import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config import settings
from typing import Optional, Tuple
import re

def get_password_hash(password: str) -> str:
    """Hash a password using PBKDF2 with SHA256."""
    try:
        if not password:
            raise ValueError("Password cannot be empty")
        salt = secrets.token_bytes(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return salt.hex() + password_hash.hex()
    except UnicodeEncodeError:
        raise ValueError("Password contains invalid characters")
    except Exception as e:
        raise ValueError(f"Failed to hash password: {str(e)}")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        if not plain_password or not hashed_password:
            return False
        if len(hashed_password) < 32:
            return False
        salt = bytes.fromhex(hashed_password[:32])
        stored_hash = hashed_password[32:]
        password_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return password_hash.hex() == stored_hash
    except (ValueError, IndexError, UnicodeEncodeError):
        return False

def create_access_token(subject: str, expires_delta: int = 24*3600) -> str:
    """Create a JWT access token."""
    try:
        if not subject:
            raise ValueError("Subject cannot be empty")
        to_encode = {"sub": str(subject)}
        expire = datetime.now(timezone.utc) + timedelta(seconds=expires_delta)
        to_encode["exp"] = str(int(expire.timestamp()))
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
        return encoded_jwt
    except Exception as e:
        raise ValueError(f"Failed to create access token: {str(e)}")

def extract_coordinates_from_google_maps_url(url: str) -> Optional[Tuple[float, float]]:
    """
    Extract latitude and longitude from Google Maps URL.
    Supports multiple Google Maps URL formats:
    - https://www.google.com/maps?q=40.7128,-74.0060
    - https://www.google.com/maps/place/40.7128,-74.0060
    - https://maps.google.com/?q=40.7128,-74.0060
    - https://goo.gl/maps/... (short URL format)
    - https://www.google.com/maps/place/Empire+State+Building/@40.7128,-74.0060
    
    Returns:
        Tuple[float, float]: (latitude, longitude) or None if extraction fails
    """
    try:
        # Pattern 1: q=lat,lon or @lat,lon
        match = re.search(r'[?@](-?\d+\.\d+),(-?\d+\.\d+)', url)
        if match:
            lat = float(match.group(1))
            lon = float(match.group(2))
            # Validate coordinates
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return (lat, lon)
        
        # Pattern 2: /place/coordinates format
        match = re.search(r'/place/.*?@(-?\d+\.\d+),(-?\d+\.\d+)', url)
        if match:
            lat = float(match.group(1))
            lon = float(match.group(2))
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return (lat, lon)
        
        return None
    except (ValueError, AttributeError, IndexError):
        return None
