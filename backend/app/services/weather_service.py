import time
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException
from app.core.config import settings
from app.core.database import get_db_connection

# Open-Meteo Forecast Attribution and License
OPEN_METEO_ATTRIBUTION = {
    "source": "Open-Meteo",
    "text": "Weather data by Open-Meteo.com",
    "url": "https://open-meteo.com/",
    "license": "CC BY 4.0",
    "terms_url": "https://open-meteo.com/en/terms",
    "notice": "Meteorological forecast data provided by Open-Meteo. Replaces retired IMD weather adapter."
}

# WMO Weather Interpretation Codes (WW)
WMO_CODE_MAP: Dict[int, Dict[str, str]] = {
    0: {"description": "Clear sky", "icon": "Sun"},
    1: {"description": "Mainly clear", "icon": "Sun"},
    2: {"description": "Partly cloudy", "icon": "CloudSun"},
    3: {"description": "Overcast", "icon": "Cloud"},
    45: {"description": "Fog", "icon": "CloudFog"},
    48: {"description": "Depositing rime fog", "icon": "CloudFog"},
    51: {"description": "Light drizzle", "icon": "CloudDrizzle"},
    53: {"description": "Moderate drizzle", "icon": "CloudDrizzle"},
    55: {"description": "Dense drizzle", "icon": "CloudDrizzle"},
    56: {"description": "Light freezing drizzle", "icon": "CloudSnow"},
    57: {"description": "Dense freezing drizzle", "icon": "CloudSnow"},
    61: {"description": "Slight rain", "icon": "CloudRain"},
    63: {"description": "Moderate rain", "icon": "CloudRain"},
    65: {"description": "Heavy rain", "icon": "CloudRain"},
    66: {"description": "Light freezing rain", "icon": "CloudSnow"},
    67: {"description": "Heavy freezing rain", "icon": "CloudSnow"},
    71: {"description": "Slight snow fall", "icon": "Snowflake"},
    73: {"description": "Moderate snow fall", "icon": "Snowflake"},
    75: {"description": "Heavy snow fall", "icon": "Snowflake"},
    77: {"description": "Snow grains", "icon": "Snowflake"},
    80: {"description": "Slight rain showers", "icon": "CloudRain"},
    81: {"description": "Moderate rain showers", "icon": "CloudRain"},
    82: {"description": "Violent rain showers", "icon": "CloudLightning"},
    85: {"description": "Slight snow showers", "icon": "Snowflake"},
    86: {"description": "Heavy snow showers", "icon": "Snowflake"},
    95: {"description": "Thunderstorm", "icon": "CloudLightning"},
    96: {"description": "Thunderstorm with slight hail", "icon": "CloudLightning"},
    99: {"description": "Thunderstorm with heavy hail", "icon": "CloudLightning"},
}

def get_weather_description(code: Optional[int]) -> Tuple[str, str]:
    if code is None or code not in WMO_CODE_MAP:
        return "Unknown atmospheric condition", "Cloud"
    entry = WMO_CODE_MAP[code]
    return entry["description"], entry["icon"]

# Default preset operational disaster command locations
PRESET_LOCATIONS: List[Dict[str, Any]] = [
    {
        "id": "loc-mumbai",
        "name": "Mumbai Operations Command (Maharashtra)",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "zone": "Coastal Western Command",
    },
    {
        "id": "loc-guwahati",
        "name": "Guwahati - Brahmaputra Basin (Assam)",
        "latitude": 26.1445,
        "longitude": 91.7362,
        "zone": "North-Eastern River Basin",
    },
    {
        "id": "loc-kurla",
        "name": "Kurla - Mithi River Drainage (Mumbai)",
        "latitude": 19.0728,
        "longitude": 72.8826,
        "zone": "Urban Inundation Zone",
    },
    {
        "id": "loc-periyar",
        "name": "Periyar Dam Reservoir (Kerala)",
        "latitude": 9.5298,
        "longitude": 77.1428,
        "zone": "High-Altitude Dam Catchment",
    },
    {
        "id": "loc-delhi",
        "name": "Delhi Headquarters (NCR)",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "zone": "Northern Plain Command",
    },
    {
        "id": "loc-chennai",
        "name": "Chennai Coastal Zone (Tamil Nadu)",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "zone": "Coromandel Cyclone Belt",
    },
    {
        "id": "loc-kolkata",
        "name": "Kolkata Delta Watch (West Bengal)",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "zone": "Sundarbans Delta Fringe",
    },
]

