import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  ExternalLink, 
  AlertTriangle, 
  ShieldAlert, 
  Radio, 
  Users, 
  Activity,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api/client';
import { NotificationItem } from '../types';
import { useNavigate } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, [unreadOnly]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(unreadOnly);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string, severity: string) => {
    if (severity === 'critical') return <ShieldAlert className="w-4 h-4 text-red-400" />;
    switch (type) {
      case 'OFFICIAL_ALERT':
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'SENSOR_THRESHOLD':
        return <Activity className="w-4 h-4 text-cyan-400" />;
      case 'RESOURCE_ASSIGNMENT':
        return <Users className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            In-App Emergency Alerts & Notifications
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit feed of new official alerts, citizen reports, sensor threshold crossings, and resource dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              unreadOnly
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {unreadOnly ? 'Showing Unread' : 'Filter Unread'}
          </button>

          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl divide-y divide-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No notifications matching the current filter.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !item.is_read ? 'bg-blue-950/20' : 'hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                  {getIcon(item.notification_type, item.severity)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-xs">{item.title}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                        item.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : item.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}
                    >
                      {item.severity}
                    </span>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{item.message}</p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 font-mono">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span className="text-slate-400">{item.notification_type}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.link_target && (
                  <button
                    onClick={() => navigate(item.link_target!)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs border border-slate-700"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                {!item.is_read && (
                  <button
                    onClick={() => handleMarkRead(item.id)}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-200"
                    title="Mark Read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
