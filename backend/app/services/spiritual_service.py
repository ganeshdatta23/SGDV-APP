from __future__ import annotations

from typing import Optional, TYPE_CHECKING
from datetime import date, datetime
from fastapi import HTTPException
from app.config import settings
from app.schemas.spiritual import (
    ActivityStatsResponse,
    DailyActivityResponse,
)
import logging
import uuid

if TYPE_CHECKING:  # type hints only; SQLAlchemy/ORM unused on the Turso path
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_LOGGABLE_ACTIVITIES = {"darshan"}


class SpiritualService:
    """Service for handling spiritual activity business logic."""

    @staticmethod
    async def get_user(db: AsyncSession, user_id: str) -> tuple:
        """Validate user_id UUID format and check user exists."""
        if settings.use_turso:
            return await _get_user_turso(user_id)

        from sqlalchemy import select
        from app.models.user import User

        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            logger.error(f"Invalid UUID format for user_id: {user_id}")
            raise HTTPException(
                status_code=400, detail=f"Invalid user_id format: {user_id}"
            )

        user_result = await db.execute(select(User).where(User.id == user_uuid))
        user = user_result.scalar()
        if not user:
            logger.warning(f"User not found: {user_uuid}")
            raise HTTPException(status_code=404, detail="User not found")

        return user_uuid, user

    @staticmethod
    async def log_activity(
        db: AsyncSession,
        user_id,
        activity_type: str,
        count: int,
        notes: Optional[str] = None,
        location_id=None,
    ) -> dict:
        """
        Log a spiritual activity with daily aggregation.

        This function:
        1. Updates/creates SpiritualActivity for today (aggregated)
        2. Creates SpiritualActivityHistory entry (audit trail)
        3. Returns the updated totals
        """
        if activity_type not in _LOGGABLE_ACTIVITIES:
            raise HTTPException(
                status_code=404, detail="Activity logging endpoint not found"
            )

        if settings.use_turso:
            return await _log_activity_turso(
                user_id, activity_type, count, notes, location_id
            )

        from sqlalchemy import select, and_
        from app.models.spiritual_activity import (
            SpiritualActivity,
            SpiritualActivityHistory,
        )

        today = date.today()
        now = datetime.utcnow()

        try:
            # Get or create today's activity record
            activity_result = await db.execute(
                select(SpiritualActivity).where(
                    and_(
                        SpiritualActivity.user_id == user_id,
                        SpiritualActivity.activity_date == today,
                    )
                )
            )
            activity = activity_result.scalar()

            if activity is None:
                # Create new record for today
                activity = SpiritualActivity(user_id=user_id, activity_date=today)
                db.add(activity)

            activity.darshan_count = (activity.darshan_count or 0) + count
            activity.darshan_last_updated = now

            activity.updated_at = now

            # Add to history (audit trail)
            history = SpiritualActivityHistory(
                user_id=user_id,
                activity_type=activity_type,
                count_added=count,
                activity_date=today,
                notes=notes,
                location_id=location_id,
                logged_at=now,
            )
            db.add(history)

            # Commit changes
            await db.commit()

            logger.info(
                f"{activity_type} logged for user {user_id}: +{count} "
                f"(total: {activity.darshan_count})"
            )

            return {
                "status": "success",
                "activity_type": activity_type,
                "count_added": count,
                "daily_total": activity.darshan_count,
                "updated_at": activity.updated_at,
            }

        except Exception as e:
            await db.rollback()
            logger.error(f"Error logging {activity_type}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500, detail=f"Error logging {activity_type}: {str(e)}"
            )

    @staticmethod
    async def get_user_statistics(
        db: AsyncSession, user_id
    ) -> ActivityStatsResponse:
        """Get aggregated statistics for a user."""
        if settings.use_turso:
            return await _get_user_statistics_turso(user_id)

        from sqlalchemy import select
        from app.models.spiritual_activity import SpiritualActivity

        # Get all activity records for this user
        result = await db.execute(
            select(SpiritualActivity)
            .where(SpiritualActivity.user_id == user_id)
            .order_by(SpiritualActivity.activity_date)
        )
        activities = result.scalars().all()

        # Calculate totals
        total_japa = sum(a.japa_count for a in activities)
        total_pranayama = sum(a.pranayama_count for a in activities)
        total_darshan = sum(a.darshan_count for a in activities)

        # Get latest timestamps
        latest_japa = max(
            (a.japa_last_updated for a in activities if a.japa_last_updated),
            default=None,
        )
        latest_pranayama = max(
            (a.pranayama_last_updated for a in activities if a.pranayama_last_updated),
            default=None,
        )
        latest_darshan = max(
            (a.darshan_last_updated for a in activities if a.darshan_last_updated),
            default=None,
        )

        # Overall last activity
        all_timestamps = [
            t for t in [latest_japa, latest_pranayama, latest_darshan] if t
        ]
        last_activity_at = max(all_timestamps) if all_timestamps else None

        # Build daily breakdown
        daily_breakdown = [
            DailyActivityResponse(
                activity_date=a.activity_date,
                japa_count=a.japa_count,
                pranayama_count=a.pranayama_count,
                darshan_count=a.darshan_count,
                japa_last_updated=a.japa_last_updated,
                pranayama_last_updated=a.pranayama_last_updated,
                darshan_last_updated=a.darshan_last_updated,
            )
            for a in activities
        ]

        return ActivityStatsResponse(
            user_id=str(user_id),
            total_japa=total_japa,
            total_pranayama=total_pranayama,
            total_darshan=total_darshan,
            total_all_activities=total_japa + total_pranayama + total_darshan,
            japa_last_updated=latest_japa,
            pranayama_last_updated=latest_pranayama,
            darshan_last_updated=latest_darshan,
            last_activity_at=last_activity_at,
            active_days=len(activities),
            daily_breakdown=daily_breakdown,
        )

    @staticmethod
    async def get_today_statistics(db: AsyncSession, user_id) -> dict:
        """Get today's spiritual activity statistics for a user."""
        if settings.use_turso:
            return await _get_today_statistics_turso(user_id)

        from sqlalchemy import select, and_
        from app.models.spiritual_activity import SpiritualActivity

        today = date.today()

        result = await db.execute(
            select(SpiritualActivity).where(
                and_(
                    SpiritualActivity.user_id == user_id,
                    SpiritualActivity.activity_date == today,
                )
            )
        )
        activity = result.scalar()

        if activity is None:
            # No activity today
            return {
                "user_id": str(user_id),
                "activity_date": today,
                "japa_count": 0,
                "pranayama_count": 0,
                "darshan_count": 0,
                "total": 0,
            }

        return {
            "user_id": str(user_id),
            "activity_date": today,
            "japa_count": activity.japa_count,
            "pranayama_count": activity.pranayama_count,
            "darshan_count": activity.darshan_count,
            "total": activity.japa_count
            + activity.pranayama_count
            + activity.darshan_count,
            "japa_last_updated": activity.japa_last_updated,
            "pranayama_last_updated": activity.pranayama_last_updated,
            "darshan_last_updated": activity.darshan_last_updated,
        }


