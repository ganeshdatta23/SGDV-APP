from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class RecordDarshanRequest(BaseModel):
    """Request to record a sunrise darshan completion for an install."""

    install_id: str = Field(
        min_length=1,
        max_length=128,
        description="Anonymous per-install identifier",
    )
    completion_date: Optional[date] = Field(
        None,
        description="Day to record (temple calendar). Defaults to today.",
    )


class StreakResponse(BaseModel):
    """Response with the current/longest streak for an install."""

    install_id: str
    current_streak: int
    longest_streak: int
    last_completion_date: Optional[date] = None
    completion_dates: list[date] = []
    milestone: Optional[int] = None
    recorded: Optional[bool] = None
