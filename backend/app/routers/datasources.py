from fastapi import APIRouter, HTTPException
from typing import List
from app.core.database import get_db_connection
from app.models.schemas import DataSourceResponse
from app.services.gdacs_service import fetch_and_sync_gdacs
from app.services.firms_service import fetch_and_sync_firms
from app.services.imd_service import check_and_sync_imd
from app.services.weather_service import sync_open_meteo

router = APIRouter(tags=["Data Sources"])

@router.get("/datasources", response_model=List[DataSourceResponse])
def get_data_sources():
    """
    Returns connection status, freshness, and record counts for all external integrations.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM data_source_status ORDER BY name ASC;")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/datasources/{name}/sync")
async def sync_data_source(name: str):
    """
    Triggers on-demand manual refresh for a specific external data source.
    """
    upper_name = name.upper()
    if upper_name == "GDACS":
        return await fetch_and_sync_gdacs()
    elif upper_name == "NASA_FIRMS":
        return await fetch_and_sync_firms()
    elif upper_name in ["OPEN_METEO", "WEATHER"]:
        return await sync_open_meteo()
    elif upper_name == "IMD":
        return await check_and_sync_imd()
    else:
        raise HTTPException(status_code=400, detail=f"Source '{name}' does not support manual polling.")
