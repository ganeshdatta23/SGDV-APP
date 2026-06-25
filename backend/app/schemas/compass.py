from pydantic import BaseModel


class BearingRequest(BaseModel):
    current_lat: float
    current_lon: float


class BearingResponse(BaseModel):
    bearing: float
    distance_km: float
    target_lat: float
    target_lon: float
