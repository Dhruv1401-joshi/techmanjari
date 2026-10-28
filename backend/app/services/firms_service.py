import httpx
import uuid
import csv
import io
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.core.config import settings
from app.core.database import get_db_connection

NASA_FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/country/csv"

async def fetch_and_sync_firms(country_code: str = "IND", days: int = 1) -> Dict[str, Any]:
    """
    NASA FIRMS satellite fire monitoring adapter.
    If NASA_FIRMS_API_KEY is configured, retrieves satellite thermal hotspot observations.
    If the key is missing or invalid, updates data_source_status to CONFIG_REQUIRED
    with setup documentation. Never fabricates fake hotspots.
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if not settings.NASA_FIRMS_API_KEY:
        msg = "NASA FIRMS API key not configured. Obtain a free MAP_KEY at https://firms.modaps.eosdis.nasa.gov/api/map_key/ and configure NASA_FIRMS_API_KEY in backend/.env"
        cursor.execute("""
            UPDATE data_source_status
            SET status = 'CONFIG_REQUIRED',
                last_error = ?,
                details = ?,
                updated_at = ?
            WHERE name = 'NASA_FIRMS';
        """, (msg, "Registration required: Map key needed for satellite thermal detection stream.", now))
        conn.commit()
        conn.close()
        return {
            "status": "config_required",
            "message": msg,
            "registration_url": "https://firms.modaps.eosdis.nasa.gov/api/map_key/",
            "records_imported": 0
        }
        
    url = f"{NASA_FIRMS_BASE_URL}/{settings.NASA_FIRMS_API_KEY}/VIIRS_SNPP_NRT/{country_code}/{days}"
    
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url)
            
        if response.status_code == 403 or "Invalid Map Key" in response.text:
            msg = "Provided NASA FIRMS Map Key is invalid or expired. Check https://firms.modaps.eosdis.nasa.gov/api/map_key/"
            cursor.execute("""
                UPDATE data_source_status
                SET status = 'ERROR', last_error = ?, updated_at = ?
                WHERE name = 'NASA_FIRMS';
            """, (msg, now))
            conn.commit()
            conn.close()
            return {"status": "error", "message": msg, "records_imported": 0}
            
        if response.status_code != 200:
            msg = f"HTTP {response.status_code}: NASA FIRMS request failed."
            cursor.execute("""
                UPDATE data_source_status
                SET status = 'ERROR', last_error = ?, updated_at = ?
                WHERE name = 'NASA_FIRMS';
            """, (msg, now))
            conn.commit()
            conn.close()
            return {"status": "error", "message": msg, "records_imported": 0}
            
        # Parse CSV
        reader = csv.DictReader(io.StringIO(response.text))
        imported_count = 0
        
        for row in reader:
            try:
                lat = float(row.get('latitude', 0))
                lon = float(row.get('longitude', 0))
                brightness = float(row.get('bright_ti4', row.get('brightness', 0)))
                confidence = row.get('confidence', 'nominal')
                acq_date = row.get('acq_date', now[:10])
                acq_time = row.get('acq_time', '0000')
                satellite = row.get('satellite', 'VIIRS')
                frp = row.get('frp', 'N/A')
                
                # Deterministic source ID based on lat/lon/acq_date/acq_time
                source_id = f"FIRMS_{lat:.4f}_{lon:.4f}_{acq_date}_{acq_time}"
                title = f"Satellite Thermal Hotspot ({satellite}) - Brightness: {brightness}K"
                desc = f"FRP: {frp}MW, Confidence: {confidence}, Acquired: {acq_date} {acq_time} UTC"
                
                # Confidence mapping to severity
                conf_lower = str(confidence).lower()
                if conf_lower in ['h', 'high'] or brightness > 350:
                    severity = "High"
                elif conf_lower in ['n', 'nominal'] or brightness > 320:
                    severity = "Medium"
                else:
                    severity = "Low"
                    
                cursor.execute("""
                    INSERT INTO incidents (
                        id, title, disaster_category, severity, location_name,
                        latitude, longitude, source, source_event_id, source_url,
                        description, status, event_time, updated_at
                    ) VALUES (?, ?, 'fire', ?, 'Satellite Fire Hotspot Sector', ?, ?, 'NASA_FIRMS', ?, 'https://firms.modaps.eosdis.nasa.gov/', ?, 'active', ?, ?)
                    ON CONFLICT(source_event_id) DO UPDATE SET
                        severity = excluded.severity,
                        description = excluded.description,
                        updated_at = excluded.updated_at;
                """, (str(uuid.uuid4()), title, severity, lat, lon, source_id, desc, f"{acq_date}T{acq_time[:2]}:{acq_time[2:]}:00Z", now))
                imported_count += 1
            except Exception:
                continue
                
        cursor.execute("SELECT COUNT(*) FROM incidents WHERE source = 'NASA_FIRMS'")
        total_records = cursor.fetchone()[0]
        
        cursor.execute("""
            UPDATE data_source_status
            SET status = 'CONNECTED',
                last_successful_fetch = ?,
                last_error = NULL,
                records_count = ?,
                details = ?,
                updated_at = ?
            WHERE name = 'NASA_FIRMS';
        """, (now, total_records, f"Successfully parsed {imported_count} real NASA FIRMS hotspot records", now))
        conn.commit()
        conn.close()
        
        return {"status": "success", "records_imported": imported_count, "total_records": total_records}
        
    except Exception as e:
        cursor.execute("""
            UPDATE data_source_status
            SET status = 'ERROR', last_error = ?, updated_at = ?
            WHERE name = 'NASA_FIRMS';
        """, (str(e), now))
        conn.commit()
        conn.close()
        return {"status": "error", "message": str(e), "records_imported": 0}
