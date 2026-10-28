from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.core.database import get_db_connection
from app.models.schemas import (
    RescueTeamResponse, 
    ResourceAssignmentCreate, 
    ResourceAssignmentResponse
)
from app.services.resource_service import (
    suggest_resources_for_incident, 
    create_resource_assignment, 
    release_resource_assignment
)

router = APIRouter(tags=["Rescue Teams & Resources"])

@router.get("/teams", response_model=List[RescueTeamResponse])
def get_rescue_teams(status: Optional[str] = Query(None)):
    """
    Returns emergency teams, specialized vehicles, and rescue units.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT t.*, 
               (SELECT r.title FROM emergency_reports r 
                JOIN resource_assignments a ON a.report_id = r.id 
                WHERE a.team_id = t.id AND a.approval_status = 'Approved' 
                ORDER BY a.assigned_at DESC LIMIT 1) as assigned_incident_title
        FROM rescue_teams t
        WHERE 1=1
    """
    params = []
    if status and status.lower() != "all":
        query += " AND lower(t.operational_status) = ?"
        params.append(status.lower())
        
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/teams/suggestions")
def get_team_suggestions(
    disaster_category: str = Query("flood"),
    priority: str = Query("Medium")
):
    """
    Returns AI/heuristic-assisted team suggestions based on incident domain and urgency.
    """
    return suggest_resources_for_incident(disaster_category, priority)

@router.post("/assignments", response_model=ResourceAssignmentResponse, status_code=201)
def assign_team(payload: ResourceAssignmentCreate):
    """
    Dispatches a team with human approval.
    """
    result = create_resource_assignment(
        team_id=payload.team_id,
        report_id=payload.report_id,
        incident_id=payload.incident_id,
        notes=payload.assignment_notes
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return {
        "id": result["id"],
        "incident_id": payload.incident_id,
        "report_id": payload.report_id,
        "team_id": payload.team_id,
        "team_name": result["team_name"],
        "assigned_by": "Dispatcher",
        "approval_status": "Approved",
        "assignment_notes": payload.assignment_notes,
        "assigned_at": result["assigned_at"]
    }

@router.get("/assignments", response_model=List[ResourceAssignmentResponse])
def get_assignments():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, t.name as team_name, t.team_type
        FROM resource_assignments a
        LEFT JOIN rescue_teams t ON a.team_id = t.id
        ORDER BY a.assigned_at DESC;
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.patch("/assignments/{assignment_id}/release")
def release_team(assignment_id: str, notes: Optional[str] = None):
    """
    Completes mission and releases team back to Available status.
    """
    result = release_resource_assignment(assignment_id, notes)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
