import React, { useEffect, useState } from 'react';
import { 
  Radio, 
  Search, 
  Filter, 
  ExternalLink, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw,
  X,
  MapPin,
  Calendar,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import { Incident } from '../types';

export const MonitoringPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, [categoryFilter, severityFilter, sourceFilter]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents({
        category: categoryFilter,
        severity: severityFilter,
        source: sourceFilter,
        search: search,
        limit: 150
      });
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadIncidents();
  };

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await api.syncGdacs();
      await loadIncidents();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            Live Disaster Monitoring Feed
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time disaster observations from GDACS official alerts, NASA FIRMS satellite fire telemetry, and field reports.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-md shadow-blue-600/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Poll GDACS Alerts'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by disaster title, country, or keyword..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="flood">Flood</option>
            <option value="fire">Fire / Wildfire</option>
            <option value="cyclone">Cyclone / Storm</option>
            <option value="earthquake">Earthquake</option>
            <option value="drought">Drought</option>
            <option value="tsunami">Tsunami</option>
            <option value="other">Other Hazards</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (Red)</option>
            <option value="high">High (Orange)</option>
            <option value="medium">Medium</option>
            <option value="low">Low (Green)</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="GDACS">GDACS</option>
            <option value="NASA_FIRMS">NASA FIRMS</option>
            <option value="REPORT">Citizen Reports</option>
          </select>
        </div>
      </div>

      {/* Main Table & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents Table */}
        <div className={`bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden ${selectedIncident ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Hazard</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Title & Location</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Observed Time</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Loading live disaster feeds...
                    </td>
                  </tr>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No matching incidents found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                        selectedIncident?.id === inc.id ? 'bg-blue-950/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-slate-200 capitalize">
                        {inc.disaster_category}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            inc.severity === 'Critical'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : inc.severity === 'High'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : inc.severity === 'Medium'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200 line-clamp-1">{inc.title}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {inc.location_name}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {inc.source}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {inc.event_time.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncident(inc);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-[11px]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Incident Inspection Drawer */}
        {selectedIncident && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Incident Detail View
              </span>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                  selectedIncident.severity === 'Critical'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : selectedIncident.severity === 'High'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {selectedIncident.severity} Severity
              </span>
              <h3 className="font-bold text-slate-100 text-base mt-2">
                {selectedIncident.title}
              </h3>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{selectedIncident.location_name}</span>
              </div>
              {selectedIncident.latitude && selectedIncident.longitude && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="text-slate-500">Coordinates:</span>
                  <span>{selectedIncident.latitude.toFixed(4)}° N, {selectedIncident.longitude.toFixed(4)}° E</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Event Time: {selectedIncident.event_time}</span>
              </div>
            </div>

            {selectedIncident.description && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                <p className="font-semibold text-slate-400 text-[10px] uppercase mb-1">Observation Description:</p>
                {selectedIncident.description}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              {selectedIncident.source_url && (
                <a
                  href={selectedIncident.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                >
                  <span>Official GDACS Bulletin</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
