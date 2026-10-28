import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Database, 
  Radio, 
  Info,
  Key,
  ShieldCheck,
  Flame,
  CloudSun
} from 'lucide-react';
import { api } from '../api/client';
import { DataSourceStatus } from '../types';

export const DataSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<DataSourceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingSource, setRefreshingSource] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    setLoading(true);
    try {
      const data = await api.getDataSources();
      setSources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async (sourceName: string) => {
    setRefreshingSource(sourceName);
    try {
      const res = await api.syncDataSource(sourceName);
      setSyncFeedback(prev => ({
        ...prev,
        [sourceName]: res.status === 'success' 
          ? `Synced ${res.records_imported} records successfully` 
          : res.message || 'Sync completed'
      }));
      await loadDataSources();
    } catch (err: any) {
      setSyncFeedback(prev => ({
        ...prev,
        [sourceName]: err.message || 'Sync failed'
      }));
    } finally {
      setRefreshingSource(null);
    }
  };

  const getSourceIcon = (name: string) => {
    switch (name.toUpperCase()) {
      case 'GDACS':
        return <Radio className="w-5 h-5 text-emerald-400" />;
      case 'NASA_FIRMS':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'OPEN_METEO':
      case 'WEATHER':
      case 'IMD':
        return <CloudSun className="w-5 h-5 text-amber-400" />;
      case 'SUPABASE_DATABASE':
        return <Database className="w-5 h-5 text-blue-400" />;
      default:
        return <Settings className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          External Data Integrations & Data Source Health
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Monitor connection integrity, last synchronization timestamps, and configuration prerequisites for all disaster data feeds.
        </p>
      </div>

      {/* Integration Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((src) => {
          const isConnected = src.status === 'CONNECTED' || src.status === 'LOCAL_STORAGE';
          const isConfigRequired = src.status === 'CONFIG_REQUIRED';

          return (
            <div
              key={src.id}
              className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    {getSourceIcon(src.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{src.name}</h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isConnected
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : isConfigRequired
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}
                    >
                      {src.status}
                    </span>
                  </div>
                </div>

                {src.name !== 'WATER_LEVEL_SENSORS' && src.name !== 'SUPABASE_DATABASE' && (
                  <button
                    onClick={() => handleManualSync(src.name)}
                    disabled={refreshingSource === src.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingSource === src.name ? 'animate-spin text-blue-400' : ''}`} />
                    <span>Sync</span>
                  </button>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Total Records Ingested:</span>
                  <span className="font-mono font-bold text-slate-200">{src.records_count}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Last Successful Sync:</span>
                  <span className="font-mono text-slate-300">
                    {src.last_successful_fetch ? new Date(src.last_successful_fetch).toLocaleString() : 'Not Yet Synchronized'}
                  </span>
                </div>
              </div>

              {src.details && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {src.details}
                </p>
              )}

              {src.last_error && (
                <div className="p-2.5 rounded bg-red-950/30 border border-red-800/40 text-[11px] text-red-300">
                  <span className="font-semibold block mb-0.5">Last Logged Status:</span>
                  {src.last_error}
                </div>
              )}

              {syncFeedback[src.name] && (
                <p className="text-[11px] font-mono text-blue-400">
                  {syncFeedback[src.name]}
                </p>
              )}

              {/* Documentation link for missing API keys */}
              {src.name === 'NASA_FIRMS' && (
                <a
                  href="https://firms.modaps.eosdis.nasa.gov/api/map_key/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline pt-1"
                >
                  <span>Register Free NASA FIRMS Map Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {/* Documentation link for Open-Meteo */}
              {(src.name === 'OPEN_METEO' || src.name === 'WEATHER') && (
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline pt-1"
                >
                  <span>Open-Meteo Weather Forecast API (CC BY 4.0)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {src.name === 'IMD' && (
                <a
                  href="https://api.imd.gov.in/public/api_reference.html"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:underline pt-1"
                >
                  <span>Legacy IMD API Reference (Deprecated / Retired)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Environment Setup & Supabase Migration Instructions */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          Environment Setup & Supabase PostgreSQL Migration
        </h3>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            The backend is currently operating with the embedded SQLite persistence engine, which allows 100% offline functionality without external accounts.
          </p>
          <p>
            To connect your live <strong>Supabase PostgreSQL</strong> instance:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-slate-400">
            <li>Create a new Supabase project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">supabase.com</a>.</li>
            <li>Copy the contents of <code className="text-slate-200 font-mono">backend/schema.sql</code> and execute it in the Supabase SQL Editor to initialize all tables and RLS policies.</li>
            <li>Add <code className="text-slate-200 font-mono">SUPABASE_URL</code> and <code className="text-slate-200 font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to <code className="text-slate-200 font-mono">backend/.env</code>.</li>
            <li>Add <code className="text-slate-200 font-mono">NASA_FIRMS_API_KEY</code> to enable live thermal satellite fire monitoring.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
