import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class Event(Base):
    __tablename__ = 'events'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    location_name = Column(String(255))
    location_id = Column(UUID(as_uuid=True), nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
