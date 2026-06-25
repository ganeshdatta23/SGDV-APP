"""Authentication dependencies for FastAPI endpoints."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, OAuth2PasswordBearer
from jose import jwt, JWTError
from app.config import settings
from app.database import get_session
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:  # only for type hints — never imported at runtime on Turso
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.models.user import User

# Support both HTTPBearer and OAuth2PasswordBearer
security = HTTPBearer()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_session)
) -> User:
    """Get current authenticated user from JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if settings.use_turso:
        from app import turso

        user = await turso.fetch_one(
            "SELECT id, email, username, full_name, is_admin, is_active "
            "FROM users WHERE id = ?",
            [user_id],
        )
    else:
        from sqlalchemy import select
        from app.models.user import User

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify they are admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
