from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.sql import func
from app.database import Base


class AppConfig(Base):
    __tablename__ = "app_config"

    id = Column(Integer, primary_key=True, default=1)
    app_version = Column(String(50), nullable=False, default="1.0.0")
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
