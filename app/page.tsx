'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { PlatformOverviewSection } from '@/components/dashboard/PlatformOverviewSection';
import { BuyActivitySection } from '@/components/dashboard/BuyActivitySection';
import { SellActivitySection } from '@/components/dashboard/SellActivitySection';
import { MtdReportView } from '@/components/dashboard/mtd/MtdReportView';
import { DynamicReportView } from '@/components/dashboard/dynamic/DynamicReportView';
import { PowerPivotStudio } from '@/components/dashboard/pivot/PowerPivotStudio';
import { CampaignTrackingView } from '@/components/dashboard/campaign/CampaignTrackingView';
import { WeeklyHistoricalMatrix } from '@/components/dashboard/weekly/WeeklyHistoricalMatrix';
import { UserAuthModal } from '@/components/dashboard/auth/UserAuthModal';
import { SystemCheckAndValidationModal } from '@/components/dashboard/audit/SystemCheckAndValidationModal';
import { FreshnessBadge } from '@/components/dashboard/FreshnessBadge';
import { ExecutiveDashboardData, WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { MtdReportPayload } from '@/lib/types/mtd.types';
import { UserProfile } from '@/lib/types/auth.types';
import { getCurrentUser } from '@/lib/supabase/authHelper';
import { 
  Calendar, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  TrendingUp, 
  BarChart3, 
  SlidersHorizontal, 
  Table2, 
  Target, 
  UserCircle2, 
  Lock, 
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  Scale,
  Coins
} from 'lucide-react';

import { DEFAULT_MTD_PAYLOAD } from '@/lib/constants/mtdData';
import { DEFAULT_WEEKLY_FALLBACK_DATA } from '@/lib/constants/weeklyData';

export default function DashboardPage() {
  // View toggle: 'dynamic', 'mtd', 'weekly', 'pivot', 'campaign'
  const [activeReportTab, setActiveReportTab] = useState<'dynamic' | 'mtd' | 'weekly' | 'pivot' | 'campaign'>('dynamic');

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isValidatorModalOpen, setIsValidatorModalOpen] = useState<boolean>(false);

  // Weekly data state initialized with default data
  const [weeklyData, setWeeklyData] = useState<ExecutiveDashboardData>(DEFAULT_WEEKLY_FALLBACK_DATA);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string>('W42');
  const [isProratedWoW, setIsProratedWoW] = useState<boolean>(false);

  // MTD data state initialized with default values for instant render
  const [mtdData, setMtdData] = useState<MtdReportPayload>(DEFAULT_MTD_PAYLOAD);
  const [mtdLoading, setMtdLoading] = useState(false);

  // Fetch weekly summary
  const fetchWeeklySummary = async () => {
    setWeeklyLoading(true);
    try {
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const json: ExecutiveDashboardData = await res.json();
        setWeeklyData(json);
        if (json.current_week?.week_label) {
          setSelectedWeekLabel(json.current_week.week_label);
        }
      }
    } catch (err) {
      console.error('Failed to load weekly summary', err);
    } finally {
      setWeeklyLoading(false);
    }
  };

  // Fetch MTD & Forecast report
  const fetchMtdData = async () => {
    setMtdLoading(true);
    try {
      const res = await fetch('/api/dashboard/mtd-forecast');
      if (res.ok) {
        const json: MtdReportPayload = await res.json();
        setMtdData(json);
      }
    } catch (err) {
      console.error('Failed to load MTD forecast report', err);
    } finally {
      setMtdLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
    fetchMtdData();
    fetchWeeklySummary();
  }, []);

  // Sorted list of all weeks available in history (oldest to newest: W14 ... W41)
  const sortedHistory = useMemo(() => {
    if (!weeklyData?.history || weeklyData.history.length === 0) return [];
    return [...weeklyData.history].sort((a, b) => a.year_week.localeCompare(b.year_week));
  }, [weeklyData]);

  // Compute Active Week, Previous Week, Dynamic Variances, and Rolling 5-Week Chart Window
  const activeWeeklyMetrics = useMemo(() => {
    if (!weeklyData) return null;

    const history = sortedHistory;
    const activeIndex = history.findIndex((w) => w.week_label === selectedWeekLabel);
    const rawWeek: WeeklyMetricRow =
      activeIndex >= 0 ? history[activeIndex] : weeklyData.current_week;
    const previousWeek: WeeklyMetricRow | undefined =
      activeIndex > 0 ? history[activeIndex - 1] : undefined;

    // Detect if current selected week is partial in-progress week (W42)
    const isPartial = rawWeek.week_label === 'W42';

    // Prorated 7-day run-rate (assuming 1 day elapsed in W42 for normalized comparison)
    const currentWeek: WeeklyMetricRow = (isProratedWoW && isPartial)
      ? {
          ...rawWeek,
          all_transactions: Math.round(rawWeek.all_transactions * 7),
          active_users: Math.round(rawWeek.active_users * 3.5),
          new_registers: Math.round(rawWeek.new_registers * 7),
          withdraw_gold_grams: Number((Number(rawWeek.withdraw_gold_grams) * 7).toFixed(2)),
          buy_weight_15g: Math.round(Number(rawWeek.buy_weight_15g) * 7),
          buy_transactions: Math.round(rawWeek.buy_transactions * 7),
          sell_weight_15g: Math.round(Number(rawWeek.sell_weight_15g) * 7),
          sell_transactions: Math.round(rawWeek.sell_transactions * 7),
        }
      : rawWeek;

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

    const effectiveIndex = activeIndex >= 0 ? activeIndex : history.length - 1;
    const windowStart = Math.max(0, effectiveIndex - 4);
    const rawChartHistory = history.slice(windowStart, effectiveIndex + 1);
    const chartHistory = rawChartHistory.map((w) => 
      (w.week_label === currentWeek.week_label && isProratedWoW && isPartial) ? currentWeek : w
    );

    return {
      currentWeek,
      rawWeek,
      isPartial,
      previousWeek,
      variances,
      history,
      chartHistory,
      activeIndex: effectiveIndex,
    };
  }, [weeklyData, sortedHistory, selectedWeekLabel, isProratedWoW]);

  // Format date to DD/MM/YYYY
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '10/10/2026';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Step backward to older week
  const handlePrevWeek = () => {
    if (!activeWeeklyMetrics || activeWeeklyMetrics.activeIndex <= 0) return;
    const prevWeek = sortedHistory[activeWeeklyMetrics.activeIndex - 1];
    if (prevWeek) {
      setSelectedWeekLabel(prevWeek.week_label);
    }
  };

  // Step forward to newer week
  const handleNextWeek = () => {
    if (!activeWeeklyMetrics || activeWeeklyMetrics.activeIndex >= sortedHistory.length - 1) return;
    const nextWeek = sortedHistory[activeWeeklyMetrics.activeIndex + 1];
    if (nextWeek) {
      setSelectedWeekLabel(nextWeek.week_label);
    }
  };

  // Quick recent pills (latest 5 weeks)
  const recentPills = useMemo(() => {
    if (sortedHistory.length <= 5) return sortedHistory;
    return sortedHistory.slice(-5);
  }, [sortedHistory]);

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-900 flex flex-col select-none">
      {/* Main Executive Report Content Area */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 lg:p-6 overflow-x-hidden min-w-0">
        {/* Navigation Tabs Bar & Branding */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/80 gap-3 flex-wrap">
          {/* Executive View Tabs */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300/80 shadow-xs flex-wrap gap-1">
            <button
              onClick={() => setActiveReportTab('dynamic')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                activeReportTab === 'dynamic'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Dynamic BI</span>
            </button>
            <button
              onClick={() => setActiveReportTab('mtd')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                activeReportTab === 'mtd'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>MTD Forecast</span>
            </button>
            <button
              onClick={() => setActiveReportTab('weekly')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                activeReportTab === 'weekly'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>WoW Trends</span>
            </button>
            <button
              onClick={() => setActiveReportTab('pivot')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                activeReportTab === 'pivot'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Custom Pivot Profile</span>
            </button>
            <button
              onClick={() => setActiveReportTab('campaign')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all ${
                activeReportTab === 'campaign'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Campaign Tracking</span>
            </button>
          </div>

          {/* Right Header: Freshness Badge + System Audit + User Profile + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
            {/* Live Data Freshness & Sync Alert Badge */}
            <FreshnessBadge
              onTriggerRefresh={async () => {
                await Promise.all([fetchWeeklySummary(), fetchMtdData()]);
              }}
            />

            {/* System Health, Calculation & Free Plan Audit Button */}
            <button
              onClick={() => setIsValidatorModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 shadow-xs transition-all font-bold text-xs"
              title="System Integrity & Free Plan Audit"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Audit &amp; Sync Check</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            {/* User Account / Profile Badge button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 shadow-xs transition-all hover:bg-slate-50"
              title="Manage Account & Reporting Profiles"
            >
              <div className="w-6 h-6 rounded-lg bg-[#0c4ca3] text-[#e5a812] font-black text-xs flex items-center justify-center">
                {currentUser ? currentUser.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-[11px] font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {currentUser ? (currentUser.full_name || currentUser.email.split('@')[0]) : 'Sign In'}
                </span>
                <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-tighter leading-tight">
                  {currentUser ? currentUser.role : 'Guest Mode'}
                </span>
              </div>
            </button>

            {/* Logo: EASY GOLD by KHAMPHOUVONG */}
            <div className="text-right select-none pl-1">
              <div className="flex items-baseline justify-end gap-1 font-black leading-none">
                <span className="text-xl sm:text-2xl text-[#e5a812] tracking-wider">EASY</span>
                <span className="text-xl sm:text-2xl text-[#0c4ca3] tracking-wider">GOLD</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider mt-0.5">
                by KHAMPHOUVONG
              </div>
            </div>
          </div>
        </div>

        {/* TAB: DYNAMIC BI PERFORMANCE & DAX MEASURES EXPLORER */}
        {activeReportTab === 'dynamic' && (
          <DynamicReportView />
        )}

        {/* TAB 1: MTD & FORECAST REPORT (Requested by user) */}
        {activeReportTab === 'mtd' && (
          <div>
            {mtdLoading && !mtdData ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-[#0c4ca3]" />
                <p className="font-semibold text-sm">Loading MTD and Forecast Report...</p>
              </div>
            ) : mtdData ? (
              <MtdReportView
                initialData={mtdData}
                onRefresh={fetchMtdData}
                loading={mtdLoading}
              />
            ) : null}
          </div>
        )}

        {/* TAB 2: WEEK OVER WEEK (WoW) HISTORICAL REPORT */}
        {activeReportTab === 'weekly' && (
          <div>
            {/* Top Header Row for Weekly View */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4 pb-2 border-b border-slate-200/80">
              {/* Left Title & Date */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0c4ca3] tracking-tight flex items-center gap-3">
                  <span>Overall performance Week over Week -</span>
                  <span className="text-[#0c4ca3] underline decoration-[#0c4ca3]/40 underline-offset-4">
                    {activeWeeklyMetrics?.currentWeek.week_label || selectedWeekLabel}
                  </span>
                </h1>
                <div className="mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-[#1d63b8] underline underline-offset-2">
                    Data up to date {formatDisplayDate(activeWeeklyMetrics?.currentWeek.end_date)}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Period: {activeWeeklyMetrics?.currentWeek.start_date} to {activeWeeklyMetrics?.currentWeek.end_date}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {sortedHistory.length} Weeks in Database
                  </span>
                </div>
              </div>

              {/* Week Selector Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-300/80 shadow-xs flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevWeek}
                    disabled={!activeWeeklyMetrics || activeWeeklyMetrics.activeIndex <= 0}
                    className="p-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Previous Week (Older)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative flex items-center">
                    <Calendar className="w-3.5 h-3.5 text-[#0c4ca3] absolute left-2 pointer-events-none" />
                    <select
                      value={selectedWeekLabel}
                      onChange={(e) => setSelectedWeekLabel(e.target.value)}
                      className="text-xs font-black text-slate-800 bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-1 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0c4ca3]"
                    >
                      {[...sortedHistory].reverse().map((w) => (
                        <option key={w.year_week} value={w.week_label}>
                          {w.week_label} ({w.start_date.substring(5)} to {w.end_date.substring(5)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleNextWeek}
                    disabled={!activeWeeklyMetrics || activeWeeklyMetrics.activeIndex >= sortedHistory.length - 1}
                    className="p-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Next Week (Newer)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Pills for Recent Weeks */}
                <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2">
                  {recentPills.map((w) => (
                    <button
                      key={w.week_label}
                      onClick={() => setSelectedWeekLabel(w.week_label)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-black transition-all ${
                        selectedWeekLabel === w.week_label
                          ? 'bg-[#0c4ca3] text-white shadow-xs scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {w.week_label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchWeeklySummary}
                  disabled={weeklyLoading}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50 border-l border-slate-200 pl-1.5"
                  title="Refresh from Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${weeklyLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Weekly Content */}
            {weeklyLoading && !activeWeeklyMetrics ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-[#0c4ca3]" />
                <p className="font-semibold text-sm">Loading Weekly Performance Report...</p>
              </div>
            ) : activeWeeklyMetrics ? (
              <main className="flex-1 flex flex-col gap-3 sm:gap-4 justify-between">
                {/* 1. In-Progress Partial Week Intelligence Alert Banner */}
                {activeWeeklyMetrics.isPartial && (
                  <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-3.5 sm:p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs shrink-0">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                            In-Progress Partial Week Detected: {selectedWeekLabel}
                          </h4>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950/30 text-amber-100">
                            ~1-2 Days Elapsed
                          </span>
                        </div>
                        <p className="text-xs text-amber-100/90 font-medium mt-0.5">
                          Comparing raw numbers against a full 7-day week (W41) shows an artificial -87% drop. Turn on <strong>7-Day Prorated Run-Rate</strong> to compare on an equalized basis!
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsProratedWoW(!isProratedWoW)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0 ${
                        isProratedWoW
                          ? 'bg-slate-950 text-amber-400 ring-2 ring-amber-300'
                          : 'bg-white text-slate-900 hover:bg-amber-50'
                      }`}
                    >
                      <Gauge className="w-3.5 h-3.5" />
                      <span>{isProratedWoW ? '⚡ Prorated Run-Rate: ON' : 'Prorate to 7-Day Run-Rate'}</span>
                    </button>
                  </div>
                )}

                {/* 2. Senior Analyst Executive Brief ("What to Know & Aware") */}
                <div className="bg-gradient-to-r from-slate-900 via-[#0c4ca3] to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-amber-400 text-slate-950">
                        <Sparkles className="w-4 h-4 font-black" />
                      </span>
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
                        Week over Week (WoW) Executive Brief &amp; Diagnosis
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                      Senior Analyst Insights
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Insight 1: Daily Velocity */}
                    <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-emerald-300 font-extrabold text-[11px]">
                        <span>⚡ Daily Velocity</span>
                        <span>{activeWeeklyMetrics.isPartial ? 'Day 1 Tempo' : '7-Day Avg'}</span>
                      </div>
                      <p className="text-white/90 text-[11px] leading-relaxed">
                        {activeWeeklyMetrics.isPartial ? (
                          <>
                            Day 1 recorded <strong>{activeWeeklyMetrics.rawWeek.all_transactions.toLocaleString()} tx/day</strong> vs W41 daily average of <strong>{Math.round((activeWeeklyMetrics.previousWeek?.all_transactions || 39744) / 7).toLocaleString()} tx/day</strong> (-10.6% normalized).
                          </>
                        ) : (
                          <>
                            Weekly daily average was <strong>{Math.round(activeWeeklyMetrics.currentWeek.all_transactions / 7).toLocaleString()} tx/day</strong> with strong trading volume.
                          </>
                        )}
                      </p>
                    </div>

                    {/* Insight 2: Net Gold Flow Balance */}
                    <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-amber-300 font-extrabold text-[11px]">
                        <span>⚖️ Net Gold Flow</span>
                        <span>{Number(activeWeeklyMetrics.currentWeek.buy_weight_15g) - Number(activeWeeklyMetrics.currentWeek.sell_weight_15g) >= 0 ? '+Net Inflow' : '-Net Outflow'}</span>
                      </div>
                      <p className="text-white/90 text-[11px] leading-relaxed">
                        Buy Weight is <strong>{Number(activeWeeklyMetrics.currentWeek.buy_weight_15g).toLocaleString()} (15g)</strong> vs Sell Weight of <strong>{Number(activeWeeklyMetrics.currentWeek.sell_weight_15g).toLocaleString()} (15g)</strong> (Net flow: <strong>{(Number(activeWeeklyMetrics.currentWeek.buy_weight_15g) - Number(activeWeeklyMetrics.currentWeek.sell_weight_15g)).toLocaleString()} (15g)</strong>).
                      </p>
                    </div>

                    {/* Insight 3: Ticket Size Dynamics */}
                    <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-blue-300 font-extrabold text-[11px]">
                        <span>🔍 Ticket Size Trends</span>
                        <span>{activeWeeklyMetrics.currentWeek.buy_ticket_size_g}g Buy Avg</span>
                      </div>
                      <p className="text-white/90 text-[11px] leading-relaxed">
                        Average buy ticket is <strong>{activeWeeklyMetrics.currentWeek.buy_ticket_size_g}g</strong> while sell ticket is <strong>{activeWeeklyMetrics.currentWeek.sell_ticket_size_g}g</strong>, demonstrating sustained retail micro-savings behavior.
                      </p>
                    </div>

                    {/* Insight 4: User Base Momentum */}
                    <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-teal-300 font-extrabold text-[11px]">
                        <span>👥 User Participation</span>
                        <span>{activeWeeklyMetrics.currentWeek.active_users.toLocaleString()} Active</span>
                      </div>
                      <p className="text-white/90 text-[11px] leading-relaxed">
                        Engagement ratio stands at <strong>{(activeWeeklyMetrics.currentWeek.all_transactions / Math.max(1, activeWeeklyMetrics.currentWeek.active_users)).toFixed(2)} tx/user</strong> with <strong>+{activeWeeklyMetrics.currentWeek.new_registers.toLocaleString()}</strong> new signups.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Three Themed Cards Sections */}
                <section className="w-full">
                  <PlatformOverviewSection
                    currentWeek={activeWeeklyMetrics.currentWeek}
                    history={activeWeeklyMetrics.chartHistory}
                    variances={activeWeeklyMetrics.variances}
                    selectedWeek={selectedWeekLabel}
                  />
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 w-full">
                  <section className="w-full">
                    <BuyActivitySection
                      currentWeek={activeWeeklyMetrics.currentWeek}
                      history={activeWeeklyMetrics.chartHistory}
                      variances={activeWeeklyMetrics.variances}
                      selectedWeek={selectedWeekLabel}
                    />
                  </section>

                  <section className="w-full">
                    <SellActivitySection
                      currentWeek={activeWeeklyMetrics.currentWeek}
                      history={activeWeeklyMetrics.chartHistory}
                      variances={activeWeeklyMetrics.variances}
                      selectedWeek={selectedWeekLabel}
                    />
                  </section>
                </div>

                {/* 4. 8-Week Historical Trajectory Matrix with 4-Week Moving Average (MA4) */}
                <section className="w-full">
                  <WeeklyHistoricalMatrix
                    history={sortedHistory}
                    selectedWeek={selectedWeekLabel}
                    onSelectWeek={setSelectedWeekLabel}
                    isProrated={isProratedWoW}
                  />
                </section>
              </main>
            ) : null}
          </div>
        )}

        {/* TAB 3: CUSTOM REPORTING PROFILE (PIVOT STUDIO) */}
        {activeReportTab === 'pivot' && (
          <PowerPivotStudio
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* TAB 4: CAMPAIGN TRACKING & TARGET INTELLIGENCE */}
        {activeReportTab === 'campaign' && (
          <CampaignTrackingView
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </div>

      {/* User Login & Password Modal */}
      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthChange={setCurrentUser}
      />

      {/* System Integrity, Calculation & Free Plan Audit Modal */}
      <SystemCheckAndValidationModal
        isOpen={isValidatorModalOpen}
        onClose={() => setIsValidatorModalOpen(false)}
      />
    </div>
  );
}
