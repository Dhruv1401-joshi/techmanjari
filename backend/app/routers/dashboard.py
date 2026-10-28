from fastapi import APIRouter
from app.core.database import get_db_connection
from app.models.schemas import DashboardSummaryResponse
from app.core.config import settings

router = APIRouter(tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary():
    """
    Returns real aggregated statistics directly derived from the database and active data feeds.
    Strictly avoids hardcoded or fake totals.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total recorded incidents
    cursor.execute("SELECT COUNT(*) FROM incidents;")
    total_incidents = cursor.fetchone()[0]
    
    # Active incidents
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE status = 'active';")
    active_incidents = cursor.fetchone()[0]
    
    # Verified incidents (verified reports + official incidents)
    cursor.execute("SELECT COUNT(*) FROM emergency_reports WHERE verification_status = 'Verified';")
    verified_reports = cursor.fetchone()[0]
    verified_incidents = total_incidents + verified_reports
    
    # Unverified citizen reports awaiting review
    cursor.execute("SELECT COUNT(*) FROM emergency_reports WHERE verification_status = 'Unverified' AND current_status != 'Rejected';")
    unverified_reports = cursor.fetchone()[0]
    
    # High priority incidents
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE severity IN ('High', 'Critical');")
    high_pri_incidents = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM emergency_reports WHERE priority IN ('High', 'Critical');")
    high_pri_reports = cursor.fetchone()[0]
    high_priority_total = high_pri_incidents + high_pri_reports
    
    # Available rescue teams
    cursor.execute("SELECT COUNT(*) FROM rescue_teams WHERE operational_status = 'Available';")
    avail_teams = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM rescue_teams;")
    total_teams = cursor.fetchone()[0]
    
    # Category distribution
    cursor.execute("""
        SELECT disaster_category as category, COUNT(*) as count 
        FROM (
            SELECT disaster_category FROM incidents
            UNION ALL
            SELECT disaster_category FROM emergency_reports
        )
        GROUP BY disaster_category
        ORDER BY count DESC;
    """)
    cat_rows = cursor.fetchall()
    category_dist = [{"category": r["category"].capitalize(), "count": r["count"]} for r in cat_rows]
    
    # Risk-level distribution
    cursor.execute("""
        SELECT severity, COUNT(*) as count
        FROM incidents
        GROUP BY severity;
    """)
    risk_rows = cursor.fetchall()
    risk_dist = [{"level": r["severity"], "count": r["count"]} for r in risk_rows]
    
    # Data sources status
    cursor.execute("SELECT id, name, status, last_successful_fetch, last_error, records_count, details, updated_at FROM data_source_status;")
    ds_rows = cursor.fetchall()
    data_sources = [dict(r) for r in ds_rows]
    
    # Recent activity
    cursor.execute("""
        SELECT id, title, disaster_category, severity as level, location_name, event_time as timestamp, source
        FROM incidents
        ORDER BY event_time DESC
        LIMIT 6;
    """)
    recent = [dict(r) for r in cursor.fetchall()]
    
    # Last data refresh
    cursor.execute("SELECT MAX(updated_at) FROM data_source_status;")
    last_refresh = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "total_recorded_incidents": total_incidents,
        "active_incidents": active_incidents,
        "verified_incidents": verified_incidents,
        "unverified_reports_awaiting_review": unverified_reports,
        "high_priority_incidents": high_priority_total,
        "available_rescue_teams": avail_teams,
        "total_rescue_teams": total_teams,
        "sensor_simulation_status": "Active (SIMULATION MODE)",
        "data_sources_status": data_sources,
        "category_distribution": category_dist,
        "risk_distribution": risk_dist,
        "recent_activity": recent,
        "last_data_refresh": last_refresh,
        "database_mode": "Supabase PostgreSQL Ready / SQLite Engine" if not settings.SUPABASE_URL else "Supabase Live"
    }
