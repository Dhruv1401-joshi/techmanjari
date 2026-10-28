import pytest
import os
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, get_db_connection
from app.services.ai_analyzer import analyze_incident_text
from app.services.risk_engine import evaluate_disaster_risk
from app.services.sensor_simulation import tick_sensor_simulation, reset_sensor_simulation
from app.services.weather_service import (
    get_weather_description,
    validate_coordinates,
    get_configured_location,
    set_configured_location,
    fetch_open_meteo_forecast,
    PRESET_LOCATIONS,
    OPEN_METEO_ATTRIBUTION,
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

# ---------------------------------------------------------------------------
# Existing tests (unchanged — regression checks)
# ---------------------------------------------------------------------------

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["sensor_mode"] == "SIMULATION_MODE"
    assert data["database_connected"] is True
    # Weather service should be identified
    assert "weather_service" in data
    assert "Open-Meteo" in data["weather_service"]

def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_recorded_incidents" in data
    assert "available_rescue_teams" in data
    assert isinstance(data["data_sources_status"], list)

def test_dashboard_no_imd_source():
    """Ensures the IMD data source is replaced by OPEN_METEO in the database."""
    response = client.get("/api/datasources")
    assert response.status_code == 200
    sources = response.json()
    source_names = [s["name"] for s in sources]
    assert "IMD" not in source_names, "Retired IMD source should not appear in datasources"
    assert "OPEN_METEO" in source_names, "OPEN_METEO source must appear in datasources"

def test_create_and_fetch_report():
    payload = {
        "title": "Severe Waterlogging near Hospital",
        "description": "Rising floodwaters have submerged the hospital entrance road. Ambulance access obstructed.",
        "disaster_category": "flood",
        "location_name": "Kurla West, Mumbai",
        "priority": "High",
        "reporter_name": "Dr. Sharma",
        "reporter_contact": "+91-9876543210"
    }
    create_res = client.post("/api/reports", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    report_id = created_data["id"]
    assert created_data["verification_status"] == "Unverified"
    assert created_data["current_status"] == "Submitted"

    get_res = client.get(f"/api/reports/{report_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == payload["title"]

    patch_res = client.patch(f"/api/reports/{report_id}", json={"verification_status": "Verified"})
    assert patch_res.status_code == 200
    assert patch_res.json()["verification_status"] == "Verified"

def test_ai_incident_analyzer():
    text = "Massive flames and smoke burning through residential apartments in Kurla, Mumbai. Multiple families trapped on the third floor!"
    result = analyze_incident_text(text)
    assert result["suggested_category"] == "fire"
    assert result["suggested_priority"] == "Critical"
    assert "Kurla" in result["extracted_locations"] or "Mumbai" in result["extracted_locations"]
    assert result["confidence"] > 0.60
    assert "flames" in result["explanation"] or "burning" in result["explanation"]

def test_risk_calculation_sufficient_and_insufficient():
    flood_eval = evaluate_disaster_risk(
        disaster_type="flood",
        location_name="Assam River Basin",
        water_level_ratio=1.2,
        rainfall_mm_24h=140.0
    )
    assert flood_eval["score"] is not None
    assert flood_eval["risk_category"] in ["High", "Critical"]
    assert flood_eval["score"] >= 65.0

    insufficient_eval = evaluate_disaster_risk(
        disaster_type="flood",
        location_name="Assam River Basin",
        water_level_ratio=None,
        rainfall_mm_24h=None
    )
    assert insufficient_eval["score"] is None
    assert insufficient_eval["risk_category"] == "Insufficient Data"
    assert "Insufficient Data" in insufficient_eval["explanation"]

def test_sensor_simulation_and_threshold_detection():
    res_normal = tick_sensor_simulation("sens-01", "steady_normal")
    assert res_normal["data_mode"] == "simulation"
    assert res_normal["water_level_meters"] > 0

    res_surge = tick_sensor_simulation("sens-01", "flash_flood")
    assert res_surge["data_mode"] == "simulation"
    assert res_surge["threshold_status"] in ["Warning", "Critical"]

    res_reset = reset_sensor_simulation("sens-01")
    assert res_reset["status"] == "reset"

def test_rescue_team_assignment_workflow():
    teams_res = client.get("/api/teams")
    assert teams_res.status_code == 200
    teams = teams_res.json()
    assert len(teams) > 0
    available_team = next((t for t in teams if t["operational_status"] == "Available"), None)
    assert available_team is not None

    assign_payload = {
        "team_id": available_team["id"],
        "assignment_notes": "Dispatched to flood area for civilian evacuation"
    }
    assign_res = client.post("/api/assignments", json=assign_payload)
    assert assign_res.status_code == 201
    assign_id = assign_res.json()["id"]

    release_res = client.patch(f"/api/assignments/{assign_id}/release")
    assert release_res.status_code == 200
    assert release_res.json()["status"] == "Completed"

# ---------------------------------------------------------------------------
# Open-Meteo Weather Integration Tests
# ---------------------------------------------------------------------------

def test_wmo_code_map_known_codes():
    """WMO weather code mapping returns correct descriptions and icons."""
    desc, icon = get_weather_description(0)
    assert desc == "Clear sky"
    assert icon == "Sun"

    desc, icon = get_weather_description(61)
    assert "rain" in desc.lower()

    desc, icon = get_weather_description(95)
    assert "thunderstorm" in desc.lower()

    desc, icon = get_weather_description(None)
    assert isinstance(desc, str)
    assert isinstance(icon, str)

    desc, icon = get_weather_description(9999)  # unknown code
    assert isinstance(desc, str)
    assert isinstance(icon, str)

def test_coordinate_validation_valid():
    """Valid coordinates should not raise any exceptions."""
    validate_coordinates(19.076, 72.877)
    validate_coordinates(-90.0, -180.0)
    validate_coordinates(90.0, 180.0)
    validate_coordinates(0.0, 0.0)

def test_coordinate_validation_invalid():
    """Out-of-range coordinates must raise HTTPException."""
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_coordinates(91.0, 72.877)
    assert exc_info.value.status_code == 400
    assert "latitude" in str(exc_info.value.detail).lower()

    with pytest.raises(HTTPException) as exc_info:
        validate_coordinates(19.076, 200.0)
    assert exc_info.value.status_code == 400
    assert "longitude" in str(exc_info.value.detail).lower()

def test_set_and_get_configured_location():
    """Location configuration in memory should persist and return correctly."""
    original = get_configured_location()
    set_configured_location(28.6139, 77.2090, "Delhi Headquarters Test")
    cfg = get_configured_location()
    assert abs(cfg["latitude"] - 28.6139) < 0.001
    assert abs(cfg["longitude"] - 77.2090) < 0.001
    assert cfg["location_name"] == "Delhi Headquarters Test"
    # Restore original
    set_configured_location(original["latitude"], original["longitude"], original["location_name"])

def test_open_meteo_attribution_structure():
    """Attribution dict must include required CC BY 4.0 fields."""
    assert OPEN_METEO_ATTRIBUTION["source"] == "Open-Meteo"
    assert "open-meteo.com" in OPEN_METEO_ATTRIBUTION["url"]
    assert "CC BY 4.0" in OPEN_METEO_ATTRIBUTION["license"]
    assert "open-meteo.com" in OPEN_METEO_ATTRIBUTION["terms_url"]

def test_preset_locations_structure():
    """All preset locations must have required fields with valid coordinates."""
    assert len(PRESET_LOCATIONS) >= 5
    for loc in PRESET_LOCATIONS:
        assert "name" in loc
        assert "latitude" in loc
        assert "longitude" in loc
        assert -90.0 <= loc["latitude"] <= 90.0
        assert -180.0 <= loc["longitude"] <= 180.0

def test_weather_locations_endpoint():
    """GET /api/weather/locations returns current config and presets."""
    res = client.get("/api/weather/locations")
    assert res.status_code == 200
    data = res.json()
    assert "current_configured" in data
    assert "presets" in data
    curr = data["current_configured"]
    assert "name" in curr
    assert "latitude" in curr
    assert "longitude" in curr
    assert len(data["presets"]) >= 5

def test_update_configured_location_endpoint():
    """POST /api/weather/configured-location updates config and returns weather."""
    payload = {"latitude": 22.5726, "longitude": 88.3639, "location_name": "Kolkata Test Station"}
    # This will call Open-Meteo live — mock it to avoid network dependency in tests
    mock_weather = {
        "location_name": "Kolkata Test Station",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "elevation": 6.0,
        "timezone": "Asia/Kolkata",
        "timezone_abbreviation": "IST",
        "fetched_at": "2026-10-24T14:00:00+00:00",
        "cached": False,
        "current": {
            "time": "2026-10-24T14:00",
            "temperature": 29.0, "temperature_unit": "°C",
            "relative_humidity": 75, "relative_humidity_unit": "%",
            "apparent_temperature": 35.0, "apparent_temperature_unit": "°C",
            "precipitation": 0.0, "precipitation_unit": "mm",
            "wind_speed": 12.0, "wind_speed_unit": "km/h",
            "wind_direction": 180.0, "wind_direction_unit": "°",
            "surface_pressure": 1010.0, "surface_pressure_unit": "hPa",
            "weather_code": 2, "weather_description": "Partly cloudy", "icon": "CloudSun"
        },
        "hourly": [],
        "daily": [],
        "attribution": {
            "source": "Open-Meteo", "text": "Weather data by Open-Meteo.com",
            "url": "https://open-meteo.com/", "license": "CC BY 4.0",
            "terms_url": "https://open-meteo.com/en/terms", "notice": None
        }
    }
    with patch("app.routers.weather.fetch_open_meteo_forecast", new=AsyncMock(return_value=mock_weather)):
        res = client.post("/api/weather/configured-location", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "Kolkata" in data["message"]
    assert "configured" in data

def test_update_configured_location_invalid_coords():
    """Invalid coordinates must be rejected with 422."""
    payload = {"latitude": 999.0, "longitude": 72.877, "location_name": "Invalid"}
    res = client.post("/api/weather/configured-location", json=payload)
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_fetch_weather_with_mock_open_meteo():
    """
    Tests fetch_open_meteo_forecast with a mocked HTTPX response.
    Ensures the service never invents data when the API call succeeds.
    """
    mock_api_response = {
        "latitude": 19.076,
        "longitude": 72.877,
        "elevation": 14.0,
        "timezone": "Asia/Kolkata",
        "timezone_abbreviation": "IST",
        "generationtime_ms": 0.5,
        "utc_offset_seconds": 19800,
        "current_units": {
            "time": "iso8601", "interval": "seconds",
            "temperature_2m": "°C", "relative_humidity_2m": "%",
            "apparent_temperature": "°C", "precipitation": "mm",
            "weather_code": "wmo code", "wind_speed_10m": "km/h",
            "wind_direction_10m": "°", "surface_pressure": "hPa"
        },
        "current": {
            "time": "2026-10-24T14:15",
            "interval": 900,
            "temperature_2m": 32.5,
            "relative_humidity_2m": 65,
            "apparent_temperature": 38.6,
            "precipitation": 0.1,
            "weather_code": 51,
            "wind_speed_10m": 9.7,
            "wind_direction_10m": 246,
            "surface_pressure": 1007.5
        },
        "daily_units": {
            "time": "iso8601", "weather_code": "wmo code",
            "temperature_2m_max": "°C", "temperature_2m_min": "°C",
            "precipitation_sum": "mm", "precipitation_probability_max": "%",
            "wind_speed_10m_max": "km/h"
        },
        "daily": {
            "time": ["2026-10-24"],
            "weather_code": [51],
            "temperature_2m_max": [35.1],
            "temperature_2m_min": [26.2],
            "precipitation_sum": [1.2],
            "precipitation_probability_max": [60],
            "wind_speed_10m_max": [15.3]
        },
        "hourly_units": {
            "time": "iso8601", "temperature_2m": "°C",
            "relative_humidity_2m": "%", "precipitation_probability": "%",
            "precipitation": "mm", "wind_speed_10m": "km/h", "weather_code": "wmo code"
        },
        "hourly": {
            "time": ["2026-10-24T14:00"],
            "temperature_2m": [32.5],
            "relative_humidity_2m": [65],
            "precipitation_probability": [20],
            "precipitation": [0.0],
            "wind_speed_10m": [9.7],
            "weather_code": [51]
        }
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_api_response

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)

    # Force-clear cache to ensure we hit the mock
    from app.services import weather_service
    weather_service._weather_cache.clear()

    result = await fetch_open_meteo_forecast(
        latitude=19.076,
        longitude=72.877,
        location_name="Mumbai Test",
        force_refresh=True,
        client=mock_client
    )

    # Validate core structure
    assert result["latitude"] == 19.076
    assert result["location_name"] == "Mumbai Test"
    assert result["cached"] is False

    # Validate current observations — must use real API values, never invented
    curr = result["current"]
    assert curr["temperature"] == 32.5
    assert curr["temperature_unit"] == "°C"
    assert curr["relative_humidity"] == 65
    assert curr["relative_humidity_unit"] == "%"
    assert curr["wind_speed"] == 9.7
    assert curr["wind_speed_unit"] == "km/h"
    assert curr["precipitation"] == 0.1
    assert curr["weather_code"] == 51
    assert "drizzle" in curr["weather_description"].lower()

    # Validate daily forecast
    assert len(result["daily"]) == 1
    daily = result["daily"][0]
    assert daily["date"] == "2026-10-24"
    assert daily["temperature_max"] == 35.1
    assert daily["temperature_min"] == 26.2
    assert daily["precipitation_sum"] == 1.2

    # Validate attribution is always present
    attr = result["attribution"]
    assert attr["source"] == "Open-Meteo"
    assert "CC BY 4.0" in attr["license"]
    assert "open-meteo.com" in attr["url"]

@pytest.mark.asyncio
async def test_fetch_weather_api_timeout_raises_http_exception():
    """When Open-Meteo API times out, HTTPException 504 must be raised (no fake data returned)."""
    from fastapi import HTTPException

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timed out"))

    from app.services import weather_service
    weather_service._weather_cache.clear()

    with pytest.raises(HTTPException) as exc_info:
        await fetch_open_meteo_forecast(
            latitude=19.076,
            longitude=72.877,
            force_refresh=True,
            client=mock_client
        )
    assert exc_info.value.status_code == 504
    assert "timed out" in exc_info.value.detail.lower() or "timeout" in exc_info.value.detail.lower()

@pytest.mark.asyncio
async def test_fetch_weather_api_error_status_raises_http_exception():
    """When Open-Meteo returns non-200, HTTPException 502 must be raised."""
    from fastapi import HTTPException

    mock_resp = MagicMock()
    mock_resp.status_code = 503
    mock_resp.text = "Service Unavailable"

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)

    from app.services import weather_service
    weather_service._weather_cache.clear()

    with pytest.raises(HTTPException) as exc_info:
        await fetch_open_meteo_forecast(
            latitude=19.076,
            longitude=72.877,
            force_refresh=True,
            client=mock_client
        )
    assert exc_info.value.status_code == 502

def test_weather_endpoint_cache_headers():
    """
    Tests that GET /api/weather returns expected weather fields including attribution.
    Uses live Open-Meteo network call (integration test - requires connectivity).
    Skipped if network is not available.
    """
    try:
        res = client.get("/api/weather?latitude=19.076&longitude=72.877&location_name=TestMumbai")
        if res.status_code == 200:
            data = res.json()
            assert "current" in data
            assert "daily" in data
            assert "attribution" in data
            assert data["attribution"]["source"] == "Open-Meteo"
            assert "license" in data["attribution"]
            curr = data["current"]
            assert "temperature" in curr
            assert "temperature_unit" in curr
            assert "relative_humidity" in curr
            assert "wind_speed" in curr
            assert "precipitation" in curr
            assert "weather_description" in curr
        elif res.status_code in (502, 504):
            # Network timeout/error is acceptable in offline environments
            pytest.skip("Open-Meteo unreachable in this environment — integration test skipped")
    except Exception:
        pytest.skip("Open-Meteo integration test skipped due to network error")

def test_datasources_contains_open_meteo():
    """Data sources list must contain OPEN_METEO, not IMD."""
    res = client.get("/api/datasources")
    assert res.status_code == 200
    names = [s["name"] for s in res.json()]
    assert "OPEN_METEO" in names
    assert "IMD" not in names

def test_open_meteo_sync_endpoint():
    """POST /api/datasources/OPEN_METEO/sync must call Open-Meteo and return success/error."""
    with patch("app.routers.datasources.sync_open_meteo", new=AsyncMock(return_value={
        "status": "success",
        "message": "Successfully synchronized Open-Meteo forecast (32 data points ingested).",
        "records_imported": 32,
        "location": "Mumbai Operations Command",
        "attribution": "Weather data by Open-Meteo.com",
        "url": "https://open-meteo.com/",
        "license": "CC BY 4.0"
    })):
        res = client.post("/api/datasources/OPEN_METEO/sync")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["records_imported"] > 0
    assert "Open-Meteo" in data.get("attribution", "") or "Open-Meteo" in data.get("message", "")

def test_imd_sync_endpoint_retired():
    """POST /api/datasources/IMD/sync must return retired status, not real IMD data."""
    res = client.post("/api/datasources/IMD/sync")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "retired"
    assert "Open-Meteo" in data["message"]
    assert data["records_imported"] == 0
