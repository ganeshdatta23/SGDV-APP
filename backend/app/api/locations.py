from fastapi import APIRouter, Depends, HTTPException, Query
from app.config import settings
from app.database import get_session
from app.schemas.location import LocationSearchResponse, LocationUpdateResponse
from app.utils.auth_dependency import get_admin_user
from app.services.location_service import LocationService

router = APIRouter()


@router.get("", response_model=LocationSearchResponse)
async def get_locations(db=Depends(get_session)):
    """Get all available locations from database."""
    try:
        results = await LocationService.get_all_locations(db)
        return LocationSearchResponse(results=results)
    except Exception:
        raise HTTPException(status_code=500, detail="Error fetching locations")


@router.post("/update", response_model=LocationUpdateResponse)
async def update_location(
    name: str = Query(..., description="Location name"),
    google_maps_url: str = Query(
        ..., description="Google Maps URL to extract coordinates"
    ),
    description: str = Query(..., description="Location description"),
    db=Depends(get_session),
    admin_user=Depends(get_admin_user),
) -> LocationUpdateResponse:
    """
    Create or update location with coordinates from Google Maps URL.
    Requires admin authentication.

    Query Parameters:
    - name: Location name (mandatory)
    - google_maps_url: Google Maps URL to extract coordinates (mandatory)
    - description: Location description (mandatory)
    - is_global: Always set to true

    Supports Google Maps URL formats:
    - https://www.google.com/maps?q=40.7128,-74.0060
    - https://www.google.com/maps/place/40.7128,-74.0060
    - https://maps.google.com/?q=40.7128,-74.0060
    - https://www.google.com/maps/place/Empire+State+Building/@40.7128,-74.0060
    """
    try:
        return await LocationService.create_location(
            db=db,
            name=name,
            google_maps_url=google_maps_url,
            description=description,
            admin_username=admin_user.username,  # type: ignore
        )
    except HTTPException:
        if not settings.use_turso:
            await db.rollback()
        raise
    except Exception as e:
        if not settings.use_turso:
            await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error creating location: {str(e)}"
        )
