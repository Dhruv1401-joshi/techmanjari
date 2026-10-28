import React, { useState } from 'react';
import { 
  Bell, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink,
  Info
} from 'lucide-react';
import { NotificationItem } from '../types';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  notifications: NotificationItem[];
  lastSyncTime?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onMarkRead: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  notifications,
  lastSyncTime,
  onRefresh,
  isRefreshing,
  onMarkRead
}) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTimestamp = (iso?: string) => {
    if (!iso) return 'Synchronizing...';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Active Environment & Sensor Notice */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-slate-300">Live Disaster Stream</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-mono text-[11px]">
            Sync: {formatTimestamp(lastSyncTime)}
          </span>
        </div>

        {/* Persistent hardware deferral notice */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-300">
          <Info className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Review-1: Physical Sensors In Simulation</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Refresh Feeds button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          title="Poll GDACS and check data source health"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>{isRefreshing ? 'Polling Feeds...' : 'Sync Live Feeds'}</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className="relative p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Alerts and notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Quick Dropdown */}
          {showDrawer && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
                <span>Recent In-App Alerts</span>
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    navigate('/notifications');
                  }}
                  className="text-blue-400 hover:underline text-[11px]"
                >
                  View All
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 my-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No active notifications
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`py-2 px-1 text-xs transition-colors ${
                        !n.is_read ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium text-slate-200 line-clamp-1">{n.title}</span>
                        {!n.is_read && (
                          <button
                            onClick={() => onMarkRead(n.id)}
                            className="text-slate-500 hover:text-blue-400"
                            title="Mark Read"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.link_target && (
                          <button
                            onClick={() => {
                              setShowDrawer(false);
                              navigate(n.link_target!);
                            }}
                            className="text-blue-400 hover:underline flex items-center gap-0.5"
                          >
                            Inspect <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/50 border border-blue-800/50 text-blue-300 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">Incident Dispatcher</span>
        </div>
      </div>
    </header>
  );
};
