import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { api } from '../api/client';
import { NotificationItem, DashboardSummary } from '../types';

export const Layout: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();

  const fetchGlobalData = async () => {
    try {
      const [sumRes, notifRes] = await Promise.all([
        api.getDashboardSummary().catch(() => null),
        api.getNotifications().catch(() => []),
      ]);
      if (sumRes) setSummary(sumRes);
      if (notifRes) setNotifications(notifRes);
    } catch (err) {
      console.error('Failed to load global summary:', err);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 30000); // 30s background poll
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.syncGdacs();
      await fetchGlobalData();
    } catch (err) {
      console.error('Manual refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Sidebar */}
      <Sidebar
        unverifiedCount={summary?.unverified_reports_awaiting_review || 0}
        unreadNotifications={notifications.filter(n => !n.is_read).length}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          notifications={notifications}
          lastSyncTime={summary?.last_data_refresh}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onMarkRead={handleMarkRead}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <Outlet context={{ summary, refreshSummary: fetchGlobalData }} />
        </main>
      </div>
    </div>
  );
};
