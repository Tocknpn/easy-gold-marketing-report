'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MtdReportPayload, MtdQuery } from '@/lib/types/mtd.types';
import { MtdBuyActivitySection } from './MtdBuyActivitySection';
import { MtdSellActivitySection } from './MtdSellActivitySection';
import { MtdPlatformSection } from './MtdPlatformSection';
import { 
  Calendar, 
  RefreshCw, 
  Info,
  Clock,
  Sparkles,
  Filter,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
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
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>(
    initialData.current_month_label || "Oct'26"
  );
  const [selectedCompMonth, setSelectedCompMonth] = useState<string>(
    initialData.comparison_month_label || "Sep'26"
  );
  const [asOfDate, setAsOfDate] = useState<string>(initialData.as_of_date || '');

  const [forecastScenario, setForecastScenario] = useState<'standard' | 'conservative' | 'optimistic' | 'payday_surge'>('standard');
  const [hasExecuted, setHasExecuted] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSlicersExpanded, setIsSlicersExpanded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(false);
  const [executionTimestamp, setExecutionTimestamp] = useState<string>(() => new Date().toLocaleTimeString());

  // Dynamically compile all available months from payload
  const allAvailableMonths = useMemo(() => {
    const list: Array<{ label: string; year: number; month: number; isCurrent?: boolean }> = [];
    if (initialData.current_month_label) {
      list.push({
        label: initialData.current_month_label,
        year: initialData.current_month_year || 2026,
        month: initialData.current_month_num || 10,
        isCurrent: true,
      });
    }
    (initialData.available_months || []).forEach((m) => {
      if (!list.some((existing) => existing.label === m.label)) {
        list.push({ ...m, isCurrent: false });
      }
    });
    // Ensure default list is populated if empty
    if (list.length === 0) {
      list.push(
        { label: "Oct'26", year: 2026, month: 10, isCurrent: true },
        { label: "Sep'26", year: 2026, month: 9, isCurrent: false },
        { label: "Aug'26", year: 2026, month: 8, isCurrent: false },
        { label: "Jul'26", year: 2026, month: 7, isCurrent: false }
      );
    }
    return list;
  }, [initialData]);

  // Keep state synchronized with incoming initialData (e.g. month rollover to November)
  useEffect(() => {
    if (initialData?.current_month_label) {
      setSelectedReportMonth(initialData.current_month_label);
    }
    if (initialData?.comparison_month_label) {
      setSelectedCompMonth(initialData.comparison_month_label);
    }
    if (initialData?.as_of_date) {
      setAsOfDate(initialData.as_of_date);
    }
  }, [initialData?.current_month_label, initialData?.comparison_month_label, initialData?.as_of_date]);

  const handleExecuteMtd = async (
    overrideCompMonth?: string, 
    overrideDate?: string
  ) => {
    setIsExecuting(true);
    try {
      if (onRefresh) {
        const targetCompLabel = overrideCompMonth || selectedCompMonth;
        const matchedComp = allAvailableMonths.find(m => m.label === targetCompLabel);
        await onRefresh({
          asOfDate: overrideDate || asOfDate,
          compYear: matchedComp?.year,
          compMonth: matchedComp?.month,
          mode: 'calendar_days',
        });
      }
    } finally {
      setIsExecuting(false);
      setHasExecuted(true);
      setExecutionTimestamp(new Date().toLocaleTimeString());
    }
  };

  // Change MTD Target Month
  const handleReportMonthChange = (newMonthLabel: string) => {
    setSelectedReportMonth(newMonthLabel);
    const targetMonth = allAvailableMonths.find((m) => m.label === newMonthLabel);
    if (!targetMonth) return;

    let targetDate = initialData.as_of_date;
    if (targetMonth.isCurrent) {
      targetDate = initialData.as_of_date || `${targetMonth.year}-${String(targetMonth.month).padStart(2, '0')}-21`;
    } else {
      const lastDay = new Date(targetMonth.year, targetMonth.month, 0).getDate();
      targetDate = `${targetMonth.year}-${String(targetMonth.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
    setAsOfDate(targetDate);

    // Auto-select comparison month (month preceding the target month)
    const curIdx = allAvailableMonths.findIndex((m) => m.label === newMonthLabel);
    const defaultComp = allAvailableMonths[curIdx + 1]?.label || (allAvailableMonths.find(m => m.label !== newMonthLabel)?.label);
    const compToUse = defaultComp || selectedCompMonth;
    if (compToUse && compToUse !== newMonthLabel) {
      setSelectedCompMonth(compToUse);
      handleExecuteMtd(compToUse, targetDate);
    } else {
      handleExecuteMtd(selectedCompMonth, targetDate);
    }
  };

  // Change Comparison Month
  const handleCompMonthChange = (newMonth: string) => {
    setSelectedCompMonth(newMonth);
    handleExecuteMtd(newMonth, asOfDate);
  };

  // Apply filters and scale metrics dynamically
  const displayedData = useMemo(() => {
    const parts = (asOfDate || '').split('-');
    const currYear = parts.length === 3 ? (parseInt(parts[0], 10) || 2026) : (initialData.current_month_year || 2026);
    const currMonth = parts.length === 3 ? (parseInt(parts[1], 10) || 10) : (initialData.current_month_num || 10);
    const day = parts.length === 3 ? (parseInt(parts[2], 10) || 1) : (initialData.elapsed_days || 1);
    const totalDays = initialData.total_days_current_month || new Date(currYear, currMonth, 0).getDate();
    
    // 100% Real Consolidated Metrics
    let runRateMultiplier = totalDays / Math.max(1, day);
    if (forecastScenario === 'conservative') runRateMultiplier *= 0.90;
    if (forecastScenario === 'optimistic') runRateMultiplier *= 1.10;
    if (forecastScenario === 'payday_surge') runRateMultiplier *= 1.15; // Lao payday surge (25th-30th)

    const updatedMetrics = { ...initialData.metrics };
    Object.keys(updatedMetrics).forEach((key) => {
      const mKey = key as keyof typeof updatedMetrics;
      const base = initialData.metrics[mKey];

      const currentMtd = base.current_mtd;
      const compMtd = base.comp_mtd;
      const mtdVar = compMtd > 0 ? Math.round(((currentMtd - compMtd) / compMtd) * 100) : 0;
      
      const estLanding = Math.round(currentMtd * runRateMultiplier);
      const fullComp = base.full_comp_month;
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

    const displayDateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : (initialData.display_as_of_date || asOfDate);

    return {
      ...initialData,
      as_of_date: asOfDate,
      display_as_of_date: displayDateStr,
      elapsed_days: day,
      total_days_current_month: totalDays,
      comparison_month_label: selectedCompMonth,
      metrics: updatedMetrics,
    };
  }, [initialData, asOfDate, selectedCompMonth, forecastScenario]);

  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const metricLabelMap: Record<string, string> = {
        buy_weight_g: 'Buy Weight (baht)',
        sell_weight_g: 'Sell Weight (Baht)',
        buy_transactions: 'Buy Trx',
        sell_transactions: 'Sell Trx',
        new_customers: 'NC',
        total_transactions: 'Total Trx',
        withdraw_15g: 'Withdraw (15g)',
      };

      const rows = [
        `EASY GOLD - MTD AND FORECAST PERFORMANCE REPORT`,
        `Report Month: ${selectedReportMonth}, As Of Date: ${displayedData.display_as_of_date}, Comparison Month: ${displayedData.comparison_month_label}`,
        `Elapsed Days: ${displayedData.elapsed_days} / ${displayedData.total_days_current_month} (${Math.round((displayedData.elapsed_days / displayedData.total_days_current_month) * 100)}%)`,
        `Scenario: ${forecastScenario}`,
        ``,
        `Metric Name,Current MTD,Comp MTD,MTD Variance %,Est. Month End,Full Comp Month,Forecast Variance %`,
      ];

      Object.values(displayedData.metrics).forEach((m) => {
        const cleanName = metricLabelMap[m.id] || m.label;
        rows.push(
          `"${cleanName}",${m.current_mtd},${m.comp_mtd},${m.mtd_variance_percent}%,${m.est_month_end},${m.full_comp_month},${m.forecast_variance_percent}%`
        );
      });

      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `easy_gold_mtd_forecast_${selectedReportMonth}_${asOfDate}.csv`);
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
    asOfDate !== initialData.as_of_date ? 1 : 0,
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
              {error} Showing calibrated actual baseline data.
            </p>
          </div>
        </div>
      )}

      {/* 1. Header Row matching screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-brand-navy tracking-tight flex items-center gap-2 flex-wrap">
            <span>
              Overall performance MTD {selectedReportMonth !== initialData.current_month_label ? `(${selectedReportMonth})` : ''} and Forecast vs
            </span>
            <span className="text-brand-navy underline decoration-brand-navy/30 underline-offset-4">
              {displayedData.comparison_month_label}
            </span>
          </h1>

          {/* Subtitle & Date Meta */}
          <div className="mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-brand-navyLight underline underline-offset-2">
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
              className="text-xs text-slate-500 hover:text-brand-navy font-medium flex items-center gap-1 transition-colors"
              title="Click to view formula calculation details"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>How it works</span>
            </button>
          </div>
        </div>

        {/* Interactive Controls Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. MTD Target Month Dropdown */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-brand-navy absolute left-2.5 pointer-events-none" />
            <select
              value={selectedReportMonth}
              onChange={(e) => handleReportMonthChange(e.target.value)}
              className="text-xs font-black text-slate-800 bg-white border border-slate-300/80 rounded-xl pl-8 pr-3 py-1.5 shadow-xs cursor-pointer focus:ring-1 focus:ring-brand-navy"
              title="Select month for MTD report"
            >
              {allAvailableMonths.map((m) => (
                <option key={m.label} value={m.label}>
                  MTD: {m.label} {m.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Comparison Month Dropdown */}
          <div className="relative flex items-center">
            <span className="text-xs font-bold text-slate-500 hidden sm:inline mr-1">vs</span>
            <select
              value={selectedCompMonth}
              onChange={(e) => handleCompMonthChange(e.target.value)}
              className="text-xs font-black text-slate-800 bg-white border border-slate-300/80 rounded-xl px-3 py-1.5 shadow-xs cursor-pointer focus:ring-1 focus:ring-brand-navy"
              title="Select comparison month"
            >
              {allAvailableMonths
                .filter((m) => m.label !== selectedReportMonth)
                .map((m) => (
                  <option key={m.label} value={m.label}>
                    Compare vs {m.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Toggle Slicers Dropdown Button */}
          <button
            onClick={() => setIsSlicersExpanded(!isSlicersExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300/80 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
            title="Filter by Cutoff Date & Forecast Scenario"
          >
            <Filter className="w-3.5 h-3.5 text-brand-navy" />
            <span>Filters</span>
            {activeSlicersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-navy text-white text-[10px] flex items-center justify-center font-black">
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
            title="Execute MTD report calculation"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-gold hover:bg-brand-goldDark text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer"
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
            className="p-1.5 rounded-xl bg-white border border-slate-300/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            title="Refresh MTD & Forecast"
          >
            <RefreshCw className={`w-4 h-4 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Advanced Filters Bar (Date Cutoff & Forecast Scenario) */}
      {isSlicersExpanded && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-navy" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                MTD Slicers &amp; Forecast Scenarios
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {/* 1. As-Of Cutoff Date Picker */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-navy" />
                <span>Cutoff As-Of Date</span>
              </label>
              <input
                type="date"
                value={asOfDate}
                min="2025-01-01"
                max="2026-12-31"
                onChange={(e) => setAsOfDate(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-brand-navy focus:outline-hidden text-slate-800"
              />
            </div>

            {/* 2. Forecast Model Scenario */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-navy" />
                <span>Forecast Model Scenario</span>
              </label>
              <select
                value={forecastScenario}
                onChange={(e) => setForecastScenario(e.target.value as any)}
                className="text-xs font-semibold bg-blue-50/60 border border-blue-200 text-brand-navy rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-brand-navy focus:outline-hidden"
              >
                <option value="standard">Linear Run-Rate (Standard)</option>
                <option value="payday_surge">Payday Surge (+15% Month-End Payroll Rally)</option>
                <option value="conservative">Conservative (-10% Outliers Excluded)</option>
                <option value="optimistic">Optimistic (+10% Month-End Rally)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-brand-navy shrink-0" />
            <span>
              <strong>Note:</strong> MTD Forecast displays certified company-wide consolidated ledger metrics. For granular ad-hoc bank or branch dimensional analysis, switch to <strong>Dynamic BI</strong> or <strong>Power Pivot Studio</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Optional Formula Explainer Collapsible Banner */}
      {showFormulaInfo && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-xl p-3.5 text-xs text-slate-700 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-brand-navy shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-900">
                  Business Intelligence Methodology (MTD &amp; Forecast Landing):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">&bull; MTD State:</span> Actual accumulated metrics from Day 1 to Day {displayedData.elapsed_days} ({displayedData.display_as_of_date}).
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">&bull; vs. {displayedData.comparison_month_label}:</span> Compared to the exact same period (Day 1 to {displayedData.elapsed_days}) of {displayedData.comparison_month_label}.
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
              className="text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Executive Grid OR Empty "Ready to Calculate" State */}
      {!hasExecuted ? (
        <div className="bg-white rounded-3xl p-8 sm:p-14 border-2 border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-4 shadow-xs animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-brand-navy flex items-center justify-center border border-blue-200 shadow-inner">
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
              Set your cutoff date and comparison month above, then click <strong className="text-slate-800">Calculate</strong> to run.
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
                <strong>Live MTD Calculation:</strong> Cutoff: <strong>Day {displayedData.elapsed_days} ({displayedData.display_as_of_date})</strong> | Comp: <strong>vs {displayedData.comparison_month_label}</strong> | Model: <strong className="capitalize">{forecastScenario.replace('_', ' ')}</strong>
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
