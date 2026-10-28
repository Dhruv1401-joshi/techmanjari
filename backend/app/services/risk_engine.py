import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.core.database import get_db_connection, create_notification, log_audit

SCORING_METHOD_VERSION = "v1.2-deterministic-weighted"

def evaluate_disaster_risk(
    disaster_type: str,
    location_name: str,
    water_level_ratio: Optional[float] = None,
    rainfall_mm_24h: Optional[float] = None,
    wind_speed_kmh: Optional[float] = None,
    hotspot_count: Optional[int] = None,
    seismic_zone_factor: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Transparent, explainable 0-100 risk scoring engine.
    If required inputs for a hazard type are missing, strictly returns 'Insufficient Data'.
    Does NOT predict exact times or locations of future disasters.
    """
    now = datetime.now(timezone.utc).isoformat()
    d_type = disaster_type.lower()
    
    score = None
    risk_category = "Insufficient Data"
    explanation = ""
    inputs_used = {}
    
    # 1. Flood Assessment
    if d_type in ["flood", "flooding", "heavy_rainfall"]:
        if water_level_ratio is None and rainfall_mm_24h is None:
            explanation = "Insufficient Data: Evaluation requires at least one quantitative metric: water-level ratio or 24h rainfall (mm)."
            return _format_insufficient_response(disaster_type, location_name, explanation, now)
            
        inputs_used["water_level_ratio"] = water_level_ratio
        inputs_used["rainfall_mm_24h"] = rainfall_mm_24h
        
        # Formula: 0.55 * WaterLevelComponent + 0.45 * RainfallComponent
        w_comp = (min(1.5, water_level_ratio) / 1.5) * 100 if water_level_ratio is not None else 50
        r_comp = (min(200.0, rainfall_mm_24h) / 200.0) * 100 if rainfall_mm_24h is not None else 40
        raw_score = 0.55 * w_comp + 0.45 * r_comp
        score = round(min(100.0, max(0.0, raw_score)), 1)
        explanation = f"Flood Risk Calculated: Water Gauge Ratio ({water_level_ratio or 'N/A'}) contributed {w_comp:.1f}pts (55% wt); 24h Precipitation ({rainfall_mm_24h or 'N/A'}mm) contributed {r_comp:.1f}pts (45% wt)."

    # 2. Fire Assessment
    elif d_type in ["fire", "wildfire"]:
        if hotspot_count is None:
            explanation = "Insufficient Data: Wildfire hazard calculation requires active satellite thermal hotspot count."
            return _format_insufficient_response(disaster_type, location_name, explanation, now)
            
        inputs_used["satellite_hotspots_detected"] = hotspot_count
        # Hotspot density formula: 1-5 hotspots: moderate; 6-15: high; >15: critical
        if hotspot_count == 0:
            score = 12.0
            explanation = "Zero satellite thermal anomalies detected in the sector. Baseline risk remains Low."
        elif hotspot_count <= 4:
            score = round(25.0 + (hotspot_count / 4.0) * 20.0, 1)
            explanation = f"{hotspot_count} thermal hotspot detections observed. Localized dry conditions indicate Moderate fire spread potential."
        elif hotspot_count <= 12:
            score = round(50.0 + ((hotspot_count - 4) / 8.0) * 25.0, 1)
            explanation = f"Elevated thermal cluster ({hotspot_count} hotspots). High danger of flame propagation in vegetative zones."
        else:
            score = round(min(100.0, 75.0 + ((hotspot_count - 12) / 10.0) * 25.0), 1)
            explanation = f"Critical thermal cluster ({hotspot_count} hotspots). Severe active fire spread danger. NOTE: Satellite observations do NOT predict future ignition."

    # 3. Cyclone Assessment
    elif d_type in ["cyclone", "storm"]:
        if wind_speed_kmh is None:
            explanation = "Insufficient Data: Cyclone evaluation requires verified sustained wind speed measurement (km/h)."
            return _format_insufficient_response(disaster_type, location_name, explanation, now)
            
        inputs_used["sustained_wind_speed_kmh"] = wind_speed_kmh
        # Standard Meteorological Cyclone scale: <62 kmh: depression; 62-88: cyclonic storm; 89-117: severe; >118: very severe
        if wind_speed_kmh < 40:
            score = round((wind_speed_kmh / 40.0) * 25.0, 1)
        elif wind_speed_kmh < 65:
            score = round(25.0 + ((wind_speed_kmh - 40) / 25.0) * 25.0, 1)
        elif wind_speed_kmh < 118:
            score = round(50.0 + ((wind_speed_kmh - 65) / 53.0) * 25.0, 1)
        else:
            score = round(min(100.0, 75.0 + ((wind_speed_kmh - 118) / 80.0) * 25.0), 1)
            
        explanation = f"Calculated based on sustained winds of {wind_speed_kmh} km/h under standard meteorological categorization."

    # 4. Earthquake Hazard Assessment
    elif d_type in ["earthquake", "seismic"]:
        if seismic_zone_factor is None:
            explanation = "Insufficient Data: Earthquake risk evaluation requires BIS Seismic Zone factor (Zone II=0.10, III=0.16, IV=0.24, V=0.36)."
            return _format_insufficient_response(disaster_type, location_name, explanation, now)
            
        inputs_used["seismic_zone_factor"] = seismic_zone_factor
        score = round(min(100.0, (seismic_zone_factor / 0.40) * 85.0), 1)
        explanation = f"Hazard index derived from statutory structural seismic zoning ({seismic_zone_factor}). CRITICAL: The platform does NOT predict the date, time, or epicenter of future seismic events."

    else:
        explanation = f"Insufficient Data: Unsupported disaster category '{disaster_type}' for automated empirical scoring."
        return _format_insufficient_response(disaster_type, location_name, explanation, now)

    # Categorize score
    if score < 25.0:
        risk_category = "Low"
    elif score < 50.0:
        risk_category = "Moderate"
    elif score < 75.0:
        risk_category = "High"
    else:
        risk_category = "Critical"

    # Persist in risk_assessments table
    conn = get_db_connection()
    cursor = conn.cursor()
    assessment_id = str(uuid.uuid4())
    
    cursor.execute("""
        INSERT INTO risk_assessments (
            id, disaster_type, location_name, score, risk_category, 
            inputs_used, scoring_method_version, data_freshness, explanation, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Real-time calculation', ?, ?);
    """, (assessment_id, disaster_type, location_name, score, risk_category, json.dumps(inputs_used), SCORING_METHOD_VERSION, explanation, now))
    
    conn.commit()
    conn.close()
    
    # Send notification if Critical
    if risk_category in ["High", "Critical"]:
        create_notification(
            title=f"Elevated {risk_category} Risk: {location_name}",
            message=f"{disaster_type.capitalize()} Risk Score reached {score}/100. {explanation}",
            notification_type="RISK_CHANGE",
            severity="critical" if risk_category == "Critical" else "warning",
            link_target="/risk"
        )
        
    return {
        "id": assessment_id,
        "disaster_type": disaster_type,
        "location_name": location_name,
        "score": score,
        "risk_category": risk_category,
        "inputs_used": inputs_used,
        "scoring_method_version": SCORING_METHOD_VERSION,
        "data_freshness": "Real-time calculation",
        "explanation": explanation,
        "created_at": now
    }

def _format_insufficient_response(disaster_type: str, location_name: str, explanation: str, now: str) -> Dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "disaster_type": disaster_type,
        "location_name": location_name,
        "score": None,
        "risk_category": "Insufficient Data",
        "inputs_used": {},
        "scoring_method_version": SCORING_METHOD_VERSION,
        "data_freshness": "No input data provided",
        "explanation": explanation,
        "created_at": now
    }
