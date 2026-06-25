from __future__ import annotations

from typing import Optional, TYPE_CHECKING
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from app.config import settings
import logging

if TYPE_CHECKING:  # type hints only; SQLAlchemy/ORM unused on the Turso path
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Milestone streak lengths that are worth surfacing to the user.
_MILESTONES = {1, 3, 7}


def _streak_timezone() -> ZoneInfo:
    tz_name = settings.PROGRAMS_TIMEZONE or "Asia/Kolkata"
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        logger.warning("Invalid PROGRAMS_TIMEZONE=%s; falling back to UTC", tz_name)
        return ZoneInfo("UTC")


def _streak_today(now: datetime | None = None) -> date:
    tz = _streak_timezone()
    current = now or datetime.now(tz)
    if current.tzinfo is None:
        current = current.replace(tzinfo=tz)
    return current.astimezone(tz).date()


# --- pure helpers ----------------------------------------------------------


def compute_streaks(dates: list[date], today: date) -> tuple[int, int]:
    """Return ``(current_streak, longest_streak)`` for a set of completion dates.

    ``longest`` is the maximum run of consecutive days anywhere in history.
    ``current`` walks back from an anchor of ``today`` (if completed) else
    yesterday (if completed) else 0, counting consecutive days back from there.
    """
    unique = sorted(set(dates))
    if not unique:
        return 0, 0

    # Longest run of consecutive days anywhere.
    longest = 1
    run = 1
    for prev, cur in zip(unique, unique[1:]):
        if cur - prev == timedelta(days=1):
            run += 1
        else:
            run = 1
        if run > longest:
            longest = run

    completed = set(unique)
    yesterday = today - timedelta(days=1)
    if today in completed:
        anchor = today
    elif yesterday in completed:
        anchor = yesterday
    else:
        return 0, longest

    current = 0
    cursor = anchor
    while cursor in completed:
        current += 1
        cursor -= timedelta(days=1)

    return current, longest


def milestone_for(streak: int) -> Optional[int]:
    """Return the streak length if it hits a milestone (1/3/7), else None."""
    return streak if streak in _MILESTONES else None


# --- public service API ----------------------------------------------------


async def record_darshan(
    db,
    install_id: str,
    completion_date: Optional[date] = None,
) -> dict:
    """Idempotently record a darshan completion and return the streak payload."""
    target = completion_date or _streak_today()

    if settings.use_turso:
        return await _record_darshan_turso(install_id, target)

    from sqlalchemy import select
    from sqlalchemy.dialects.postgresql import insert
    from app.models.streak import Streak

    stmt = (
        insert(Streak)
        .values(install_id=install_id, completion_date=target)
        .on_conflict_do_nothing(
            index_elements=["install_id", "completion_date"]
        )
    )
    result = await db.execute(stmt)
    await db.commit()
    recorded = (result.rowcount or 0) > 0

    rows = await db.execute(
        select(Streak.completion_date).where(Streak.install_id == install_id)
    )
    dates = [row[0] for row in rows.all()]
    return _build_payload(install_id, dates, recorded=recorded)


async def get_streak(db, install_id: str) -> dict:
    """Return the current/longest streak payload for an install (no write)."""
    if settings.use_turso:
        return await _get_streak_turso(install_id)

    from sqlalchemy import select
    from app.models.streak import Streak

    rows = await db.execute(
        select(Streak.completion_date).where(Streak.install_id == install_id)
    )
    dates = [row[0] for row in rows.all()]
    return _build_payload(install_id, dates, recorded=None)


def _build_payload(
    install_id: str, dates: list[date], recorded: Optional[bool]
) -> dict:
    """Assemble a StreakResponse-shaped dict from completion dates."""
    today = _streak_today()
    ordered = sorted(set(dates))
    current, longest = compute_streaks(ordered, today)
    return {
        "install_id": install_id,
        "current_streak": current,
        "longest_streak": longest,
        "last_completion_date": ordered[-1] if ordered else None,
        "completion_dates": ordered,
        "milestone": milestone_for(current),
        "recorded": recorded,
    }


# --- Turso (libSQL) implementations ---------------------------------------


def _parse_date(value) -> date:
    """Parse a stored completion_date (ISO string or date) to a date."""
    if isinstance(value, date):
        return value
    # Stored as 'YYYY-MM-DD'; tolerate a full ISO timestamp just in case.
    return date.fromisoformat(str(value)[:10])


async def _record_darshan_turso(install_id: str, target: date) -> dict:
    from app import turso

    rs = await turso.execute(
        "INSERT INTO darshan_streaks (id, install_id, completion_date, created_at) "
        "VALUES (?, ?, ?, ?) "
        "ON CONFLICT (install_id, completion_date) DO NOTHING",
        [turso.new_id(), install_id, target.isoformat(), turso.now_iso()],
    )
    recorded = (getattr(rs, "rows_affected", 0) or 0) > 0
    dates = await _completion_dates_turso(install_id)
    return _build_payload(install_id, dates, recorded=recorded)


async def _get_streak_turso(install_id: str) -> dict:
    dates = await _completion_dates_turso(install_id)
    return _build_payload(install_id, dates, recorded=None)


async def _completion_dates_turso(install_id: str) -> list[date]:
    from app import turso

    rows = await turso.fetch_all(
        "SELECT completion_date FROM darshan_streaks WHERE install_id = ?",
        [install_id],
    )
    return [_parse_date(r["completion_date"]) for r in rows]
