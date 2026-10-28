import React, { useEffect, useState, useCallback } from 'react';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  MapPin,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Navigation,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import {
  WeatherForecast,
  WeatherLocations,
  WeatherLocationPreset,
} from '../types';

// WMO icon map — matches backend icon strings
const WeatherIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className = 'w-5 h-5' }) => {
  const props = { className };
  switch (icon) {
    case 'Sun': return <Sun {...props} className={`${className} text-yellow-400`} />;
    case 'CloudSun': return <Cloud {...props} className={`${className} text-blue-300`} />;
    case 'CloudRain': return <CloudRain {...props} className={`${className} text-blue-400`} />;
    case 'CloudDrizzle': return <CloudRain {...props} className={`${className} text-cyan-400`} />;
    case 'CloudLightning': return <CloudLightning {...props} className={`${className} text-yellow-500`} />;
    case 'Snowflake': return <Snowflake {...props} className={`${className} text-sky-300`} />;
    case 'CloudFog': return <Cloud {...props} className={`${className} text-slate-400`} />;
    case 'CloudSnow': return <Snowflake {...props} className={`${className} text-sky-200`} />;
    default: return <Cloud {...props} className={`${className} text-slate-400`} />;
  }
};

const windDirLabel = (deg: number | null) => {
  if (deg === null) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
};

const fmt = (val: number | null, decimals = 1): string =>
  val === null || val === undefined ? '—' : Number(val).toFixed(decimals);

const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return iso; }
};

const fmtDate = (date: string) => {
  try {
    return new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return date; }
};

