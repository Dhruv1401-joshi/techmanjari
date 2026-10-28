import React, { useEffect, useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Layers, 
  Filter, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  Flame, 
  Waves, 
  Users, 
  X, 
  ExternalLink 
} from 'lucide-react';
import { api } from '../api/client';
import { Incident, EmergencyReport, SensorDevice, RescueTeam } from '../types';

// Custom SVG Icons for Leaflet markers
const createCustomIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">
        ${label}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const RedAlertIcon = createCustomIcon('#ef4444', '!');
const OrangeAlertIcon = createCustomIcon('#f97316', '▲');
const GreenAlertIcon = createCustomIcon('#10b981', '●');
const FireIcon = createCustomIcon('#dc2626', '🔥');
const SensorIcon = createCustomIcon('#06b6d4', '🌊');
const TeamIcon = createCustomIcon('#3b82f6', '🚑');
const ReportIcon = createCustomIcon('#a855f7', '🚩');

// Map view controller to re-center
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const MapPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [sensors, setSensors] = useState<SensorDevice[]>([]);
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Layer toggles
  const [showGdacs, setShowGdacs] = useState(true);
  const [showFirms, setShowFirms] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showTeams, setShowTeams] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Selected item for drawer
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const [incRes, repRes, sensRes, teamRes] = await Promise.all([
        api.getIncidents({ limit: 200 }),
        api.getReports({ limit: 100 }),
        api.getSensors(),
        api.getTeams(),
      ]);
      setIncidents(incRes);
      setReports(repRes);
      setSensors(sensRes);
      setTeams(teamRes);
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter(inc => {
    if (categoryFilter !== 'all' && inc.disaster_category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (severityFilter !== 'all' && inc.severity.toLowerCase() !== severityFilter.toLowerCase()) return false;
    return inc.latitude && inc.longitude;
  });

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-3">
      {/* Top Map Controls Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">GIS Layers:</span>
          
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 cursor-pointer hover:bg-slate-800">
            <input
              type="checkbox"
              checked={showGdacs}
              onChange={(e) => setShowGdacs(e.target.checked)}
              className="rounded accent-blue-600"
            />
            <span>GDACS Alerts</span>
          </label>

          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 cursor-pointer hover:bg-slate-800">
            <input
              type="checkbox"
              checked={showReports}
              onChange={(e) => setShowReports(e.target.checked)}
              className="rounded accent-purple-600"
            />
            <span>Field Reports</span>
          </label>

          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 cursor-pointer hover:bg-slate-800">
            <input
              type="checkbox"
              checked={showSensors}
              onChange={(e) => setShowSensors(e.target.checked)}
              className="rounded accent-cyan-600"
            />
            <span>Water Sensors</span>
          </label>

          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 cursor-pointer hover:bg-slate-800">
            <input
              type="checkbox"
              checked={showTeams}
              onChange={(e) => setShowTeams(e.target.checked)}
              className="rounded accent-emerald-600"
            />
            <span>Rescue Units</span>
          </label>
        </div>

        {/* Hazard & Severity Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Hazards</option>
            <option value="flood">Flood</option>
            <option value="fire">Fire</option>
            <option value="cyclone">Cyclone</option>
            <option value="earthquake">Earthquake</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (Red)</option>
            <option value="high">High (Orange)</option>
            <option value="low">Low (Green)</option>
          </select>
        </div>
      </div>

      {/* Map Container & Drawer */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-800 min-h-0">
        <MapContainer
          center={[20.5937, 78.9629]} // Centered on India
          zoom={5}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Dark Matter Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* GDACS / Real Official Alert Markers */}
          {showGdacs &&
            filteredIncidents.map((inc) => {
              if (!inc.latitude || !inc.longitude) return null;
              const icon =
                inc.severity === 'Critical'
                  ? RedAlertIcon
                  : inc.severity === 'High'
                  ? OrangeAlertIcon
                  : GreenAlertIcon;

              return (
                <Marker
                  key={`inc-${inc.id}`}
                  position={[inc.latitude, inc.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedItem({ type: 'incident', data: inc }),
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-slate-100">{inc.title}</div>
                      <div className="text-slate-400">Severity: {inc.severity}</div>
                      <div className="text-slate-400">Category: {inc.disaster_category}</div>
                      <button
                        onClick={() => setSelectedItem({ type: 'incident', data: inc })}
                        className="mt-1 text-blue-400 hover:underline font-semibold block"
                      >
                        Inspect Incident &rarr;
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Citizen / Field Emergency Reports */}
          {showReports &&
            reports
              .filter(r => r.latitude && r.longitude)
              .map((rep) => (
                <Marker
                  key={`rep-${rep.id}`}
                  position={[rep.latitude!, rep.longitude!]}
                  icon={ReportIcon}
                  eventHandlers={{
                    click: () => setSelectedItem({ type: 'report', data: rep }),
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-purple-400">[Report] {rep.title}</div>
                      <div className="text-slate-300">Priority: {rep.priority}</div>
                      <div className="text-slate-400">Status: {rep.current_status}</div>
                      <button
                        onClick={() => setSelectedItem({ type: 'report', data: rep })}
                        className="mt-1 text-purple-400 hover:underline font-semibold block"
                      >
                        Review Report &rarr;
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

          {/* Software Water Sensors (Simulation Mode) */}
          {showSensors &&
            sensors.map((s) => (
              <Marker
                key={`sens-${s.id}`}
                position={[s.latitude, s.longitude]}
                icon={SensorIcon}
                eventHandlers={{
                  click: () => setSelectedItem({ type: 'sensor', data: s }),
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-cyan-400">🌊 {s.name}</div>
                    <div className="text-slate-300">Water Level: {s.latest_reading || 1.85}m</div>
                    <div className="text-[10px] text-cyan-500 font-semibold">SIMULATION MODE</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Rescue Teams */}
          {showTeams &&
            teams.map((t) => (
              <Marker
                key={`team-${t.id}`}
                position={[t.latitude, t.longitude]}
                icon={TeamIcon}
                eventHandlers={{
                  click: () => setSelectedItem({ type: 'team', data: t }),
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-blue-400">🚑 {t.name}</div>
                    <div className="text-slate-300">Status: {t.operational_status}</div>
                    <div className="text-slate-400">Base: {t.base_location}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-lg shadow-xl text-[11px] text-slate-300 space-y-1.5 pointer-events-auto">
          <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] mb-1">
            GIS Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span>Critical Alert (Red)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>High Severity (Orange)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span>Citizen Emergency Report</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            <span>Simulated Flood Gauge</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Rescue Response Unit</span>
          </div>
        </div>

        {/* Selected Map Marker Inspection Drawer */}
        {selectedItem && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-4 text-xs space-y-3 pointer-events-auto animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                {selectedItem.type.toUpperCase()} INSPECTION
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-slate-100 text-sm">
                {selectedItem.data.title || selectedItem.data.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {selectedItem.data.location_name || selectedItem.data.base_location}
              </p>
            </div>

            {selectedItem.data.description && (
              <p className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[11px] leading-relaxed max-h-36 overflow-y-auto">
                {selectedItem.data.description}
              </p>
            )}

            {selectedItem.type === 'incident' && selectedItem.data.source_url && (
              <a
                href={selectedItem.data.source_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
              >
                <span>Official Source Bulletin</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {selectedItem.type === 'sensor' && (
              <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
                <span className="font-bold block">SIMULATION MODE</span>
                Water Level: {selectedItem.data.latest_reading || 1.85}m (Normal &lt; {selectedItem.data.normal_threshold}m, Critical &gt; {selectedItem.data.critical_threshold}m)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
