import uuid
from sqlalchemy import Column, String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class SavedLocation(Base):
    __tablename__ = 'saved_locations'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    is_default = Column(Boolean, default=False)
    is_global = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
