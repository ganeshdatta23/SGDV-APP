from fastapi import APIRouter, Depends, HTTPException
from app.schemas.user import UserOut
from app.config import settings
from app.database import get_session

router = APIRouter()


@router.get('/profile/{user_id}', response_model=UserOut)
async def get_profile(user_id: str, db=Depends(get_session)) -> UserOut:
    """Get user profile by ID."""
    try:
        if settings.use_turso:
            from app import turso

            user = await turso.fetch_one(
                "SELECT id, email, username, full_name, is_admin "
                "FROM users WHERE id = ?",
                [user_id],
            )
        else:
            from sqlalchemy import select
            from app.models.user import User

            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserOut.model_validate(user)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error retrieving profile")
