from fastapi import APIRouter, Depends, HTTPException
from app.config import settings
from app.database import get_session
from app.utils.auth_dependency import get_admin_user
from typing import List
from app.schemas.events import BulkEventCreate, EventOut
from app.services.event_service import EventService

router = APIRouter()


@router.get("/", response_model=List[EventOut])
async def list_events(db=Depends(get_session)) -> List[EventOut]:
    """List all published events from today onwards (today first, then future)."""
    try:
        events = await EventService.get_published_events(db)
        return [EventOut.from_event(event) for event in events]
    except Exception:
        raise HTTPException(status_code=500, detail="Error listing events")


@router.post("/bulk", response_model=List[EventOut])
async def create_bulk_events(
    payload: BulkEventCreate,
    db=Depends(get_session),
    admin_user=Depends(get_admin_user),
) -> List[EventOut]:
    """
    Create multiple events at once.
    Requires admin authentication.
    """
    try:
        events = await EventService.create_bulk_events(
            db=db, events_data=payload.events, admin_id=admin_user.id
        )
        return [EventOut.from_event(event) for event in events]
    except HTTPException:
        raise
    except Exception as e:
        if not settings.use_turso:
            await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error creating bulk events: {str(e)}"
        )
