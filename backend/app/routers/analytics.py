from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
import csv
import io
from app.core.database import get_db_connection

router = APIRouter(tags=["Analytics"])

@router.get("/analytics/summary")
def get_analytics_summary():
    """
    Returns verified analytical metrics based entirely on actual database records.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Category breakdown
    cursor.execute("""
        SELECT disaster_category as category, count(*) as count 
        FROM (
            SELECT disaster_category FROM incidents
            UNION ALL
            SELECT disaster_category FROM emergency_reports
        )
        GROUP BY disaster_category;
    """)
    category_counts = [dict(r) for r in cursor.fetchall()]
    
    # Priority breakdown
    cursor.execute("""
        SELECT priority, count(*) as count 
        FROM emergency_reports 
        GROUP BY priority;
    """)
    priority_counts = [dict(r) for r in cursor.fetchall()]
    
    # Verification breakdown
    cursor.execute("""
        SELECT verification_status as status, count(*) as count 
        FROM emergency_reports 
        GROUP BY verification_status;
    """)
    verification_counts = [dict(r) for r in cursor.fetchall()]
    
    # Resource operational status
    cursor.execute("""
        SELECT operational_status as status, count(*) as count 
        FROM rescue_teams 
        GROUP BY operational_status;
    """)
    resource_status = [dict(r) for r in cursor.fetchall()]
    
    # Incident timeline / dates
    cursor.execute("""
        SELECT substr(event_time, 1, 10) as date, count(*) as count 
        FROM incidents 
        GROUP BY substr(event_time, 1, 10) 
        ORDER BY date DESC LIMIT 14;
    """)
    timeline = [dict(r) for r in cursor.fetchall()]
    timeline.reverse()
    
    # Sensor water level readings history
    cursor.execute("""
        SELECT s.name as sensor_name, d.water_level_meters, d.threshold_status, d.recorded_at 
        FROM sensor_data d 
        JOIN sensor_devices s ON s.id = d.sensor_id 
        ORDER BY d.recorded_at DESC LIMIT 20;
    """)
    sensor_trends = [dict(r) for r in cursor.fetchall()]
    sensor_trends.reverse()
    
    conn.close()
    
    return {
        "category_breakdown": category_counts,
        "priority_breakdown": priority_counts,
        "verification_breakdown": verification_counts,
        "resource_status": resource_status,
        "incident_timeline": timeline,
        "sensor_trends": sensor_trends
    }

@router.get("/analytics/export/csv")
def export_incidents_csv():
    """
    Exports incidents and emergency reports to CSV with clear simulation disclaimers.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, disaster_category, severity, location_name, source, event_time, status
        FROM incidents
        ORDER BY event_time DESC;
    """)
    incidents = cursor.fetchall()
    
    cursor.execute("""
        SELECT id, title, disaster_category, priority, location_name, verification_status, current_status, reported_time
        FROM emergency_reports
        ORDER BY reported_time DESC;
    """)
    reports = cursor.fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header disclaimer
    writer.writerow(["# DISASTER RESPONSE ANALYTICS PLATFORM REPORT"])
    writer.writerow(["# Exported from Review-1 Demonstration Environment"])
    writer.writerow(["# Note: Sensor observations reflect SIMULATION MODE. Physical sensors intentionally not connected."])
    writer.writerow([])
    
    writer.writerow(["--- SECTION: OFFICIAL DISASTER INCIDENTS (GDACS / FIRMS) ---"])
    writer.writerow(["ID", "Title", "Category", "Severity", "Location", "Source", "Event Time", "Status"])
    for inc in incidents:
        writer.writerow([inc['id'], inc['title'], inc['disaster_category'], inc['severity'], inc['location_name'], inc['source'], inc['event_time'], inc['status']])
        
    writer.writerow([])
    writer.writerow(["--- SECTION: CITIZEN & FIELD EMERGENCY REPORTS ---"])
    writer.writerow(["ID", "Title", "Category", "Priority", "Location", "Verification Status", "Current Status", "Reported Time"])
    for rep in reports:
        writer.writerow([rep['id'], rep['title'], rep['disaster_category'], rep['priority'], rep['location_name'], rep['verification_status'], rep['current_status'], rep['reported_time']])
        
    return PlainTextResponse(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=disaster_analytics_export.csv"}
    )
