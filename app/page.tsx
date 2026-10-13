'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { PlatformOverviewSection } from '@/components/dashboard/PlatformOverviewSection';
import { BuyActivitySection } from '@/components/dashboard/BuyActivitySection';
import { SellActivitySection } from '@/components/dashboard/SellActivitySection';
import { ExecutiveDashboardData, WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { 
  Calendar, 
  RefreshCw, 
  ChevronDown
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string>('W41');

  // Fetch summary from API (Supabase RPC with Edge Caching)
  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const json: ExecutiveDashboardData = await res.json();
        setData(json);
        // Default to latest week if available
        if (json.current_week?.week_label) {
          setSelectedWeekLabel(json.current_week.week_label);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Sorted list of all weeks available in history
  const sortedHistory = useMemo(() => {
    if (!data?.history || data.history.length === 0) return [];
    return [...data.history].sort((a, b) => a.year_week.localeCompare(b.year_week));
  }, [data]);

  // Compute Active Week, Previous Week, and Dynamic Variances
  const activeMetrics = useMemo(() => {
    if (!data) return null;

    const history = sortedHistory;
    const activeIndex = history.findIndex((w) => w.week_label === selectedWeekLabel);
    const currentWeek: WeeklyMetricRow =
      activeIndex >= 0 ? history[activeIndex] : data.current_week;
    const previousWeek: WeeklyMetricRow | undefined =
      activeIndex > 0 ? history[activeIndex - 1] : undefined;

    // Helper to calculate % variance: ((current - previous) / previous) * 100
    const calcVariance = (curr: number, prev: number | undefined): number => {
      if (prev === undefined || prev === 0) return 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const variances: MetricVariances = {
      all_transactions: calcVariance(currentWeek.all_transactions, previousWeek?.all_transactions),
      active_users: calcVariance(currentWeek.active_users, previousWeek?.active_users),
      new_registers: calcVariance(currentWeek.new_registers, previousWeek?.new_registers),
      withdraw_gold_grams: calcVariance(
        Number(currentWeek.withdraw_gold_grams),
        previousWeek ? Number(previousWeek.withdraw_gold_grams) : undefined
      ),
      buy_weight_15g: calcVariance(
        Number(currentWeek.buy_weight_15g),
        previousWeek ? Number(previousWeek.buy_weight_15g) : undefined
      ),
      buy_transactions: calcVariance(currentWeek.buy_transactions, previousWeek?.buy_transactions),
      buy_ticket_size_g: calcVariance(
        Number(currentWeek.buy_ticket_size_g),
        previousWeek ? Number(previousWeek.buy_ticket_size_g) : undefined
      ),
      sell_weight_15g: calcVariance(
        Number(currentWeek.sell_weight_15g),
        previousWeek ? Number(previousWeek.sell_weight_15g) : undefined
      ),
      sell_transactions: calcVariance(currentWeek.sell_transactions, previousWeek?.sell_transactions),
      sell_ticket_size_g: calcVariance(
        Number(currentWeek.sell_ticket_size_g),
        previousWeek ? Number(previousWeek.sell_ticket_size_g) : undefined
      ),
    };

    return {
      currentWeek,
      previousWeek,
      variances,
      history,
    };
  }, [data, sortedHistory, selectedWeekLabel]);

  // Format date to DD/MM/YYYY
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '10/10/2026';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-900 flex flex-row select-none">
      {/* 1. Left Signature Blue Brand Sidebar */}
      <aside className="w-12 sm:w-16 md:w-20 bg-[#0c4ca3] shrink-0 flex flex-col items-center justify-center border-r border-[#093c83] shadow-md z-20">
        <div className="flex flex-col items-center justify-center text-white font-black tracking-tight leading-none gap-1 sm:gap-1.5 py-6">
          <span className="text-xl sm:text-2xl md:text-3xl">Easy</span>
          <span className="text-xl sm:text-2xl md:text-3xl">Gold</span>
        </div>
      </aside>

      {/* 2. Main Executive Report Content Area */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 lg:p-6 overflow-x-hidden min-w-0">
        {/* Top Header Row matching mockup */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 pb-2 border-b border-slate-200/80">
          {/* Left Title & Date */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0c4ca3] tracking-tight flex items-center gap-3">
              <span>Overall performance Week over Week -</span>
              <span className="text-[#0c4ca3] underline decoration-[#0c4ca3]/40 underline-offset-4">
                {activeMetrics?.currentWeek.week_label || selectedWeekLabel}
              </span>
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-[#1d63b8] underline underline-offset-2">
                Data up to date {formatDisplayDate(activeMetrics?.currentWeek.end_date)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Period: {activeMetrics?.currentWeek.start_date} to {activeMetrics?.currentWeek.end_date}
              </span>
            </div>
          </div>

          {/* Right Branding & Interactive Week Selector */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-between md:justify-end">
            {/* Week Selector Controls */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300/80 shadow-xs">
              <Calendar className="w-4 h-4 text-[#0c4ca3]" />
              <span className="text-xs font-bold text-slate-600 hidden sm:inline">Select Week:</span>
              
              {/* Quick Week Pill Switcher */}
              <div className="flex items-center gap-1">
                {sortedHistory.map((w) => (
                  <button
                    key={w.week_label}
                    onClick={() => setSelectedWeekLabel(w.week_label)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                      selectedWeekLabel === w.week_label
                        ? 'bg-[#0c4ca3] text-white shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    title={`${w.week_label} (${w.start_date} to ${w.end_date})`}
                  >
                    {w.week_label}
                  </button>
                ))}
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchSummary}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50 ml-1 border-l border-slate-200 pl-2"
                title="Refresh from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Logo: EASY GOLD by KHAMPHOUVONG */}
            <div className="text-right select-none">
              <div className="flex items-baseline justify-end gap-1 font-black leading-none">
                <span className="text-xl sm:text-2xl text-[#e5a812] tracking-wider">EASY</span>
                <span className="text-xl sm:text-2xl text-[#0c4ca3] tracking-wider">GOLD</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider mt-0.5">
                by KHAMPHOUVONG
              </div>
            </div>
          </div>
        </header>

        {/* 3 Focus Areas in 1 Page Scale */}
        {loading && !activeMetrics ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0c4ca3]" />
            <p className="font-semibold text-sm">Loading Executive Performance Report...</p>
          </div>
        ) : activeMetrics ? (
          <main className="flex-1 flex flex-col gap-3 sm:gap-4 justify-between">
            {/* Area 1: PLATFORM OVERVIEW (Top Full Width, 4 Cards) */}
            <section className="w-full">
              <PlatformOverviewSection
                currentWeek={activeMetrics.currentWeek}
                history={activeMetrics.history}
                variances={activeMetrics.variances}
                selectedWeek={selectedWeekLabel}
              />
            </section>

            {/* Area 2 & Area 3: Side-by-Side (50% BUY ACTIVITY / 50% SELL ACTIVITY) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 w-full">
              {/* Area 2: BUY ACTIVITY (Forest Green, 3 Cards) */}
              <section className="w-full">
                <BuyActivitySection
                  currentWeek={activeMetrics.currentWeek}
                  history={activeMetrics.history}
                  variances={activeMetrics.variances}
                  selectedWeek={selectedWeekLabel}
                />
              </section>

              {/* Area 3: SELL ACTIVITY (Burgundy, 3 Cards) */}
              <section className="w-full">
                <SellActivitySection
                  currentWeek={activeMetrics.currentWeek}
                  history={activeMetrics.history}
                  variances={activeMetrics.variances}
                  selectedWeek={selectedWeekLabel}
                />
              </section>
            </div>
          </main>
        ) : null}
      </div>
    </div>
  );
}
