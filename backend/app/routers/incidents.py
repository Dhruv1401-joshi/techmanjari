from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.core.database import get_db_connection
from app.models.schemas import IncidentResponse
from app.services.gdacs_service import fetch_and_sync_gdacs
from app.services.firms_service import fetch_and_sync_firms

router = APIRouter(tags=["Incidents"])

@router.get("/incidents", response_model=List[IncidentResponse])
def get_incidents(
    category: Optional[str] = Query(None, description="Filter by disaster category"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    source: Optional[str] = Query(None, description="Filter by data source (GDACS, NASA_FIRMS)"),
    search: Optional[str] = Query(None, description="Search by title or location"),
    limit: int = Query(100, le=500),
    offset: int = 0
):
    """
    Returns verified/official disaster incidents from genuine feeds and records.
    Supports filtering by category, severity, source, and search terms.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    
    if category and category.lower() != "all":
        query += " AND lower(disaster_category) = ?"
        params.append(category.lower())
    if severity and severity.lower() != "all":
        query += " AND lower(severity) = ?"
        params.append(severity.lower())
    if source and source.lower() != "all":
        query += " AND source = ?"
        params.append(source)
    if search:
        query += " AND (title LIKE ? OR location_name LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    query += " ORDER BY event_time DESC LIMIT ? OFFSET ?;"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident_by_id(incident_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE id = ?;", (incident_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
    return dict(row)

@router.get("/disasters/gdacs")
async def sync_gdacs():
    """Manual trigger to refresh GDACS live feed."""
    return await fetch_and_sync_gdacs()

@router.get("/disasters/firms")
async def sync_firms():
    """Manual trigger to refresh NASA FIRMS satellite fire hotspots."""
    return await fetch_and_sync_firms()
