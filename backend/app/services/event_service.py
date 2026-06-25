from __future__ import annotations

from typing import List, TYPE_CHECKING
from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from app.config import settings
from app.schemas.events import EventCreate
import logging
import uuid

if TYPE_CHECKING:  # type hints only; SQLAlchemy/ORM unused on the Turso path
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


def _programs_timezone() -> ZoneInfo:
    tz_name = settings.PROGRAMS_TIMEZONE or "Asia/Kolkata"
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        logger.warning("Invalid PROGRAMS_TIMEZONE=%s; falling back to UTC", tz_name)
        return ZoneInfo("UTC")


def _programs_today(now: datetime | None = None) -> str:
    tz = _programs_timezone()
    current = now or datetime.now(tz)
    if current.tzinfo is None:
        current = current.replace(tzinfo=tz)
    return current.astimezone(tz).date().isoformat()


def _programs_day_start_utc(now: datetime | None = None) -> datetime:
    tz = _programs_timezone()
    current = now or datetime.now(tz)
    if current.tzinfo is None:
        current = current.replace(tzinfo=tz)
    local_today = current.astimezone(tz).date()
    local_start = datetime.combine(local_today, time.min, tzinfo=tz)
    return local_start.astimezone(timezone.utc)


def _sqlite_date_expr(column: str = "event_date") -> str:
    """Return a SQLite expression for the event date in the Programs timezone."""
    tz = _programs_timezone()
    offset = datetime.now(timezone.utc).astimezone(tz).utcoffset()
    if offset is None or offset.total_seconds() == 0:
        return f"date({column})"

    total_minutes = int(offset.total_seconds() // 60)
    sign = "+" if total_minutes >= 0 else "-"
    total_minutes = abs(total_minutes)
    hours, minutes = divmod(total_minutes, 60)
    return f"date({column}, '{sign}{hours:02d}:{minutes:02d}')"


class EventService:
    """Service for handling event business logic."""

    @staticmethod
    async def get_published_events(db: AsyncSession) -> List:
        """Get published events from today onwards in ascending order (today first, then future)."""
        if settings.use_turso:
            return await _get_published_events_turso()

        from sqlalchemy import select
        from app.models.event import Event

        today = _programs_day_start_utc()

        query = (
            select(Event)
            .where(Event.is_published)
            .where(Event.event_date >= today)
            .order_by(Event.event_date.asc())
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def create_bulk_events(
        db: AsyncSession, events_data: List[EventCreate], admin_id
    ) -> List:
        """
        Create multiple events at once.
        Automatically deletes events older than today.
        """
        if settings.use_turso:
            return await _create_bulk_events_turso(events_data, admin_id)

        from app.models.event import Event

        created_events = []
        for event_data in events_data:
            event = Event(
                title=event_data.title,
                description=event_data.description,
                location_name=event_data.location_name,
                location_id=event_data.location_id,
                event_date=datetime.fromisoformat(
                    event_data.event_date.replace("Z", "+00:00")
                ),
                created_by=admin_id,
                is_published=True,
            )
            db.add(event)
            created_events.append(event)

        await db.commit()

        for event in created_events:
            await db.refresh(event)

        # Delete events older than today
        await EventService._cleanup_old_events(db)

        logger.info(f"Created {len(created_events)} events")
        return created_events

    @staticmethod
    async def _cleanup_old_events(db: AsyncSession) -> int:
        """Delete all events before today (keeps only today and future events). Returns count of deleted events."""
        from sqlalchemy import select
        from app.models.event import Event

        today = _programs_day_start_utc()

        delete_query = select(Event).where(Event.event_date < today)
        result = await db.execute(delete_query)
        old_events = result.scalars().all()

        for old_event in old_events:
            await db.delete(old_event)

        await db.commit()

        if old_events:
            logger.info(f"Deleted {len(old_events)} past events (before today)")

        return len(old_events)


# --- Turso (libSQL) implementations ---------------------------------------

_EVENT_COLS = "id, title, description, location_name, event_date, is_published"


def _normalize_event_date(value: str) -> str:
    """Parse an incoming ISO date string and return a normalized ISO timestamp."""
    return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()


async def _get_published_events_turso() -> List:
    from app import turso

    today = _programs_today()
    event_date_expr = _sqlite_date_expr()
    return await turso.fetch_all(
        f"SELECT {_EVENT_COLS} FROM events "
        f"WHERE is_published = 1 AND {event_date_expr} >= ? "
        "ORDER BY event_date ASC",
        [today],
    )


async def _create_bulk_events_turso(events_data: List[EventCreate], admin_id) -> List:
    from app import turso

    created_ids = []
    for ed in events_data:
        eid = turso.new_id()
        await turso.execute(
            "INSERT INTO events "
            "(id, title, description, location_name, location_id, event_date, created_by, is_published, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
            [
                eid,
                ed.title,
                ed.description,
                ed.location_name,
                ed.location_id,
                _normalize_event_date(ed.event_date),
                str(admin_id),
                turso.now_iso(),
            ],
        )
        created_ids.append(eid)

    await _cleanup_old_events_turso()

    logger.info(f"Created {len(created_ids)} events")
    events = []
    for eid in created_ids:
        row = await turso.fetch_one(
            f"SELECT {_EVENT_COLS} FROM events WHERE id = ?", [eid]
        )
        if row is not None:
            events.append(row)
    return events


async def _cleanup_old_events_turso() -> int:
    from app import turso

    today = _programs_today()
    event_date_expr = _sqlite_date_expr()
    rs = await turso.execute(
        f"DELETE FROM events WHERE {event_date_expr} < ?", [today]
    )
    count = getattr(rs, "rows_affected", 0) or 0
    if count:
        logger.info(f"Deleted {count} past events (before today)")
    return count
