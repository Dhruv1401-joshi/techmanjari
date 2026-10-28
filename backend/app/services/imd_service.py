"""
IMD (India Meteorological Department) Adapter — Retired / Replaced

The official IMD integration required Ministry tokens, institutional IP-whitelisting,
and private portal credentials (https://api.imd.gov.in/public/api_reference.html).

It has been replaced by the public Open-Meteo Forecast API (https://open-meteo.com/)
which provides high-resolution global and regional weather forecasts under CC BY 4.0
without requiring private credentials.

See: app.services.weather_service
"""
from typing import Dict, Any
from app.services.weather_service import sync_open_meteo

IMD_DOCS_URL = "https://api.imd.gov.in/public/api_reference.html"

async def check_and_sync_imd() -> Dict[str, Any]:
    """
    Deprecated legacy method. Redirects to Open-Meteo forecast sync.
    Never manufactures fake IMD warnings or forecasts.
    """
    return {
        "status": "retired",
        "message": (
            "The IMD weather adapter has been retired and replaced by the Open-Meteo Forecast API "
            "(https://open-meteo.com/). Please use the Open-Meteo integration for live weather data."
        ),
        "documentation_url": IMD_DOCS_URL,
        "alternative_service": "Open-Meteo Forecast API (CC BY 4.0)",
        "records_imported": 0
    }
