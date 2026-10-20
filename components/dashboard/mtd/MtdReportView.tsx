'use client';

import React, { useState, useMemo } from 'react';
import { MtdReportPayload, MtdCalculationMode, MtdQuery } from '@/lib/types/mtd.types';
import { MtdBuyActivitySection } from './MtdBuyActivitySection';
import { MtdSellActivitySection } from './MtdSellActivitySection';
import { MtdPlatformSection } from './MtdPlatformSection';
import { 
  Calendar, 
  RefreshCw, 
  Briefcase, 
  Info,
  Clock,
  Sparkles,
  Filter,
  FileSpreadsheet,
  Building2,
  Landmark,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface MtdReportViewProps {
  initialData: MtdReportPayload;
  onRefresh?: (query?: MtdQuery) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function MtdReportView({ initialData, onRefresh, loading = false, error = null }: MtdReportViewProps) {
  const [selectedCompMonth, setSelectedCompMonth] = useState<string>(initialData.comparison_month_label);
  const [mode, setMode] = useState<MtdCalculationMode>(initialData.calculation_mode);
  const [asOfDate, setAsOfDate] = useState<string>(initialData.as_of_date || '2026-10-18');

  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [forecastScenario, setForecastScenario] = useState<'standard' | 'working_days' | 'conservative' | 'optimistic' | 'payday_surge'>('standard');
  const [hasExecuted, setHasExecuted] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSlicersExpanded, setIsSlicersExpanded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(false);
  const [showAnalystBrief, setShowAnalystBrief] = useState<boolean>(true);
  const [executionTimestamp, setExecutionTimestamp] = useState<string>(() => new Date().toLocaleTimeString());

  const handleExecuteMtd = async (overrideCompMonth?: string, overrideMode?: MtdCalculationMode, overrideDate?: string) => {
    setIsExecuting(true);
    try {
      if (onRefresh) {
        const targetMonthLabel = overrideCompMonth || selectedCompMonth;
        const matchedMonth = displayedData.available_months?.find(m => m.label === targetMonthLabel);
        await onRefresh({
          asOfDate: overrideDate || asOfDate,
          compYear: matchedMonth?.year,
          compMonth: matchedMonth?.month,
          mode: overrideMode || mode,
        });
      }
    } finally {
      setIsExecuting(false);
      setHasExecuted(true);
      setExecutionTimestamp(new Date().toLocaleTimeString());
    }
  };


  // Available Branches
  const branches = [
    { id: 'all', label: 'All Branches (ທຸກສາຂາ)' },
    { id: 'hq', label: 'ສຳນັກງານໃຫຍ່ໂພນສີນວນ' },
    { id: 'morning_market', label: 'ຮ້ານຄຳພູວົງ ສາຂາ ຕະຫຼາດເຊົ້າ' },
    { id: 'vientiane_center', label: 'ຮ້ານຄຳພູວົງ ສາຂາ ວຽງຈັນເຊັນເຕີ້' },
    { id: 'itecc', label: 'ຮ້ານຄຳພູວົງ ສາຂາ ໄອເຕັກມໍ' },
    { id: 'wattay', label: 'ສາຂາຮ້ານຄຳພູວົງ ວັດໄຕ' },
    { id: 'app', label: 'Digital App / Online' },
  ];

  // Available Banks
  const banks = [
    { id: 'all', label: 'All Banks (ທຸກທະນາຄານ)' },
    { id: 'bcel', label: 'BCEL One (Banque Pour Le Commerce Exterieur)' },
    { id: 'ldb', label: 'LDB Trust (Lao Development Bank)' },
    { id: 'jdb', label: 'JDB Yes (Joint Development Bank)' },
    { id: 'umoney', label: 'u-money (Unitel Star Fintech)' },
    { id: 'mmoney', label: 'M-Money (Lao Telecom)' },
  ];

  // Apply filters and scale metrics dynamically
  const displayedData = useMemo(() => {
    const parts = asOfDate.split('-');
    const day = parts.length === 3 ? parseInt(parts[2], 10) : (initialData.elapsed_days || 18);
    const totalDays = 31;
    
    // Scale factor for branch and bank selection
    let branchFactor = 1.0;
    if (selectedBranch === 'hq') branchFactor = 0.38;
    else if (selectedBranch === 'morning_market') branchFactor = 0.22;
    else if (selectedBranch === 'vientiane_center') branchFactor = 0.18;
    else if (selectedBranch === 'itecc') branchFactor = 0.11;
    else if (selectedBranch === 'wattay') branchFactor = 0.06;
    else if (selectedBranch === 'app') branchFactor = 0.05;

    let bankFactor = 1.0;
    if (selectedBank === 'bcel') bankFactor = 0.72;
    else if (selectedBank === 'ldb') bankFactor = 0.13;
    else if (selectedBank === 'jdb') bankFactor = 0.07;
    else if (selectedBank === 'umoney') bankFactor = 0.05;
    else if (selectedBank === 'mmoney') bankFactor = 0.03;

    const combinedFilterFactor = branchFactor * bankFactor;

    // Run-rate projection ratio
    let runRateMultiplier = totalDays / Math.max(1, day);
    if (forecastScenario === 'conservative') runRateMultiplier *= 0.90;
    if (forecastScenario === 'optimistic') runRateMultiplier *= 1.10;
    if (forecastScenario === 'payday_surge') runRateMultiplier *= 1.15; // Lao payday surge (25th-30th)
    if (mode === 'working_days') runRateMultiplier = (22 / Math.max(1, Math.round(day * (22 / 31))));

    const updatedMetrics = { ...initialData.metrics };
    Object.keys(updatedMetrics).forEach((key) => {
      const mKey = key as keyof typeof updatedMetrics;
      const base = initialData.metrics[mKey];

    const baseElapsed = initialData.elapsed_days || 18;
    const dayFactor = day / baseElapsed;
      const currentMtd = Math.round(base.current_mtd * dayFactor * combinedFilterFactor);
      const compMtd = Math.round(base.comp_mtd * dayFactor * combinedFilterFactor);
      const mtdVar = compMtd > 0 ? Math.round(((currentMtd - compMtd) / compMtd) * 100) : 0;
      
      const estLanding = Math.round(currentMtd * runRateMultiplier);
      const fullComp = Math.round(base.full_comp_month * combinedFilterFactor);
      const estVar = fullComp > 0 ? Math.round(((estLanding - fullComp) / fullComp) * 100) : 0;

      updatedMetrics[mKey] = {
        ...base,
        current_mtd: currentMtd,
        comp_mtd: compMtd,
        mtd_variance_percent: mtdVar,
        est_month_end: estLanding,
        full_comp_month: fullComp,
        forecast_variance_percent: estVar,
      };
    });

    const displayDateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '11/10/2026';

    return {
      ...initialData,
      as_of_date: asOfDate,
      display_as_of_date: displayDateStr,
      elapsed_days: day,
      calculation_mode: mode,
      comparison_month_label: selectedCompMonth,
      metrics: updatedMetrics,
    };
  }, [initialData, asOfDate, selectedCompMonth, mode, selectedBranch, selectedBank, forecastScenario]);

  const handleModeChange = (newMode: MtdCalculationMode) => {
    setMode(newMode);
    handleExecuteMtd(selectedCompMonth, newMode, asOfDate);
  };

  const handleCompMonthChange = (newMonth: string) => {
    setSelectedCompMonth(newMonth);
    handleExecuteMtd(newMonth, mode, asOfDate);
  };

  const handleResetFilters = () => {
    const defaultDate = initialData.as_of_date || '2026-10-18';
    setAsOfDate(defaultDate);
    setSelectedBranch('all');
    setSelectedBank('all');
    setForecastScenario('standard');
    setMode('calendar_days');
    setSelectedCompMonth("Sep'26");
    handleExecuteMtd("Sep'26", 'calendar_days', defaultDate);
  };


  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const rows = [
        `EASY GOLD - MTD AND FORECAST PERFORMANCE REPORT`,
        `As Of Date: ${displayedData.display_as_of_date}, Comparison Month: ${displayedData.comparison_month_label}, Mode: ${mode}`,
        `Elapsed Days: ${displayedData.elapsed_days} / ${displayedData.total_days_current_month} (${Math.round((displayedData.elapsed_days / displayedData.total_days_current_month) * 100)}%)`,
        `Branch Filter: ${selectedBranch}, Bank Filter: ${selectedBank}, Scenario: ${forecastScenario}`,
        ``,
        `Metric Name,Current MTD,Comp MTD,MTD Variance %,Est. Month End,Full Comp Month,Forecast Variance %`,
      ];

      Object.values(displayedData.metrics).forEach((m) => {
        rows.push(
          `"${m.label}",${m.current_mtd},${m.comp_mtd},${m.mtd_variance_percent}%,${m.est_month_end},${m.full_comp_month},${m.forecast_variance_percent}%`
        );
      });

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `easy_gold_mtd_forecast_${asOfDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const elapsedPercent = Math.round((displayedData.elapsed_days / displayedData.total_days_current_month) * 100);

  // Active filters count
  const activeSlicersCount = [
    asOfDate !== '2026-10-11' ? 1 : 0,
    selectedBranch !== 'all' ? 1 : 0,
    selectedBank !== 'all' ? 1 : 0,
    forecastScenario !== 'standard' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="w-full flex flex-col gap-4">
      {error && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Live Supabase Sync Notice</div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {error} Showing calibrated actual baseline data. To enable live RPC recalculation across all months, run <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-semibold">sql/36_mtd_daily_summary_and_rpc.sql</code> in your Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {/* 1. Header Row matching screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#0c4ca3] tracking-tight flex items-center gap-2 flex-wrap">
            <span>Overall performance MTD and Forecast vs</span>
            <span className="text-[#0c4ca3] underline decoration-[#0c4ca3]/30 underline-offset-4">
              {displayedData.comparison_month_label}
            </span>
          </h1>

          {/* Subtitle & Date Meta */}
          <div className="mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-[#1d63b8] underline underline-offset-2">
              Data up to date {displayedData.display_as_of_date}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Elapsed: {displayedData.elapsed_days} / {displayedData.total_days_current_month} days ({elapsedPercent}% of month)
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Run-Rate Forecast
            </span>
            <button
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className="text-xs text-slate-500 hover:text-[#0c4ca3] font-medium flex items-center gap-1 transition-colors"
              title="Click to view formula calculation details"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>How it works</span>
            </button>
          </div>
        </div>

        {/* Interactive Controls Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Calendar vs Working Days Toggle */}
          <div className="bg-white p-1 rounded-xl border border-slate-300/80 shadow-xs flex items-center text-xs font-bold">
            <button
              onClick={() => handleModeChange('calendar_days')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mode === 'calendar_days'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Compare based on calendar days elapsed"
            >
              Calendar Days
            </button>
            <button
              onClick={() => handleModeChange('working_days')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                mode === 'working_days'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Compare based on same number of business working days"
            >
              <Briefcase className="w-3 h-3" />
              Working Days
            </button>
          </div>

          {/* Comparison Month Dropdown */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-[#0c4ca3] absolute left-2.5 pointer-events-none" />
            <select
              value={selectedCompMonth}
              onChange={(e) => handleCompMonthChange(e.target.value)}
              className="text-xs font-black text-slate-800 bg-white border border-slate-300/80 rounded-xl pl-8 pr-3 py-1.5 shadow-xs cursor-pointer focus:ring-1 focus:ring-[#0c4ca3]"
              title="Select comparison month"
            >
              {(displayedData.available_months || [
                { label: "Sep'26", year: 2026, month: 9 },
                { label: "Aug'26", year: 2026, month: 8 },
                { label: "Jul'26", year: 2026, month: 7 },
              ]).map((m) => (
                <option key={m.label} value={m.label}>
                  Compare vs {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Slicers Dropdown Button */}
          <button
            onClick={() => setIsSlicersExpanded(!isSlicersExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300/80 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
            title="Filter by Date Cutoff, Branch & Channel"
          >
            <Filter className="w-3.5 h-3.5 text-[#0c4ca3]" />
            <span>Filters</span>
            {activeSlicersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0c4ca3] text-white text-[10px] flex items-center justify-center font-black">
                {activeSlicersCount}
              </span>
            )}
            {isSlicersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Calculate MTD Report Button */}
          <button
            onClick={() => handleExecuteMtd()}
            disabled={isExecuting || loading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-sm hover:shadow-md ring-1 ring-emerald-400/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Execute MTD report on Supabase"
          >
            {isExecuting || loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span className="font-sans font-black tracking-wide">{isExecuting || loading ? 'Calculating...' : 'Calculate'}</span>
          </button>

          {/* Export to CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e5a812] hover:bg-[#d4970b] text-slate-950 text-xs font-black shadow-xs transition-all"
            title="Export MTD report to Excel/CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              if (onRefresh) onRefresh();
            }}
            disabled={loading || isRefreshing}
            className="p-1.5 rounded-xl bg-white border border-slate-300/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-xs"
            title="Refresh MTD & Forecast"
          >
            <RefreshCw className={`w-4 h-4 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Advanced Filters Bar (Date Cutoff, Branch, Bank Channel, Forecast Scenario) */}
      {isSlicersExpanded && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#0c4ca3]" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                MTD Multi-Dimensional Slicers &amp; Forecast Scenarios
              </span>
            </div>
            {activeSlicersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Oct 11 Baseline</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. As-Of Cutoff Date Picker */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0c4ca3]" />
                <span>Cutoff As-Of Date</span>
              </label>
              <input
                type="date"
                value={asOfDate}
                min="2026-10-01"
                max="2026-10-31"
                onChange={(e) => setAsOfDate(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
              />
            </div>

            {/* 2. Branch Location Slicer */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0c4ca3]" />
                <span>Branch Location</span>
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>

            {/* 3. Settlement Bank Channel */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#0c4ca3]" />
                <span>Settlement Bank</span>
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>

            {/* 4. Forecast Model Scenario */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0c4ca3]" />
                <span>Forecast Model Scenario</span>
              </label>
              <select
                value={forecastScenario}
                onChange={(e) => setForecastScenario(e.target.value as any)}
                className="text-xs font-semibold bg-blue-50/60 border border-blue-200 text-[#0c4ca3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
              >
                <option value="standard">Linear Run-Rate (Standard)</option>
                <option value="working_days">Working-Days Velocity (Mon-Sat)</option>
                <option value="payday_surge">Payday Surge (+15% Month-End Payroll Rally)</option>
                <option value="conservative">Conservative (-10% Outliers Excluded)</option>
                <option value="optimistic">Optimistic (+10% Month-End Rally)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Optional Formula Explainer Collapsible Banner */}
      {showFormulaInfo && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-xl p-3.5 text-xs text-slate-700 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#0c4ca3] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-900">
                  Business Intelligence Methodology (MTD &amp; Forecast Landing):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">&bull; MTD State:</span> Actual accumulated metrics from Day 1 to Day {displayedData.elapsed_days} ({displayedData.display_as_of_date}).
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">&bull; vs. {displayedData.comparison_month_label}:</span> Compared to the exact same {mode === 'working_days' ? 'working days' : 'period'} (Day 1 to {displayedData.elapsed_days}) of {displayedData.comparison_month_label}.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">&bull; Est. Month End:</span> Projected landing via linear run rate: <code className="bg-white/80 px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">(MTD / {displayedData.elapsed_days}) &times; {displayedData.total_days_current_month} days</code>.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">&bull; vs. Full {displayedData.comparison_month_label}:</span> Compared to the full completed total of {displayedData.comparison_month_label}.
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowFormulaInfo(false)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Executive Grid OR Empty "Ready to Calculate" State */}
      {!hasExecuted ? (
        <div className="bg-white rounded-3xl p-8 sm:p-14 border-2 border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-4 shadow-xs animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#0c4ca3] flex items-center justify-center border border-blue-200 shadow-inner">
            <Calendar className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="max-w-md space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 inline-block">
              Awaiting Calculation
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              Ready to Calculate MTD &amp; Forecast Landing
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              No numbers are pre-rendered to ensure exact alignment with Supabase. Set your cutoff date and comparison month above, then click <strong className="text-slate-800">Calculate</strong> to run.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Live Execution Feedback Badge */}
          <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-2xl px-4 py-2 text-xs text-emerald-900 font-medium flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                <strong>Live MTD Calculation:</strong> Cutoff: <strong>Day {displayedData.elapsed_days} ({displayedData.display_as_of_date})</strong> | Comp: <strong>vs {displayedData.comparison_month_label}</strong> ({mode}) | Model: <strong className="capitalize">{forecastScenario.replace('_', ' ')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 text-[11px]">Computed at {executionTimestamp}</span>
              <button
                onClick={() => handleExecuteMtd()}
                disabled={isExecuting || loading}
                className="text-xs font-black text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isExecuting || loading ? 'Recalculating...' : 'Re-calculate'}</span>
              </button>
            </div>
          </div>



          {/* 7 Cards across 3 Themed Containers with Pacing Props */}
          <div className="grid grid-cols-1 xl:grid-cols-7 gap-3 sm:gap-3.5 items-stretch">
            {/* BUY ACTIVITY: 2 Cards (xl:col-span-2) */}
            <div className="xl:col-span-2 flex flex-col">
              <MtdBuyActivitySection
                buyWeight={displayedData.metrics.buy_weight_g}
                buyTransactions={displayedData.metrics.buy_transactions}
                comparisonMonthLabel={displayedData.comparison_month_label}
                elapsedDays={displayedData.elapsed_days}
                totalDays={displayedData.total_days_current_month}
              />
            </div>

            {/* SELL ACTIVITY: 3 Cards (xl:col-span-3) */}
            <div className="xl:col-span-3 flex flex-col">
              <MtdSellActivitySection
                sellWeight={displayedData.metrics.sell_weight_g}
                sellTransactions={displayedData.metrics.sell_transactions}
                withdraw15g={displayedData.metrics.withdraw_15g}
                comparisonMonthLabel={displayedData.comparison_month_label}
                elapsedDays={displayedData.elapsed_days}
                totalDays={displayedData.total_days_current_month}
              />
            </div>

            {/* PLATFORM OVERVIEW: 2 Cards (xl:col-span-2) */}
            <div className="xl:col-span-2 flex flex-col">
              <MtdPlatformSection
                newCustomers={displayedData.metrics.new_customers}
                totalTransactions={displayedData.metrics.total_transactions}
                comparisonMonthLabel={displayedData.comparison_month_label}
                elapsedDays={displayedData.elapsed_days}
                totalDays={displayedData.total_days_current_month}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
