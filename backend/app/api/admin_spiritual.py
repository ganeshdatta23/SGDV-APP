from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.database import get_session
from app.utils.auth_dependency import get_admin_user
from app.services.admin_service import AdminService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/spiritual-stats")
async def get_all_spiritual_stats(
    db=Depends(get_session),
    current_user=Depends(get_admin_user),
    # Filters
    filter_by: Optional[str] = Query(
        None,
        description="Filter field: 'username', 'japa_count', 'pranayama_count', 'darshan_count', 'total_activities'",
    ),
    filter_value: Optional[str] = Query(
        None,
        description="Filter value. For count filters use: 'min:100' or 'max:50' or '100'",
    ),
    sort_by: Optional[str] = Query(
        "total_activities",
        description="Sort by field: 'total_activities', 'total_japa', 'username', 'last_activity_at'",
    ),
    sort_order: Optional[str] = Query("DESC", description="'ASC' or 'DESC'"),
    limit: int = Query(50, ge=1, le=500, description="Max results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    Get all users' spiritual statistics with optional filtering.

    **Admin only endpoint**

    Filters:
    - `filter_by=username&filter_value=gane` - Search by username (contains)
    - `filter_by=japa_count&filter_value=min:100` - Min japa count
    - `filter_by=japa_count&filter_value=max:50` - Max japa count
    - `filter_by=total_activities&filter_value=min:50&sort_by=total_activities&sort_order=DESC`

    Examples:
    ```
    GET /sgvd/admin/spiritual-stats?filter_by=username&filter_value=gane
    GET /sgvd/admin/spiritual-stats?filter_by=japa_count&filter_value=min:100&sort_by=total_japa&sort_order=DESC
    GET /sgvd/admin/spiritual-stats?sort_by=last_activity_at&limit=100
    ```
    """
    users_stats = await AdminService.get_all_users_spiritual_stats(
        db=db,
        filter_by=filter_by,
        filter_value=filter_value,
        sort_by=sort_by or "total_activities",
        sort_order=sort_order or "DESC",
        limit=limit,
        offset=offset,
    )

    return {
        "users": users_stats,
        "count": len(users_stats),
        "limit": limit,
        "offset": offset,
    }


@router.get("/spiritual-stats/{user_id}")
async def get_user_spiritual_detail(
    user_id: str,
    db=Depends(get_session),
    current_user=Depends(get_admin_user),
):
    """
    Get detailed spiritual activity for a specific user (admin view).

    Includes daily breakdown and all timestamps.
    """
    from app.services.spiritual_service import SpiritualService

    # Validate and get user
    user_uuid, _ = await SpiritualService.get_user(db, user_id)

    # Get user stats
    stats = await SpiritualService.get_user_statistics(db, user_uuid)

    return stats
