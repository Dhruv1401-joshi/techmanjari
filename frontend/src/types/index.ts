export interface Incident {
  id: string;
  title: string;
  disaster_category: 'flood' | 'fire' | 'earthquake' | 'cyclone' | 'drought' | 'tsunami' | 'medical' | 'landslide' | 'other';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  source: 'GDACS' | 'NASA_FIRMS' | 'OPEN_METEO' | 'IMD' | 'REPORT';
  source_event_id?: string;
  source_url?: string;
  description?: string;
  status: 'active' | 'contained' | 'resolved';
  event_time: string;
  updated_at: string;
}

export interface EmergencyReport {
  id: string;
  title: string;
  description: string;
  disaster_category: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  reported_time: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  reporter_name?: string;
  reporter_contact?: string;
  verification_status: 'Unverified' | 'Verified' | 'Rejected';
  current_status: 'Submitted' | 'Under Review' | 'Verified' | 'In Progress' | 'Resolved' | 'Rejected';
  assigned_team_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PossibleDuplicate {
  report_id: string;
  title: string;
  similarity_score: number;
  location_name: string;
}

export interface AIAnalysisResult {
  suggested_category: string;
  suggested_priority: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  confidence_band: 'High' | 'Moderate' | 'Preliminary';
  explanation: string;
  extracted_locations: string[];
  extracted_entities: string[];
  suggested_review_action: string;
  possible_duplicates: PossibleDuplicate[];
  baseline_mode: string;
}

export interface RiskAssessment {
  id: string;
  disaster_type: string;
  location_name: string;
  score: number | null;
  risk_category: 'Low' | 'Moderate' | 'High' | 'Critical' | 'Insufficient Data';
  inputs_used: Record<string, any>;
  scoring_method_version: string;
  data_freshness: string;
  explanation: string;
  created_at: string;
}

export interface SensorDevice {
  id: string;
  name: string;
  location_name: string;
  latitude: number;
  longitude: number;
  data_mode: 'simulation' | 'hardware';
  normal_threshold: number;
  warning_threshold: number;
  critical_threshold: number;
  status: string;
  last_reading_time?: string;
  latest_reading?: number;
  latest_threshold_status?: 'Normal' | 'Warning' | 'Critical';
}

export interface SensorReading {
  id: string;
  sensor_id: string;
  water_level_meters: number;
  threshold_status: 'Normal' | 'Warning' | 'Critical';
  data_mode: string;
  recorded_at: string;
}

export interface RescueTeam {
  id: string;
  name: string;
  team_type: 'flood_boat' | 'search_rescue' | 'ambulance' | 'fire_response' | 'medical_unit';
  operational_status: 'Available' | 'Assigned' | 'Busy' | 'Offline';
  base_location: string;
  latitude: number;
  longitude: number;
  capacity: number;
  contact_number?: string;
  assigned_incident_title?: string;
  recommendation_score?: number;
  recommendation_reason?: string;
}

export interface ResourceAssignment {
  id: string;
  incident_id?: string;
  report_id?: string;
  team_id: string;
  team_name?: string;
  team_type?: string;
  assigned_by: string;
  approval_status: 'Approved' | 'Completed' | 'Pending';
  assignment_notes?: string;
  assigned_at: string;
  released_at?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: 'OFFICIAL_ALERT' | 'REPORT_SUBMITTED' | 'SENSOR_THRESHOLD' | 'RISK_CHANGE' | 'RESOURCE_ASSIGNMENT';
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  link_target?: string;
  created_at: string;
}

export interface DataSourceStatus {
  id: string;
  name: string;
  status: 'CONNECTED' | 'CONFIG_REQUIRED' | 'DISCONNECTED' | 'ERROR' | 'LOCAL_STORAGE';
  last_successful_fetch?: string;
  last_error?: string;
  records_count: number;
  details?: string;
  updated_at: string;
}

export interface DashboardSummary {
  total_recorded_incidents: number;
  active_incidents: number;
  verified_incidents: number;
  unverified_reports_awaiting_review: number;
  high_priority_incidents: number;
  available_rescue_teams: number;
  total_rescue_teams: number;
  sensor_simulation_status: string;
  data_sources_status: DataSourceStatus[];
  category_distribution: { category: string; count: number }[];
  risk_distribution: { level: string; count: number }[];
  recent_activity: any[];
  last_data_refresh?: string;
  database_mode: string;
}

// Open-Meteo Weather Types (CC BY 4.0 — https://open-meteo.com/)
export interface WeatherCurrent {
  time: string;
  temperature: number | null;
  temperature_unit: string;
  relative_humidity: number | null;
  relative_humidity_unit: string;
  apparent_temperature: number | null;
  apparent_temperature_unit: string;
  precipitation: number | null;
  precipitation_unit: string;
  wind_speed: number | null;
  wind_speed_unit: string;
  wind_direction: number | null;
  wind_direction_unit: string;
  surface_pressure: number | null;
  surface_pressure_unit: string;
  weather_code: number | null;
  weather_description: string;
  icon: string;
}

export interface WeatherHourlyPoint {
  time: string;
  temperature: number | null;
  relative_humidity: number | null;
  precipitation_probability: number | null;
  precipitation: number | null;
  wind_speed: number | null;
  weather_code: number | null;
  weather_description: string;
  icon: string;
}

export interface WeatherDailyPoint {
  date: string;
  weather_code: number | null;
  weather_description: string;
  temperature_max: number | null;
  temperature_min: number | null;
  precipitation_sum: number | null;
  precipitation_probability_max: number | null;
  wind_speed_max: number | null;
  icon: string;
}

export interface WeatherAttribution {
  source: string;
  text: string;
  url: string;
  license: string;
  terms_url: string;
  notice?: string;
}

export interface WeatherForecast {
  location_name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
  timezone_abbreviation?: string;
  fetched_at: string;
  cached: boolean;
  current: WeatherCurrent;
  hourly: WeatherHourlyPoint[];
  daily: WeatherDailyPoint[];
  attribution: WeatherAttribution;
}

export interface WeatherLocationPreset {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  zone?: string;
}

export interface WeatherLocations {
  current_configured: WeatherLocationPreset;
  presets: WeatherLocationPreset[];
}
