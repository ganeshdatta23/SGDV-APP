from pydantic import BaseModel
from typing import Optional, List


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location_name: Optional[str] = None
    location_id: Optional[str] = None
    event_date: str


class BulkEventCreate(BaseModel):
    events: List[EventCreate]


class EventCreateWithCreatedBy(BaseModel):
    title: str
    description: Optional[str] = None
    location_name: Optional[str] = None
    location_id: Optional[str] = None
    event_date: str
    created_by: str


class EventOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    location_name: Optional[str]
    event_date: str
    is_published: bool

    @classmethod
    def from_event(cls, event):
        event_date = event.event_date
        # ORM returns a datetime; the Turso backend returns an ISO string.
        if hasattr(event_date, "isoformat"):
            event_date = event_date.isoformat()
        return cls(
            id=str(event.id),
            title=event.title,
            description=event.description,
            location_name=event.location_name,
            event_date=str(event_date),
            is_published=bool(event.is_published),
        )

    class Config:
        from_attributes = True
