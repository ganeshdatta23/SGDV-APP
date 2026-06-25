from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.database import get_session
from app.schemas.compass import BearingRequest, BearingResponse
import math

router = APIRouter()


@router.post("/bearing", response_model=BearingResponse)
async def bearing(req: BearingRequest, db=Depends(get_session)):
    """
    Calculate bearing and distance to the location in saved_location table.

    Parameters:
    - current_lat: Current latitude
    - current_lon: Current longitude

    The target coordinates are automatically fetched from the latest saved location.
    """
    try:
        # Fetch the latest location from saved_locations table
        if settings.use_turso:
            from app import turso

            location = await turso.fetch_one(
                "SELECT latitude, longitude FROM saved_locations "
                "ORDER BY created_at DESC LIMIT 1"
            )
        else:
            from sqlalchemy import select
            from app.models.location import SavedLocation

            query = select(SavedLocation).order_by(SavedLocation.created_at.desc())
            result = await db.execute(query)
            location = result.scalars().first()

        if not location:
            raise HTTPException(
                status_code=404,
                detail="No location found in database. Please add a location first.",
            )

        target_lat = float(location.latitude)
        target_lon = float(location.longitude)

        # Haversine distance
        R = 6371.0
        lat1 = math.radians(req.current_lat)
        lon1 = math.radians(req.current_lon)
        lat2 = math.radians(target_lat)
        lon2 = math.radians(target_lon)

        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c

        # Bearing
        y = math.sin(dlon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(
            lat2
        ) * math.cos(dlon)
        brng = math.degrees(math.atan2(y, x))
        brng = (brng + 360) % 360

        return {
            "bearing": brng,
            "distance_km": distance,
            "target_lat": target_lat,
            "target_lon": target_lon,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating bearing: {str(e)}"
        )
