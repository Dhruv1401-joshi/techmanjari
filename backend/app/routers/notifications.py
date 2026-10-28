from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.core.database import get_db_connection
from app.models.schemas import NotificationResponse

router = APIRouter(tags=["Notifications"])

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(unread_only: bool = Query(False), limit: int = Query(50, le=100)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM notifications WHERE 1=1"
    if unread_only:
        query += " AND is_read = 0"
    query += " ORDER BY created_at DESC LIMIT ?;"
    
    cursor.execute(query, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        d = dict(r)
        d['is_read'] = bool(d['is_read'])
        results.append(d)
    return results

@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ?;", (notification_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "id": notification_id}

@router.post("/notifications/read-all")
def mark_all_notifications_read():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1;")
    conn.commit()
    conn.close()
    return {"status": "success", "message": "All notifications marked as read"}
