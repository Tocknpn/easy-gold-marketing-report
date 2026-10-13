'use client';

import React, { useState } from 'react';
import { MtdReportPayload, MtdCalculationMode } from '@/lib/types/mtd.types';
import { MtdBuyActivitySection } from './MtdBuyActivitySection';
import { MtdSellActivitySection } from './MtdSellActivitySection';
import { MtdPlatformSection } from './MtdPlatformSection';
import { 
  Calendar, 
  RefreshCw, 
  Briefcase, 
  Info,
  Clock,
  Sparkles
} from 'lucide-react';

interface MtdReportViewProps {
  initialData: MtdReportPayload;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function MtdReportView({ initialData, onRefresh, loading = false }: MtdReportViewProps) {
  const [data, setData] = useState<MtdReportPayload>(initialData);
  const [selectedCompMonth, setSelectedCompMonth] = useState<string>(initialData.comparison_month_label);
  const [mode, setMode] = useState<MtdCalculationMode>(initialData.calculation_mode);
  const [asOfDate, setAsOfDate] = useState<string>(initialData.as_of_date);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  // Re-fetch or simulate parameters change
  const handleApplyFilters = async (newAsOfDate: string, newCompMonth: string, newMode: MtdCalculationMode) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/dashboard/mtd-forecast?as_of_date=${newAsOfDate}&comp_month=9&comp_year=2026&mode=${newMode}`
      );
      if (res.ok) {
        const json: MtdReportPayload = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to update MTD report filters', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleModeChange = (newMode: MtdCalculationMode) => {
    setMode(newMode);
    handleApplyFilters(asOfDate, selectedCompMonth, newMode);
  };

  const handleDateChange = (newDate: string) => {
    setAsOfDate(newDate);
    handleApplyFilters(newDate, selectedCompMonth, mode);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await handleApplyFilters(asOfDate, selectedCompMonth, mode);
    }
  };

  const elapsedPercent = Math.round((data.elapsed_days / data.total_days_current_month) * 100);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Header Row matching screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#0c4ca3] tracking-tight flex items-center gap-2 flex-wrap">
            <span>Overall performance MTD and Forecast vs</span>
            <span className="text-[#0c4ca3] underline decoration-[#0c4ca3]/30 underline-offset-4">
              {data.comparison_month_label}
            </span>
          </h1>

          {/* Subtitle & Date Meta */}
          <div className="mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-[#1d63b8] underline underline-offset-2">
              Data up to date {data.display_as_of_date}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Elapsed: {data.elapsed_days} / {data.total_days_current_month} days ({elapsedPercent}% of month)
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
              title="Compare based on calendar days elapsed (Day 1 to 11)"
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
              onChange={(e) => {
                setSelectedCompMonth(e.target.value);
                handleApplyFilters(asOfDate, e.target.value, mode);
              }}
              className="text-xs font-black text-slate-800 bg-white border border-slate-300/80 rounded-xl pl-8 pr-3 py-1.5 shadow-xs cursor-pointer focus:ring-1 focus:ring-[#0c4ca3]"
              title="Select comparison month"
            >
              {(data.available_months || [
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

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="p-1.5 rounded-xl bg-white border border-slate-300/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-xs"
            title="Refresh MTD & Forecast"
          >
            <RefreshCw className={`w-4 h-4 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Optional Formula Explainer Collapsible Banner */}
      {showFormulaInfo && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-xl p-3.5 text-xs text-slate-700 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#0c4ca3] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-900">
                  Business Intelligence Methodology (MTD & Forecast Landing):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">• MTD State:</span> Actual accumulated metrics from Day 1 to Day {data.elapsed_days} ({data.display_as_of_date}).
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">• vs. {data.comparison_month_label}:</span> Compared to the exact same {mode === 'working_days' ? 'working days' : 'period'} (Day 1 to {data.elapsed_days}) of {data.comparison_month_label}.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">• Est. Month End:</span> Projected landing via linear run rate: <code className="bg-white/80 px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">(MTD / {data.elapsed_days}) × {data.total_days_current_month} days</code>.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">• vs. Full {data.comparison_month_label}:</span> Compared to the full 30-day completed total of {data.comparison_month_label}.
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

      {/* 2. Main Executive Grid: 7 Cards across 3 Themed Containers */}
      {/* Exact Proportions: BUY (2 cards, 28%), SELL (3 cards, 42%), PLATFORM (2 cards, 28%) */}
      <div className="grid grid-cols-1 xl:grid-cols-7 gap-3 sm:gap-3.5 items-stretch">
        {/* BUY ACTIVITY: 2 Cards (xl:col-span-2) */}
        <div className="xl:col-span-2 flex flex-col">
          <MtdBuyActivitySection
            buyWeight={data.metrics.buy_weight_g}
            buyTransactions={data.metrics.buy_transactions}
            comparisonMonthLabel={data.comparison_month_label}
          />
        </div>

        {/* SELL ACTIVITY: 3 Cards (xl:col-span-3) */}
        <div className="xl:col-span-3 flex flex-col">
          <MtdSellActivitySection
            sellWeight={data.metrics.sell_weight_g}
            sellTransactions={data.metrics.sell_transactions}
            withdraw15g={data.metrics.withdraw_15g}
            comparisonMonthLabel={data.comparison_month_label}
          />
        </div>

        {/* PLATFORM OVERVIEW: 2 Cards (xl:col-span-2) */}
        <div className="xl:col-span-2 flex flex-col">
          <MtdPlatformSection
            newCustomers={data.metrics.new_customers}
            totalTransactions={data.metrics.total_transactions}
            comparisonMonthLabel={data.comparison_month_label}
          />
        </div>
      </div>
    </div>
  );
}
