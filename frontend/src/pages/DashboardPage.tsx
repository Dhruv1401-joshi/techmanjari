import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Users, 
  Radio, 
  ArrowRight,
  TrendingUp,
  MapPin,
  FileText,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardSummary } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981', '#8b5cf6'];

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading Disaster Command Operations...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Active Incidents',
      value: summary?.active_incidents || 0,
      sub: 'GDACS & Verified Alerts',
      icon: AlertTriangle,
      color: 'from-red-500/20 to-red-950/40 text-red-400 border-red-500/30',
      action: () => navigate('/monitoring')
    },
    {
      title: 'High / Critical Priority',
      value: summary?.high_priority_incidents || 0,
      sub: 'Requiring Immediate Action',
      icon: ShieldAlert,
      color: 'from-orange-500/20 to-orange-950/40 text-orange-400 border-orange-500/30',
      action: () => navigate('/monitoring?severity=Critical')
    },
    {
      title: 'Verified Incidents',
      value: summary?.verified_incidents || 0,
      sub: 'Confirmed Field Disasters',
      icon: CheckCircle,
      color: 'from-emerald-500/20 to-emerald-950/40 text-emerald-400 border-emerald-500/30',
      action: () => navigate('/reports?verification=Verified')
    },
    {
      title: 'Reports Awaiting Review',
      value: summary?.unverified_reports_awaiting_review || 0,
      sub: 'Citizen Reports Under Audit',
      icon: Clock,
      color: 'from-amber-500/20 to-amber-950/40 text-amber-400 border-amber-500/30',
      action: () => navigate('/reports')
    },
    {
      title: 'Rescue Teams Available',
      value: `${summary?.available_rescue_teams || 0} / ${summary?.total_rescue_teams || 0}`,
      sub: 'Ready For Deployment',
      icon: Users,
      color: 'from-blue-500/20 to-blue-950/40 text-blue-400 border-blue-500/30',
      action: () => navigate('/teams')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Disaster Response Command Center
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-normal">
              Review-1 Operational
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-hazard surveillance, AI classification, GIS mapping, and software-simulated sensor telemetry.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-lg shadow-blue-600/30"
          >
            <MapPin className="w-3.5 h-3.5" />
            GIS Map
          </button>
          <button
            onClick={() => navigate('/ai-analyzer')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition shadow-lg shadow-purple-600/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Analyzer
          </button>
          <button
            onClick={() => navigate('/sensors')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-medium transition"
          >
            <Activity className="w-3.5 h-3.5" />
            Sensor Telemetry
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <FileText className="w-3.5 h-3.5" />
            Submit Report
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={card.action}
              className={`p-4 rounded-xl border bg-gradient-to-br ${card.color} cursor-pointer hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>{card.title}</span>
                <Icon className="w-4 h-4 opacity-80" />
              </div>
              <div className="text-2xl font-bold text-white mt-2 font-mono">
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/40 text-[11px] text-slate-400">
                <span>{card.sub}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Live Incidents by Disaster Category
              </h3>
              <p className="text-xs text-slate-500">Real counts derived from GDACS & validated reports</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Total: {summary?.total_recorded_incidents || 0}
            </span>
          </div>

          <div className="h-64">
            {summary?.category_distribution && summary.category_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.category_distribution}>
                  <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                No incidents recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Risk Distribution Donut */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  Severity Distribution
                </h3>
                <p className="text-xs text-slate-500">Hazard intensity classification</p>
              </div>
            </div>

            <div className="h-44 flex items-center justify-center">
              {summary?.risk_distribution && summary.risk_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.risk_distribution}
                      dataKey="count"
                      nameKey="level"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {summary.risk_distribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f1f5f9' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-500">No severity records</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
              {summary?.risk_distribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-2 py-1 rounded bg-slate-800/40">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    {item.level}
                  </span>
                  <span className="font-mono font-semibold text-slate-100">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feed Status & Recent Incidents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Disaster Activity Stream */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Recent Global & Local Alert Activity
            </h3>
            <button
              onClick={() => navigate('/monitoring')}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              All Alerts <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {summary?.recent_activity && summary.recent_activity.length > 0 ? (
              summary.recent_activity.map((item) => (
                <div key={item.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase mt-0.5 ${
                        item.level === 'Critical'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : item.level === 'High'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {item.level}
                    </span>
                    <div>
                      <h4 className="font-medium text-slate-200 line-clamp-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{item.location_name}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{item.timestamp}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                    {item.source}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No recent alert records available.
              </div>
            )}
          </div>
        </div>

        {/* External Data Sources Health Card */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Data Sources Health</h3>
            <button
              onClick={() => navigate('/datasources')}
              className="text-xs text-blue-400 hover:underline"
            >
              Configure
            </button>
          </div>

          <div className="space-y-3">
            {summary?.data_sources_status.map((ds) => (
              <div
                key={ds.id}
                className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-slate-200 flex items-center gap-1.5">
                    {ds.name}
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        ds.status === 'CONNECTED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ds.status === 'CONFIG_REQUIRED'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {ds.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{ds.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[11px] text-slate-300 font-bold">
                    {ds.records_count}
                  </span>
                  <p className="text-[9px] text-slate-400">records</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
