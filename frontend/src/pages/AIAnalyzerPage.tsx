import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  AlertTriangle, 
  MapPin, 
  Copy, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  FileText,
  Layers,
  Search
} from 'lucide-react';
import { api } from '../api/client';
import { AIAnalysisResult } from '../types';
import { useNavigate } from 'react-router-dom';

const SAMPLE_PRESETS = [
  {
    label: 'Flood & Stranded Victims',
    text: 'Flash floodwaters from the overflowing Mithi River have inundated Kurla West, Mumbai. Over 25 people and children are stranded on rooftops with water rising fast. Immediate boat rescue needed!'
  },
  {
    label: 'Structural Fire with Casualties',
    text: 'Massive blaze and thick black smoke bursting from the chemical factory in Guwahati. Multiple workers injured with severe burns, fire spreading rapidly toward nearby residential homes!'
  },
  {
    label: 'Cyclonic Storm Damage',
    text: 'Violent cyclonic squalls with 95 km/h winds making landfall in Odisha coast. Uprooted trees blocking coastal highways and widespread power grid blackout.'
  },
  {
    label: 'Seismic Tremor & Building Cracks',
    text: 'Strong earthquake tremors felt across Guwahati and Dispur for 30 seconds. Several visible structural cracks reported on the interstate flyover pillar.'
  }
];

export const AIAnalyzerPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [converting, setConverting] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = textToAnalyze || inputText;
    if (!text || text.length < 5) return;
    setAnalyzing(true);
    try {
      const res = await api.analyzeIncident(text);
      setAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyPreset = (presetText: string) => {
    setInputText(presetText);
    handleAnalyze(presetText);
  };

  const handleCreateReportFromAI = async () => {
    if (!analysis) return;
    setConverting(true);
    try {
      const loc = analysis.extracted_locations.length > 0 ? analysis.extracted_locations[0] : 'Reported Sector';
      const title = `AI-Triaged ${analysis.suggested_category.toUpperCase()}: ${loc}`;
      await api.createReport({
        title,
        description: inputText,
        disaster_category: analysis.suggested_category,
        priority: analysis.suggested_priority,
        location_name: loc,
        reporter_name: 'AI Triage Ingest',
      });
      navigate('/reports');
    } catch (err: any) {
      alert(err.message || 'Failed to convert report');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-purple-400" />
          AI-Assisted Incident Analyzer & Triage
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Automated multi-hazard classification, priority evaluation, entity extraction, and duplicate detection.
        </p>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Text and Presets */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Input Emergency Message or Dispatch Transcript
            </span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
              Offline Baseline Active
            </span>
          </div>

          <textarea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste raw emergency dispatch, SOS SMS, social media alert, or first-responder voice transcript here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => handleAnalyze()}
              disabled={analyzing || inputText.length < 5}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition shadow-lg shadow-purple-600/30 disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>{analyzing ? 'Evaluating Text...' : 'Analyze Emergency Text'}</span>
            </button>

            {inputText && (
              <button
                onClick={() => {
                  setInputText('');
                  setAnalysis(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick-load Sample Presets */}
          <div className="pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400 block mb-2">
              Review-1 Demonstration Test Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p.text)}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 text-left transition text-xs"
                >
                  <div className="font-semibold text-slate-200 flex items-center justify-between">
                    <span>{p.label}</span>
                    <ArrowRight className="w-3 h-3 text-purple-400" />
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">{p.text}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Analysis Results Card */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">
                AI Classification & Recommendation
              </span>
              {analysis && (
                <span className="text-[10px] font-mono text-slate-400">
                  Confidence: {(analysis.confidence * 100).toFixed(0)}% ({analysis.confidence_band})
                </span>
              )}
            </div>

            {analysis ? (
              <div className="space-y-4 mt-4">
                {/* Primary Category & Priority Badges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Suggested Category
                    </span>
                    <div className="text-lg font-bold text-slate-100 capitalize mt-1">
                      {analysis.suggested_category}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Assessed Priority
                    </span>
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono mt-1 ${
                        analysis.suggested_priority === 'Critical'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : analysis.suggested_priority === 'High'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {analysis.suggested_priority}
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Transparent Reasoning:
                  </span>
                  <p className="text-slate-300 leading-relaxed">{analysis.explanation}</p>
                </div>

                {/* Extracted Entities & Locations */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                      <MapPin className="w-3 h-3 text-blue-400" />
                      Detected Locations:
                    </span>
                    {analysis.extracted_locations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {analysis.extracted_locations.map((loc, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/50 text-[11px]"
                          >
                            {loc}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">No specific district name detected</span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Extracted Scale / Units:
                    </span>
                    {analysis.extracted_entities.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {analysis.extracted_entities.map((ent, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/50 text-[11px]"
                          >
                            {ent}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">None specified</span>
                    )}
                  </div>
                </div>

                {/* Review Action Recommendation */}
                <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-800/30 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-blue-300 block">Recommended Dispatcher Action:</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">{analysis.suggested_review_action}</p>
                  </div>
                </div>

                {/* Duplicate Detection Alert */}
                {analysis.possible_duplicates.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/30 text-xs">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Possible Duplicate Reports Found in Database:
                    </span>
                    <div className="space-y-1">
                      {analysis.possible_duplicates.map((dup) => (
                        <div
                          key={dup.report_id}
                          className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded"
                        >
                          <span className="line-clamp-1">{dup.title} ({dup.location_name})</span>
                          <span className="font-mono text-amber-400 font-bold shrink-0">
                            {(dup.similarity_score * 100).toFixed(0)}% Match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500">
                Enter an emergency transcript on the left or select a preset to preview AI triage suggestions.
              </div>
            )}
          </div>

          {/* Action Convert Button */}
          {analysis && (
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleCreateReportFromAI}
                disabled={converting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{converting ? 'Creating Report...' : '1-Click File As Verified Report'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
