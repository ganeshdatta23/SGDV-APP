from __future__ import annotations

from typing import List, TYPE_CHECKING
from datetime import datetime, date
from app.config import settings
from app.schemas.events import EventCreate
import logging
import uuid

if TYPE_CHECKING:  # type hints only; SQLAlchemy/ORM unused on the Turso path
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class EventService:
    """Service for handling event business logic."""

    @staticmethod
    async def get_published_events(db: AsyncSession) -> List:
        """Get published events from today onwards in ascending order (today first, then future)."""
        if settings.use_turso:
            return await _get_published_events_turso()

        from sqlalchemy import select
        from app.models.event import Event

        # Get today's date at midnight (start of day)
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

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

        # Get today's date at midnight (start of day)
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

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

    today = date.today().isoformat()
    return await turso.fetch_all(
        f"SELECT {_EVENT_COLS} FROM events "
        "WHERE is_published = 1 AND date(event_date) >= ? "
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

    today = date.today().isoformat()
    rs = await turso.execute(
        "DELETE FROM events WHERE date(event_date) < ?", [today]
    )
    count = getattr(rs, "rows_affected", 0) or 0
    if count:
        logger.info(f"Deleted {count} past events (before today)")
    return count
