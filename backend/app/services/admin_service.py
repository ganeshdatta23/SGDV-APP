from __future__ import annotations

from typing import Optional, List, Dict, Any, TYPE_CHECKING
from app.config import settings
import logging

if TYPE_CHECKING:  # type hints only; SQLAlchemy/ORM unused on the Turso path
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AdminService:
    """Service for handling admin-specific business logic."""

    @staticmethod
    async def get_all_users_spiritual_stats(
        db: AsyncSession,
        filter_by: Optional[str] = None,
        filter_value: Optional[str] = None,
        sort_by: str = "total_activities",
        sort_order: str = "DESC",
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get spiritual statistics for all users with optional filtering, sorting, and pagination.

        Args:
            db: Database session
            filter_by: Field to filter by ('username', 'japa_count', etc.)
            filter_value: Value to filter (supports 'min:X', 'max:X', or exact value)
            sort_by: Field to sort by
            sort_order: 'ASC' or 'DESC'
            limit: Max results to return
            offset: Offset for pagination
        """
        if settings.use_turso:
            return await _get_all_users_spiritual_stats_turso(
                filter_by, filter_value, sort_by, sort_order, limit, offset
            )

        from sqlalchemy import select, func
        from app.models.user import User
        from app.models.spiritual_activity import SpiritualActivity

        # Build base query with aggregated stats
        query = (
            select(
                User.id.label("user_id"),
                User.username,
                User.email,
                User.full_name,
                User.is_active,
                User.is_admin,
                User.created_at.label("user_created_at"),
                func.coalesce(func.sum(SpiritualActivity.japa_count), 0).label(
                    "total_japa"
                ),
                func.coalesce(func.sum(SpiritualActivity.pranayama_count), 0).label(
                    "total_pranayama"
                ),
                func.coalesce(func.sum(SpiritualActivity.darshan_count), 0).label(
                    "total_darshan"
                ),
                func.coalesce(
                    func.sum(
                        SpiritualActivity.japa_count
                        + SpiritualActivity.pranayama_count
                        + SpiritualActivity.darshan_count
                    ),
                    0,
                ).label("total_activities"),
                func.count(func.distinct(SpiritualActivity.activity_date)).label(
                    "active_days"
                ),
                func.max(
                    func.greatest(
                        SpiritualActivity.japa_last_updated,
                        SpiritualActivity.pranayama_last_updated,
                        SpiritualActivity.darshan_last_updated,
                    )
                ).label("last_activity_at"),
            )
            .select_from(User)
            .outerjoin(SpiritualActivity, User.id == SpiritualActivity.user_id)
            .group_by(User.id)
        )

        # Apply filters
        query = AdminService._apply_filters(query, filter_by, filter_value)

        # Apply sorting
        query = AdminService._apply_sorting(query, sort_by, sort_order)

        # Apply pagination
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        rows = result.all()

        # Convert to list of dicts
        users_stats = []
        for row in rows:
            users_stats.append(
                {
                    "user_id": str(row.user_id),
                    "username": row.username,
                    "email": row.email,
                    "full_name": row.full_name,
                    "is_active": row.is_active,
                    "is_admin": row.is_admin,
                    "user_created_at": row.user_created_at,
                    "total_japa": row.total_japa,
                    "total_pranayama": row.total_pranayama,
                    "total_darshan": row.total_darshan,
                    "total_activities": row.total_activities,
                    "active_days": row.active_days,
                    "last_activity_at": row.last_activity_at,
                }
            )

        return users_stats

    @staticmethod
    def _apply_filters(query, filter_by: Optional[str], filter_value: Optional[str]):
        """Apply filters to the query based on filter_by and filter_value."""
        if not filter_by or not filter_value:
            return query

        from sqlalchemy import func
        from app.models.user import User
        from app.models.spiritual_activity import SpiritualActivity

        if filter_by == "username":
            return query.where(User.username.ilike(f"%{filter_value}%"))

        elif filter_by in [
            "japa_count",
            "pranayama_count",
            "darshan_count",
            "total_activities",
        ]:
            field_map = {
                "japa_count": func.coalesce(func.sum(SpiritualActivity.japa_count), 0),
                "pranayama_count": func.coalesce(
                    func.sum(SpiritualActivity.pranayama_count), 0
                ),
                "darshan_count": func.coalesce(
                    func.sum(SpiritualActivity.darshan_count), 0
                ),
                "total_activities": func.coalesce(
                    func.sum(
                        SpiritualActivity.japa_count
                        + SpiritualActivity.pranayama_count
                        + SpiritualActivity.darshan_count
                    ),
                    0,
                ),
            }
            field = field_map.get(filter_by)

            if ":" in filter_value:
                op, value = filter_value.split(":")
                value = int(value)
                if op == "min":
                    return query.having(field >= value)
                elif op == "max":
                    return query.having(field <= value)
            else:
                # Exact match
                value = int(filter_value)
                return query.having(field == value)

        return query

    @staticmethod
    def _apply_sorting(query, sort_by: str, sort_order: str):
        """Apply sorting to the query."""
        from app.models.user import User

        # Map sort fields to actual query columns
        # Since we're using labels, we need to refer to them correctly
        sort_field = {
            "username": User.username,
            "total_japa": "total_japa",
            "total_pranayama": "total_pranayama",
            "total_darshan": "total_darshan",
            "total_activities": "total_activities",
            "active_days": "active_days",
            "last_activity_at": "last_activity_at",
        }.get(sort_by, "total_activities")

        # For aggregated fields, we need to use text() or column()
        from sqlalchemy import desc, asc, text

        if isinstance(sort_field, str):
            # It's a label/alias from our select
            if sort_order.upper() == "DESC":
                return query.order_by(desc(text(sort_field)))
            else:
                return query.order_by(asc(text(sort_field)))
        else:
            # It's a direct column reference
            if sort_order.upper() == "DESC":
                return query.order_by(desc(sort_field))
            else:
                return query.order_by(asc(sort_field))


# --- Turso (libSQL) implementations ---------------------------------------

# Aggregate expressions reused for HAVING-based count filters.
_AGG_EXPR = {
    "japa_count": "COALESCE(SUM(sa.japa_count), 0)",
    "pranayama_count": "COALESCE(SUM(sa.pranayama_count), 0)",
    "darshan_count": "COALESCE(SUM(sa.darshan_count), 0)",
    "total_activities": "COALESCE(SUM(sa.japa_count + sa.pranayama_count + sa.darshan_count), 0)",
}

# Whitelist of sortable output columns (alias -> column expression in outer query).
_SORT_COLUMNS = {
    "username": "username",
    "total_japa": "total_japa",
    "total_pranayama": "total_pranayama",
    "total_darshan": "total_darshan",
    "total_activities": "total_activities",
    "active_days": "active_days",
    "last_activity_at": "last_activity_at",
}


async def _get_all_users_spiritual_stats_turso(
    filter_by: Optional[str],
    filter_value: Optional[str],
    sort_by: str,
    sort_order: str,
    limit: int,
    offset: int,
) -> List[Dict[str, Any]]:
    from app import turso

    where_clauses: List[str] = []
    having_clauses: List[str] = []
    params: List[Any] = []

    if filter_by and filter_value:
        if filter_by == "username":
            where_clauses.append("u.username LIKE ?")
            params.append(f"%{filter_value}%")
        elif filter_by in _AGG_EXPR:
            expr = _AGG_EXPR[filter_by]
            if ":" in filter_value:
                op, raw = filter_value.split(":", 1)
                val = int(raw)
                if op == "min":
                    having_clauses.append(f"{expr} >= ?")
                    params.append(val)
                elif op == "max":
                    having_clauses.append(f"{expr} <= ?")
                    params.append(val)
            else:
                having_clauses.append(f"{expr} = ?")
                params.append(int(filter_value))

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    having_sql = f"HAVING {' AND '.join(having_clauses)}" if having_clauses else ""

    sort_col = _SORT_COLUMNS.get(sort_by, "total_activities")
    direction = "DESC" if str(sort_order).upper() == "DESC" else "ASC"

    inner = f"""
        SELECT
            u.id AS user_id,
            u.username,
            u.email,
            u.full_name,
            u.is_active,
            u.is_admin,
            u.created_at AS user_created_at,
            COALESCE(SUM(sa.japa_count), 0) AS total_japa,
            COALESCE(SUM(sa.pranayama_count), 0) AS total_pranayama,
            COALESCE(SUM(sa.darshan_count), 0) AS total_darshan,
            COALESCE(SUM(sa.japa_count + sa.pranayama_count + sa.darshan_count), 0) AS total_activities,
            COUNT(DISTINCT sa.activity_date) AS active_days,
            MAX(sa.japa_last_updated) AS j_max,
            MAX(sa.pranayama_last_updated) AS p_max,
            MAX(sa.darshan_last_updated) AS d_max
        FROM users u
        LEFT JOIN spiritual_activity sa ON u.id = sa.user_id
        {where_sql}
        GROUP BY u.id
        {having_sql}
    """

    sql = f"""
        SELECT
            user_id, username, email, full_name, is_active, is_admin, user_created_at,
            total_japa, total_pranayama, total_darshan, total_activities, active_days,
            NULLIF(MAX(COALESCE(j_max, ''), COALESCE(p_max, ''), COALESCE(d_max, '')), '') AS last_activity_at
        FROM ({inner})
        ORDER BY {sort_col} {direction}
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])

    rows = await turso.fetch_all(sql, params)

    users_stats = []
    for row in rows:
        users_stats.append(
            {
                "user_id": str(row["user_id"]),
                "username": row["username"],
                "email": row["email"],
                "full_name": row["full_name"],
                "is_active": bool(row["is_active"]),
                "is_admin": bool(row["is_admin"]),
                "user_created_at": row["user_created_at"],
                "total_japa": row["total_japa"],
                "total_pranayama": row["total_pranayama"],
                "total_darshan": row["total_darshan"],
                "total_activities": row["total_activities"],
                "active_days": row["active_days"],
                "last_activity_at": row["last_activity_at"],
            }
        )

    return users_stats
