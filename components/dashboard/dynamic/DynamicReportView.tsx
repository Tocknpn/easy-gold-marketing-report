'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  AlertTriangle,
  Loader2,
  Database,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { DynamicFilterState, DynamicReportPayload } from '@/lib/types/dynamicReport.types';
import { DEFAULT_FILTER_STATE } from '@/lib/constants/dynamicReportData';
import { DynamicFilterBar } from './DynamicFilterBar';
import { DynamicKpiRibbon } from './DynamicKpiRibbon';
import { DynamicChartsSection } from './DynamicChartsSection';
import { DaxMeasuresTable } from './DaxMeasuresTable';
import { exportDynamicReportToCsv } from './exportUtils';

const INITIAL_THIS_MONTH_FILTER: DynamicFilterState = {
  ...DEFAULT_FILTER_STATE,
  startDate: '2026-10-01',
  endDate: '2026-10-27',
  quickPreset: 'this_month',
};

export function DynamicReportView() {
  const [filters, setFilters] = useState<DynamicFilterState>(INITIAL_THIS_MONTH_FILTER);
  const [appliedFilters, setAppliedFilters] = useState<DynamicFilterState>(INITIAL_THIS_MONTH_FILTER);
  const [reportData, setReportData] = useState<DynamicReportPayload | null>(null);
  const [latestAvailableDate, setLatestAvailableDate] = useState<string>('2026-10-27');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isComparingPoP, setIsComparingPoP] = useState<boolean>(false);
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const hasUnappliedChanges = JSON.stringify(filters) !== JSON.stringify(appliedFilters);

  // Elapsed timer during live SQL execution
  useEffect(() => {
    if (!isLoading) {
      setElapsedSec(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Execute live SQL query via API route (zero mock fallback)
  const fetchReport = useCallback(async (targetFilters: DynamicFilterState) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetFilters.startDate) params.set('start_date', targetFilters.startDate);
      if (targetFilters.endDate) params.set('end_date', targetFilters.endDate);
      if (targetFilters.quickPreset) params.set('quick_preset', targetFilters.quickPreset);
      if (targetFilters.selectedBanks.length > 0) params.set('banks', targetFilters.selectedBanks.join(','));
      if (targetFilters.selectedBranches.length > 0) params.set('branches', targetFilters.selectedBranches.join(','));
      if (targetFilters.selectedTxTypes.length > 0) params.set('tx_types', targetFilters.selectedTxTypes.join(','));
      if (targetFilters.minWeight !== null) params.set('min_weight', targetFilters.minWeight.toString());
      if (targetFilters.maxWeight !== null) params.set('max_weight', targetFilters.maxWeight.toString());
      if (targetFilters.minAmount !== null) params.set('min_amount', targetFilters.minAmount.toString());
      if (targetFilters.maxAmount !== null) params.set('max_amount', targetFilters.maxAmount.toString());
      if (targetFilters.selectedHours && targetFilters.selectedHours.length > 0 && targetFilters.selectedHours.length < 24) {
        params.set('hours', targetFilters.selectedHours.join(','));
        params.set('start_hour', Math.min(...targetFilters.selectedHours).toString());
        params.set('end_hour', Math.max(...targetFilters.selectedHours).toString());
      } else {
        if (targetFilters.startHour !== null) params.set('start_hour', targetFilters.startHour.toString());
        if (targetFilters.endHour !== null) params.set('end_hour', targetFilters.endHour.toString());
      }
      if (targetFilters.selectedDaysOfWeek && targetFilters.selectedDaysOfWeek.length > 0 && targetFilters.selectedDaysOfWeek.length < 7) {
        params.set('days_of_week', targetFilters.selectedDaysOfWeek.join(','));
      }
      if (targetFilters.customerSegment && targetFilters.customerSegment !== 'all') {
        params.set('customer_segment', targetFilters.customerSegment);
      }
      if (targetFilters.status) {
        params.set('status', targetFilters.status);
      }
      if (targetFilters.searchKeyword && targetFilters.searchKeyword.trim() !== '') {
        params.set('search_keyword', targetFilters.searchKeyword.trim());
      }

      const res = await fetch(`/api/dashboard/dynamic-report?${params.toString()}`, {
        cache: 'no-store',
      });

      const json = await res.json();
      if (!res.ok || !json?.dax_measures) {
        throw new Error(json?.error || `Database query failed with status ${res.status}`);
      }

      const payload = json as DynamicReportPayload;
      setReportData(payload);
      if (payload.meta?.latest_available_date) {
        setLatestAvailableDate(payload.meta.latest_available_date);
      }
      // Sync resolved start/end date from SQL back to filter state if preset was anchored
      const resolvedFilters: DynamicFilterState = {
        ...targetFilters,
        startDate: payload.meta?.start_date || targetFilters.startDate,
        endDate: payload.meta?.end_date || targetFilters.endDate,
      };
      setFilters(resolvedFilters);
      setAppliedFilters(resolvedFilters);
      setHasExecuted(true);
      setError(null);
    } catch (err: any) {
      console.error('Dynamic BI live SQL query error:', err);
      setError(err?.message || 'Failed to execute live SQL query on Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load Current Month (this_month) on initial mount
  useEffect(() => {
    fetchReport(INITIAL_THIS_MONTH_FILTER);
  }, [fetchReport]);

  // Stage filter edits without running mock previews; user clicks Calculate to execute SQL
  const handleFilterChange = (newFilters: DynamicFilterState) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    const resetState: DynamicFilterState = {
      ...INITIAL_THIS_MONTH_FILTER,
      startDate: `${latestAvailableDate.slice(0, 7)}-01`,
      endDate: latestAvailableDate,
      quickPreset: 'this_month',
    };
    setFilters(resetState);
    fetchReport(resetState);
  };

  const handleExportCsv = () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      exportDynamicReportToCsv(reportData);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Multi-Dimensional Filter Bar with explicit Calculate & Export controls */}
      <DynamicFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        isLoading={isLoading}
        onExecuteQuery={() => fetchReport(filters)}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        hasExecuted={hasExecuted && !!reportData}
        isComparingPoP={isComparingPoP}
        onToggleComparingPoP={() => setIsComparingPoP(!isComparingPoP)}
        latestAvailableDate={latestAvailableDate}
        hasUnappliedChanges={hasUnappliedChanges}
      />

      {/* Staged Filter Prompt Banner when user changed filters and hasn't clicked Calculate yet */}
      {hasUnappliedChanges && !isLoading && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Filter selection staged (<strong>{filters.startDate}</strong> to <strong>{filters.endDate}</strong>). Click{' '}
              <strong className="underline">Calculate</strong> to transform into SQL and load live results from Supabase.
            </span>
          </div>
          <button
            type="button"
            onClick={() => fetchReport(filters)}
            className="px-3.5 py-1 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all cursor-pointer"
          >
            Run SQL Now
          </button>
        </div>
      )}

      {/* Live SQL Metadata Status Bar */}
      {reportData && !isLoading && !error && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              100% Live SQL Verified
            </span>
            <span>
              Active Period: <strong className="text-slate-900">{reportData.meta.start_date}</strong> to{' '}
              <strong className="text-slate-900">{reportData.meta.end_date}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Latest Uploaded DB Date: <strong className="text-[#0c4ca3]">{latestAvailableDate}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Database className="w-3.5 h-3.5 text-[#0c4ca3]" />
            <span>
              Source: <strong className="text-slate-800">{reportData.meta.source || 'Supabase Live SQL'}</strong>
              {reportData.meta.elapsed_ms ? ` (${(reportData.meta.elapsed_ms / 1000).toFixed(1)}s)` : ''}
            </span>
          </div>
        </div>
      )}

      {/* 2. Loading Spinner Overlay OR Error State OR Live SQL Visuals */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-10 sm:p-16 border border-blue-200 text-center flex flex-col items-center justify-center space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#0c4ca3] flex items-center justify-center border border-blue-200 shadow-inner">
            <Loader2 className="w-8 h-8 animate-spin text-[#0c4ca3]" />
          </div>
          <div className="max-w-lg space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#0c4ca3] border border-blue-200 inline-block">
              Executing Live Supabase SQL Query ({elapsedSec}s)
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              Calculating 100% Verified Metrics &amp; Curves from Database...
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Querying raw transaction records for{' '}
              <strong className="text-slate-800">
                {filters.startDate} to {filters.endDate}
              </strong>{' '}
              across KPI cards, 24-hour Buy/Sell curves, day-of-week patterns, 6 weight brackets, bank settlement channels, and branch breakdowns.
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-rose-200 text-center flex flex-col items-center justify-center space-y-4 shadow-xs animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-inner">
            <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="max-w-md space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-200 inline-block">
              SQL Query Error
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              Unable to Retrieve Dynamic Report Data
            </h3>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => fetchReport(filters)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0c4ca3] text-white hover:bg-blue-900 transition-all cursor-pointer shadow-xs"
          >
            Retry SQL Query
          </button>
        </div>
      ) : !reportData ? (
        <div className="bg-white rounded-3xl p-8 sm:p-14 border-2 border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-4 shadow-xs animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#0c4ca3] flex items-center justify-center border border-blue-200 shadow-inner">
            <SlidersHorizontal className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              Ready to Run Dynamic BI Analysis
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Select your filters above and click <strong className="text-slate-800">Calculate</strong> to query Supabase SQL.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 2. Executive KPI Ribbon (Platform, Buy, Sell, Withdraw, Pricing & Stats) */}
          <DynamicKpiRibbon
            measures={reportData.dax_measures}
            popComparison={reportData.pop_comparison}
            isComparingPoP={isComparingPoP}
          />

          {/* 3. Visual Distribution Charts (Trend, Hourly, Day, Banks, Branches, Weight Brackets) */}
          <DynamicChartsSection
            hourly={reportData.hourly}
            banks={reportData.banks}
            branches={reportData.branches}
            weightBrackets={reportData.weight_brackets}
            measures={reportData.dax_measures}
            dayOfWeek={reportData.day_of_week}
            timelineTrend={reportData.timeline_trend}
            yearTrend={reportData.year_trend}
          />

          {/* 4. Complete PowerBI / Excel DAX Measures Table */}
          <DaxMeasuresTable measures={reportData.dax_measures} />
        </div>
      )}
    </div>
  );
}
