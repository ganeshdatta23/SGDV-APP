from fastapi import APIRouter, Depends, HTTPException
from app.config import settings
from app.database import get_session
from app.services.auth_service import create_access_token
from app.schemas.google_auth import GoogleTokenRequest, GoogleAuthResponse
import httpx
import uuid

router = APIRouter()


@router.post("/google", response_model=GoogleAuthResponse)
async def google_auth(request: GoogleTokenRequest, db=Depends(get_session)):
    """
    Authenticate user with Google OAuth token.
    Creates new user if doesn't exist.
    """
    try:
        # Verify Google token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={request.token}"
            )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google token")

        google_user = response.json()
        email = google_user.get("email")
        name = google_user.get("name", "")

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")

        if settings.use_turso:
            from app import turso

            user = await turso.fetch_one(
                "SELECT id, email, username, full_name, is_admin "
                "FROM users WHERE email = ?",
                [email],
            )
            if not user:
                username = email.split("@")[0] + "_" + str(uuid.uuid4())[:8]
                new_user_id = turso.new_id()
                await turso.execute(
                    "INSERT INTO users "
                    "(id, email, username, password_hash, full_name, is_admin, is_active) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [new_user_id, email, username, "google_oauth", name, 0, 1],
                )
                user = await turso.fetch_one(
                    "SELECT id, email, username, full_name, is_admin "
                    "FROM users WHERE id = ?",
                    [new_user_id],
                )
        else:
            from sqlalchemy import select
            from app.models.user import User

            # Check if user exists
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar()

            if not user:
                # Create new user
                username = email.split("@")[0] + "_" + str(uuid.uuid4())[:8]
                user = User(
                    email=email,
                    username=username,
                    password_hash="google_oauth",  # Placeholder
                    full_name=name,
                    is_admin=False,
                    is_active=True,
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)

        # Create access token
        access_token = create_access_token(subject=user["email"] if isinstance(user, dict) else user.email)

        return GoogleAuthResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": str(user["id"]) if isinstance(user, dict) else str(user.id),
                "email": user["email"] if isinstance(user, dict) else user.email,
                "username": user["username"] if isinstance(user, dict) else user.username,
                "full_name": user["full_name"] if isinstance(user, dict) else user.full_name,
                "is_admin": user["is_admin"] if isinstance(user, dict) else user.is_admin,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")
