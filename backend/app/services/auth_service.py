from __future__ import annotations

from app.config import settings
from app.utils.security import get_password_hash, verify_password, create_access_token
from fastapi import HTTPException
from typing import Optional, Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:  # type hints only; SQLAlchemy/ORM unused on the Turso path
    from app.models.user import User

async def register_user(db, email: str, username: str, password: str, full_name: Optional[str] = None) -> User:
    """Register a new user in the database."""
    if settings.use_turso:
        return await _register_user_turso(email, username, password, full_name)

    from sqlalchemy import select
    from sqlalchemy.exc import IntegrityError
    from app.models.user import User

    try:
        # Check if user already exists
        existing_user = await db.execute(select(User).where(User.email == email))
        if existing_user.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user = User(
            email=email, 
            username=username, 
            password_hash=get_password_hash(password), 
            full_name=full_name
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    except HTTPException:
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Email or username already exists")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Database error occurred")

async def authenticate_user(db, email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate a user and return access token if successful."""
    import logging
    logger = logging.getLogger("uvicorn.error")

    if settings.use_turso:
        return await _authenticate_user_turso(email, password, logger)

    from sqlalchemy import select
    from app.models.user import User

    try:
        logger.info(f"Authenticating user: {email}")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if not user:
            logger.warning(f"User not found: {email}")
            return None
        
        if not verify_password(password, user.password_hash):
            logger.warning(f"Invalid password for user: {email}")
            return None
        
        logger.info(f"User authenticated successfully: {email}")
        token = create_access_token(str(user.id))
        return {"user": user, "access_token": token}
    except Exception as e:
        logger.error(f"Authentication error for {email}: {str(e)}")
        return None


# --- Turso (libSQL) implementations ---------------------------------------

_USER_COLS = "id, email, username, full_name, is_admin, is_active"


async def _register_user_turso(
    email: str, username: str, password: str, full_name: Optional[str]
):
    from app import turso

    existing = await turso.fetch_one("SELECT id FROM users WHERE email = ?", [email])
    if existing is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = turso.new_id()
    try:
        await turso.execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, is_admin, is_active) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [user_id, email, username, get_password_hash(password), full_name, 0, 1],
        )
    except HTTPException:
        raise
    except Exception:
        # e.g. UNIQUE constraint on username/email
        raise HTTPException(
            status_code=400, detail="Email or username already exists"
        )

    return await turso.fetch_one(
        f"SELECT {_USER_COLS} FROM users WHERE id = ?", [user_id]
    )


async def _authenticate_user_turso(email: str, password: str, logger):
    from app import turso

    try:
        logger.info(f"Authenticating user: {email}")
        user = await turso.fetch_one(
            "SELECT id, email, username, full_name, is_admin, is_active, password_hash "
            "FROM users WHERE email = ?",
            [email],
        )
        if user is None:
            logger.warning(f"User not found: {email}")
            return None

        if not verify_password(password, user["password_hash"]):
            logger.warning(f"Invalid password for user: {email}")
            return None

        logger.info(f"User authenticated successfully: {email}")
        token = create_access_token(str(user["id"]))
        return {"user": user, "access_token": token}
    except Exception as e:
        logger.error(f"Authentication error for {email}: {str(e)}")
        return None
