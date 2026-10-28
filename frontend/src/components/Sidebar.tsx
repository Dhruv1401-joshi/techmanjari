import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  ShieldAlert,
  MapPin,
  FileText,
  BrainCircuit,
  Gauge,
  Users,
  BarChart3,
  Bell,
  Settings,
  AlertTriangle,
  Activity,
  CloudSun
} from 'lucide-react';

interface SidebarProps {
  unverifiedCount: number;
  unreadNotifications: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ unverifiedCount, unreadNotifications }) => {
  const navItems = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/monitoring', label: 'Live Monitoring', icon: Radio },
    { to: '/map', label: 'Disaster GIS Map', icon: MapPin },
    { to: '/risk', label: 'Risk Assessment', icon: ShieldAlert },
    { 
      to: '/reports', 
      label: 'Emergency Reports', 
      icon: FileText,
      badge: unverifiedCount > 0 ? `${unverifiedCount} New` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    { to: '/ai-analyzer', label: 'AI Incident Analyzer', icon: BrainCircuit },
    { 
      to: '/sensors', 
      label: 'Sensor Monitoring', 
      icon: Gauge,
      badge: 'Simulation',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    { to: '/teams', label: 'Rescue Teams & Ops', icon: Users },
    { to: '/analytics', label: 'Analytics & Exports', icon: BarChart3 },
    { 
      to: '/notifications', 
      label: 'Notifications', 
      icon: Bell,
      badge: unreadNotifications > 0 ? String(unreadNotifications) : undefined,
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    { 
      to: '/weather', 
      label: 'Weather Forecast', 
      icon: CloudSun,
      badge: 'Open-Meteo',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
    },
    { to: '/datasources', label: 'Data Sources & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand & Badge */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 via-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-950/50">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
              TECHMANJARI
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">
                R1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Disaster Response Ops</p>
          </div>
        </div>

        {/* Persistent Simulation Notice */}
        <div className="mt-3 px-2.5 py-1.5 rounded bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
          <span className="font-medium tracking-tight">SIMULATION MODE ACTIVE</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Command Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Footer info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Core Engine Live
          </span>
          <span className="font-mono text-slate-400">v1.0-R1</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Review-1 Demo Build</p>
      </div>
    </aside>
  );
};
