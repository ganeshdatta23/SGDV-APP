from pydantic import BaseModel


class GoogleTokenRequest(BaseModel):
    token: str


class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
