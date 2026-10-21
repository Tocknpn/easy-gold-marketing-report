'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  SlidersHorizontal, 
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { DynamicFilterState, DynamicReportPayload } from '@/lib/types/dynamicReport.types';
import { 
  DEFAULT_DYNAMIC_REPORT_PAYLOAD, 
  DEFAULT_FILTER_STATE,
  calculateFilteredReport
} from '@/lib/constants/dynamicReportData';
import { DynamicFilterBar } from './DynamicFilterBar';
import { DynamicKpiRibbon } from './DynamicKpiRibbon';
import { DynamicChartsSection } from './DynamicChartsSection';
import { DaxMeasuresTable } from './DaxMeasuresTable';
import { exportDynamicReportToCsv } from './exportUtils';

export function DynamicReportView() {
  const [filters, setFilters] = useState<DynamicFilterState>(DEFAULT_FILTER_STATE);
  const [reportData, setReportData] = useState<DynamicReportPayload>(DEFAULT_DYNAMIC_REPORT_PAYLOAD);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isComparingPoP, setIsComparingPoP] = useState<boolean>(false);

  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [executionTimestamp, setExecutionTimestamp] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  // Fetch dynamic report from API with query params
  const fetchReport = useCallback(async (currentFilters: DynamicFilterState) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFilters.startDate) params.set('start_date', currentFilters.startDate);
      if (currentFilters.endDate) params.set('end_date', currentFilters.endDate);
      if (currentFilters.quickPreset) params.set('quick_preset', currentFilters.quickPreset);
      if (currentFilters.selectedBanks.length > 0) params.set('banks', currentFilters.selectedBanks.join(','));
      if (currentFilters.selectedBranches.length > 0) params.set('branches', currentFilters.selectedBranches.join(','));
      if (currentFilters.selectedTxTypes.length > 0) params.set('tx_types', currentFilters.selectedTxTypes.join(','));
      if (currentFilters.minWeight !== null) params.set('min_weight', currentFilters.minWeight.toString());
      if (currentFilters.maxWeight !== null) params.set('max_weight', currentFilters.maxWeight.toString());
      if (currentFilters.minAmount !== null) params.set('min_amount', currentFilters.minAmount.toString());
      if (currentFilters.maxAmount !== null) params.set('max_amount', currentFilters.maxAmount.toString());
      if (currentFilters.selectedHours && currentFilters.selectedHours.length > 0) {
        params.set('hours', currentFilters.selectedHours.join(','));
        params.set('start_hour', Math.min(...currentFilters.selectedHours).toString());
        params.set('end_hour', Math.max(...currentFilters.selectedHours).toString());
      } else {
        if (currentFilters.startHour !== null) params.set('start_hour', currentFilters.startHour.toString());
        if (currentFilters.endHour !== null) params.set('end_hour', currentFilters.endHour.toString());
      }
      if (currentFilters.selectedDaysOfWeek && currentFilters.selectedDaysOfWeek.length > 0) {
        params.set('days_of_week', currentFilters.selectedDaysOfWeek.join(','));
      }
      if (currentFilters.status) params.set('status', currentFilters.status);

      const res = await fetch(`/api/dashboard/dynamic-report?${params.toString()}`);
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let parsedMessage = `Dynamic report query failed (HTTP ${res.status}).`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.error) parsedMessage = parsed.error;
        } catch {
          if (res.status === 502 || res.status === 504) {
            parsedMessage = 'Supabase gateway timeout. Please retry with a narrower date filter or refresh.';
          }
        }
        setError(parsedMessage);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setError('Dynamic report service returned an invalid non-JSON response.');
        return;
      }

      const json = await res.json();
      if (json?.dax_measures) {
        setReportData(json as DynamicReportPayload);
        setError(null);
      } else {
        setError(json?.error || 'Dynamic report returned incomplete data.');
      }
    } catch (err: any) {
      console.error('API fetch failed:', err);
      setError(err?.message || 'Network error connecting to Dynamic BI report service.');
    } finally {
      setIsLoading(false);
      setHasExecuted(true);
      setExecutionTimestamp(new Date().toLocaleTimeString());
    }
  }, []);

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      exportDynamicReportToCsv(reportData);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Multi-Dimensional Filter Bar with single Calculate and Export controls */}
      <DynamicFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
        isLoading={isLoading}
        onExecuteQuery={() => fetchReport(filters)}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        hasExecuted={hasExecuted}
      />

      {/* 2. Content: Error State OR Empty State OR Live Results */}
      {error ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-rose-200 text-center flex flex-col items-center justify-center space-y-4 shadow-xs animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-inner">
            <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="max-w-md space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-200 inline-block">
              Query Error
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              Unable to Retrieve Dynamic Report Data
            </h3>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">
              {error}
            </p>
          </div>
          <button
            onClick={() => fetchReport(filters)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-navy text-white hover:bg-brand-navyDark transition-all cursor-pointer shadow-xs"
          >
            Retry Query
          </button>
        </div>
      ) : !hasExecuted ? (
        <div className="bg-white rounded-3xl p-8 sm:p-14 border-2 border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-4 shadow-xs animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-brand-navy flex items-center justify-center border border-blue-200 shadow-inner">
            <SlidersHorizontal className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="max-w-md space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 inline-block">
              Awaiting Query Trigger
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              Ready to Run Dynamic BI Analysis
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              No metrics are pre-loaded to ensure 100% data integrity with Supabase. Choose your date range, banks, branches, and filters above, then click <strong className="text-slate-800">Calculate</strong> to run.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Live Execution Feedback Badge with PoP Toggle & Export */}
          <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-2xl px-4 py-2.5 text-xs text-emerald-900 font-medium flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                <strong>Live Supabase Dynamic Aggregation:</strong> Window: <strong>{filters.startDate} to {filters.endDate}</strong> | Status: <strong>{filters.status}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Period over Period (PoP) Toggle */}
              <button
                onClick={() => setIsComparingPoP(!isComparingPoP)}
                className={`text-xs font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                  isComparingPoP 
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs' 
                    : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                }`}
                title="Toggle Period-over-Period (PoP) comparison deltas"
              >
                <span>{isComparingPoP ? '⚡ PoP Comparison: ON' : 'Compare vs Prior Period'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-brand-gold hover:bg-brand-goldDark text-slate-950 shadow-xs transition-all cursor-pointer font-sans"
                title="Export report data to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
                <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
              </button>

              <span className="text-emerald-700 text-[11px] hidden sm:inline">Computed at {executionTimestamp}</span>
            </div>
          </div>



          {/* 2. Executive KPI Ribbon (Platform, Buy, Sell, Withdraw, Pricing & Stats) */}
          <DynamicKpiRibbon measures={reportData.dax_measures} isComparingPoP={isComparingPoP} />

          {/* 3. Visual Distribution Charts (Trend, Hourly, Day, Banks, Branches, Weight Brackets) */}
          <DynamicChartsSection
            hourly={reportData.hourly}
            banks={reportData.banks}
            branches={reportData.branches}
            weightBrackets={reportData.weight_brackets}
            measures={reportData.dax_measures}
            dayOfWeek={reportData.day_of_week}
            timelineTrend={reportData.timeline_trend}
          />

          {/* 4. Complete PowerBI / Excel DAX Measures Table */}
          <DaxMeasuresTable measures={reportData.dax_measures} />
        </div>
      )}
    </div>
  );
}