# Configured default weather location (persisted in memory, initialized from settings)
_configured_location: Dict[str, Any] = {
    "latitude": settings.DEFAULT_WEATHER_LATITUDE,
    "longitude": settings.DEFAULT_WEATHER_LONGITUDE,
    "location_name": settings.DEFAULT_WEATHER_LOCATION_NAME,
}

# In-memory weather cache: key -> (monotonic_time, payload)
_weather_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}

def get_configured_location() -> Dict[str, Any]:
    return dict(_configured_location)

def set_configured_location(latitude: float, longitude: float, location_name: str) -> Dict[str, Any]:
    validate_coordinates(latitude, longitude)
    _configured_location["latitude"] = float(latitude)
    _configured_location["longitude"] = float(longitude)
    _configured_location["location_name"] = location_name.strip()
    return dict(_configured_location)

def validate_coordinates(latitude: float, longitude: float) -> None:
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        raise HTTPException(status_code=400, detail="Latitude and longitude must be valid floating-point numbers.")
    if latitude < -90.0 or latitude > 90.0:
        raise HTTPException(status_code=400, detail=f"Invalid latitude {latitude}. Latitude must be between -90.0 and +90.0 degrees.")
    if longitude < -180.0 or longitude > 180.0:
        raise HTTPException(status_code=400, detail=f"Invalid longitude {longitude}. Longitude must be between -180.0 and +180.0 degrees.")

def _cache_key(lat: float, lon: float) -> str:
    return f"{round(lat, 3)}_{round(lon, 3)}"

