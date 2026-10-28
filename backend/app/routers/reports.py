import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.core.database import get_db_connection, log_audit, create_notification
from app.models.schemas import EmergencyReportCreate, EmergencyReportUpdate, EmergencyReportResponse

router = APIRouter(tags=["Reports"])

@router.post("/reports", response_model=EmergencyReportResponse, status_code=201)
def create_report(payload: EmergencyReportCreate):
    """
    Creates a new citizen or responder emergency report.
    Defaults verification_status to 'Unverified' and current_status to 'Submitted'.
    """
    now = datetime.now(timezone.utc).isoformat()
    report_id = str(uuid.uuid4())
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO emergency_reports (
            id, title, description, disaster_category, location_name,
            latitude, longitude, reported_time, priority, reporter_name,
            reporter_contact, verification_status, current_status, assigned_team_id,
            notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unverified', 'Submitted', NULL, NULL, ?, ?);
    """, (
        report_id, payload.title, payload.description, payload.disaster_category.lower(),
        payload.location_name, payload.latitude, payload.longitude, now, payload.priority,
        payload.reporter_name, payload.reporter_contact, now, now
    ))
    
    conn.commit()
    
    # Audit log
    log_audit("emergency_report", report_id, "REPORT_SUBMITTED", payload.reporter_name or "Public", {"title": payload.title, "priority": payload.priority})
    
    # In-app notification for new reports
    severity = "critical" if payload.priority == "Critical" else ("warning" if payload.priority == "High" else "info")
    create_notification(
        title=f"New {payload.priority} Report: {payload.title}",
        message=f"Reported at {payload.location_name}. Awaiting dispatcher verification.",
        notification_type="REPORT_SUBMITTED",
        severity=severity,
        link_target=f"/reports/{report_id}"
    )
    
    cursor.execute("SELECT * FROM emergency_reports WHERE id = ?;", (report_id,))
    row = cursor.fetchone()
    conn.close()
    
    return dict(row)

@router.get("/reports", response_model=List[EmergencyReportResponse])
def get_reports(
    status: Optional[str] = Query(None, description="Filter by current_status"),
    verification_status: Optional[str] = Query(None, description="Filter by verification_status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    category: Optional[str] = Query(None, description="Filter by disaster category"),
    search: Optional[str] = Query(None, description="Search in title, description, or location"),
    limit: int = Query(50, le=200),
    offset: int = 0
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM emergency_reports WHERE 1=1"
    params = []
    
    if status and status.lower() != "all":
        query += " AND lower(current_status) = ?"
        params.append(status.lower())
    if verification_status and verification_status.lower() != "all":
        query += " AND lower(verification_status) = ?"
        params.append(verification_status.lower())
    if priority and priority.lower() != "all":
        query += " AND lower(priority) = ?"
        params.append(priority.lower())
    if category and category.lower() != "all":
        query += " AND lower(disaster_category) = ?"
        params.append(category.lower())
    if search:
        query += " AND (title LIKE ? OR description LIKE ? OR location_name LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])
        
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?;"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

@router.get("/reports/{report_id}", response_model=EmergencyReportResponse)
def get_report_by_id(report_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergency_reports WHERE id = ?;", (report_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Emergency report not found")
    return dict(row)

@router.patch("/reports/{report_id}", response_model=EmergencyReportResponse)
def update_report(report_id: str, payload: EmergencyReportUpdate):
    """
    Updates report fields, verification status, or operational status.
    Requires dispatcher authorization.
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM emergency_reports WHERE id = ?;", (report_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Report not found")
        
    updates = []
    params = []
    
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            updates.append(f"{field} = ?")
            params.append(val)
            
    if not updates:
        conn.close()
        return dict(existing)
        
    updates.append("updated_at = ?")
    params.append(now)
    params.append(report_id)
    
    query = f"UPDATE emergency_reports SET {', '.join(updates)} WHERE id = ?;"
    cursor.execute(query, params)
    conn.commit()
    
    log_audit("emergency_report", report_id, "REPORT_UPDATED", "Dispatcher", payload.model_dump(exclude_unset=True))
    
    cursor.execute("SELECT * FROM emergency_reports WHERE id = ?;", (report_id,))
    updated_row = cursor.fetchone()
    conn.close()
    
    return dict(updated_row)

@router.delete("/reports/{report_id}")
def delete_report(report_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM emergency_reports WHERE id = ?;", (report_id,))
    conn.commit()
    conn.close()
    log_audit("emergency_report", report_id, "REPORT_DELETED", "Dispatcher")
    return {"status": "deleted", "id": report_id}