export const WeatherPage: React.FC = () => {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [locations, setLocations] = useState<WeatherLocations | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [customName, setCustomName] = useState('');
  const [locationUpdating, setLocationUpdating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showHourly, setShowHourly] = useState(false);

  const loadWeather = useCallback(async (forceRefresh = false) => {
    setError(null);
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [wx, locs] = await Promise.all([
        api.getWeather({ force_refresh: forceRefresh }),
        api.getWeatherLocations(),
      ]);
      setWeather(wx);
      setLocations(locs);
    } catch (e: any) {
      setError(e.message || 'Failed to load weather data from Open-Meteo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const handlePresetClick = async (preset: WeatherLocationPreset) => {
    setLocationUpdating(true);
    setLocationError(null);
    try {
      await api.setWeatherLocation({
        latitude: preset.latitude,
        longitude: preset.longitude,
        location_name: preset.name,
      });
      setShowLocationPicker(false);
      await loadWeather(true);
    } catch (e: any) {
      setLocationError(e.message || 'Failed to update location');
    } finally {
      setLocationUpdating(false);
    }
  };

  const handleCustomLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (isNaN(lat) || isNaN(lon) || !customName.trim()) {
      setLocationError('Please enter valid latitude, longitude, and a location name.');
      return;
    }
    if (lat < -90 || lat > 90) { setLocationError('Latitude must be between -90 and +90.'); return; }
    if (lon < -180 || lon > 180) { setLocationError('Longitude must be between -180 and +180.'); return; }
    setLocationUpdating(true);
    setLocationError(null);
    try {
      await api.setWeatherLocation({ latitude: lat, longitude: lon, location_name: customName.trim() });
      setShowLocationPicker(false);
      setCustomLat('');
      setCustomLon('');
      setCustomName('');
      await loadWeather(true);
    } catch (e: any) {
      setLocationError(e.message || 'Failed to set custom location');
    } finally {
      setLocationUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Cloud className="w-10 h-10 text-blue-400 animate-pulse" />
        <p className="text-sm text-slate-400">Fetching live weather from Open-Meteo…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            Weather Forecast
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-normal">
              Open-Meteo · CC BY 4.0
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time meteorological observations and 7-day forecast via Open-Meteo public API. No credentials required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="weather-change-location-btn"
            onClick={() => setShowLocationPicker(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            Change Location
          </button>
          <button
            id="weather-refresh-btn"
            onClick={() => loadWeather(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Location Picker */}
      {showLocationPicker && (
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-700 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            Select Operations Location
          </h3>
          {locationError && (
            <div className="p-2.5 rounded bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {locationError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {locations?.presets.map((preset) => (
              <button
                key={preset.id || preset.name}
                onClick={() => handlePresetClick(preset)}
                disabled={locationUpdating}
                className="flex flex-col items-start text-left p-3 rounded-lg bg-slate-800/60 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500/40 transition text-xs disabled:opacity-50"
              >
                <span className="font-medium text-slate-200 line-clamp-1">{preset.name}</span>
                <span className="text-slate-400 font-mono text-[10px] mt-0.5">
                  {preset.latitude}°N, {preset.longitude}°E
                </span>
                {preset.zone && (
                  <span className="text-slate-500 text-[10px] mt-0.5">{preset.zone}</span>
                )}
              </button>
            ))}
          </div>
          <form onSubmit={handleCustomLocation} className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Custom Coordinates</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Latitude (-90 to 90)"
                value={customLat}
                onChange={e => setCustomLat(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude (-180 to 180)"
                value={customLon}
                onChange={e => setCustomLon(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Location Name"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={locationUpdating}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition disabled:opacity-50"
            >
              {locationUpdating ? 'Updating…' : 'Set Custom Location'}
            </button>
          </form>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-5 rounded-xl bg-red-950/30 border border-red-800/40 flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold text-sm">Weather Data Unavailable</span>
          </div>
          <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          <p className="text-xs text-slate-400">
            Open-Meteo API is a free public service (CC BY 4.0). If this persists, check network connectivity.
          </p>
          <button
            onClick={() => loadWeather(true)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
            Retry
          </button>
        </div>
      )}

      {weather && !error && (
        <>
          {/* Location Info Bar */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              {weather.location_name}
            </span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-slate-400">
              {weather.latitude.toFixed(4)}°N, {weather.longitude.toFixed(4)}°E
            </span>
            {weather.elevation !== undefined && weather.elevation !== null && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">Elevation: {weather.elevation}m</span>
              </>
            )}
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Timezone: {weather.timezone_abbreviation || weather.timezone}</span>
            {weather.cached && (
              <span className="ml-auto px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono">CACHED</span>
            )}
          </div>

          {/* Current Conditions */}
          <div className="bg-gradient-to-br from-slate-900/80 via-blue-950/20 to-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  Current Conditions
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Observation time: {fmtTime(weather.current.time)} local — Interval: {Math.round(900 / 60)} min
                </p>
              </div>
              <WeatherIcon icon={weather.current.icon} className="w-10 h-10" />
            </div>

            <div className="mb-4">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold text-white tabular-nums">
                  {fmt(weather.current.temperature, 1)}
                </span>
                <span className="text-2xl text-slate-400 mb-1">{weather.current.temperature_unit}</span>
              </div>
              <p className="text-base text-slate-300 mt-1">{weather.current.weather_description}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Feels like {fmt(weather.current.apparent_temperature, 1)}{weather.current.apparent_temperature_unit}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  Humidity
                </div>
                <div className="text-lg font-bold text-white">
                  {fmt(weather.current.relative_humidity, 0)}<span className="text-sm text-slate-400 ml-0.5">{weather.current.relative_humidity_unit}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  Wind
                </div>
                <div className="text-lg font-bold text-white">
                  {fmt(weather.current.wind_speed, 1)}<span className="text-sm text-slate-400 ml-0.5">{weather.current.wind_speed_unit}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {windDirLabel(weather.current.wind_direction)} ({fmt(weather.current.wind_direction, 0)}{weather.current.wind_direction_unit})
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  Precipitation
                </div>
                <div className="text-lg font-bold text-white">
                  {fmt(weather.current.precipitation, 1)}<span className="text-sm text-slate-400 ml-0.5">{weather.current.precipitation_unit}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" />
                  Pressure
                </div>
                <div className="text-lg font-bold text-white">
                  {fmt(weather.current.surface_pressure, 1)}<span className="text-sm text-slate-400 ml-0.5">{weather.current.surface_pressure_unit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Daily Forecast */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Navigation className="w-4 h-4 text-blue-400" />
              7-Day Forecast
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {weather.daily.map((day, i) => (
                <div
                  key={day.date}
                  className={`flex flex-col items-center p-3 rounded-xl border text-xs transition ${
                    i === 0
                      ? 'bg-blue-900/30 border-blue-700/40'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="font-medium text-slate-300">{i === 0 ? 'Today' : fmtDate(day.date)}</span>
                  <WeatherIcon icon={day.icon} className="w-6 h-6 my-2" />
                  <span className="text-[10px] text-slate-400 text-center line-clamp-1 mb-1">{day.weather_description}</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-orange-400 font-semibold">{fmt(day.temperature_max, 0)}°</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-blue-400">{fmt(day.temperature_min, 0)}°</span>
                  </div>
                  {(day.precipitation_sum ?? 0) > 0 && (
                    <div className="flex items-center gap-0.5 text-blue-400 mt-1">
                      <CloudRain className="w-3 h-3" />
                      <span className="text-[10px]">{fmt(day.precipitation_sum, 1)}mm</span>
                    </div>
                  )}
                  {(day.precipitation_probability_max ?? 0) > 0 && (
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {day.precipitation_probability_max}% chance
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Forecast (collapsible) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl">
            <button
              id="weather-hourly-toggle-btn"
              onClick={() => setShowHourly(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-200 hover:text-white transition"
            >
              <span className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-400" />
                Next 24-Hour Hourly Forecast
              </span>
              {showHourly ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showHourly && (
              <div className="px-5 pb-5">
                <div className="overflow-x-auto">
                  <div className="flex gap-2 pb-2 min-w-max">
                    {weather.hourly.map((h, i) => (
                      <div
                        key={h.time}
                        className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs min-w-[72px] ${
                          i === 0
                            ? 'bg-blue-900/30 border-blue-700/40'
                            : 'bg-slate-800/40 border-slate-800'
                        }`}
                      >
                        <span className="text-slate-400 font-mono text-[10px]">{fmtTime(h.time)}</span>
                        <WeatherIcon icon={h.icon} className="w-4 h-4 my-1" />
                        <span className="font-semibold text-white">{fmt(h.temperature, 0)}°</span>
                        {(h.precipitation_probability ?? 0) > 0 && (
                          <div className="flex items-center gap-0.5 text-blue-400 mt-0.5">
                            <Droplets className="w-2.5 h-2.5" />
                            <span className="text-[9px]">{h.precipitation_probability}%</span>
                          </div>
                        )}
                        <div className="flex items-center gap-0.5 text-slate-500 mt-0.5">
                          <Wind className="w-2.5 h-2.5" />
                          <span className="text-[9px]">{fmt(h.wind_speed, 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Attribution Footer — CC BY 4.0 required */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-medium text-slate-300">Data Attribution (required by license):</span>
              </div>
              <a
                id="weather-attribution-link"
                href={weather.attribution.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:underline font-medium"
              >
                {weather.attribution.text}
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>License: {weather.attribution.license}</span>
              <a
                href={weather.attribution.terms_url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-slate-300 hover:underline transition"
              >
                Terms of Use
              </a>
              <span className="text-slate-600">
                Fetched: {new Date(weather.fetched_at).toLocaleString('en-IN')}
              </span>
            </div>
            {weather.attribution.notice && (
              <p className="mt-1 text-slate-500 leading-relaxed">{weather.attribution.notice}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