async def fetch_open_meteo_forecast(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    force_refresh: bool = False,
    client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    """
    Fetches real meteorological weather and forecast from Open-Meteo API using HTTPX.
    Includes timeout handling, coordinate validation, in-memory caching, units,
    and Open-Meteo source attribution (CC BY 4.0).
    Never manufactures fake or synthetic weather data.
    """
    lat = float(_configured_location["latitude"] if latitude is None else latitude)
    lon = float(_configured_location["longitude"] if longitude is None else longitude)
    loc_name = location_name.strip() if location_name else _configured_location["location_name"]

    validate_coordinates(lat, lon)
    key = _cache_key(lat, lon)

    # Check cache unless force_refresh is requested
    ttl = settings.WEATHER_CACHE_TTL_SECONDS
    now_mono = time.monotonic()
    if not force_refresh and key in _weather_cache:
        cached_time, cached_data = _weather_cache[key]
        if now_mono - cached_time < ttl:
            out = dict(cached_data)
            out["cached"] = True
            out["location_name"] = loc_name
            return out

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
            "surface_pressure",
        ],
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation_probability",
            "precipitation",
            "wind_speed_10m",
            "weather_code",
        ],
        "daily": [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "wind_speed_10m_max",
        ],
        "timezone": "auto",
        "forecast_days": 7
    }

    try:
        timeout = httpx.Timeout(10.0, connect=5.0)
        should_close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=timeout)
            should_close_client = True

        try:
            resp = await client.get(settings.OPEN_METEO_API_URL, params=params)
        finally:
            if should_close_client:
                await client.aclose()

        if resp.status_code != 200:
            err_detail = f"Open-Meteo API returned HTTP {resp.status_code}: {resp.text}"
            raise HTTPException(status_code=502, detail=err_detail)

        raw = resp.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Open-Meteo weather API request timed out after 10.0 seconds. Weather data is temporarily unavailable."
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Open-Meteo weather API request failed: {str(exc)}"
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error while processing Open-Meteo weather data: {str(exc)}"
        )

    # Parse and structure the response
    current_raw = raw.get("current", {})
    current_units = raw.get("current_units", {})
    w_code = current_raw.get("weather_code")
    desc, icon = get_weather_description(w_code)

    current_data = {
        "time": current_raw.get("time", datetime.now(timezone.utc).isoformat()),
        "temperature": current_raw.get("temperature_2m"),
        "temperature_unit": current_units.get("temperature_2m", "°C"),
        "relative_humidity": current_raw.get("relative_humidity_2m"),
        "relative_humidity_unit": current_units.get("relative_humidity_2m", "%"),
        "apparent_temperature": current_raw.get("apparent_temperature"),
        "apparent_temperature_unit": current_units.get("apparent_temperature", "°C"),
        "precipitation": current_raw.get("precipitation"),
        "precipitation_unit": current_units.get("precipitation", "mm"),
        "wind_speed": current_raw.get("wind_speed_10m"),
        "wind_speed_unit": current_units.get("wind_speed_10m", "km/h"),
        "wind_direction": current_raw.get("wind_direction_10m"),
        "wind_direction_unit": current_units.get("wind_direction_10m", "°"),
        "surface_pressure": current_raw.get("surface_pressure"),
        "surface_pressure_unit": current_units.get("surface_pressure", "hPa"),
        "weather_code": w_code,
        "weather_description": desc,
        "icon": icon,
    }

    # Format next 24 hourly forecast points
    hourly_raw = raw.get("hourly", {})
    hourly_times = hourly_raw.get("time", [])
    hourly_points: List[Dict[str, Any]] = []
    max_hourly = min(24, len(hourly_times))
    for i in range(max_hourly):
        h_code = hourly_raw.get("weather_code", [None])[i] if i < len(hourly_raw.get("weather_code", [])) else None
        h_desc, h_icon = get_weather_description(h_code)
        hourly_points.append({
            "time": hourly_times[i],
            "temperature": hourly_raw.get("temperature_2m", [None])[i] if i < len(hourly_raw.get("temperature_2m", [])) else None,
            "relative_humidity": hourly_raw.get("relative_humidity_2m", [None])[i] if i < len(hourly_raw.get("relative_humidity_2m", [])) else None,
            "precipitation_probability": hourly_raw.get("precipitation_probability", [0])[i] if i < len(hourly_raw.get("precipitation_probability", [])) else 0,
            "precipitation": hourly_raw.get("precipitation", [0])[i] if i < len(hourly_raw.get("precipitation", [])) else 0,
            "wind_speed": hourly_raw.get("wind_speed_10m", [None])[i] if i < len(hourly_raw.get("wind_speed_10m", [])) else None,
            "weather_code": h_code,
            "weather_description": h_desc,
            "icon": h_icon,
        })

    # Format 7 daily forecast points
    daily_raw = raw.get("daily", {})
    daily_times = daily_raw.get("time", [])
    daily_points: List[Dict[str, Any]] = []
    for i in range(len(daily_times)):
        d_code = daily_raw.get("weather_code", [None])[i] if i < len(daily_raw.get("weather_code", [])) else None
        d_desc, d_icon = get_weather_description(d_code)
        daily_points.append({
            "date": daily_times[i],
            "weather_code": d_code,
            "weather_description": d_desc,
            "temperature_max": daily_raw.get("temperature_2m_max", [None])[i] if i < len(daily_raw.get("temperature_2m_max", [])) else None,
            "temperature_min": daily_raw.get("temperature_2m_min", [None])[i] if i < len(daily_raw.get("temperature_2m_min", [])) else None,
            "precipitation_sum": daily_raw.get("precipitation_sum", [0])[i] if i < len(daily_raw.get("precipitation_sum", [])) else 0,
            "precipitation_probability_max": daily_raw.get("precipitation_probability_max", [0])[i] if i < len(daily_raw.get("precipitation_probability_max", [])) else 0,
            "wind_speed_max": daily_raw.get("wind_speed_10m_max", [None])[i] if i < len(daily_raw.get("wind_speed_10m_max", [])) else None,
            "icon": d_icon,
        })

    result = {
        "location_name": loc_name,
        "latitude": raw.get("latitude", lat),
        "longitude": raw.get("longitude", lon),
        "elevation": raw.get("elevation"),
        "timezone": raw.get("timezone", "UTC"),
        "timezone_abbreviation": raw.get("timezone_abbreviation"),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "cached": False,
        "current": current_data,
        "hourly": hourly_points,
        "daily": daily_points,
        "attribution": OPEN_METEO_ATTRIBUTION,
    }

    # Store in memory cache
    _weather_cache[key] = (now_mono, result)
    return result