# --- Turso (libSQL) implementations ---------------------------------------


def _validate_user_id(user_id) -> str:
    try:
        return str(uuid.UUID(str(user_id)))
    except (ValueError, AttributeError, TypeError):
        logger.error(f"Invalid UUID format for user_id: {user_id}")
        raise HTTPException(
            status_code=400, detail=f"Invalid user_id format: {user_id}"
        )


async def _get_user_turso(user_id: str) -> tuple:
    from app import turso

    uid = _validate_user_id(user_id)
    user = await turso.fetch_one(
        "SELECT id, email, username, full_name, is_admin, is_active "
        "FROM users WHERE id = ?",
        [uid],
    )
    if user is None:
        logger.warning(f"User not found: {uid}")
        raise HTTPException(status_code=404, detail="User not found")
    return user["id"], user


async def _log_activity_turso(
    user_id, activity_type, count, notes, location_id
) -> dict:
    from app import turso

    if activity_type not in _LOGGABLE_ACTIVITIES:
        raise HTTPException(
            status_code=404, detail="Activity logging endpoint not found"
        )

    uid = str(user_id)
    today = date.today().isoformat()
    now = turso.now_iso()

    try:
        row = await turso.fetch_one(
            "SELECT id, darshan_count "
            "FROM spiritual_activity WHERE user_id = ? AND activity_date = ?",
            [uid, today],
        )

        if row is None:
            sa_id = turso.new_id()
            await turso.execute(
                "INSERT INTO spiritual_activity "
                "(id, user_id, activity_date, japa_count, pranayama_count, darshan_count, created_at, updated_at) "
                "VALUES (?, ?, ?, 0, 0, 0, ?, ?)",
                [sa_id, uid, today, now, now],
            )
            current = 0
        else:
            sa_id = row["id"]
            current = row["darshan_count"] or 0

        new_total = current + count
        await turso.execute(
            "UPDATE spiritual_activity "
            "SET darshan_count = ?, darshan_last_updated = ?, updated_at = ? "
            "WHERE id = ?",
            [new_total, now, now, sa_id],
        )

        await turso.execute(
            "INSERT INTO spiritual_activity_history "
            "(id, user_id, activity_type, count_added, activity_date, notes, location_id, logged_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                turso.new_id(),
                uid,
                activity_type,
                count,
                today,
                notes,
                str(location_id) if location_id else None,
                now,
            ],
        )

        logger.info(
            f"{activity_type} logged for user {uid}: +{count} (total: {new_total})"
        )
        return {
            "status": "success",
            "activity_type": activity_type,
            "count_added": count,
            "daily_total": new_total,
            "updated_at": now,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging {activity_type}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error logging {activity_type}: {str(e)}"
        )


