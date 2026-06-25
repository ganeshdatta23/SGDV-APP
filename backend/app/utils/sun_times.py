from datetime import datetime, timezone
from astral import LocationInfo
from astral.sun import sun

def calculate_sun_times(latitude, longitude, date_time=None):
    """Calculate sun times for given coordinates and date"""
    if date_time is None:
        date_time = datetime.now(timezone.utc)
    
    city = LocationInfo(latitude=latitude, longitude=longitude)
    s = sun(city.observer, date=date_time.date())

    return {
        "sunrise": s["sunrise"].astimezone(),
        "sunset": s["sunset"].astimezone(),
        "noon": s["noon"].astimezone(),
        "dawn": s["dawn"].astimezone(),
        "dusk": s["dusk"].astimezone()
    }