from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
