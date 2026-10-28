import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    APP_NAME: str = "Disaster Response Analytics Platform"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    API_PREFIX: str = "/api"
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # External credentials (none fabricated)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    NASA_FIRMS_API_KEY: str = os.getenv("NASA_FIRMS_API_KEY", "")
    
    # Open-Meteo Forecast Configuration (Public API - CC BY 4.0 - No credentials needed)
    # Attribution required: https://open-meteo.com/
    OPEN_METEO_API_URL: str = os.getenv("OPEN_METEO_API_URL", "https://api.open-meteo.com/v1/forecast")
    DEFAULT_WEATHER_LATITUDE: float = float(os.getenv("DEFAULT_WEATHER_LATITUDE", "19.0760"))
    DEFAULT_WEATHER_LONGITUDE: float = float(os.getenv("DEFAULT_WEATHER_LONGITUDE", "72.8777"))
    DEFAULT_WEATHER_LOCATION_NAME: str = os.getenv("DEFAULT_WEATHER_LOCATION_NAME", "Mumbai Operations Command")
    WEATHER_CACHE_TTL_SECONDS: int = int(os.getenv("WEATHER_CACHE_TTL_SECONDS", "900"))
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.netlify.app",
    ]
    
    # Data storage: SQLite local fallback db file
    DATABASE_PATH: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "disaster_response.db")
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "300"))

settings = Settings()
