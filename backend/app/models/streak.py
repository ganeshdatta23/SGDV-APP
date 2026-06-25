import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Date,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Streak(Base):
    """
    One row per (install_id, day) the user completed the sunrise darshan.

    Streaks are computed on read from these completion rows (there is no
    summary table), so the only write is an idempotent insert per day.
    """

    __tablename__ = "darshan_streaks"

    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    install_id = Column(String(128), nullable=False, index=True)
    completion_date = Column(Date, nullable=False)

    # Timestamp
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            "install_id", "completion_date", name="uq_streak_install_date"
        ),
    )
