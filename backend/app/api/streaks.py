from fastapi import APIRouter, Depends, HTTPException
from app.database import get_session
from app.schemas.streak import RecordDarshanRequest, StreakResponse
from app.services import streak_service

router = APIRouter()


@router.post("/record", response_model=StreakResponse)
async def record_darshan(
    payload: RecordDarshanRequest,
    db=Depends(get_session),
) -> StreakResponse:
    """
    Record a sunrise darshan completion for an anonymous install.

    Idempotent per day: recording the same day twice keeps a single row and
    returns ``recorded=False`` the second time. Returns the recomputed streak.
    """
    try:
        result = await streak_service.record_darshan(
            db, install_id=payload.install_id, completion_date=payload.completion_date
        )
        return StreakResponse.model_validate(result)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to record darshan")


@router.get("/{install_id}", response_model=StreakResponse)
async def get_streak(install_id: str, db=Depends(get_session)) -> StreakResponse:
    """
    Get the current and longest sunrise darshan streak for an install.

    Publicly accessible; identified only by the anonymous ``install_id``.
    """
    try:
        result = await streak_service.get_streak(db, install_id=install_id)
        return StreakResponse.model_validate(result)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve streak")
