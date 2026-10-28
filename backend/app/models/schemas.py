from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class IncidentResponse(BaseModel):
    id: str
    title: str
    disaster_category: str
    severity: str
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: str
    source_event_id: Optional[str] = None
    source_url: Optional[str] = None
    description: Optional[str] = None
    status: str
    event_time: str
    updated_at: str

class EmergencyReportCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10)
    disaster_category: str
    location_name: str = Field(..., min_length=2)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    priority: str = "Medium"
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None

class EmergencyReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    disaster_category: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    priority: Optional[str] = None
    verification_status: Optional[str] = None
    current_status: Optional[str] = None
    assigned_team_id: Optional[str] = None
    notes: Optional[str] = None

class EmergencyReportResponse(BaseModel):
    id: str
    title: str
    description: str
    disaster_category: str
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    reported_time: str
    priority: str
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    verification_status: str
    current_status: str
    assigned_team_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class AIAnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=5)
    existing_report_id: Optional[str] = None

class PossibleDuplicate(BaseModel):
    report_id: str
    title: str
    similarity_score: float
    location_name: str

class AIAnalyzeResponse(BaseModel):
    suggested_category: str
    suggested_priority: str
    confidence: float
    confidence_band: str  # 'High', 'Moderate', 'Preliminary'
    explanation: str
    extracted_locations: List[str]
    extracted_entities: List[str]
    suggested_review_action: str
    possible_duplicates: List[PossibleDuplicate] = []
    baseline_mode: str = "transparent_rule_heuristic"

class RiskEvaluateRequest(BaseModel):
    disaster_type: str
    location_name: str
    water_level_ratio: Optional[float] = None  # e.g. 0.8 (current/critical)
    rainfall_mm_24h: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    hotspot_count: Optional[int] = None
    seismic_zone_factor: Optional[float] = None

class RiskAssessmentResponse(BaseModel):
    id: str
    disaster_type: str
    location_name: str
    score: Optional[float] = None
    risk_category: str  # 'Low', 'Moderate', 'High', 'Critical', or 'Insufficient Data'
    inputs_used: Dict[str, Any]
    scoring_method_version: str
    data_freshness: str
    explanation: str
    created_at: str

class SensorDeviceResponse(BaseModel):
    id: str
    name: str
    location_name: str
    latitude: float
    longitude: float
    data_mode: str = "simulation"
    normal_threshold: float
    warning_threshold: float
    critical_threshold: float
    status: str
    last_reading_time: Optional[str] = None
    latest_reading: Optional[float] = None
    latest_threshold_status: Optional[str] = None

class SensorReadingResponse(BaseModel):
    id: str
    sensor_id: str
    water_level_meters: float
    threshold_status: str
    data_mode: str
    recorded_at: str

class SimulationControlRequest(BaseModel):
    sensor_id: str
    scenario: str  # 'steady_normal', 'rising_monsoon', 'flash_flood', 'storm_recession'
    action: str = "tick"  # 'tick', 'reset', 'pause', 'resume'

class SensorIngestRequest(BaseModel):
    sensor_id: str
    water_level_meters: float
    api_key: Optional[str] = None

class RescueTeamResponse(BaseModel):
    id: str
    name: str
    team_type: str
    operational_status: str
    base_location: str
    latitude: float
    longitude: float
    capacity: int
    contact_number: Optional[str] = None
    assigned_incident_title: Optional[str] = None

class ResourceAssignmentCreate(BaseModel):
    report_id: Optional[str] = None
    incident_id: Optional[str] = None
    team_id: str
    resource_id: Optional[str] = None
    assignment_notes: Optional[str] = None

class ResourceAssignmentResponse(BaseModel):
    id: str
    incident_id: Optional[str] = None
    report_id: Optional[str] = None
    team_id: str
    team_name: Optional[str] = None
    team_type: Optional[str] = None
    assigned_by: str
    approval_status: str
    assignment_notes: Optional[str] = None
    assigned_at: str
    released_at: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str
    severity: str
    is_read: bool
    link_target: Optional[str] = None
    created_at: str

class DataSourceResponse(BaseModel):
    id: str
    name: str
    status: str
    last_successful_fetch: Optional[str] = None
    last_error: Optional[str] = None
    records_count: int
    details: Optional[str] = None
    updated_at: str

class DashboardSummaryResponse(BaseModel):
    total_recorded_incidents: int
    active_incidents: int
    verified_incidents: int
    unverified_reports_awaiting_review: int
    high_priority_incidents: int
    available_rescue_teams: int
    total_rescue_teams: int
    sensor_simulation_status: str
    data_sources_status: List[DataSourceResponse]
    category_distribution: List[Dict[str, Any]]
    risk_distribution: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    last_data_refresh: Optional[str] = None
    database_mode: str

# Open-Meteo Weather Schemas
class WeatherCurrent(BaseModel):
    time: str
    temperature: Optional[float] = None
    temperature_unit: str = "°C"
    relative_humidity: Optional[float] = None
    relative_humidity_unit: str = "%"
    apparent_temperature: Optional[float] = None
    apparent_temperature_unit: str = "°C"
    precipitation: Optional[float] = None
    precipitation_unit: str = "mm"
    wind_speed: Optional[float] = None
    wind_speed_unit: str = "km/h"
    wind_direction: Optional[float] = None
    wind_direction_unit: str = "°"
    surface_pressure: Optional[float] = None
    surface_pressure_unit: str = "hPa"
    weather_code: Optional[int] = None
    weather_description: str
    icon: str = "Cloud"

class WeatherHourlyPoint(BaseModel):
    time: str
    temperature: Optional[float] = None
    relative_humidity: Optional[float] = None
    precipitation_probability: Optional[float] = None
    precipitation: Optional[float] = None
    wind_speed: Optional[float] = None
    weather_code: Optional[int] = None
    weather_description: str
    icon: str = "Cloud"

class WeatherDailyPoint(BaseModel):
    date: str
    weather_code: Optional[int] = None
    weather_description: str
    temperature_max: Optional[float] = None
    temperature_min: Optional[float] = None
    precipitation_sum: Optional[float] = None
    precipitation_probability_max: Optional[float] = None
    wind_speed_max: Optional[float] = None
    icon: str = "Cloud"

class WeatherAttribution(BaseModel):
    source: str = "Open-Meteo"
    text: str = "Weather data by Open-Meteo.com"
    url: str = "https://open-meteo.com/"
    license: str = "CC BY 4.0"
    terms_url: str = "https://open-meteo.com/en/terms"
    notice: Optional[str] = None

class WeatherForecastResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    timezone: str = "UTC"
    timezone_abbreviation: Optional[str] = None
    fetched_at: str
    cached: bool = False
    current: WeatherCurrent
    hourly: List[WeatherHourlyPoint] = []
    daily: List[WeatherDailyPoint] = []
    attribution: WeatherAttribution

class WeatherLocationPreset(BaseModel):
    id: Optional[str] = None
    name: str
    latitude: float
    longitude: float
    zone: Optional[str] = None

class WeatherLocationsResponse(BaseModel):
    current_configured: WeatherLocationPreset
    presets: List[WeatherLocationPreset]

class ConfiguredLocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    location_name: str = Field(..., min_length=2, max_length=150)

