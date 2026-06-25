import os
import sqlite3
import sys
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import patch


os.environ.setdefault("SECRET_KEY", "test-secret")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import streak_service  # noqa: E402


class _ExecResult:
    """Minimal stand-in for a libSQL ResultSet exposing rows_affected."""

    def __init__(self, rows_affected):
        self.rows_affected = rows_affected


class FakeTurso:
    def __init__(self, connection):
        self.connection = connection

    async def fetch_all(self, sql, args=()):
        rows = self.connection.execute(sql, args).fetchall()
        return [dict(row) for row in rows]

    async def execute(self, sql, args=()):
        cursor = self.connection.execute(sql, args)
        self.connection.commit()
        return _ExecResult(cursor.rowcount)


# DDL mirrors the Turso schema in app/turso.py so the UNIQUE constraint is
# exercised by the in-memory tests.
_STREAK_DDL = """
    CREATE TABLE darshan_streaks (
        id TEXT PRIMARY KEY,
        install_id TEXT NOT NULL,
        completion_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_streak_install_date UNIQUE (install_id, completion_date)
    )
"""

_FIXED_TODAY = date(2026, 6, 26)


class StreakPureHelpersTest(unittest.TestCase):
    def test_empty_history(self):
        self.assertEqual(compute([], _FIXED_TODAY), (0, 0))

    def test_current_counts_consecutive_ending_today(self):
        dates = [date(2026, 6, 24), date(2026, 6, 25), date(2026, 6, 26)]
        self.assertEqual(compute(dates, _FIXED_TODAY), (3, 3))

    def test_alive_when_only_yesterday(self):
        # Anchor is yesterday when today is not completed yet.
        dates = [date(2026, 6, 24), date(2026, 6, 25)]
        self.assertEqual(compute(dates, _FIXED_TODAY), (2, 2))

    def test_breaks_on_skipped_day(self):
        # Gap between the 23rd and the 25th: current run is only 25th+26th.
        dates = [date(2026, 6, 23), date(2026, 6, 25), date(2026, 6, 26)]
        self.assertEqual(compute(dates, _FIXED_TODAY), (2, 2))

    def test_current_zero_when_latest_older_than_yesterday(self):
        dates = [date(2026, 6, 1), date(2026, 6, 2), date(2026, 6, 3)]
        current, longest = compute(dates, _FIXED_TODAY)
        self.assertEqual(current, 0)
        self.assertEqual(longest, 3)

    def test_longest_over_history(self):
        # Best run is the four-day stretch in early June.
        dates = [
            date(2026, 6, 1),
            date(2026, 6, 2),
            date(2026, 6, 3),
            date(2026, 6, 4),
            date(2026, 6, 10),
            date(2026, 6, 26),
        ]
        current, longest = compute(dates, _FIXED_TODAY)
        self.assertEqual(longest, 4)
        self.assertEqual(current, 1)

    def test_milestone_for(self):
        self.assertEqual(streak_service.milestone_for(1), 1)
        self.assertEqual(streak_service.milestone_for(3), 3)
        self.assertEqual(streak_service.milestone_for(7), 7)
        for n in (0, 2, 4, 5, 6, 8):
            self.assertIsNone(streak_service.milestone_for(n))


class StreakTimezoneTest(unittest.TestCase):
    def setUp(self):
        self.original_timezone = streak_service.settings.PROGRAMS_TIMEZONE
        streak_service.settings.PROGRAMS_TIMEZONE = "Asia/Kolkata"

    def tearDown(self):
        streak_service.settings.PROGRAMS_TIMEZONE = self.original_timezone

    def test_streak_today_uses_configured_timezone(self):
        # 19:00 UTC on the 25th is already the 26th in IST (UTC+5:30).
        now = datetime(2026, 6, 25, 19, 0, tzinfo=timezone.utc)
        self.assertEqual(streak_service._streak_today(now), date(2026, 6, 26))


class StreakServiceTursoTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.connection = sqlite3.connect(":memory:")
        self.connection.row_factory = sqlite3.Row
        self.connection.execute(_STREAK_DDL)

        import app

        self.app = app
        self.original_turso = getattr(app, "turso", None)
        app.turso = FakeTurso(self.connection)

        self._today_patch = patch.object(
            streak_service, "_streak_today", return_value=_FIXED_TODAY
        )
        self._today_patch.start()

    def tearDown(self):
        self._today_patch.stop()
        if self.original_turso is None:
            if hasattr(self.app, "turso"):
                delattr(self.app, "turso")
        else:
            self.app.turso = self.original_turso
        self.connection.close()

    async def test_empty_install_is_zero(self):
        result = await streak_service.get_streak(None, "install-empty")
        self.assertEqual(result["current_streak"], 0)
        self.assertEqual(result["longest_streak"], 0)
        self.assertIsNone(result["last_completion_date"])
        self.assertEqual(result["completion_dates"], [])
        self.assertIsNone(result["milestone"])
        self.assertIsNone(result["recorded"])

    async def test_unknown_install_is_empty(self):
        result = await streak_service.get_streak(None, "never-seen")
        self.assertEqual(result["current_streak"], 0)
        self.assertEqual(result["completion_dates"], [])

    async def test_idempotent_insert(self):
        first = await streak_service.record_darshan(None, "install-1")
        self.assertTrue(first["recorded"])
        self.assertEqual(first["current_streak"], 1)
        self.assertEqual(first["milestone"], 1)

        second = await streak_service.record_darshan(None, "install-1")
        self.assertFalse(second["recorded"])
        self.assertEqual(second["current_streak"], 1)

        rows = self.connection.execute(
            "SELECT COUNT(*) FROM darshan_streaks WHERE install_id = ?",
            ["install-1"],
        ).fetchone()
        self.assertEqual(rows[0], 1)

    async def test_explicit_completion_date(self):
        result = await streak_service.record_darshan(
            None, "install-2", completion_date=date(2026, 6, 25)
        )
        self.assertTrue(result["recorded"])
        # Anchored on yesterday (25th) since today (26th) is not recorded.
        self.assertEqual(result["current_streak"], 1)
        self.assertEqual(result["last_completion_date"], date(2026, 6, 25))

    async def test_three_day_streak_milestone(self):
        for d in (date(2026, 6, 24), date(2026, 6, 25), date(2026, 6, 26)):
            await streak_service.record_darshan(None, "install-3", completion_date=d)
        result = await streak_service.get_streak(None, "install-3")
        self.assertEqual(result["current_streak"], 3)
        self.assertEqual(result["longest_streak"], 3)
        self.assertEqual(result["milestone"], 3)
        self.assertEqual(result["last_completion_date"], date(2026, 6, 26))

    async def test_broken_streak_current_zero(self):
        for d in (date(2026, 6, 1), date(2026, 6, 2), date(2026, 6, 3)):
            await streak_service.record_darshan(None, "install-4", completion_date=d)
        result = await streak_service.get_streak(None, "install-4")
        self.assertEqual(result["current_streak"], 0)
        self.assertEqual(result["longest_streak"], 3)
        self.assertIsNone(result["milestone"])


def compute(dates, today):
    return streak_service.compute_streaks(dates, today)


if __name__ == "__main__":
    unittest.main()
