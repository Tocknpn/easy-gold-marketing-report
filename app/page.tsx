'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { PlatformOverviewSection } from '@/components/dashboard/PlatformOverviewSection';
import { BuyActivitySection } from '@/components/dashboard/BuyActivitySection';
import { SellActivitySection } from '@/components/dashboard/SellActivitySection';
import { MtdReportView } from '@/components/dashboard/mtd/MtdReportView';
import { TargetReportView } from '@/components/dashboard/targets/TargetReportView';
import { DynamicReportView } from '@/components/dashboard/dynamic/DynamicReportView';
import { PowerPivotStudio } from '@/components/dashboard/pivot/PowerPivotStudio';
import { CampaignTrackingView } from '@/components/dashboard/campaign/CampaignTrackingView';
import { WeeklyHistoricalMatrix } from '@/components/dashboard/weekly/WeeklyHistoricalMatrix';
import { UserAuthModal } from '@/components/dashboard/auth/UserAuthModal';
import { CorporateLoginView } from '@/components/dashboard/auth/CorporateLoginView';
import { AdminUserManagementModal } from '@/components/dashboard/admin/AdminUserManagementModal';
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
  Coins,
  Crown,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  FileSpreadsheet
} from 'lucide-react';

import { DEFAULT_MTD_PAYLOAD } from '@/lib/constants/mtdData';
import { DEFAULT_WEEKLY_FALLBACK_DATA } from '@/lib/constants/weeklyData';

type ReportTab = 'targets' | 'dynamic' | 'mtd' | 'weekly' | 'pivot' | 'campaign';
const VALID_TABS: ReportTab[] = ['targets', 'dynamic', 'mtd', 'weekly', 'pivot', 'campaign'];

