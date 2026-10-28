import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { MapPage } from './pages/MapPage';
import { RiskAssessmentPage } from './pages/RiskAssessmentPage';
import { ReportsPage } from './pages/ReportsPage';
import { AIAnalyzerPage } from './pages/AIAnalyzerPage';
import { SensorsPage } from './pages/SensorsPage';
import { TeamsPage } from './pages/TeamsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { WeatherPage } from './pages/WeatherPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="risk" element={<RiskAssessmentPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id" element={<ReportsPage />} />
          <Route path="ai-analyzer" element={<AIAnalyzerPage />} />
          <Route path="sensors" element={<SensorsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="datasources" element={<DataSourcesPage />} />
          <Route path="weather" element={<WeatherPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
