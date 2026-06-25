from fastapi import APIRouter, Depends
from app.database import get_session
from app.utils.auth_dependency import get_current_user
from app.schemas.spiritual import LogActivityRequest
from app.services.spiritual_service import SpiritualService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/darshan")
async def log_darshan(
    payload: LogActivityRequest,
    db=Depends(get_session),
    current_user=Depends(get_current_user),
):
    """
    Log darshan (spiritual viewing/witnessing) activity.

    **IMPORTANT: Darshan is LIMITED to 1 per day ONLY**

    Rules:
    - User can log darshan only ONCE per day
    - Multiple attempts same day: Updates timestamp only, keeps count as 1
    - Regardless of count value sent, only 1 is recorded per day
    - Next day: can log 1 again (total becomes 2)

    Examples:
      Day 1: Log darshan → darshan_count = 1
      Day 1 (again): Log darshan (count=10000) → darshan_count = 1, timestamp updated
      Day 2: Log darshan → darshan_count = 2 (total)
    """
    # Darshan is always logged as 1
    return await SpiritualService.log_activity(
        db=db,
        user_id=current_user.id,
        activity_type="darshan",
        count=1,  # Fixed to 1 for darshan
        notes=payload.notes,
    )


@router.get("/stats")
async def get_spiritual_stats(
    db=Depends(get_session), current_user=Depends(get_current_user)
):
    """
    Get aggregated spiritual activity statistics for current user.

    Returns:
    - Total counts for each activity type
    - Last update times
    - Daily breakdown
    - Active days count
    """
    return await SpiritualService.get_user_statistics(db, current_user.id)


@router.get("/stats/today")
async def get_spiritual_stats_today(
    db=Depends(get_session), current_user=Depends(get_current_user)
):
    """
    Get today's spiritual activity statistics for current user.
    """
    return await SpiritualService.get_today_statistics(db, current_user.id)
