from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Union
import uuid

class UserOut(BaseModel):
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str]
    is_admin: bool

    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_string(cls, value: Union[str, uuid.UUID]) -> str:
        """Convert UUID objects to string representation."""
        if isinstance(value, uuid.UUID):
            return str(value)
        return value

    class Config:
        from_attributes = True
