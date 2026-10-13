'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  RefreshCw, 
  SlidersHorizontal, 
  Sparkles, 
  Calendar, 
  CheckCircle2,
  FileSpreadsheet
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

  // Fetch dynamic report from API with query params
  const fetchReport = useCallback(async (currentFilters: DynamicFilterState) => {
    setIsLoading(true);
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
      if (currentFilters.startHour !== null) params.set('start_hour', currentFilters.startHour.toString());
      if (currentFilters.endHour !== null) params.set('end_hour', currentFilters.endHour.toString());
      if (currentFilters.status) params.set('status', currentFilters.status);

      const res = await fetch(`/api/dashboard/dynamic-report?${params.toString()}`);
      if (res.ok) {
        const json: DynamicReportPayload = await res.json();
        setReportData(json);
      } else {
        // Fallback to local computation
        setReportData(calculateFilteredReport(currentFilters));
      }
    } catch (err) {
      console.warn('API fetch failed, falling back to local simulation engine:', err);
      setReportData(calculateFilteredReport(currentFilters));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(filters);
  }, [filters, fetchReport]);

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
      {/* Dynamic Report Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] p-4 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#e5a812]" />
            <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
              Dynamic BI Performance & Measures Explorer
            </h2>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#e5a812] text-slate-950">
              Live Aggregations
            </span>
          </div>
          <p className="text-xs text-white/80 mt-1 font-medium">
            Multi-dimensional cross-filtering across 1.4M rows. Replaces manual Excel work with instant automated calculations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchReport(filters)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Recalculating...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#e5a812] hover:bg-[#d4970b] text-slate-950 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>{isExporting ? 'Exporting...' : 'Export to Excel/CSV'}</span>
          </button>
        </div>
      </div>

      {/* 1. Multi-Dimensional Filter Bar */}
      <DynamicFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
        isLoading={isLoading}
      />

      {/* 2. Executive KPI Ribbon (Platform, Buy, Sell, Withdraw, Pricing & Stats) */}
      <DynamicKpiRibbon measures={reportData.dax_measures} />

      {/* 3. Visual Distribution Charts (Hourly, Banks, Branches, Weight Brackets) */}
      <DynamicChartsSection
        hourly={reportData.hourly}
        banks={reportData.banks}
        branches={reportData.branches}
        weightBrackets={reportData.weight_brackets}
      />

      {/* 4. Complete PowerBI / Excel DAX Measures Table */}
      <DaxMeasuresTable measures={reportData.dax_measures} />
    </div>
  );
}
