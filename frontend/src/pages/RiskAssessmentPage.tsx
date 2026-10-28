import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Calculator, 
  AlertTriangle, 
  Info, 
  Waves, 
  Flame, 
  Wind, 
  Activity, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { api } from '../api/client';
import { RiskAssessment } from '../types';

export const RiskAssessmentPage: React.FC = () => {
  const [hazardType, setHazardType] = useState('flood');
  const [locationName, setLocationName] = useState('Guwahati River Valley');
  
  // Inputs
  const [waterLevelRatio, setWaterLevelRatio] = useState<string>('0.85');
  const [rainfallMm, setRainfallMm] = useState<string>('95.0');
  const [windSpeedKmh, setWindSpeedKmh] = useState<string>('65.0');
  const [hotspotCount, setHotspotCount] = useState<string>('6');
  const [seismicZone, setSeismicZone] = useState<string>('0.24');

  const [evaluationResult, setEvaluationResult] = useState<RiskAssessment | null>(null);
  const [history, setHistory] = useState<RiskAssessment[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getRiskAssessments();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvaluating(true);
    setErrorMsg(null);

    const payload: any = {
      disaster_type: hazardType,
      location_name: locationName,
    };

    if (hazardType === 'flood') {
      payload.water_level_ratio = waterLevelRatio ? parseFloat(waterLevelRatio) : null;
      payload.rainfall_mm_24h = rainfallMm ? parseFloat(rainfallMm) : null;
    } else if (hazardType === 'fire') {
      payload.hotspot_count = hotspotCount ? parseInt(hotspotCount) : null;
    } else if (hazardType === 'cyclone') {
      payload.wind_speed_kmh = windSpeedKmh ? parseFloat(windSpeedKmh) : null;
    } else if (hazardType === 'earthquake') {
      payload.seismic_zone_factor = seismicZone ? parseFloat(seismicZone) : null;
    }

    try {
      const result = await api.evaluateRisk(payload);
      setEvaluationResult(result);
      await loadHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleTestInsufficientData = async () => {
    setEvaluating(true);
    setErrorMsg(null);
    try {
      const result = await api.evaluateRisk({
        disaster_type: 'flood',
        location_name: 'Unmonitored Mountain Stream',
        water_level_ratio: null,
        rainfall_mm_24h: null,
      });
      setEvaluationResult(result);
      await loadHistory();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Statutory Disclaimer */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
          Disaster Risk Assessment & Early Warning Engine
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Transparent multi-hazard scoring (0–100) based on documented physical formulas and verified telemetry.
        </p>
      </div>

      {/* Mandatory Statutory Notice */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">
            Scientific Boundary & Transparency Guarantee:
          </p>
          <p className="text-[11px] leading-relaxed">
            The platform computes relative empirical risk scores from available sensory and meteorological inputs. It does{' '}
            <strong className="text-amber-300">NEVER</strong> claim to predict the exact time, location, or magnitude of future earthquakes or wildfire ignitions. If critical inputs are missing, the system strictly returns{' '}
            <span className="font-mono text-amber-400 font-bold">&quot;Insufficient Data&quot;</span> rather than misleading estimates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Evaluation Form */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-400" />
            Evaluate Hazard Risk
          </h3>

          <form onSubmit={handleEvaluate} className="space-y-3 text-xs">
            {/* Hazard Type Selector */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Hazard Category</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'flood', label: 'Flood', icon: Waves },
                  { id: 'fire', label: 'Wildfire', icon: Flame },
                  { id: 'cyclone', label: 'Cyclone', icon: Wind },
                  { id: 'earthquake', label: 'Seismic', icon: Activity },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHazardType(item.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                        hazardType === item.id
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Location */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Geographic Area / District</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Dynamic Inputs based on Hazard Type */}
            {hazardType === 'flood' && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Water Level Ratio (Current / Critical)</span>
                    <span className="font-mono text-blue-400">{waterLevelRatio || 'Missing'}</span>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2.0"
                    value={waterLevelRatio}
                    onChange={(e) => setWaterLevelRatio(e.target.value)}
                    placeholder="e.g. 0.85"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Ratio of current river gauge against flood threshold (55% weight)</p>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>24h Precipitation (mm)</span>
                    <span className="font-mono text-blue-400">{rainfallMm || 'Missing'} mm</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="500"
                    value={rainfallMm}
                    onChange={(e) => setRainfallMm(e.target.value)}
                    placeholder="e.g. 95"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Cumulative rainfall from radar/forecast (45% weight)</p>
                </div>
              </div>
            )}

            {hazardType === 'fire' && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-slate-400 mb-1">Active Satellite Thermal Hotspots</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hotspotCount}
                    onChange={(e) => setHotspotCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Observed VIIRS/MODIS cluster detections</p>
                </div>
              </div>
            )}

            {hazardType === 'cyclone' && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-slate-400 mb-1">Sustained Wind Speed (km/h)</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={windSpeedKmh}
                    onChange={(e) => setWindSpeedKmh(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Verified meteorological sustained wind gust</p>
                </div>
              </div>
            )}

            {hazardType === 'earthquake' && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-slate-400 mb-1">BIS Seismic Zone Factor</label>
                  <select
                    value={seismicZone}
                    onChange={(e) => setSeismicZone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="0.10">Zone II (Low Damage Risk - 0.10)</option>
                    <option value="0.16">Zone III (Moderate Damage Risk - 0.16)</option>
                    <option value="0.24">Zone IV (High Damage Risk - 0.24)</option>
                    <option value="0.36">Zone V (Very High Damage Risk - 0.36)</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={evaluating}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-md shadow-blue-600/30 disabled:opacity-50"
            >
              {evaluating ? 'Computing Empirical Score...' : 'Calculate Risk Score'}
            </button>

            <button
              type="button"
              onClick={handleTestInsufficientData}
              className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] border border-slate-700 transition"
            >
              Simulate Missing Input (Verify Insufficient Data Guard)
            </button>
          </form>
        </div>

        {/* Evaluation Output Inspector */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
            <span>Assessment Calculation Report</span>
            {evaluationResult && (
              <span className="font-mono text-[10px] text-slate-500">
                Method: {evaluationResult.scoring_method_version}
              </span>
            )}
          </h3>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {evaluationResult ? (
            <div className="space-y-4">
              {/* Score Header Card */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  evaluationResult.risk_category === 'Critical'
                    ? 'bg-red-950/30 border-red-500/40 text-red-300'
                    : evaluationResult.risk_category === 'High'
                    ? 'bg-orange-950/30 border-orange-500/40 text-orange-300'
                    : evaluationResult.risk_category === 'Moderate'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : evaluationResult.risk_category === 'Low'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                    Hazard Classification
                  </span>
                  <h4 className="text-2xl font-bold font-mono mt-0.5">
                    {evaluationResult.risk_category.toUpperCase()}
                  </h4>
                  <p className="text-xs mt-1 text-slate-300 font-medium">
                    {evaluationResult.location_name} • {evaluationResult.disaster_type.toUpperCase()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                    Transparent Score
                  </span>
                  <div className="text-3xl font-extrabold font-mono">
                    {evaluationResult.score !== null ? `${evaluationResult.score} / 100` : 'N/A'}
                  </div>
                  <span className="text-[10px] opacity-75">{evaluationResult.data_freshness}</span>
                </div>
              </div>

              {/* Formula & Explanation */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Documented Mathematical Explanation:
                </span>
                <p className="text-slate-200 leading-relaxed font-mono text-[11px]">
                  {evaluationResult.explanation}
                </p>

                <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Inputs Used: </span>
                  {Object.keys(evaluationResult.inputs_used).length > 0 ? (
                    <span className="font-mono text-blue-400">
                      {JSON.stringify(evaluationResult.inputs_used)}
                    </span>
                  ) : (
                    <span className="text-amber-400 italic">None (Parameters missing)</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">
              Submit the form to compute an empirical hazard risk score.
            </div>
          )}

          {/* Historical Assessments Table */}
          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Recent Risk Evaluations Log
            </h4>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 text-xs">
              {history.length === 0 ? (
                <div className="py-4 text-center text-slate-600">No previous assessments logged.</div>
              ) : (
                history.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-slate-200 capitalize">
                        {item.disaster_type} Hazard
                      </span>
                      <span className="text-slate-500 text-[11px] ml-2">({item.location_name})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          item.risk_category === 'Critical'
                            ? 'text-red-400 bg-red-950/40'
                            : item.risk_category === 'High'
                            ? 'text-orange-400 bg-orange-950/40'
                            : item.risk_category === 'Moderate'
                            ? 'text-amber-400 bg-amber-950/40'
                            : item.risk_category === 'Low'
                            ? 'text-emerald-400 bg-emerald-950/40'
                            : 'text-slate-400 bg-slate-800'
                        }`}
                      >
                        {item.score !== null ? `${item.score}/100 (${item.risk_category})` : item.risk_category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
