from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.auth import UserRegister, UserLogin, Token
from app.schemas.user import UserOut
from app.database import get_session
from app.services import auth_service

router = APIRouter()

@router.post('/register', response_model=UserOut)
async def register(payload: UserRegister, db=Depends(get_session)) -> UserOut:
    """Register a new user."""
    try:
        user = await auth_service.register_user(
            db, payload.email, payload.username, payload.password, payload.full_name
        )
        return UserOut.model_validate(user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post('/login', response_model=Token)
async def login(payload: UserLogin, db=Depends(get_session)) -> Token:
    """Login a user and return access token."""
    try:
        auth = await auth_service.authenticate_user(db, payload.email, payload.password)
        if not auth:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid credentials"
            )
        return Token(access_token=auth['access_token'], token_type="bearer")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Login failed")

@router.post('/token', response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db=Depends(get_session)
) -> Token:
    """
    OAuth2 compatible token endpoint for Swagger UI.
    
    Use email as username field.
    Accepts form data: username (email) and password
    """
    import logging
    logger = logging.getLogger("uvicorn.error")
    
    try:
        logger.info(f"Token request for: {form_data.username}")
        
        # OAuth2PasswordRequestForm uses 'username' field, we treat it as email
        auth = await auth_service.authenticate_user(db, form_data.username, form_data.password)
        
        if not auth:
            logger.warning(f"Authentication failed for: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Token generated successfully for: {form_data.username}")
        return Token(access_token=auth['access_token'], token_type="bearer")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")
