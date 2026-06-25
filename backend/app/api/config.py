from fastapi import APIRouter, Depends, HTTPException
from app.database import get_session
from app.schemas.config import AppConfigOut, AppConfigUpdate
from app.services import config_service
from app.utils.auth_dependency import get_admin_user

router = APIRouter()


@router.get("/app", response_model=AppConfigOut)
async def get_app_config(db=Depends(get_session)) -> AppConfigOut:
    """
    Get current app configuration (version and expiry date).

    This endpoint is publicly accessible and returns the current app version
    and expiry date if set.
    """
    try:
        config = await config_service.get_app_config(db)
        return AppConfigOut.model_validate(config)
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to retrieve app configuration"
        )


@router.put("/app", response_model=AppConfigOut)
async def update_app_config(
    payload: AppConfigUpdate,
    db=Depends(get_session),
    admin=Depends(get_admin_user),
) -> AppConfigOut:
    """
    Update app configuration (admin only).

    This endpoint requires admin authentication and allows updating:
    - app_version: The current version of the app
    - expiry_date: Optional expiry date for the app

    Only provided fields will be updated.
    """
    try:
        config = await config_service.update_app_config(
            db, app_version=payload.app_version, expiry_date=payload.expiry_date
        )
        return AppConfigOut.model_validate(config)
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to update app configuration"
        )