async def sync_open_meteo() -> Dict[str, Any]:
    """
    Refreshes Open-Meteo forecast data for the configured operations hub,
    and updates the database data_source_status table for OPEN_METEO.
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        weather_data = await fetch_open_meteo_forecast(force_refresh=True)
        total_data_points = 1 + len(weather_data.get("hourly", [])) + len(weather_data.get("daily", []))
        location = weather_data.get("location_name", "Configured Operations Command")
        details = f"Open-Meteo forecast active for {location} ({weather_data['latitude']}°N, {weather_data['longitude']}°E) under CC BY 4.0."

        cursor.execute("""
            INSERT INTO data_source_status (id, name, status, last_successful_fetch, last_error, records_count, details, updated_at)
            VALUES (?, 'OPEN_METEO', 'CONNECTED', ?, NULL, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
            status = 'CONNECTED',
            last_successful_fetch = excluded.last_successful_fetch,
            last_error = NULL,
            records_count = excluded.records_count,
            details = excluded.details,
            updated_at = excluded.updated_at;
        """, (
            str(time.time()),
            now,
            total_data_points,
            details,
            now
        ))
        conn.commit()
        conn.close()

        return {
            "status": "success",
            "message": f"Successfully synchronized Open-Meteo forecast ({total_data_points} data points ingested).",
            "records_imported": total_data_points,
            "location": location,
            "attribution": OPEN_METEO_ATTRIBUTION["text"],
            "url": OPEN_METEO_ATTRIBUTION["url"],
            "license": OPEN_METEO_ATTRIBUTION["license"]
        }

    except HTTPException as e:
        err = f"Open-Meteo forecast error: {e.detail}"
        cursor.execute("""
            INSERT INTO data_source_status (id, name, status, last_successful_fetch, last_error, records_count, details, updated_at)
            VALUES (?, 'OPEN_METEO', 'ERROR', NULL, ?, 0, 'Open-Meteo API connection failed', ?)
            ON CONFLICT(name) DO UPDATE SET
            status = 'ERROR',
            last_error = excluded.last_error,
            updated_at = excluded.updated_at;
        """, (str(time.time()), err, now))
        conn.commit()
        conn.close()
        return {
            "status": "error",
            "message": err,
            "records_imported": 0
        }
    except Exception as e:
        err = f"Failed to sync Open-Meteo: {str(e)}"
        cursor.execute("""
            INSERT INTO data_source_status (id, name, status, last_successful_fetch, last_error, records_count, details, updated_at)
            VALUES (?, 'OPEN_METEO', 'ERROR', NULL, ?, 0, 'Open-Meteo API connection failed', ?)
            ON CONFLICT(name) DO UPDATE SET
            status = 'ERROR',
            last_error = excluded.last_error,
            updated_at = excluded.updated_at;
        """, (str(time.time()), err, now))
        conn.commit()
        conn.close()
        return {
            "status": "error",
            "message": err,
            "records_imported": 0
        }
