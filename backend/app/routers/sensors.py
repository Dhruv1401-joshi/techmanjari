from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.core.database import get_db_connection
from app.models.schemas import (
    SensorDeviceResponse, 
    SensorReadingResponse, 
    SimulationControlRequest, 
    SensorIngestRequest
)
from app.services.sensor_simulation import (
    tick_sensor_simulation, 
    reset_sensor_simulation, 
    ingest_hardware_reading
)

router = APIRouter(tags=["Sensors"])

@router.get("/sensors", response_model=List[SensorDeviceResponse])
def get_sensors():
    """
    Returns water-level monitoring stations.
    Clearly indicates SIMULATION MODE for Review-1.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_devices;")
    sensors = [dict(r) for r in cursor.fetchall()]
    
    # Enrich with latest reading
    for s in sensors:
        cursor.execute("""
            SELECT water_level_meters, threshold_status 
            FROM sensor_data 
            WHERE sensor_id = ? 
            ORDER BY recorded_at DESC LIMIT 1;
        """, (s['id'],))
        latest = cursor.fetchone()
        if latest:
            s['latest_reading'] = latest['water_level_meters']
            s['latest_threshold_status'] = latest['threshold_status']
        else:
            s['latest_reading'] = None
            s['latest_threshold_status'] = "Normal"
            
    conn.close()
    return sensors

@router.get("/sensors/{sensor_id}/readings", response_model=List[SensorReadingResponse])
def get_sensor_readings(sensor_id: str, limit: int = Query(50, le=200)):
    """
    Returns historical water-level readings for a given station.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM sensor_data 
        WHERE sensor_id = ? 
        ORDER BY recorded_at DESC LIMIT ?;
    """, (sensor_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/sensors/simulation/control")
def control_simulation(payload: SimulationControlRequest):
    """
    Controls software water-level sensor simulation.
    Actions: 'tick' (advances scenario), 'reset' (returns to baseline).
    """
    if payload.action == "reset":
        return reset_sensor_simulation(payload.sensor_id)
    else:
        return tick_sensor_simulation(payload.sensor_id, payload.scenario)

@router.post("/sensors/ingest")
def ingest_reading(payload: SensorIngestRequest):
    """
    Reserved endpoint for future ESP32 / Arduino hardware connectivity.
    Flags readings with data_mode = 'hardware'.
    """
    result = ingest_hardware_reading(payload.sensor_id, payload.water_level_meters)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
