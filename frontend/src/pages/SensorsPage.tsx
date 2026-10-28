import React, { useState, useEffect } from 'react';
import { 
  Gauge, 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Waves, 
  Radio, 
  Cpu, 
  Info,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { api } from '../api/client';
import { SensorDevice, SensorReading } from '../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';

export const SensorsPage: React.FC = () => {
  const [sensors, setSensors] = useState<SensorDevice[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string>('sens-01');
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Simulation Controls
  const [activeScenario, setActiveScenario] = useState<string>('flash_flood');
  const [isAutoTicking, setIsAutoTicking] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSensors();
  }, []);

  useEffect(() => {
    if (selectedSensorId) {
      loadReadings(selectedSensorId);
    }
  }, [selectedSensorId]);

  // Auto-ticker effect when simulation stream is running
  useEffect(() => {
    let interval: any = null;
    if (isAutoTicking && selectedSensorId) {
      interval = setInterval(() => {
        handleTickSimulation();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAutoTicking, selectedSensorId, activeScenario]);

  const loadSensors = async () => {
    try {
      const data = await api.getSensors();
      setSensors(data);
      if (data.length > 0 && !selectedSensorId) {
        setSelectedSensorId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReadings = async (sensorId: string) => {
    try {
      const data = await api.getSensorReadings(sensorId, 30);
      setReadings(data.reverse());
    } catch (err) {
      console.error(err);
    }
  };

  const handleTickSimulation = async () => {
    if (!selectedSensorId) return;
    try {
      const res = await api.controlSimulation(selectedSensorId, activeScenario, 'tick');
      setSimMessage(`Reading updated: ${res.water_level_meters}m (${res.threshold_status})`);
      await loadReadings(selectedSensorId);
      await loadSensors();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    if (!selectedSensorId) return;
    setIsAutoTicking(false);
    try {
      await api.controlSimulation(selectedSensorId, activeScenario, 'reset');
      setSimMessage('Sensor readings reset to safe baseline (1.80m).');
      await loadReadings(selectedSensorId);
      await loadSensors();
    } catch (err: any) {
      console.error(err);
    }
  };

  const currentSensor = sensors.find(s => s.id === selectedSensorId);
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

  const chartData = readings.map(r => ({
    time: r.recorded_at.slice(11, 19),
    level: r.water_level_meters,
    status: r.threshold_status
  }));

  return (
    <div className="space-y-6">
      {/* PERSISTENT CRITICAL SIMULATION BANNER */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-2 border-cyan-500/60 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 animate-pulse">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wider text-cyan-300 font-mono">
                SIMULATION MODE — NO PHYSICAL SENSOR CONNECTED
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-400 text-slate-950">
                REVIEW-1
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Software telemetry generator simulating river gauge levels. Hardware integration (ESP32 / ultrasonic) deferred for later review phases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
            Mode: data_mode = &apos;simulation&apos;
          </span>
        </div>
      </div>

      {/* Sensor Station Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sensors.map((s) => {
          const isSelected = s.id === selectedSensorId;
          const status = s.latest_threshold_status || 'Normal';
          return (
            <div
              key={s.id}
              onClick={() => setSelectedSensorId(s.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500/70 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 line-clamp-1">{s.name}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    status === 'Critical'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : status === 'Warning'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{s.location_name}</p>
              <div className="flex items-end justify-between mt-3 pt-2 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400">Level:</span>
                <span className="text-lg font-bold font-mono text-cyan-300">
                  {s.latest_reading ? `${s.latest_reading.toFixed(2)}m` : '1.85m'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Sensor Dashboard & Simulation Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Telemetry Gauge & Controls */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Live Telemetry Meter
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              Station ID: {selectedSensorId}
            </span>
          </div>

          {/* Current Reading Gauge Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Current Water Gauge
            </span>
            <div className="text-4xl font-extrabold font-mono text-cyan-400 flex items-center justify-center gap-1">
              <span>{latestReading ? latestReading.water_level_meters.toFixed(2) : '1.85'}</span>
              <span className="text-lg text-slate-500 font-sans">meters</span>
            </div>

            <div className="inline-block">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  latestReading?.threshold_status === 'Critical'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-bounce'
                    : latestReading?.threshold_status === 'Warning'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                STATUS: {latestReading?.threshold_status || 'Normal'}
              </span>
            </div>

            {/* Threshold Limits Reference */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-[10px]">
              <div>
                <span className="text-slate-500 block">Normal</span>
                <span className="font-mono text-emerald-400">&lt; {currentSensor?.normal_threshold || 2.5}m</span>
              </div>
              <div>
                <span className="text-slate-500 block">Warning</span>
                <span className="font-mono text-orange-400">&ge; {currentSensor?.warning_threshold || 3.8}m</span>
              </div>
              <div>
                <span className="text-slate-500 block">Critical</span>
                <span className="font-mono text-red-400">&ge; {currentSensor?.critical_threshold || 5.0}m</span>
              </div>
            </div>
          </div>

          {/* Scenario Selector */}
          <div className="space-y-2 text-xs">
            <label className="block text-slate-400 font-semibold uppercase text-[10px]">
              Select Simulation Scenario:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'flash_flood', label: 'Flash Flood Surge', desc: 'Triggers Warning/Critical' },
                { id: 'rising_monsoon', label: 'Monsoonal Rise', desc: 'Gradual slow elevation' },
                { id: 'steady_normal', label: 'Steady Normal', desc: 'Safe baseline level' },
                { id: 'storm_recession', label: 'Storm Recession', desc: 'Water drains down' },
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveScenario(sc.id)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    activeScenario === sc.id
                      ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold">{sc.label}</div>
                  <div className="text-[10px] text-slate-500">{sc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Execution Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTickSimulation}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-600/30"
              >
                <span>Generate Step Tick</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsAutoTicking(!isAutoTicking)}
                className={`px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                  isAutoTicking
                    ? 'bg-amber-600/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {isAutoTicking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoTicking ? 'Pause Stream' : 'Live Stream'}</span>
              </button>

              <button
                onClick={handleReset}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
                title="Reset back to baseline"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {simMessage && (
              <p className="text-[11px] text-cyan-300 font-mono text-center">
                {simMessage}
              </p>
            )}
          </div>
        </div>

        {/* Right: Real-time Trend Graph */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Water Gauge Telemetry Stream (Past Readings)
                </h3>
                <p className="text-xs text-slate-500">
                  Logged timestamped measurements in Simulation Mode
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-orange-400 font-mono">
                  <span className="w-2 h-0.5 bg-orange-500 inline-block" /> Warning Threshold
                </span>
                <span className="flex items-center gap-1 text-red-400 font-mono">
                  <span className="w-2 h-0.5 bg-red-500 inline-block" /> Critical Flood
                </span>
              </div>
            </div>

            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis domain={[0, 6]} stroke="#64748b" fontSize={11} unit="m" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#06b6d4' }}
                    />
                    <ReferenceLine y={currentSensor?.warning_threshold || 3.8} stroke="#f97316" strokeDasharray="3 3" />
                    <ReferenceLine y={currentSensor?.critical_threshold || 5.0} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="level"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#06b6d4' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-500">
                  No readings logged yet for this station.
                </div>
              )}
            </div>
          </div>

          {/* Hardware Plug-in Architecture Note */}
          <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-300 block">
                Hardware Ingest Architecture (Ready for Review-2 / Post-Hardware Phase):
              </span>
              <p className="mt-0.5 leading-relaxed">
                When physical ESP32 or ultrasonic sensors are deployed, they authenticate directly against{' '}
                <code className="text-cyan-300 font-mono">POST /api/sensors/ingest</code> without rebuilding any part of the database or UI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
