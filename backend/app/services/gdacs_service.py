import httpx
import xml.etree.ElementTree as ET
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.database import get_db_connection, create_notification

GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"

# XML namespaces commonly used in GDACS feed
NAMESPACES = {
    'geo': 'http://www.w3.org/2003/01/geo/wgs84_pos#',
    'georss': 'http://www.georss.org/georss',
    'gdacs': 'http://www.gdacs.org',
}

CATEGORY_MAP = {
    'FL': 'flood',
    'TC': 'cyclone',
    'EQ': 'earthquake',
    'WF': 'fire',
    'DR': 'drought',
    'TS': 'tsunami',
    'VO': 'volcano',
}

async def fetch_and_sync_gdacs() -> Dict[str, Any]:
    """
    Fetches real live disaster alerts from the official GDACS public RSS feed.
    Parses events, extracts coordinates, severity, alertlevel, and deduplicates.
    """
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(GDACS_RSS_URL, headers={"User-Agent": "DisasterResponsePlatform/1.0"})
            
        if response.status_code != 200:
            error_msg = f"HTTP {response.status_code}: GDACS feed returned error"
            cursor.execute("""
                UPDATE data_source_status 
                SET last_error = ?, status = 'ERROR', updated_at = ?
                WHERE name = 'GDACS';
            """, (error_msg, now))
            conn.commit()
            conn.close()
            return {"status": "error", "message": error_msg, "records_imported": 0}
            
        # Parse XML
        xml_content = response.content
        root = ET.fromstring(xml_content)
        channel = root.find('channel')
        if channel is None:
            conn.close()
            return {"status": "error", "message": "Invalid RSS channel structure", "records_imported": 0}
            
        items = channel.findall('item')
        imported_count = 0
        new_critical_count = 0
        
        for item in items:
            title_elem = item.find('title')
            desc_elem = item.find('description')
            link_elem = item.find('link')
            guid_elem = item.find('guid')
            pub_date_elem = item.find('pubDate')
            
            title = title_elem.text.strip() if title_elem is not None and title_elem.text else "GDACS Alert"
            description = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ""
            source_url = link_elem.text.strip() if link_elem is not None and link_elem.text else ""
            source_id = guid_elem.text.strip() if guid_elem is not None and guid_elem.text else str(uuid.uuid4())
            pub_date = pub_date_elem.text.strip() if pub_date_elem is not None and pub_date_elem.text else now
            
            # Extract coordinates
            lat = None
            lon = None
            # Check geo:lat, geo:long
            lat_elem = item.find('geo:lat', NAMESPACES)
            lon_elem = item.find('geo:long', NAMESPACES)
            if lat_elem is not None and lon_elem is not None and lat_elem.text and lon_elem.text:
                try:
                    lat = float(lat_elem.text.strip())
                    lon = float(lon_elem.text.strip())
                except ValueError:
                    pass
                    
            if lat is None or lon is None:
                # Check georss:point
                point_elem = item.find('georss:point', NAMESPACES)
                if point_elem is not None and point_elem.text:
                    parts = point_elem.text.strip().split()
                    if len(parts) >= 2:
                        try:
                            lat = float(parts[0])
                            lon = float(parts[1])
                        except ValueError:
                            pass
                            
            # Extract alert level and event type
            alert_elem = item.find('gdacs:alertlevel', NAMESPACES)
            alert_level = alert_elem.text.strip().capitalize() if alert_elem is not None and alert_elem.text else "Medium"
            if alert_level.lower() == "orange":
                severity = "High"
            elif alert_level.lower() == "red":
                severity = "Critical"
                new_critical_count += 1
            elif alert_level.lower() == "green":
                severity = "Low"
            else:
                severity = "Medium"
                
            type_elem = item.find('gdacs:eventtype', NAMESPACES)
            raw_type = type_elem.text.strip().upper() if type_elem is not None and type_elem.text else ""
            category = CATEGORY_MAP.get(raw_type, "other")
            
            # Extract country or location
            country_elem = item.find('gdacs:country', NAMESPACES)
            location_name = country_elem.text.strip() if country_elem is not None and country_elem.text else "Global Watch Zone"
            
            # Upsert into incidents table
            cursor.execute("""
                INSERT INTO incidents (
                    id, title, disaster_category, severity, location_name, 
                    latitude, longitude, source, source_event_id, source_url, 
                    description, status, event_time, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'GDACS', ?, ?, ?, 'active', ?, ?)
                ON CONFLICT(source_event_id) DO UPDATE SET
                    title = excluded.title,
                    severity = excluded.severity,
                    description = excluded.description,
                    updated_at = excluded.updated_at;
            """, (str(uuid.uuid4()), title, category, severity, location_name, lat, lon, source_id, source_url, description, pub_date, now))
            
            imported_count += 1
            
        # Update data source status
        cursor.execute("SELECT COUNT(*) FROM incidents WHERE source = 'GDACS'")
        total_records = cursor.fetchone()[0]
        
        cursor.execute("""
            UPDATE data_source_status
            SET status = 'CONNECTED',
                last_successful_fetch = ?,
                last_error = NULL,
                records_count = ?,
                details = ?,
                updated_at = ?
            WHERE name = 'GDACS';
        """, (now, total_records, f"Successfully parsed {imported_count} real GDACS disaster alerts", now))
        
        conn.commit()
        
        if new_critical_count > 0:
            create_notification(
                title="Critical GDACS Alert Received",
                message=f"Received {new_critical_count} RED alert(s) from Global Disaster Alert System.",
                notification_type="OFFICIAL_ALERT",
                severity="critical",
                link_target="/map"
            )
            
        conn.close()
        return {"status": "success", "records_imported": imported_count, "total_records": total_records}
        
    except Exception as e:
        cursor.execute("""
            UPDATE data_source_status 
            SET last_error = ?, status = 'ERROR', updated_at = ?
            WHERE name = 'GDACS';
        """, (str(e), now))
        conn.commit()
        conn.close()
        return {"status": "error", "message": str(e), "records_imported": 0}