export default function DashboardPage() {
  // View toggle: 'dynamic', 'mtd', 'weekly', 'pivot', 'campaign' with URL and localStorage sync
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('dynamic');

  // User authentication & Admin management modal state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);
  const [isValidatorModalOpen, setIsValidatorModalOpen] = useState<boolean>(false);

  // Tab change handler that updates state, localStorage, and browser URL query param (?tab=...)
  const handleTabChange = (tab: ReportTab) => {
    setActiveReportTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('easy_gold_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  // Weekly data state initialized with default data
  const [weeklyData, setWeeklyData] = useState<ExecutiveDashboardData>(DEFAULT_WEEKLY_FALLBACK_DATA);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string>('W43');
  const [isProratedWoW, setIsProratedWoW] = useState<boolean>(false);
  const [densityMode, setDensityMode] = useState<'comfortable' | 'compact'>('comfortable');

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

  // Restore active tab from URL query params (?tab=...), hash, or localStorage upon mount & refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTab = searchParams.get('tab') as ReportTab | null;
      const hashTab = window.location.hash.replace('#', '') as ReportTab;
      const storedTab = localStorage.getItem('easy_gold_active_tab') as ReportTab | null;

      let resolvedTab: ReportTab = 'dynamic';
      if (urlTab && VALID_TABS.includes(urlTab)) {
        resolvedTab = urlTab;
      } else if (hashTab && VALID_TABS.includes(hashTab)) {
        resolvedTab = hashTab;
      } else if (storedTab && VALID_TABS.includes(storedTab)) {
        resolvedTab = storedTab;
      }

      setActiveReportTab(resolvedTab);

      // Keep URL clean and synchronized
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== resolvedTab) {
        url.searchParams.set('tab', resolvedTab);
        window.history.replaceState(null, '', url.pathname + url.search);
      }

      // Handle browser forward/back buttons
      const handlePopState = () => {
        const p = new URLSearchParams(window.location.search);
        const t = p.get('tab') as ReportTab | null;
        if (t && VALID_TABS.includes(t)) {
          setActiveReportTab(t);
        }
      };
      window.addEventListener('popstate', handlePopState);

      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        if (user) {
          fetchMtdData();
          fetchWeeklySummary();
        }
      })
      .catch((err) => {
        console.warn('Failed to verify current user session:', err);
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
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

    // Detect if current selected week is partial in-progress week (W43)
    const isPartial = rawWeek.week_label === 'W43';

    const rawBuyVal = rawWeek.buy_value_mil_lak ?? Math.round(Number(rawWeek.buy_weight_15g) * 15 * 3.14);
    const rawSellVal = rawWeek.sell_value_mil_lak ?? Math.round(Number(rawWeek.sell_weight_15g) * 15 * 3.14);

    // Prorated 7-day run-rate (1 day elapsed in W43: divide by 1 and multiply by 7 for standard week)
    const currentWeek: WeeklyMetricRow = (isProratedWoW && isPartial)
      ? {
          ...rawWeek,
          all_transactions: Math.round((rawWeek.all_transactions / 1) * 7),
          active_users: Math.round((rawWeek.active_users / 1) * 3.5),
          new_registers: Math.round((rawWeek.new_registers / 1) * 7),
          withdraw_gold_grams: Number(((Number(rawWeek.withdraw_gold_grams) / 1) * 7).toFixed(2)),
          buy_weight_15g: Math.round((Number(rawWeek.buy_weight_15g) / 1) * 7),
          buy_transactions: Math.round((rawWeek.buy_transactions / 1) * 7),
          buy_value_mil_lak: Math.round((rawBuyVal / 1) * 7),
          sell_weight_15g: Math.round((Number(rawWeek.sell_weight_15g) / 1) * 7),
          sell_transactions: Math.round((rawWeek.sell_transactions / 1) * 7),
          sell_value_mil_lak: Math.round((rawSellVal / 1) * 7),
        }
      : {
          ...rawWeek,
          buy_value_mil_lak: rawBuyVal,
          sell_value_mil_lak: rawSellVal,
        };

    const calcVariance = (curr: number, prev: number | undefined): number => {
      if (prev === undefined || prev === 0) return 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const prevBuyVal = previousWeek ? (previousWeek.buy_value_mil_lak ?? Math.round(Number(previousWeek.buy_weight_15g) * 15 * 3.14)) : undefined;
    const prevSellVal = previousWeek ? (previousWeek.sell_value_mil_lak ?? Math.round(Number(previousWeek.sell_weight_15g) * 15 * 3.14)) : undefined;

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
      buy_value_mil_lak: calcVariance(Number(currentWeek.buy_value_mil_lak), prevBuyVal),
      sell_weight_15g: calcVariance(
        Number(currentWeek.sell_weight_15g),
        previousWeek ? Number(previousWeek.sell_weight_15g) : undefined
      ),
      sell_transactions: calcVariance(currentWeek.sell_transactions, previousWeek?.sell_transactions),
      sell_ticket_size_g: calcVariance(
        Number(currentWeek.sell_ticket_size_g),
        previousWeek ? Number(previousWeek.sell_ticket_size_g) : undefined
      ),
      sell_value_mil_lak: calcVariance(Number(currentWeek.sell_value_mil_lak), prevSellVal),
    };

    const effectiveIndex = activeIndex >= 0 ? activeIndex : history.length - 1;
    const windowStart = Math.max(0, effectiveIndex - 4);
    const rawChartHistory = history.slice(windowStart, effectiveIndex + 1);
    const chartHistory = rawChartHistory.map((w) => 
      (w.week_label === currentWeek.week_label && isProratedWoW && isPartial) ? currentWeek : w
    );

    // Trading Flow Dynamics
    const buyWeightNum = Number(currentWeek.buy_weight_15g);
    const sellWeightNum = Number(currentWeek.sell_weight_15g);
    const netGoldFlow = buyWeightNum - sellWeightNum;
    const totalGoldTurnover = buyWeightNum + sellWeightNum;
    const buyWeightPct = totalGoldTurnover > 0 ? (buyWeightNum / totalGoldTurnover) * 100 : 50;
    const sellWeightPct = 100 - buyWeightPct;
    const totalTransactions = currentWeek.buy_transactions + currentWeek.sell_transactions;
    const buyTxPct = totalTransactions > 0 ? (currentWeek.buy_transactions / totalTransactions) * 100 : 50;
    const orderFlowRatio = currentWeek.sell_transactions > 0 
      ? (currentWeek.buy_transactions / currentWeek.sell_transactions).toFixed(2) 
      : '1.00';

    return {
      currentWeek,
      rawWeek,
      isPartial,
      previousWeek,
      variances,
      history,
      chartHistory,
      activeIndex: effectiveIndex,
      netGoldFlow,
      totalGoldTurnover,
      buyWeightPct,
      sellWeightPct,
      totalTransactions,
      buyTxPct,
      orderFlowRatio,
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

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#051329] flex flex-col items-center justify-center text-white select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-baseline gap-1 font-black leading-none">
            <span className="text-3xl sm:text-4xl text-[#e5a812] tracking-wider font-black">EASY</span>
            <span className="text-3xl sm:text-4xl text-white tracking-wider font-black">GOLD</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-200">
            <RefreshCw className="w-4 h-4 animate-spin text-[#e5a812]" />
            <span>Verifying Corporate Security Session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <CorporateLoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          fetchMtdData();
          fetchWeeklySummary();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-900 flex flex-col select-none">
      {/* Main Executive Report Content Area */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 lg:p-6 overflow-x-hidden min-w-0">
        {/* Tier 1: Brand Logo & Executive Controls Bar (Never wraps below tabs) */}
        <header className="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-200/90 gap-3 min-w-0">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 select-none shrink-0">
            <div>
              <div className="flex items-baseline gap-1 font-black leading-none">
                <span className="text-xl sm:text-2xl text-[#e5a812] tracking-wider font-black">EASY</span>
                <span className="text-xl sm:text-2xl text-[#0c4ca3] tracking-wider font-black">GOLD</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider mt-0.5 uppercase">
                by KHAMPHOUVONG
              </div>
            </div>
            <div className="hidden md:block h-6 w-px bg-slate-200/90" />
            <div className="hidden md:block">
              <span className="text-xs font-black text-slate-800 tracking-tight block">
                Executive BI &amp; Marketing Intelligence
              </span>
              <span className="text-[10px] font-medium text-slate-400 block">
                Real-Time Sales Operations &amp; Performance Analytics
              </span>
            </div>
          </div>

          {/* Right Header Options Bar: Freshness Badge + System Audit + User Manage + User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end flex-wrap">
            {/* Live Data Freshness & Sync Alert Badge */}
            <FreshnessBadge
              onTriggerRefresh={async () => {
                await Promise.all([fetchWeeklySummary(), fetchMtdData()]);
              }}
            />

            {/* System Health, Calculation & Free Plan Audit Button */}
            <button
              onClick={() => setIsValidatorModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 shadow-xs transition-all font-bold text-xs cursor-pointer"
              title="System Integrity & Free Plan Audit"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Audit &amp; Sync Check</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            {/* Admin User & Profile Management Button (Only for Admin Role) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setIsUserManagementModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-900 to-[#0c4ca3] hover:from-blue-800 hover:to-[#0a3f88] text-white shadow-xs transition-all font-bold text-xs border border-blue-400/40 cursor-pointer"
                title="Admin: User Directory & Reporting Profile Provisioning"
              >
                <Crown className="w-3.5 h-3.5 text-[#e5a812]" />
                <span className="hidden sm:inline">User Manage</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#e5a812] text-slate-950">
                  ADMIN
                </span>
              </button>
            )}

            {/* User Account / Profile Badge button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 shadow-xs transition-all hover:bg-slate-50 cursor-pointer"
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
          </div>
        </header>

        {/* Tier 2: Executive Navigation Tabs Bar */}
        <nav aria-label="Reporting Views Navigation" className="mb-4">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300/80 shadow-xs flex-wrap gap-1 w-fit">
            <button
              onClick={() => handleTabChange('targets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeReportTab === 'targets'
                  ? 'bg-gradient-to-r from-[#0c4ca3] to-blue-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Target className="w-4 h-4 text-amber-400" />
              <span>Target &amp; Run-Rate</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-slate-950">
                2026
              </span>
            </button>
            <button
              onClick={() => handleTabChange('dynamic')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeReportTab === 'dynamic'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Dynamic BI</span>
            </button>
            <button
              onClick={() => handleTabChange('mtd')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeReportTab === 'mtd'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>MTD Forecast</span>
            </button>
            <button
              onClick={() => handleTabChange('weekly')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeReportTab === 'weekly'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>WoW Trends</span>
            </button>
            <button
              onClick={() => handleTabChange('pivot')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeReportTab === 'pivot'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Custom Pivot Profile</span>
            </button>
            <button
              onClick={() => handleTabChange('campaign')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeReportTab === 'campaign'
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Campaign Tracking</span>
            </button>
          </div>
        </nav>

        {/* TAB 0: MONTHLY RUN-RATE & 2026 TARGET TRACKING (Image 1, 2, 3) */}
        {activeReportTab === 'targets' && (
          <TargetReportView />
        )}

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
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0c4ca3] tracking-tight flex items-center gap-2.5 flex-wrap">
                  <span>Overall Performance Week over Week</span>
                  <span className="px-3 py-0.5 rounded-xl bg-blue-100/70 text-[#0c4ca3] border border-blue-300/80 text-xl sm:text-2xl lg:text-3xl font-black">
                    {activeWeeklyMetrics?.currentWeek.week_label || selectedWeekLabel}
                  </span>
                </h1>
                <div className="mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-[#1d63b8] underline underline-offset-2">
                    Data up to date {formatDisplayDate(activeWeeklyMetrics?.currentWeek.week_label === 'W43' ? '2026-10-18' : activeWeeklyMetrics?.currentWeek.end_date)}
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

                {/* Report Density / Scale Switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 ml-1">
                  <button
                    onClick={() => setDensityMode('comfortable')}
                    className={`px-2 py-0.5 rounded text-[11px] font-black transition-all flex items-center gap-1 ${
                      densityMode === 'comfortable'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Standard Balanced Card Scale"
                  >
                    <Maximize2 className="w-3 h-3 text-[#0c4ca3]" />
                    <span className="hidden sm:inline">Standard</span>
                  </button>
                  <button
                    onClick={() => setDensityMode('compact')}
                    className={`px-2 py-0.5 rounded text-[11px] font-black transition-all flex items-center gap-1 ${
                      densityMode === 'compact'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Compact Trading Floor Density (Fits on 1 Screen)"
                  >
                    <Minimize2 className="w-3 h-3 text-[#0c4ca3]" />
                    <span className="hidden sm:inline">Compact</span>
                  </button>
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
              <main className={`flex-1 flex flex-col justify-between ${densityMode === 'compact' ? 'gap-2 sm:gap-2.5' : 'gap-3 sm:gap-3.5'}`}>
                {/* 1. In-Progress Partial Week Intelligence Alert Banner */}
                {activeWeeklyMetrics.isPartial && (
                  <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-3 sm:p-3.5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
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
                            1 Day Elapsed
                          </span>
                        </div>
                        <p className="text-xs text-amber-100/90 font-medium mt-0.5">
                          Comparing raw numbers against a full 7-day week (W42) shows an artificial drop. Turn on <strong>7-Day Prorated Run-Rate</strong> to compare on an equalized basis!
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

                {/* 2. Three Report Sections on the SAME LINE (3x1 Line: Platform Overview | Buy Activity | Sell Activity) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-3.5 w-full items-stretch">
                  {/* Section 1: Platform Overview */}
                  <section className="w-full flex flex-col">
                    <PlatformOverviewSection
                      currentWeek={activeWeeklyMetrics.currentWeek}
                      history={activeWeeklyMetrics.chartHistory}
                      variances={activeWeeklyMetrics.variances}
                      selectedWeek={selectedWeekLabel}
                      isPartialWeek={activeWeeklyMetrics.isPartial}
                    />
                  </section>

                  {/* Section 2: Buy Activity */}
                  <section className="w-full flex flex-col">
                    <BuyActivitySection
                      currentWeek={activeWeeklyMetrics.currentWeek}
                      history={activeWeeklyMetrics.chartHistory}
                      variances={activeWeeklyMetrics.variances}
                      selectedWeek={selectedWeekLabel}
                      isPartialWeek={activeWeeklyMetrics.isPartial}
                    />
                  </section>

                  {/* Section 3: Sell Activity */}
                  <section className="w-full flex flex-col">
                    <SellActivitySection
                      currentWeek={activeWeeklyMetrics.currentWeek}
                      history={activeWeeklyMetrics.chartHistory}
                      variances={activeWeeklyMetrics.variances}
                      selectedWeek={selectedWeekLabel}
                      isPartialWeek={activeWeeklyMetrics.isPartial}
                    />
                  </section>
                </div>

                {/* 3. Trading Flow Balance & Market Pulse Ribbon */}
                <section className="w-full bg-white/95 rounded-2xl border border-slate-200/90 px-3.5 py-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-[#e5a812] border border-amber-200/80 shrink-0">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Trading Flow &amp; Net Gold Position ({activeWeeklyMetrics.currentWeek.week_label})
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-700">Net Flow:</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          activeWeeklyMetrics.netGoldFlow > 0 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : activeWeeklyMetrics.netGoldFlow < 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {activeWeeklyMetrics.netGoldFlow > 0 
                            ? `▲ +${activeWeeklyMetrics.netGoldFlow.toLocaleString()} Baht (Accumulation)` 
                            : `${activeWeeklyMetrics.netGoldFlow.toLocaleString()} Baht (Liquidation)`}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          • Turnover: <strong>{activeWeeklyMetrics.totalGoldTurnover.toLocaleString()} Baht</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buy vs Sell Volume Bar & Order Ratio */}
                  <div className="w-full md:w-80 lg:w-96">
                    <div className="flex justify-between text-[11px] font-black mb-1">
                      <span className="text-emerald-700">Buy: {activeWeeklyMetrics.buyWeightPct.toFixed(1)}%</span>
                      <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-1.5 py-0.2 rounded">
                        Ratio: {activeWeeklyMetrics.orderFlowRatio}x
                      </span>
                      <span className="text-rose-700">Sell: {activeWeeklyMetrics.sellWeightPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300" 
                        style={{ width: `${activeWeeklyMetrics.buyWeightPct}%` }}
                        title={`Buy: ${activeWeeklyMetrics.buyWeightPct.toFixed(1)}%`}
                      />
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-300" 
                        style={{ width: `${activeWeeklyMetrics.sellWeightPct}%` }}
                        title={`Sell: ${activeWeeklyMetrics.sellWeightPct.toFixed(1)}%`}
                      />
                    </div>
                  </div>
                </section>

                {/* 5. 8-Week Historical Trajectory Matrix with 4-Week Moving Average (MA4) */}
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
        onOpenAdminModal={() => setIsUserManagementModalOpen(true)}
      />

      {/* Admin User & Reporting Profile Management Modal */}
      <AdminUserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        currentUser={currentUser}
      />

      {/* System Integrity, Calculation & Free Plan Audit Modal */}
      <SystemCheckAndValidationModal
        isOpen={isValidatorModalOpen}
        onClose={() => setIsValidatorModalOpen(false)}
      />
    </div>
  );
}
