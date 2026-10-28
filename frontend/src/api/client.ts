import {
  Incident,
  EmergencyReport,
  AIAnalysisResult,
  RiskAssessment,
  SensorDevice,
  SensorReading,
  RescueTeam,
  ResourceAssignment,
  NotificationItem,
  DataSourceStatus,
  DashboardSummary
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let errMsg = `Request failed: ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errMsg = errorJson.detail || errorJson.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return await response.json();
  } catch (error: any) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  // Health
  getHealth: () => request<any>('/health'),

  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>('/api/dashboard/summary'),

  // Incidents & Live Feeds
  getIncidents: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Incident[]>(`/api/incidents${query ? `?${query}` : ''}`);
  },
  getIncidentById: (id: string) => request<Incident>(`/api/incidents/${id}`),
  syncGdacs: () => request<any>('/api/disasters/gdacs'),
  syncFirms: () => request<any>('/api/disasters/firms'),

  // Emergency Reports
  getReports: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<EmergencyReport[]>(`/api/reports${query ? `?${query}` : ''}`);
  },
  getReportById: (id: string) => request<EmergencyReport>(`/api/reports/${id}`),
  createReport: (data: Partial<EmergencyReport>) =>
    request<EmergencyReport>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateReport: (id: string, data: Partial<EmergencyReport>) =>
    request<EmergencyReport>(`/api/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteReport: (id: string) =>
    request<any>(`/api/reports/${id}`, {
      method: 'DELETE',
    }),

  // AI Incident Analyzer
  analyzeIncident: (text: string, existing_report_id?: string) =>
    request<AIAnalysisResult>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ text, existing_report_id }),
    }),

  // Risk Assessment
  getRiskAssessments: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<RiskAssessment[]>(`/api/risk-assessments${query ? `?${query}` : ''}`);
  },
  evaluateRisk: (payload: any) =>
    request<RiskAssessment>('/api/risk-assessments/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Sensor Monitoring (Simulation Mode)
  getSensors: () => request<SensorDevice[]>('/api/sensors'),
  getSensorReadings: (id: string, limit = 40) =>
    request<SensorReading[]>(`/api/sensors/${id}/readings?limit=${limit}`),
  controlSimulation: (sensor_id: string, scenario: string, action = 'tick') =>
    request<any>('/api/sensors/simulation/control', {
      method: 'POST',
      body: JSON.stringify({ sensor_id, scenario, action }),
    }),

  // Rescue Teams & Resources
  getTeams: (status?: string) => {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return request<RescueTeam[]>(`/api/teams${query}`);
  },
  getTeamSuggestions: (disaster_category: string, priority: string) =>
    request<RescueTeam[]>(`/api/teams/suggestions?disaster_category=${disaster_category}&priority=${priority}`),
  createAssignment: (team_id: string, report_id?: string, incident_id?: string, assignment_notes?: string) =>
    request<ResourceAssignment>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify({ team_id, report_id, incident_id, assignment_notes }),
    }),
  getAssignments: () => request<ResourceAssignment[]>('/api/assignments'),
  releaseAssignment: (assignment_id: string, notes?: string) =>
    request<any>(`/api/assignments/${assignment_id}/release`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  // Analytics
  getAnalyticsSummary: () => request<any>('/api/analytics/summary'),
  getCsvExportUrl: () => `${BASE_URL}/api/analytics/export/csv`,

  // Notifications
  getNotifications: (unread_only = false) =>
    request<NotificationItem[]>(`/api/notifications?unread_only=${unread_only}`),
  markNotificationRead: (id: string) =>
    request<any>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request<any>('/api/notifications/read-all', { method: 'POST' }),

  // Data Sources
  getDataSources: () => request<DataSourceStatus[]>('/api/datasources'),
  syncDataSource: (name: string) =>
    request<any>(`/api/datasources/${name}/sync`, { method: 'POST' }),

  // Weather (Open-Meteo)
  getWeather: (params?: { latitude?: number; longitude?: number; location_name?: string; force_refresh?: boolean }) => {
    const query = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return request<any>(`/api/weather${query ? `?${query}` : ''}`);
  },
  getWeatherLocations: () => request<any>('/api/weather/locations'),
  setWeatherLocation: (payload: { latitude: number; longitude: number; location_name: string }) =>
    request<any>('/api/weather/configured-location', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
