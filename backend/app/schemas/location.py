from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class LocationResult(BaseModel):
    name: str
    latitude: float
    longitude: float
    sunrise: datetime
    sunset: datetime

class LocationSearchResponse(BaseModel):
    results: List[LocationResult]

class LocationUpdateRequest(BaseModel):
    """Request model for creating/updating location via Google Maps link."""
    name: str
    google_maps_url: str
    description: str

class LocationUpdateResponse(BaseModel):
    """Response model for location update."""
    id: str
    name: str
    description: Optional[str]
    latitude: float
    longitude: float
    is_global: bool
    message: str

    class Config:
        from_attributes = True