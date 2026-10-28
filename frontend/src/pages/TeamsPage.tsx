import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  LifeBuoy,
  Flame,
  Truck,
  HeartPulse
} from 'lucide-react';
import { api } from '../api/client';
import { RescueTeam, ResourceAssignment, EmergencyReport } from '../types';

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [unverifiedReports, setUnverifiedReports] = useState<EmergencyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<RescueTeam | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [suggestions, setSuggestions] = useState<RescueTeam[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tRes, aRes, rRes] = await Promise.all([
        api.getTeams(),
        api.getAssignments(),
        api.getReports({ limit: 50 }),
      ]);
      setTeams(tRes);
      setAssignments(aRes);
      setUnverifiedReports(rRes.filter(r => r.current_status !== 'Resolved' && r.current_status !== 'Rejected'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDispatchModal = async (team?: RescueTeam) => {
    if (team) {
      setSelectedTeam(team);
    } else {
      setSelectedTeam(teams.find(t => t.operational_status === 'Available') || null);
    }
    
    // Fetch smart suggestions
    try {
      const sug = await api.getTeamSuggestions('flood', 'High');
      setSuggestions(sug);
    } catch (e) {
      console.error(e);
    }
    setShowDispatchModal(true);
  };

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setSubmitting(true);
    try {
      await api.createAssignment(
        selectedTeam.id,
        selectedReportId || undefined,
        undefined,
        dispatchNotes || 'Approved emergency response deployment'
      );
      setShowDispatchModal(false);
      setSelectedTeam(null);
      setSelectedReportId('');
      setDispatchNotes('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (assignmentId: string) => {
    if (!confirm('Confirm mission resolution and release team back to Available status?')) return;
    try {
      await api.releaseAssignment(assignmentId, 'Field mission completed successfully.');
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const getTeamTypeIcon = (type: string) => {
    switch (type) {
      case 'flood_boat':
        return <LifeBuoy className="w-4 h-4 text-cyan-400" />;
      case 'fire_response':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'ambulance':
        return <Truck className="w-4 h-4 text-orange-400" />;
      case 'medical_unit':
        return <HeartPulse className="w-4 h-4 text-pink-400" />;
      default:
        return <Users className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Rescue Teams & Emergency Resource Allocation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop dispatch authority. Specialized water rescue, urban search, fire tactical, and paramedic units.
          </p>
        </div>

        <button
          onClick={() => handleOpenDispatchModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Authorize Dispatch</span>
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((t) => {
          const isAvailable = t.operational_status === 'Available';
          return (
            <div
              key={t.id}
              className={`p-4 rounded-xl border transition ${
                isAvailable
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-900/40 border-slate-800/60 opacity-90'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    {getTeamTypeIcon(t.team_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">{t.name}</h3>
                    <span className="text-[10px] text-slate-400 capitalize">
                      {t.team_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    isAvailable
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {t.operational_status}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="line-clamp-1">{t.base_location}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Crew Capacity: <strong className="text-slate-200">{t.capacity} responders</strong></span>
                  {t.contact_number && (
                    <span className="font-mono text-slate-500">{t.contact_number}</span>
                  )}
                </div>
              </div>

              {t.assigned_incident_title && (
                <div className="mt-2.5 p-2 rounded bg-amber-950/20 border border-amber-800/30 text-[11px] text-amber-300">
                  <span className="font-semibold block">Active Mission:</span>
                  <span className="line-clamp-1">{t.assigned_incident_title}</span>
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {isAvailable ? 'Standby for deployment' : 'Currently engaged'}
                </span>
                {isAvailable ? (
                  <button
                    onClick={() => handleOpenDispatchModal(t)}
                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                  >
                    Deploy Unit
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-amber-400">Deployed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Assignments History Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          Active & Recent Incident Deployments
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Team Assigned</th>
                <th className="py-2.5 px-3">Authorization</th>
                <th className="py-2.5 px-3">Mission Notes</th>
                <th className="py-2.5 px-3">Dispatched Time</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No active resource assignments recorded.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {a.team_name || 'Emergency Unit'}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {a.assigned_by}
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                      {a.assignment_notes || 'Operational dispatch'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {new Date(a.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          a.approval_status === 'Approved'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {a.approval_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {a.approval_status === 'Approved' && (
                        <button
                          onClick={() => handleRelease(a.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] font-medium"
                        >
                          Release Team
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Human Dispatch Approval Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Authorize Emergency Deployment
              </h3>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Response Team</label>
                <select
                  value={selectedTeam?.id || ''}
                  onChange={(e) => {
                    const t = teams.find(team => team.id === e.target.value);
                    if (t) setSelectedTeam(t);
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.operational_status !== 'Available'}>
                      {t.name} ({t.team_type}) — [{t.operational_status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Incident / Emergency Report</label>
                <select
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="">General Standby Sector Dispatch</option>
                  {unverifiedReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.priority}] {r.title} ({r.location_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dispatch Authorization Directive</label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Authorized to conduct immediate civilian water rescue and triage."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-800/30 text-[11px] text-slate-300">
                <span className="font-semibold text-blue-300 block mb-1">AI Allocation Recommendation:</span>
                Specialized in watercraft extraction. Matching priority hazard: Flood / Rising Water.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Dispatching...' : 'Confirm & Authorize Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
