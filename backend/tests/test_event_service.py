import os
import sqlite3
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch


os.environ.setdefault("SECRET_KEY", "test-secret")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import event_service  # noqa: E402


class FakeTurso:
    def __init__(self, connection):
        self.connection = connection

    async def fetch_all(self, sql, args=()):
        rows = self.connection.execute(sql, args).fetchall()
        return [dict(row) for row in rows]


class EventServiceDateFilteringTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.original_timezone = event_service.settings.PROGRAMS_TIMEZONE
        event_service.settings.PROGRAMS_TIMEZONE = "Asia/Kolkata"

    def tearDown(self):
        event_service.settings.PROGRAMS_TIMEZONE = self.original_timezone

    def test_programs_today_uses_configured_timezone(self):
        now = datetime(2026, 6, 25, 19, 0, tzinfo=timezone.utc)

        self.assertEqual(event_service._programs_today(now), "2026-06-26")
        self.assertEqual(
            event_service._programs_day_start_utc(now),
            datetime(2026, 6, 25, 18, 30, tzinfo=timezone.utc),
        )

    async def test_turso_query_filters_by_program_date(self):
        connection = sqlite3.connect(":memory:")
        connection.row_factory = sqlite3.Row
        connection.execute(
            """
            CREATE TABLE events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                location_name TEXT,
                event_date TEXT NOT NULL,
                is_published INTEGER NOT NULL
            )
            """
        )
        connection.executemany(
            """
            INSERT INTO events
            (id, title, description, location_name, event_date, is_published)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("past", "Past", None, None, "2026-06-25T18:00:00+00:00", 1),
                ("today", "Today", None, None, "2026-06-25T19:00:00+00:00", 1),
                ("future", "Future", None, None, "2026-06-27T10:00:00+05:30", 1),
                ("draft", "Draft", None, None, "2026-06-27T10:00:00+05:30", 0),
            ],
        )

        import app

        original_turso = getattr(app, "turso", None)
        app.turso = FakeTurso(connection)
        try:
            with patch.object(event_service, "_programs_today", return_value="2026-06-26"):
                rows = await event_service._get_published_events_turso()
        finally:
            if original_turso is None:
                delattr(app, "turso")
            else:
                app.turso = original_turso

        self.assertEqual([row["id"] for row in rows], ["today", "future"])


if __name__ == "__main__":
    unittest.main()
