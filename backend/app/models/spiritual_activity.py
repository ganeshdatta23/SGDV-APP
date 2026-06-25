import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    Date,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class SpiritualActivity(Base):
    """
    Daily aggregated spiritual activity for a user.

    This table stores one row per user per day with aggregated counts
    for japa, pranayama, and darshan activities. This prevents redundancy
    and allows for efficient querying of daily/total statistics.

    Example:
        - 2025-11-22: User logged japa=1, so one row with japa_count=1
        - 2025-11-22 (later): User logs japa=4 more, row updated to japa_count=5
        - Result: Only ONE row per day, no duplicate entries
    """

    __tablename__ = "spiritual_activity"

    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_date = Column(Date, nullable=False)

    # Daily activity counts
    japa_count = Column(Integer, default=0, nullable=False)
    pranayama_count = Column(Integer, default=0, nullable=False)
    darshan_count = Column(Integer, default=0, nullable=False)

    # Track when each activity type was last updated
    japa_last_updated = Column(DateTime(timezone=True), nullable=True)
    pranayama_last_updated = Column(DateTime(timezone=True), nullable=True)
    darshan_last_updated = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Constraints
    __table_args__ = (
        CheckConstraint("japa_count >= 0", name="japa_count_positive"),
        CheckConstraint("pranayama_count >= 0", name="pranayama_count_positive"),
        CheckConstraint("darshan_count >= 0", name="darshan_count_positive"),
    )


class SpiritualActivityHistory(Base):
    """
    Audit trail for all spiritual activities.

    This table keeps a complete history of every activity logged,
    useful for auditing, debugging, and generating reports.
    Unlike SpiritualActivity which aggregates, this stores every entry.

    Example:
        - Log: japa +1 at 10:00
        - Log: japa +4 at 15:00
        - History has TWO entries, one for each log
        - SpiritualActivity has ONE entry (aggregated: 5)
    """

    __tablename__ = "spiritual_activity_history"

    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Activity details
    activity_type = Column(
        String(50),
        nullable=False,
        index=True,
        # Validate activity type
    )
    count_added = Column(Integer, nullable=False)
    activity_date = Column(Date, nullable=False, index=True)

    # Optional fields
    notes = Column(Text, nullable=True)
    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("saved_locations.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Timestamp
    logged_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "activity_type IN ('japa', 'pranayama', 'darshan')",
            name="valid_activity_type",
        ),
        CheckConstraint("count_added > 0", name="count_added_positive"),
    )
