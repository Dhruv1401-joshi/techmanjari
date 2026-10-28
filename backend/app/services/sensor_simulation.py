import uuid
import random
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.core.database import get_db_connection, create_notification, log_audit

SIMULATION_BANNER = "SIMULATION MODE — NO PHYSICAL SENSOR CONNECTED"

# Scenario definitions and delta step multipliers
SCENARIOS = {
    'steady_normal': {'target_min': 1.6, 'target_max': 2.2, 'delta': 0.05},
    'rising_monsoon': {'target_min': 2.8, 'target_max': 3.7, 'delta': 0.15},
    'flash_flood': {'target_min': 4.2, 'target_max': 5.6, 'delta': 0.35},
    'storm_recession': {'target_min': 1.8, 'target_max': 2.4, 'delta': -0.20},
}

def determine_threshold_status(level: float, warning_th: float, critical_th: float) -> str:
    if level >= critical_th:
        return "Critical"
    elif level >= warning_th:
        return "Warning"
    else:
        return "Normal"

def tick_sensor_simulation(sensor_id: str, scenario: str = "rising_monsoon") -> Dict[str, Any]:
    """
    Simulates a new water-level measurement for the designated sensor station.
    Persists with data_mode = 'simulation'.
    Triggers in-app warning notification if threshold crossed.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("""
        SELECT id, name, location_name, normal_threshold, warning_threshold, critical_threshold
        FROM sensor_devices WHERE id = ?;
    """, (sensor_id,))
    sensor = cursor.fetchone()
    
    if not sensor:
        conn.close()
        return {"error": "Sensor not found"}
        
    s_name = sensor['name']
    w_th = sensor['warning_threshold']
    c_th = sensor['critical_threshold']
    
    # Get latest reading
    cursor.execute("""
        SELECT water_level_meters, threshold_status FROM sensor_data
        WHERE sensor_id = ? ORDER BY recorded_at DESC LIMIT 1;
    """, (sensor_id,))
    latest = cursor.fetchone()
    current_level = latest['water_level_meters'] if latest else 2.0
    previous_status = latest['threshold_status'] if latest else "Normal"
    
    # Apply scenario delta
    sc_info = SCENARIOS.get(scenario, SCENARIOS['rising_monsoon'])
    if scenario == 'flash_flood':
        new_level = round(max(current_level + 0.8, sc_info['target_min'] + random.uniform(0.1, 0.5)), 2)
    elif scenario == 'storm_recession':
        new_level = round(max(sc_info['target_min'], current_level + sc_info['delta']), 2)
    else:
        delta = sc_info['delta'] + (random.uniform(-0.04, 0.04))
        new_level = round(max(0.5, current_level + delta), 2)
        
    threshold_status = determine_threshold_status(new_level, w_th, c_th)

    
    # Insert new simulated record
    reading_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO sensor_data (id, sensor_id, water_level_meters, threshold_status, data_mode, recorded_at)
        VALUES (?, ?, ?, ?, 'simulation', ?);
    """, (reading_id, sensor_id, new_level, threshold_status, now))
    
    cursor.execute("""
        UPDATE sensor_devices
        SET last_reading_time = ?, status = 'online'
        WHERE id = ?;
    """, (now, sensor_id))
    
    conn.commit()
    
    # If threshold crossed to Warning or Critical, trigger notification
    if threshold_status in ["Warning", "Critical"] and threshold_status != previous_status:
        severity = "critical" if threshold_status == "Critical" else "warning"
        create_notification(
            title=f"Water Level {threshold_status.upper()}: {s_name}",
            message=f"Simulated sensor reading reached {new_level:.2f}m (Threshold: {c_th if threshold_status == 'Critical' else w_th}m). {SIMULATION_BANNER}",
            notification_type="SENSOR_THRESHOLD",
            severity=severity,
            link_target="/sensors"
        )
        log_audit(
            entity_type="sensor_device",
            entity_id=sensor_id,
            action=f"THRESHOLD_CROSSED_{threshold_status.upper()}",
            performed_by="SimulationEngine",
            details={"water_level": new_level, "scenario": scenario, "mode": "simulation"}
        )
        
    conn.close()
    
    return {
        "sensor_id": sensor_id,
        "sensor_name": s_name,
        "water_level_meters": new_level,
        "threshold_status": threshold_status,
        "scenario": scenario,
        "data_mode": "simulation",
        "simulation_label": SIMULATION_BANNER,
        "recorded_at": now
    }

def reset_sensor_simulation(sensor_id: str) -> Dict[str, Any]:
    """Resets sensor back to a safe baseline reading."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("""
        INSERT INTO sensor_data (id, sensor_id, water_level_meters, threshold_status, data_mode, recorded_at)
        VALUES (?, ?, 1.80, 'Normal', 'simulation', ?);
    """, (str(uuid.uuid4()), sensor_id, now))
    
    cursor.execute("""
        UPDATE sensor_devices
        SET last_reading_time = ? WHERE id = ?;
    """, (now, sensor_id))
    
    conn.commit()
    conn.close()
    return {"sensor_id": sensor_id, "status": "reset", "water_level_meters": 1.80}

def ingest_hardware_reading(sensor_id: str, water_level_meters: float) -> Dict[str, Any]:
    """
    Reserved endpoint for future ESP32 / Arduino hardware connectivity.
    Flags data_mode = 'hardware'.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("SELECT normal_threshold, warning_threshold, critical_threshold FROM sensor_devices WHERE id = ?", (sensor_id,))
    sensor = cursor.fetchone()
    if not sensor:
        conn.close()
        return {"error": "Sensor ID not registered"}
        
    th_status = determine_threshold_status(water_level_meters, sensor['warning_threshold'], sensor['critical_threshold'])
    
    cursor.execute("""
        INSERT INTO sensor_data (id, sensor_id, water_level_meters, threshold_status, data_mode, recorded_at)
        VALUES (?, ?, ?, ?, 'hardware', ?);
    """, (str(uuid.uuid4()), sensor_id, water_level_meters, th_status, now))
    
    cursor.execute("UPDATE sensor_devices SET last_reading_time = ?, data_mode = 'hardware' WHERE id = ?", (now, sensor_id))
    conn.commit()
    conn.close()
    
    return {"sensor_id": sensor_id, "data_mode": "hardware", "water_level_meters": water_level_meters, "threshold_status": th_status}
