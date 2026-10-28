import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.core.database import get_db_connection, create_notification, log_audit

RESOURCE_AFFINITY = {
    'flood': ['flood_boat', 'search_rescue'],
    'fire': ['fire_response', 'search_rescue'],
    'earthquake': ['search_rescue', 'ambulance', 'medical_unit'],
    'cyclone': ['flood_boat', 'search_rescue', 'ambulance'],
    'medical': ['ambulance', 'medical_unit'],
    'landslide': ['search_rescue', 'ambulance'],
}

def suggest_resources_for_incident(disaster_category: str, priority: str) -> List[Dict[str, Any]]:
    """
    Suggests available emergency teams based on incident hazard type and priority.
    Does not auto-dispatch; returns explainable recommendations for dispatcher approval.
    """
    preferred_types = RESOURCE_AFFINITY.get(disaster_category.lower(), ['search_rescue'])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, team_type, operational_status, base_location, capacity, contact_number
        FROM rescue_teams
        WHERE operational_status = 'Available'
        ORDER BY capacity DESC;
    """)
    available_teams = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    scored_suggestions = []
    for team in available_teams:
        score = 0
        reasons = []
        if team['team_type'] in preferred_types:
            score += 50
            reasons.append(f"Specialized in {team['team_type'].replace('_', ' ')}")
            
        if priority == "Critical" and team['capacity'] >= 8:
            score += 30
            reasons.append("High capacity team suitable for Critical response")
        elif priority in ["High", "Medium"]:
            score += 20
            reasons.append("Available for immediate deployment")
            
        team['recommendation_score'] = score
        team['recommendation_reason'] = "; ".join(reasons) if reasons else "General standby unit"
        scored_suggestions.append(team)
        
    scored_suggestions.sort(key=lambda x: x['recommendation_score'], reverse=True)
    return scored_suggestions

def create_resource_assignment(
    team_id: str,
    report_id: Optional[str] = None,
    incident_id: Optional[str] = None,
    assigned_by: str = "Dispatcher",
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Assigns an emergency team to a report/incident with human authorization.
    Updates team operational status to 'Assigned'.
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check team availability
    cursor.execute("SELECT id, name, operational_status FROM rescue_teams WHERE id = ?", (team_id,))
    team = cursor.fetchone()
    if not team:
        conn.close()
        return {"error": "Team not found"}
        
    assignment_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO resource_assignments (
            id, incident_id, report_id, team_id, resource_id, 
            assigned_by, approval_status, assignment_notes, assigned_at, released_at
        ) VALUES (?, ?, ?, ?, NULL, ?, 'Approved', ?, ?, NULL);
    """, (assignment_id, incident_id, report_id, team_id, assigned_by, notes or "Dispatched with human dispatcher verification", now))
    
    # Mark team Assigned
    cursor.execute("UPDATE rescue_teams SET operational_status = 'Assigned', updated_at = ? WHERE id = ?", (now, team_id))
    
    # If report_id supplied, update report's assigned_team_id and current_status to 'In Progress'
    if report_id:
        cursor.execute("""
            UPDATE emergency_reports
            SET assigned_team_id = ?, current_status = 'In Progress', updated_at = ?
            WHERE id = ?;
        """, (team_id, now, report_id))
        
    conn.commit()
    conn.close()
    
    log_audit("resource_assignment", assignment_id, "TEAM_ASSIGNED", assigned_by, {"team_id": team_id, "report_id": report_id, "incident_id": incident_id})
    create_notification(
        title=f"Resource Dispatched: {team['name']}",
        message=f"Team {team['name']} assigned to incident response. Status: In Progress.",
        notification_type="RESOURCE_ASSIGNMENT",
        severity="info",
        link_target="/teams"
    )
    
    return {
        "id": assignment_id,
        "team_id": team_id,
        "team_name": team['name'],
        "status": "Assigned",
        "assigned_at": now
    }

def release_resource_assignment(assignment_id: str, resolution_notes: Optional[str] = None) -> Dict[str, Any]:
    """
    Releases an assigned team back to Available status.
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, team_id, report_id FROM resource_assignments WHERE id = ?", (assignment_id,))
    assignment = cursor.fetchone()
    if not assignment:
        conn.close()
        return {"error": "Assignment not found"}
        
    team_id = assignment['team_id']
    report_id = assignment['report_id']
    
    cursor.execute("""
        UPDATE resource_assignments
        SET approval_status = 'Completed', released_at = ?, assignment_notes = coalesce(assignment_notes || ' | ', '') || ?
        WHERE id = ?;
    """, (now, resolution_notes or "Mission completed successfully", assignment_id))
    
    cursor.execute("UPDATE rescue_teams SET operational_status = 'Available', updated_at = ? WHERE id = ?", (now, team_id))
    
    if report_id:
        cursor.execute("UPDATE emergency_reports SET current_status = 'Resolved', updated_at = ? WHERE id = ?", (now, report_id))
        
    conn.commit()
    conn.close()
    
    log_audit("resource_assignment", assignment_id, "TEAM_RELEASED", "Dispatcher", {"team_id": team_id, "resolution": resolution_notes})
    return {"id": assignment_id, "status": "Completed", "released_at": now}
