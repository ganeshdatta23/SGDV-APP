from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class LogActivityRequest(BaseModel):
    """Request to log a spiritual activity"""

    count: int = Field(gt=0, description="Number of counts (must be > 0)")
    notes: Optional[str] = None


class DailyActivityResponse(BaseModel):
    """Daily activity breakdown"""

    activity_date: date
    japa_count: int
    pranayama_count: int
    darshan_count: int
    japa_last_updated: Optional[datetime] = None
    pranayama_last_updated: Optional[datetime] = None
    darshan_last_updated: Optional[datetime] = None


class ActivityStatsResponse(BaseModel):
    """Response with aggregated activity statistics"""

    user_id: str
    total_japa: int
    total_pranayama: int
    total_darshan: int
    total_all_activities: int
    japa_last_updated: Optional[datetime] = None
    pranayama_last_updated: Optional[datetime] = None
    darshan_last_updated: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    active_days: int
    daily_breakdown: list[DailyActivityResponse] = []
