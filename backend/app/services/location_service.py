from __future__ import annotations

from typing import List, TYPE_CHECKING
from datetime import datetime
from fastapi import HTTPException
from app.config import settings
from app.schemas.location import LocationResult, LocationUpdateResponse
from app.utils.security import extract_coordinates_from_google_maps_url
from app.utils.sun_times import calculate_sun_times
import uuid
import logging

if TYPE_CHECKING:  # type hints only; SQLAlchemy/ORM unused on the Turso path
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class LocationService:
    """Service for handling location business logic."""

    @staticmethod
    async def get_all_locations(db: AsyncSession) -> List[LocationResult]:
        """Get all available locations from database with sun times."""
        if settings.use_turso:
            return await _get_all_locations_turso()

        from sqlalchemy import select
        from app.models.location import SavedLocation

        # Fetch all locations from saved_locations table
        query = select(SavedLocation).order_by(SavedLocation.created_at.desc())

        result = await db.execute(query)
        locations = result.scalars().all()

        # Convert to response format with sun times
        results = []
        for location in locations:
            # Calculate sun times based on location's created_at time
            sun_times = calculate_sun_times(
                latitude=float(location.latitude),  # type: ignore
                longitude=float(location.longitude),  # type: ignore
                date_time=location.created_at,
            )

            results.append(
                LocationResult(
                    name=location.name,  # type: ignore
                    latitude=float(location.latitude),  # type: ignore
                    longitude=float(location.longitude),  # type: ignore
                    sunrise=sun_times["sunrise"],
                    sunset=sun_times["sunset"],
                )
            )

        return results

    @staticmethod
    async def create_location(
        db: AsyncSession,
        name: str,
        google_maps_url: str,
        description: str,
        admin_username: str,
    ) -> LocationUpdateResponse:
        """
        Create a new location from Google Maps URL.
        Deletes all old locations (keeps only the latest).
        """
        if settings.use_turso:
            return await _create_location_turso(
                name, google_maps_url, description, admin_username
            )

        from sqlalchemy import select
        from app.models.location import SavedLocation

        # Extract coordinates from Google Maps URL
        coordinates = extract_coordinates_from_google_maps_url(google_maps_url)

        if coordinates is None:
            raise HTTPException(
                status_code=400,
                detail="Invalid Google Maps URL. Could not extract coordinates.",
            )

        latitude, longitude = coordinates

        # Create new location entry
        location = SavedLocation(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            latitude=latitude,
            longitude=longitude,
            is_global=True,
        )

        db.add(location)
        await db.commit()
        await db.refresh(location)

        # Delete all old location records (keep only the latest one)
        delete_query = select(SavedLocation).where(SavedLocation.id != location.id)
        result = await db.execute(delete_query)
        old_locations = result.scalars().all()

        for old_location in old_locations:
            await db.delete(old_location)

        await db.commit()

        logger.info(
            f"Location '{name}' created by admin {admin_username}. Deleted {len(old_locations)} old locations."
        )

        return LocationUpdateResponse(
            id=str(location.id),
            name=location.name,  # type: ignore
            description=location.description,  # type: ignore
            latitude=float(location.latitude),  # type: ignore
            longitude=float(location.longitude),  # type: ignore
            is_global=location.is_global,  # type: ignore
            message=f"Location '{location.name}' created successfully. Old records deleted by admin {admin_username}",
        )


# --- Turso (libSQL) implementations ---------------------------------------


def _parse_dt(value):
    """Parse a SQLite text timestamp into a datetime (or None if not parseable)."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        try:
            return datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return None


async def _get_all_locations_turso() -> List[LocationResult]:
    from app import turso

    rows = await turso.fetch_all(
        "SELECT name, latitude, longitude, created_at "
        "FROM saved_locations ORDER BY created_at DESC"
    )

    results = []
    for loc in rows:
        sun_times = calculate_sun_times(
            latitude=float(loc["latitude"]),
            longitude=float(loc["longitude"]),
            date_time=_parse_dt(loc["created_at"]),
        )
        results.append(
            LocationResult(
                name=loc["name"],
                latitude=float(loc["latitude"]),
                longitude=float(loc["longitude"]),
                sunrise=sun_times["sunrise"],
                sunset=sun_times["sunset"],
            )
        )
    return results


async def _create_location_turso(
    name: str, google_maps_url: str, description: str, admin_username: str
) -> LocationUpdateResponse:
    from app import turso

    coordinates = extract_coordinates_from_google_maps_url(google_maps_url)
    if coordinates is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid Google Maps URL. Could not extract coordinates.",
        )

    latitude, longitude = coordinates
    location_id = turso.new_id()

    # Insert the new location, then drop every older record (keep only latest).
    await turso.execute(
        "INSERT INTO saved_locations "
        "(id, name, description, latitude, longitude, is_global, created_at) "
        "VALUES (?, ?, ?, ?, ?, 1, ?)",
        [location_id, name, description, latitude, longitude, turso.now_iso()],
    )
    rs = await turso.execute(
        "DELETE FROM saved_locations WHERE id != ?", [location_id]
    )
    deleted = getattr(rs, "rows_affected", 0) or 0

    logger.info(
        f"Location '{name}' created by admin {admin_username}. Deleted {deleted} old locations."
    )

    return LocationUpdateResponse(
        id=location_id,
        name=name,
        description=description,
        latitude=float(latitude),
        longitude=float(longitude),
        is_global=True,
        message=f"Location '{name}' created successfully. Old records deleted by admin {admin_username}",
    )
