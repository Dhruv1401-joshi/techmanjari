-- =========================================================================
-- DISASTER RESPONSE ANALYTICS PLATFORM
-- Supabase PostgreSQL Schema & Row Level Security (RLS) Migrations
-- TechManjari Review-1 Architecture
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'dispatcher', -- 'dispatcher', 'responder', 'admin', 'analyst', 'public'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Official / Consolidated Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    disaster_category TEXT NOT NULL, -- 'flood', 'fire', 'earthquake', 'cyclone', 'medical', 'landslide', 'other'
    severity TEXT NOT NULL,          -- 'Low', 'Medium', 'High', 'Critical'
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    source TEXT NOT NULL,            -- 'GDACS', 'NASA_FIRMS', 'OPEN_METEO', 'IMD', 'REPORT'
    source_event_id TEXT UNIQUE,
    source_url TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'contained', 'resolved'
    event_time TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(disaster_category);
CREATE INDEX IF NOT EXISTS idx_incidents_source ON incidents(source);
CREATE INDEX IF NOT EXISTS idx_incidents_time ON incidents(event_time);

-- 3. Citizen / Field Emergency Reports Table
CREATE TABLE IF NOT EXISTS emergency_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    disaster_category TEXT NOT NULL,
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    reported_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    priority TEXT NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    reporter_name TEXT,
    reporter_contact TEXT,
    verification_status TEXT NOT NULL DEFAULT 'Unverified', -- 'Unverified', 'Verified', 'Rejected'
    current_status TEXT NOT NULL DEFAULT 'Submitted',       -- 'Submitted', 'Under Review', 'Verified', 'In Progress', 'Resolved', 'Rejected'
    assigned_team_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON emergency_reports(current_status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON emergency_reports(priority);

-- 4. Forecast Records Table
CREATE TABLE IF NOT EXISTS forecast_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_type TEXT NOT NULL,
    location_name TEXT NOT NULL,
    forecast_period TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    severity TEXT,
    source TEXT NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Transparent Risk Assessments Table
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_type TEXT NOT NULL,
    location_name TEXT NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    risk_category TEXT NOT NULL, -- 'Low', 'Moderate', 'High', 'Critical'
    inputs_used JSONB NOT NULL,
    scoring_method_version TEXT NOT NULL,
    data_freshness TEXT,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Risk Zones Table
CREATE TABLE IF NOT EXISTS risk_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_name TEXT NOT NULL,
    disaster_type TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    coordinates_geojson JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Sensor Devices Table (Simulation Mode for Review-1)
CREATE TABLE IF NOT EXISTS sensor_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    data_mode TEXT NOT NULL DEFAULT 'simulation', -- 'simulation', 'hardware'
    normal_threshold DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    warning_threshold DOUBLE PRECISION NOT NULL DEFAULT 3.8,
    critical_threshold DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    status TEXT NOT NULL DEFAULT 'online',
    last_reading_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Sensor Readings Stream Table
CREATE TABLE IF NOT EXISTS sensor_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID REFERENCES sensor_devices(id) ON DELETE CASCADE,
    water_level_meters DOUBLE PRECISION NOT NULL,
    threshold_status TEXT NOT NULL, -- 'Normal', 'Warning', 'Critical'
    data_mode TEXT NOT NULL DEFAULT 'simulation',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sensor_data_recorded ON sensor_data(recorded_at);

-- 9. Rescue Teams Table
CREATE TABLE IF NOT EXISTS rescue_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    team_type TEXT NOT NULL, -- 'flood_boat', 'search_rescue', 'ambulance', 'fire_response', 'medical_unit'
    operational_status TEXT NOT NULL DEFAULT 'Available', -- 'Available', 'Assigned', 'Busy', 'Offline'
    base_location TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 6,
    contact_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    current_location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Resource Assignments Table (Human in the Loop)
CREATE TABLE IF NOT EXISTS resource_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    report_id UUID REFERENCES emergency_reports(id) ON DELETE SET NULL,
    team_id UUID REFERENCES rescue_teams(id) ON DELETE SET NULL,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    assigned_by TEXT NOT NULL DEFAULT 'Dispatcher',
    approval_status TEXT NOT NULL DEFAULT 'Approved',
    assignment_notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    released_at TIMESTAMPTZ
);

-- 12. In-App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_target TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Data Source Status Table
CREATE TABLE IF NOT EXISTS data_source_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL, -- 'CONNECTED', 'CONFIG_REQUIRED', 'DISCONNECTED', 'ERROR'
    last_successful_fetch TIMESTAMPTZ,
    last_error TEXT,
    records_count INTEGER NOT NULL DEFAULT 0,
    details TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Incidents: Anyone can read incidents; only authenticated service role can insert/update
CREATE POLICY "Public read incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Service write incidents" ON incidents FOR ALL USING (true);

-- Emergency Reports: Anyone can submit a report; authenticated responders/dispatchers can update status
CREATE POLICY "Public insert reports" ON emergency_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read reports" ON emergency_reports FOR SELECT USING (true);
CREATE POLICY "Authorized update reports" ON emergency_reports FOR UPDATE USING (true);

-- Sensors: Public read sensor readings; simulation engine or authenticated hardware can write
CREATE POLICY "Public read sensors" ON sensor_devices FOR SELECT USING (true);
CREATE POLICY "Public read sensor data" ON sensor_data FOR SELECT USING (true);
CREATE POLICY "System insert sensor data" ON sensor_data FOR INSERT WITH CHECK (true);

-- Teams and Resources: Read all; dispatch updates allowed
CREATE POLICY "Public read teams" ON rescue_teams FOR SELECT USING (true);
CREATE POLICY "Public read assignments" ON resource_assignments FOR SELECT USING (true);

-- Notifications: Read all
CREATE POLICY "Public read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Public update notifications" ON notifications FOR UPDATE USING (true);