async def _get_user_statistics_turso(user_id) -> ActivityStatsResponse:
    from app import turso

    uid = str(user_id)
    rows = await turso.fetch_all(
        "SELECT activity_date, japa_count, pranayama_count, darshan_count, "
        "japa_last_updated, pranayama_last_updated, darshan_last_updated "
        "FROM spiritual_activity WHERE user_id = ? ORDER BY activity_date",
        [uid],
    )

    total_japa = sum((r["japa_count"] or 0) for r in rows)
    total_pranayama = sum((r["pranayama_count"] or 0) for r in rows)
    total_darshan = sum((r["darshan_count"] or 0) for r in rows)

    # ISO-8601 strings sort chronologically, so max() over the strings works.
    latest_japa = max(
        (r["japa_last_updated"] for r in rows if r["japa_last_updated"]), default=None
    )
    latest_pranayama = max(
        (r["pranayama_last_updated"] for r in rows if r["pranayama_last_updated"]),
        default=None,
    )
    latest_darshan = max(
        (r["darshan_last_updated"] for r in rows if r["darshan_last_updated"]),
        default=None,
    )
    all_ts = [t for t in [latest_japa, latest_pranayama, latest_darshan] if t]
    last_activity_at = max(all_ts) if all_ts else None

    daily_breakdown = [
        DailyActivityResponse(
            activity_date=r["activity_date"],
            japa_count=r["japa_count"] or 0,
            pranayama_count=r["pranayama_count"] or 0,
            darshan_count=r["darshan_count"] or 0,
            japa_last_updated=r["japa_last_updated"],
            pranayama_last_updated=r["pranayama_last_updated"],
            darshan_last_updated=r["darshan_last_updated"],
        )
        for r in rows
    ]

    return ActivityStatsResponse(
        user_id=uid,
        total_japa=total_japa,
        total_pranayama=total_pranayama,
        total_darshan=total_darshan,
        total_all_activities=total_japa + total_pranayama + total_darshan,
        japa_last_updated=latest_japa,
        pranayama_last_updated=latest_pranayama,
        darshan_last_updated=latest_darshan,
        last_activity_at=last_activity_at,
        active_days=len(rows),
        daily_breakdown=daily_breakdown,
    )


async def _get_today_statistics_turso(user_id) -> dict:
    from app import turso

    uid = str(user_id)
    today = date.today()
    row = await turso.fetch_one(
        "SELECT japa_count, pranayama_count, darshan_count, "
        "japa_last_updated, pranayama_last_updated, darshan_last_updated "
        "FROM spiritual_activity WHERE user_id = ? AND activity_date = ?",
        [uid, today.isoformat()],
    )

    if row is None:
        return {
            "user_id": uid,
            "activity_date": today,
            "japa_count": 0,
            "pranayama_count": 0,
            "darshan_count": 0,
            "total": 0,
        }

    japa = row["japa_count"] or 0
    pranayama = row["pranayama_count"] or 0
    darshan = row["darshan_count"] or 0
    return {
        "user_id": uid,
        "activity_date": today,
        "japa_count": japa,
        "pranayama_count": pranayama,
        "darshan_count": darshan,
        "total": japa + pranayama + darshan,
        "japa_last_updated": row["japa_last_updated"],
        "pranayama_last_updated": row["pranayama_last_updated"],
        "darshan_last_updated": row["darshan_last_updated"],
    }
