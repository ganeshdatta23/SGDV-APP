from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserSpiritualStatsAdmin(BaseModel):
    """User spiritual statistics for admin view"""

    user_id: str
    username: str
    email: str
    full_name: Optional[str]
    total_japa: int
    total_pranayama: int
    total_darshan: int
    total_activities: int
    active_days: int
    last_activity_at: Optional[datetime] = None
    user_created_at: datetime
    is_active: bool
    is_admin: bool
