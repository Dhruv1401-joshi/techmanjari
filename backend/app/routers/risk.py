import json
from fastapi import APIRouter, Query
from typing import List, Optional
from app.core.database import get_db_connection
from app.models.schemas import RiskEvaluateRequest, RiskAssessmentResponse
from app.services.risk_engine import evaluate_disaster_risk

router = APIRouter(tags=["Risk Assessment"])

@router.post("/risk-assessments/evaluate", response_model=RiskAssessmentResponse)
def evaluate_risk(payload: RiskEvaluateRequest):
    """
    Computes a transparent 0-100 hazard risk score based on quantitative inputs.
    Strictly returns 'Insufficient Data' if necessary parameters are missing.
    """
    result = evaluate_disaster_risk(
        disaster_type=payload.disaster_type,
        location_name=payload.location_name,
        water_level_ratio=payload.water_level_ratio,
        rainfall_mm_24h=payload.rainfall_mm_24h,
        wind_speed_kmh=payload.wind_speed_kmh,
        hotspot_count=payload.hotspot_count,
        seismic_zone_factor=payload.seismic_zone_factor
    )
    return result

@router.get("/risk-assessments", response_model=List[RiskAssessmentResponse])
def get_risk_assessments(
    disaster_type: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    limit: int = Query(25, le=100)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM risk_assessments WHERE 1=1"
    params = []
    
    if disaster_type and disaster_type.lower() != "all":
        query += " AND lower(disaster_type) = ?"
        params.append(disaster_type.lower())
    if risk_category and risk_category.lower() != "all":
        query += " AND lower(risk_category) = ?"
        params.append(risk_category.lower())
        
    query += " ORDER BY created_at DESC LIMIT ?;"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        d = dict(r)
        try:
            d['inputs_used'] = json.loads(d['inputs_used'])
        except Exception:
            d['inputs_used'] = {}
        results.append(d)
        
    return results
