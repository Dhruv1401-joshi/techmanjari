import sqlite3
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.core.config import settings

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DATABASE_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. profiles
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'dispatcher',
        created_at TEXT NOT NULL
    );
    """)
    
    # 2. incidents
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        disaster_category TEXT NOT NULL,
        severity TEXT NOT NULL,
        location_name TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        source TEXT NOT NULL,
        source_event_id TEXT UNIQUE,
        source_url TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        event_time TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(disaster_category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_source ON incidents(source);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_time ON incidents(event_time);")

    # 3. emergency_reports
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS emergency_reports (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        disaster_category TEXT NOT NULL,
        location_name TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        reported_time TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'Medium',
        reporter_name TEXT,
        reporter_contact TEXT,
        verification_status TEXT NOT NULL DEFAULT 'Unverified',
        current_status TEXT NOT NULL DEFAULT 'Submitted',
        assigned_team_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_status ON emergency_reports(current_status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_priority ON emergency_reports(priority);")

    # 4. forecast_records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forecast_records (
        id TEXT PRIMARY KEY,
        disaster_type TEXT NOT NULL,
        location_name TEXT NOT NULL,
        forecast_period TEXT,
        valid_from TEXT,
        valid_to TEXT,
        severity TEXT,
        source TEXT NOT NULL,
        raw_data TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 5. risk_assessments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS risk_assessments (
        id TEXT PRIMARY KEY,
        disaster_type TEXT NOT NULL,
        location_name TEXT NOT NULL,
        score REAL NOT NULL,
        risk_category TEXT NOT NULL,
        inputs_used TEXT NOT NULL,
        scoring_method_version TEXT NOT NULL,
        data_freshness TEXT,
        explanation TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 6. risk_zones
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS risk_zones (
        id TEXT PRIMARY KEY,
        zone_name TEXT NOT NULL,
        disaster_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        coordinates_geojson TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 7. sensor_devices (explicitly in Simulation Mode for Review-1)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        data_mode TEXT NOT NULL DEFAULT 'simulation',
        normal_threshold REAL NOT NULL DEFAULT 2.5,
        warning_threshold REAL NOT NULL DEFAULT 3.8,
        critical_threshold REAL NOT NULL DEFAULT 5.0,
        status TEXT NOT NULL DEFAULT 'online',
        last_reading_time TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 8. sensor_data
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_data (
        id TEXT PRIMARY KEY,
        sensor_id TEXT NOT NULL,
        water_level_meters REAL NOT NULL,
        threshold_status TEXT NOT NULL,
        data_mode TEXT NOT NULL DEFAULT 'simulation',
        recorded_at TEXT NOT NULL,
        FOREIGN KEY(sensor_id) REFERENCES sensor_devices(id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_data_recorded ON sensor_data(recorded_at);")

    # 9. rescue_teams
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rescue_teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        team_type TEXT NOT NULL,
        operational_status TEXT NOT NULL DEFAULT 'Available',
        base_location TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 6,
        contact_number TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 10. resources
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Available',
        current_location TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # 11. resource_assignments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS resource_assignments (
        id TEXT PRIMARY KEY,
        incident_id TEXT,
        report_id TEXT,
        team_id TEXT,
        resource_id TEXT,
        assigned_by TEXT NOT NULL DEFAULT 'Dispatcher',
        approval_status TEXT NOT NULL DEFAULT 'Approved',
        assignment_notes TEXT,
        assigned_at TEXT NOT NULL,
        released_at TEXT,
        FOREIGN KEY(team_id) REFERENCES rescue_teams(id),
        FOREIGN KEY(report_id) REFERENCES emergency_reports(id)
    );
    """)

    # 12. notifications
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        is_read INTEGER NOT NULL DEFAULT 0,
        link_target TEXT,
        created_at TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);")

    # 13. data_source_status
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS data_source_status (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        last_successful_fetch TEXT,
        last_error TEXT,
        records_count INTEGER NOT NULL DEFAULT 0,
        details TEXT,
        updated_at TEXT NOT NULL
    );
    """)

    # 14. audit_logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()

    # Seed standard initial data sources and rescue teams if empty
    seed_initial_data(conn)
    conn.close()

def seed_initial_data(conn: sqlite3.Connection):
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    
    # Seed data sources tracker
    sources = [
        ("GDACS", "CONNECTED", "Global Disaster Alert and Coordination System RSS feed active", now),
        ("NASA_FIRMS", "CONFIG_REQUIRED" if not settings.NASA_FIRMS_API_KEY else "CONNECTED", 
         "NASA FIRMS Map Key required for direct satellite fire queries (https://firms.modaps.eosdis.nasa.gov/api/map_key/)", now),
        ("OPEN_METEO", "CONNECTED", 
         "Open-Meteo Global Forecast API active (CC BY 4.0 - https://open-meteo.com/)", now),
        ("WATER_LEVEL_SENSORS", "CONNECTED", "Software simulation mode active (SIMULATION MODE — NO PHYSICAL SENSOR CONNECTED)", now),
        ("SUPABASE_DATABASE", "CONNECTED" if settings.SUPABASE_URL else "LOCAL_STORAGE", 
         "Supabase PostgreSQL dual-persistence ready" if settings.SUPABASE_URL else "Local SQLite persistent engine active (migrations ready for Supabase)", now),
    ]
    
    # Remove legacy IMD tracker if present in existing databases
    cursor.execute("DELETE FROM data_source_status WHERE name = 'IMD';")
    
    for name, status, details, ts in sources:
        cursor.execute("""
            INSERT INTO data_source_status (id, name, status, last_successful_fetch, last_error, records_count, details, updated_at)
            VALUES (?, ?, ?, ?, NULL, 0, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
            status = excluded.status,
            details = excluded.details,
            updated_at = excluded.updated_at;
        """, (str(uuid.uuid4()), name, status, ts if status == "CONNECTED" else None, details, ts))

    # Seed baseline sensor stations (Simulation Mode)
    cursor.execute("SELECT COUNT(*) FROM sensor_devices")
    if cursor.fetchone()[0] == 0:
        sensors = [
            ("sens-01", "River Basin Station Alpha", "Brahmaputra River - Guwahati Basin", 26.1445, 91.7362, 2.5, 3.8, 5.0),
            ("sens-02", "Urban Storm Drainage Beta", "Mithi River - Kurla Waterway", 19.0728, 72.8826, 2.0, 3.2, 4.5),
            ("sens-03", "Reservoir Spillway Gamma", "Periyar Dam Reservoir Outflow", 9.5298, 77.1428, 3.0, 4.2, 5.5),
        ]
        for s_id, s_name, loc, lat, lon, n_th, w_th, c_th in sensors:
            cursor.execute("""
                INSERT INTO sensor_devices (id, name, location_name, latitude, longitude, data_mode, normal_threshold, warning_threshold, critical_threshold, status, last_reading_time, created_at)
                VALUES (?, ?, ?, ?, ?, 'simulation', ?, ?, ?, 'online', ?, ?);
            """, (s_id, s_name, loc, lat, lon, n_th, w_th, c_th, now, now))
            
            # Initial baseline readings
            cursor.execute("""
                INSERT INTO sensor_data (id, sensor_id, water_level_meters, threshold_status, data_mode, recorded_at)
                VALUES (?, ?, ?, 'Normal', 'simulation', ?);
            """, (str(uuid.uuid4()), s_id, 1.85, now))

    # Seed baseline emergency response teams
    cursor.execute("SELECT COUNT(*) FROM rescue_teams")
    if cursor.fetchone()[0] == 0:
        teams = [
            ("team-01", "NDRF Battalion 1 - Rapid Water Rescue", "flood_boat", "Available", "Guwahati Riverside Base", 26.1850, 91.7450, 10, "+91-9876543210"),
            ("team-02", "SDRF Urban Search & Rescue Unit", "search_rescue", "Available", "Central Civil Defense Depot", 19.0760, 72.8777, 12, "+91-9876543211"),
            ("team-03", "Emergency Medical Paramedic Unit 4", "ambulance", "Available", "District Trauma Centre", 19.0550, 72.8900, 4, "+91-9876543212"),
            ("team-04", "Fire & Hazmat Tactical Squad", "fire_response", "Available", "Western Sector Fire Command", 26.1200, 91.7100, 8, "+91-9876543213"),
            ("team-05", "Coastal Amphibious Rescue Unit", "flood_boat", "Available", "Southern Marine Outpost", 9.5400, 77.1300, 6, "+91-9876543214"),
        ]
        for t_id, t_name, t_type, t_status, loc, lat, lon, cap, phone in teams:
            cursor.execute("""
                INSERT INTO rescue_teams (id, name, team_type, operational_status, base_location, latitude, longitude, capacity, contact_number, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (t_id, t_name, t_type, t_status, loc, lat, lon, cap, phone, now, now))

    conn.commit()

def log_audit(entity_type: str, entity_id: str, action: str, performed_by: str = "Dispatcher", details: Optional[Dict] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (str(uuid.uuid4()), entity_type, entity_id, action, performed_by, json.dumps(details or {}), now))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[AUDIT LOG ERROR] {e}")

def create_notification(title: str, message: str, notification_type: str, severity: str = "info", link_target: Optional[str] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        # Avoid duplicate notifications within last 1 hour with same title and message
        cursor.execute("""
            SELECT id FROM notifications 
            WHERE title = ? AND message = ? AND created_at > datetime('now', '-1 hour')
            LIMIT 1;
        """, (title, message))
        if cursor.fetchone():
            conn.close()
            return
            
        cursor.execute("""
            INSERT INTO notifications (id, title, message, notification_type, severity, is_read, link_target, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?);
        """, (str(uuid.uuid4()), title, message, notification_type, severity, link_target, now))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[NOTIFICATION ERROR] {e}")
