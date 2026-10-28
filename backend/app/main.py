import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, get_db_connection
from app.services.gdacs_service import fetch_and_sync_gdacs

# Routers
from app.routers.dashboard import router as dashboard_router
from app.routers.incidents import router as incidents_router
from app.routers.reports import router as reports_router
from app.routers.ai import router as ai_router
from app.routers.risk import router as risk_router
from app.routers.sensors import router as sensors_router
from app.routers.teams import router as teams_router
from app.routers.analytics import router as analytics_router
from app.routers.notifications import router as notifications_router
from app.routers.datasources import router as datasources_router
from app.routers.weather import router as weather_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database schema and initial state
    print("[STARTUP] Initializing Disaster Response database schema...")
    init_db()
    
    # Trigger background sync of live GDACS disaster events (non-blocking)
    print("[STARTUP] Spawning initial GDACS live alert sync task...")
    asyncio.create_task(fetch_and_sync_gdacs())
    
    yield
    print("[SHUTDOWN] Disaster Response Platform backend stopped.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for TechManjari Review-1 Disaster Response Analytics Platform. Unified real-time disaster monitoring, GIS, AI incident analysis, simulated flood sensing, and rescue resource dispatch.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local dev and preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root and Health Check
@app.get("/health")
def health_check():
    db_ok = False
    try:
        conn = get_db_connection()
        conn.cursor().execute("SELECT 1;")
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False
        
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database_connected": db_ok,
        "sensor_mode": "SIMULATION_MODE",
        "hardware_connected": False,
        "weather_service": "Open-Meteo Forecast API (CC BY 4.0)",
        "review_stage": "TechManjari Review-1"
    }

# Register all API routes
app.include_router(dashboard_router, prefix="/api/dashboard")
app.include_router(incidents_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(sensors_router, prefix="/api")
app.include_router(teams_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(datasources_router, prefix="/api")
app.include_router(weather_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
