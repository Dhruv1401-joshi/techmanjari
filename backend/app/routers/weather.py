from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional
from app.models.schemas import (
    WeatherForecastResponse,
    WeatherLocationsResponse,
    WeatherLocationPreset,
    ConfiguredLocationUpdate
)
from app.services.weather_service import (
    fetch_open_meteo_forecast,
    get_configured_location,
    set_configured_location,
    PRESET_LOCATIONS
)

router = APIRouter(prefix="/weather", tags=["Weather (Open-Meteo)"])

@router.get("", response_model=WeatherForecastResponse)
async def get_weather(
    latitude: Optional[float] = Query(None, description="Target location latitude (-90 to +90)", ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, description="Target location longitude (-180 to +180)", ge=-180.0, le=180.0),
    location_name: Optional[str] = Query(None, description="Optional custom location label"),
    force_refresh: bool = Query(False, description="Bypass in-memory cache and force live Open-Meteo API query")
):
    """
    Fetches real-time atmospheric observations and 7-day multi-hazard forecast from Open-Meteo.
    Includes timeout handling, validation, caching, units, and CC BY 4.0 attribution.
    Falls back to project configured location if coordinates are omitted.
    Never invents or fabricates fake weather figures.
    """
    return await fetch_open_meteo_forecast(
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        force_refresh=force_refresh
    )

@router.get("/locations", response_model=WeatherLocationsResponse)
def get_weather_locations():
    """
    Returns available operational presets and the current active configured location.
    """
    curr = get_configured_location()
    return {
        "current_configured": {
            "name": curr["location_name"],
            "latitude": curr["latitude"],
            "longitude": curr["longitude"],
            "zone": "Active Default Location"
        },
        "presets": PRESET_LOCATIONS
    }

@router.post("/configured-location", status_code=status.HTTP_200_OK)
async def update_configured_location(payload: ConfiguredLocationUpdate):
    """
    Updates the project's configured weather location and fetches fresh forecast data for it.
    """
    updated = set_configured_location(
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_name=payload.location_name
    )
    # Fetch fresh weather for the new configured location
    fresh_weather = await fetch_open_meteo_forecast(
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_name=payload.location_name,
        force_refresh=True
    )
    return {
        "status": "success",
        "message": f"Configured default weather location updated to {payload.location_name}.",
        "configured": {
            "name": updated["location_name"],
            "latitude": updated["latitude"],
            "longitude": updated["longitude"],
            "zone": "Active Default Location"
        },
        "weather": fresh_weather
    }
