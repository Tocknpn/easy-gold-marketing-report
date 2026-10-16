'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MonthlyMarketingTarget, 
  RunRateComparisonPayload 
} from '@/lib/types/target.types';
import { 
  DEFAULT_2026_TARGETS, 
  MONTH_NAMES, 
  calculateRunRateComparison, 
  getDaysInMonth 
} from '@/lib/constants/targetData';
import { ClassicRunRateTables } from './ClassicRunRateTables';
import { VisualTargetTrackingCockpit } from './VisualTargetTrackingCockpit';
import { SqlTargetEditorModal } from './SqlTargetEditorModal';
import { 
  Calendar, 
  Database, 
  SlidersHorizontal, 
  FileSpreadsheet, 
  BarChart3, 
  Table2, 
  Layers, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Info,
  CheckCircle2
} from 'lucide-react';

export function TargetReportView() {
  // Slicers state
  const [currYear] = useState<number>(2026);
  const [currMonth, setCurrMonth] = useState<number>(10); // Oct
  const [compMonth, setCompMonth] = useState<number>(9);  // Sep
  const [asOfDay, setAsOfDay] = useState<number>(15);     // Day 15
  const [viewMode, setViewMode] = useState<'combined' | 'tables' | 'visuals'>('combined');
  
  // Targets state (seeded with DEFAULT_2026_TARGETS, updated from API or localStorage)
  const [targets, setTargets] = useState<MonthlyMarketingTarget[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('easy_gold_2026_targets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return DEFAULT_2026_TARGETS;
  });

  // Modal state
  const [isSqlEditorOpen, setIsSqlEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnalystNotes, setShowAnalystNotes] = useState(true);

  // Maximum days for selected month
  const maxDays = useMemo(() => getDaysInMonth(currYear, currMonth), [currYear, currMonth]);

  // Ensure asOfDay does not exceed month limit
  useEffect(() => {
    if (asOfDay > maxDays) {
      setAsOfDay(maxDays);
    }
  }, [maxDays, asOfDay]);

  // Compute active report payload dynamically
  const reportData: RunRateComparisonPayload = useMemo(() => {
    return calculateRunRateComparison(
      currYear,
      currMonth,
      currYear,
      compMonth,
      asOfDay,
      targets
    );
  }, [currYear, currMonth, compMonth, asOfDay, targets]);

  // Save targets handler
  const handleSaveTargets = async (updated: MonthlyMarketingTarget[]) => {
    setTargets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('easy_gold_2026_targets', JSON.stringify(updated));
    }

    try {
      await fetch('/api/dashboard/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: updated }),
      });
    } catch (err) {
      console.warn('API sync notice: Targets persisted to browser storage.', err);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const csvRows = [
      ['Metric', `${reportData.comparison_month_label} Full`, `${reportData.current_month_label} MTD`, 'RR Proj', 'Diff', 'MoM %', 'Monthly Target', 'Vs Target %', `${reportData.comparison_month_label} Same Date`, 'Diff Same', '% Change Same', 'Vs Target Same %'],
      ...reportData.rows.map((r) => [
        `"${r.label}"`,
        r.comp_full_month,
        r.cur_mtd,
        r.rr_projected,
        r.diff_full,
        `${r.mom_full_pct}%`,
        r.target_val || '-',
        r.vs_target_pct ? `${r.vs_target_pct}%` : '-',
        r.comp_same_period,
        r.diff_same,
        `${r.mom_same_pct}%`,
        r.vs_target_same_pct ? `${r.vs_target_same_pct}%` : '-',
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `easy_gold_run_rate_${reportData.current_month_label}_vs_${reportData.comparison_month_label}_day${asOfDay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-300">
      {/* ==================================================================== */}
      {/* CONTROL & SLICER BAR                                                 */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-300/80 shadow-xs p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c4ca3] to-blue-900 text-amber-400 flex items-center justify-center font-black shadow-xs">
              <Table2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Monthly Run-Rate &amp; 2026 Target Tracking</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0c4ca3]">
                  Dual-Side Matrix
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Pacing comparison vs full month actuals &amp; same-date calendar windows with official 2026 targets.
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Layout Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-300/60 text-xs font-bold text-slate-700">
              <button
                onClick={() => setViewMode('combined')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'combined'
                    ? 'bg-white text-[#0c4ca3] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visual Cockpit + Classic Tables"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Combined</span>
              </button>
              <button
                onClick={() => setViewMode('visuals')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'visuals'
                    ? 'bg-white text-[#0c4ca3] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Modern Target Cockpit (Image 3)"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Target Cockpit</span>
              </button>
              <button
                onClick={() => setViewMode('tables')}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'tables'
                    ? 'bg-white text-[#0c4ca3] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Excel Table Grid for the Old Guys (Image 2)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Classic Tables</span>
              </button>
            </div>

            {/* SQL Target Editor Button */}
            <button
              onClick={() => setIsSqlEditorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-900 via-[#0c4ca3] to-slate-900 hover:opacity-95 text-white font-bold text-xs shadow-xs transition-all border border-blue-400/40"
              title="Open SQL Editor & 2026 Target Manager"
            >
              <Database className="w-3.5 h-3.5 text-amber-300" />
              <span>SQL Target Editor</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all"
              title="Export Run Rate Table to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dynamic Slicers & Date Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Current Month Slicer */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Current Month (2026)
            </label>
            <select
              value={currMonth}
              onChange={(e) => setCurrMonth(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={`curr-${name}`} value={idx + 1}>
                  {name} 2026
                </option>
              ))}
            </select>
          </div>

          {/* Comparison Month Slicer */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Comparison Month
            </label>
            <select
              value={compMonth}
              onChange={(e) => setCompMonth(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={`comp-${name}`} value={idx + 1}>
                  {name} 2026
                </option>
              ))}
            </select>
          </div>

          {/* Elapsed Day Slider */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                As-Of Cutoff Day (Elapsed: {asOfDay} / {maxDays} days = {reportData.time_gone_pct}%)
              </label>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <button
                  onClick={() => setAsOfDay(11)}
                  className={`px-1.5 py-0.5 rounded ${asOfDay === 11 ? 'bg-[#0c4ca3] text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  Day 11
                </button>
                <button
                  onClick={() => setAsOfDay(15)}
                  className={`px-1.5 py-0.5 rounded ${asOfDay === 15 ? 'bg-[#0c4ca3] text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  Day 15
                </button>
                <button
                  onClick={() => setAsOfDay(20)}
                  className={`px-1.5 py-0.5 rounded ${asOfDay === 20 ? 'bg-[#0c4ca3] text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  Day 20
                </button>
                <button
                  onClick={() => setAsOfDay(maxDays)}
                  className={`px-1.5 py-0.5 rounded ${asOfDay === maxDays ? 'bg-[#0c4ca3] text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  Full Month
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={maxDays}
                value={asOfDay}
                onChange={(e) => setAsOfDay(parseInt(e.target.value, 10))}
                className="w-full accent-[#0c4ca3] cursor-pointer"
              />
              <span className="font-mono font-black text-xs text-[#0c4ca3] w-8 text-right shrink-0">
                D{asOfDay}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Senior Data Analyst Briefing Callout */}
      {showAnalystNotes && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 text-xs text-slate-700 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#0c4ca3] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-[#0c4ca3] text-xs">
                  Senior Analyst Perspective: Dual-Side Run-Rate Mechanics
                </span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono text-[9px] font-bold">
                  Multiplier = {reportData.run_rate_multiplier}x
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Table 1 (Full Month Compare)</strong> scales {reportData.current_month_label}&apos;s {asOfDay}-day performance across {maxDays} days to project final month landing against {reportData.comparison_month_label} Full Month and Board Budget Targets ({reportData.rows[1].target_val?.toLocaleString()}g buy target).
                {' '}<strong>Table 2 (Same Period Compare)</strong> standardizes seasonality by isolating Day 1 to {asOfDay} against the exact same calendar days in {reportData.comparison_month_label}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAnalystNotes(false)}
            className="text-slate-400 hover:text-slate-600 font-bold text-[10px] shrink-0 p-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW SECTION 1: MODERN VISUAL TARGET COCKPIT (Image 3 Concept)       */}
      {/* ==================================================================== */}
      {(viewMode === 'combined' || viewMode === 'visuals') && (
        <VisualTargetTrackingCockpit data={reportData} />
      )}

      {/* ==================================================================== */}
      {/* VIEW SECTION 2: CLASSIC EXCEL RUN-RATE TABLES (Image 2 Concept)      */}
      {/* ==================================================================== */}
      {(viewMode === 'combined' || viewMode === 'tables') && (
        <div className="pt-2">
          <ClassicRunRateTables data={reportData} />
        </div>
      )}

      {/* SQL Target Editor Modal */}
      <SqlTargetEditorModal
        isOpen={isSqlEditorOpen}
        onClose={() => setIsSqlEditorOpen(false)}
        targets={targets}
        onSaveTargets={handleSaveTargets}
      />
    </div>
  );
}
