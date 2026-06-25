from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AppConfigOut(BaseModel):
    """Response schema for app configuration."""

    app_version: str
    expiry_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class AppConfigUpdate(BaseModel):
    """Request schema for updating app configuration."""

    app_version: Optional[str] = Field(
        None,
        min_length=1,
        max_length=50,
        description="App version string (e.g., '1.0.0')",
    )
    expiry_date: Optional[datetime] = Field(
        None, description="App expiry date (ISO 8601 format)"
    )
