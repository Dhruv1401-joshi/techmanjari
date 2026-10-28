import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Layers, 
  ShieldCheck,
  Activity
} from 'lucide-react';
import { api } from '../api/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#eab308'];

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const summary = await api.getAnalyticsSummary();
      setData(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open(api.getCsvExportUrl(), '_blank');
  };

  const handleExportPdf = () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const now = new Date().toLocaleString();

      // Title & Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DISASTER RESPONSE ANALYTICS PLATFORM', 14, 16);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Official Executive Summary Report • Generated: ${now}`, 14, 25);
      doc.text('TechManjari Review-1 Operational Audit', 14, 30);

      // Simulation Disclaimer Box
      doc.setFillColor(254, 243, 199);
      doc.rect(14, 40, 182, 16, 'F');
      doc.setTextColor(146, 64, 14);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('SIMULATION NOTICE (HARDWARE DEFERRED FOR REVIEW-1):', 18, 46);
      doc.setFont('helvetica', 'normal');
      doc.text('Water sensor metrics reflect software simulation scenarios. No physical sensors connected.', 18, 52);

      let currentY = 65;

      // Section 1: Categories Table
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Incident Distribution by Hazard Category', 14, currentY);

      const categoryRows = data?.category_breakdown?.map((c: any) => [
        c.category.toUpperCase(),
        c.count,
        'GDACS & Field Reports'
      ]) || [];

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Hazard Category', 'Recorded Count', 'Source Type']],
        body: categoryRows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 }
      });

      // Section 2: Verification Status Table
      currentY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('2. Citizen Report Verification Audit', 14, currentY);

      const verRows = data?.verification_breakdown?.map((v: any) => [
        v.status,
        v.count,
        v.status === 'Verified' ? 'Approved for Dispatch' : 'Awaiting Review / Rejected'
      ]) || [];

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Verification State', 'Total Reports', 'Action Status']],
        body: verRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 }
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} • Disaster Response Analytics Platform`, 14, 285);
      }

      doc.save('disaster_analytics_summary.pdf');
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF summary.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Analytics & Executive Report Exports
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Empirical data summaries, verification metrics, and one-click compliance export generators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{exportingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Bar Chart */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Incidents by Hazard Category
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Real database records</span>
          </div>
          <div className="h-64">
            {data?.category_breakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.category_breakdown}>
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
                Not enough data to calculate this trend.
              </div>
            )}
          </div>
        </div>

        {/* Priority Breakdown Pie Chart */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              Emergency Reports by Priority
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Dispatcher Priority</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {data?.priority_breakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.priority_breakdown}
                    dataKey="count"
                    nameKey="priority"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={((entry: any) => `${entry.name || entry.priority || ''}: ${entry.value || entry.count || ''}`) as any}
                  >
                    {data.priority_breakdown.map((_: any, index: number) => (
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
              <div className="text-xs text-slate-500">
                No priority records logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Verification Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Report Verification Audit Breakdown
            </h3>
          </div>
          <div className="space-y-3 pt-2">
            {data?.verification_breakdown?.map((v: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <span className="font-medium text-slate-300">{v.status}</span>
                <span className="font-mono font-bold text-slate-100">{v.count} reports</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Simulation Historical Trend */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Sensor Simulation Water Level Trend
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono">SIMULATION</span>
          </div>
          <div className="h-48">
            {data?.sensor_trends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.sensor_trends}>
                  <XAxis dataKey="recorded_at" tickFormatter={(t) => t.slice(11, 16)} stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} unit="m" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#06b6d4' }}
                  />
                  <Line type="monotone" dataKey="water_level_meters" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                Not enough sensor history to plot trend.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
