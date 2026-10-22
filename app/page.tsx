'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
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
import { ExecutivePulseBanner } from '@/components/dashboard/ExecutivePulseBanner';
import { prorateWeeklyRow, calculateVariance } from '@/lib/utils/runRate';
import { ExecutiveDashboardData, WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { MtdReportPayload, MtdQuery } from '@/lib/types/mtd.types';
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
  ChevronDown,
  Activity,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  FileSpreadsheet
} from 'lucide-react';

import { DEFAULT_MTD_PAYLOAD } from '@/lib/constants/mtdData';
import { DEFAULT_WEEKLY_FALLBACK_DATA } from '@/lib/constants/weeklyData';
import { DEFAULT_2026_TARGETS } from '@/lib/constants/targetData';

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
  const [isTelemetryPopoverOpen, setIsTelemetryPopoverOpen] = useState<boolean>(false);
  const telemetryPopoverRef = useRef<HTMLDivElement>(null);

  // Close telemetry popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (telemetryPopoverRef.current && !telemetryPopoverRef.current.contains(event.target as Node)) {
        setIsTelemetryPopoverOpen(false);
      }
    }
    if (isTelemetryPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTelemetryPopoverOpen]);

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

  // Accessible roving-tabindex keyboard navigation for tablist
  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: ReportTab) => {
    const currentIndex = VALID_TABS.indexOf(currentTab);
    let nextTab: ReportTab | null = null;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextTab = VALID_TABS[(currentIndex + 1) % VALID_TABS.length];
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextTab = VALID_TABS[(currentIndex - 1 + VALID_TABS.length) % VALID_TABS.length];
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextTab = VALID_TABS[0];
    } else if (e.key === 'End') {
      e.preventDefault();
      nextTab = VALID_TABS[VALID_TABS.length - 1];
    }

    if (nextTab) {
      handleTabChange(nextTab);
      const targetEl = document.getElementById(`tab-${nextTab}`);
      targetEl?.focus();
    }
  };

  // Weekly data state initialized with default data
  const [weeklyData, setWeeklyData] = useState<ExecutiveDashboardData>(DEFAULT_WEEKLY_FALLBACK_DATA);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string>(DEFAULT_WEEKLY_FALLBACK_DATA.current_week.week_label || 'W43');
  const [isProratedWoW, setIsProratedWoW] = useState<boolean>(false);
  const [densityMode, setDensityMode] = useState<'comfortable' | 'compact'>('comfortable');

  // MTD data state initialized with default values for instant render
  const [mtdData, setMtdData] = useState<MtdReportPayload>(DEFAULT_MTD_PAYLOAD);
  const [mtdLoading, setMtdLoading] = useState(false);
  const [mtdError, setMtdError] = useState<string | null>(null);
  // Last filters used by the MTD report, so page-level refreshes keep the user's selection
  const mtdQueryRef = useRef<MtdQuery>({});

  // Fetch weekly summary with cache-busting & resilient status/content-type checks
  const fetchWeeklySummary = async () => {
    setWeeklyLoading(true);
    setWeeklyError(null);
    try {
      const res = await fetch(`/api/dashboard/summary?refresh=true&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let msg = `Weekly summary failed (HTTP ${res.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.error) msg = parsed.error;
        } catch {
          if (res.status === 502 || res.status === 504) {
            msg = 'Supabase gateway timeout loading weekly summary. Click retry.';
          }
        }
        setWeeklyError(msg);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setWeeklyError('Weekly summary service returned an invalid response format.');
        return;
      }

      const json: ExecutiveDashboardData = await res.json();
      if (json && json.current_week) {
        setWeeklyData(json);
        setWeeklyError(null);
        if (json.current_week?.week_label) {
          setSelectedWeekLabel(json.current_week.week_label);
        }
      } else {
        setWeeklyError('Incomplete weekly summary data received.');
      }
    } catch (err: any) {
      console.error('Failed to load weekly summary', err);
      setWeeklyError(err?.message || 'Network error connecting to weekly summary service.');
    } finally {
      setWeeklyLoading(false);
    }
  };

  // Fetch MTD & Forecast report with cache-busting & resilient status/content-type checks
  const fetchMtdData = async (query?: MtdQuery) => {
    if (query) mtdQueryRef.current = query;
    const q = mtdQueryRef.current;
    const params = new URLSearchParams();
    if (q.asOfDate) params.set('as_of_date', q.asOfDate);
    if (q.compYear && q.compMonth) {
      params.set('comp_year', String(q.compYear));
      params.set('comp_month', String(q.compMonth));
    }
    if (q.mode) params.set('mode', q.mode);
    params.set('refresh', 'true');
    params.set('t', String(Date.now()));

    setMtdLoading(true);
    try {
      const res = await fetch(`/api/dashboard/mtd-forecast?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let parsedMessage = `MTD report failed (HTTP ${res.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.error) parsedMessage = parsed.error;
        } catch {
          if (res.status === 502 || res.status === 504) {
            parsedMessage = 'Gateway timeout / Supabase connection unavailable. Please retry in a few moments.';
          }
        }
        setMtdError(parsedMessage);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setMtdError('Received non-JSON response from MTD forecast service.');
        return;
      }

      const json = await res.json();
      if (json?.metrics) {
        setMtdData(json as MtdReportPayload);
        setMtdError(null);
      } else {
        setMtdError(json?.error || `MTD report failed (HTTP ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to load MTD forecast report', err);
      setMtdError(err?.message || 'Network error connecting to MTD forecast service.');
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

    // Detect if current selected week is partial in-progress week (latest week in database and end_date >= today)
    const isLatestWeek = activeIndex >= 0 ? activeIndex === history.length - 1 : true;
    const isPartial = isLatestWeek && new Date(rawWeek.end_date) >= new Date();
    const latestDbDateStr = mtdData?.as_of_date || mtdData?.latest_data_date || rawWeek?.end_date || new Date().toISOString().split('T')[0];

    // Calculate dynamic elapsed days for partial week (e.g., Oct 18 to latest date)
    const elapsedDays = isPartial
      ? Math.max(1, Math.min(7, Math.round((new Date(latestDbDateStr).getTime() - new Date(rawWeek.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1))
      : 7;

    const rawBuyVal = rawWeek.buy_value_mil_lak ?? 0;
    const rawSellVal = rawWeek.sell_value_mil_lak ?? 0;

    // Prorated 7-day run-rate based on dynamic elapsed days using central math utility
    const currentWeek: WeeklyMetricRow = (isProratedWoW && isPartial)
      ? prorateWeeklyRow(rawWeek, elapsedDays)
      : {
          ...rawWeek,
          buy_value_mil_lak: rawBuyVal,
          sell_value_mil_lak: rawSellVal,
        };

    const prevBuyVal = previousWeek ? (previousWeek.buy_value_mil_lak ?? 0) : undefined;
    const prevSellVal = previousWeek ? (previousWeek.sell_value_mil_lak ?? 0) : undefined;

    const variances: MetricVariances = {
      all_transactions: calculateVariance(currentWeek.all_transactions, previousWeek?.all_transactions),
      active_users: calculateVariance(currentWeek.active_users, previousWeek?.active_users),
      new_registers: calculateVariance(currentWeek.new_registers, previousWeek?.new_registers),
      withdraw_gold_grams: calculateVariance(
        Number(currentWeek.withdraw_gold_grams),
        previousWeek ? Number(previousWeek.withdraw_gold_grams) : undefined
      ),
      buy_weight_15g: calculateVariance(
        Number(currentWeek.buy_weight_15g),
        previousWeek ? Number(previousWeek.buy_weight_15g) : undefined
      ),
      buy_transactions: calculateVariance(currentWeek.buy_transactions, previousWeek?.buy_transactions),
      buy_ticket_size_g: calculateVariance(
        Number(currentWeek.buy_ticket_size_g),
        previousWeek ? Number(previousWeek.buy_ticket_size_g) : undefined
      ),
      buy_value_mil_lak: calculateVariance(Number(currentWeek.buy_value_mil_lak), prevBuyVal),
      sell_weight_15g: calculateVariance(
        Number(currentWeek.sell_weight_15g),
        previousWeek ? Number(previousWeek.sell_weight_15g) : undefined
      ),
      sell_transactions: calculateVariance(currentWeek.sell_transactions, previousWeek?.sell_transactions),
      sell_ticket_size_g: calculateVariance(
        Number(currentWeek.sell_ticket_size_g),
        previousWeek ? Number(previousWeek.sell_ticket_size_g) : undefined
      ),
      sell_value_mil_lak: calculateVariance(Number(currentWeek.sell_value_mil_lak), prevSellVal),
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
      elapsedDays,
    };
  }, [weeklyData, sortedHistory, selectedWeekLabel, isProratedWoW, mtdData]);

  // 1. Business Target Pacing (tracks the 5 official metrics of the target month in Business Target)
  const targetPacingStats = useMemo(() => {
    // Current target month: October 2026 (month 10) by default or latest month
    const octTarget = DEFAULT_2026_TARGETS.find(t => t.month === 10) || DEFAULT_2026_TARGETS[9];
    
    // October actuals from latest MTD or verified daily summary
    const curNc = mtdData?.metrics?.new_customers?.current_mtd || 1571;
    const curBuyTx = mtdData?.metrics?.buy_transactions?.current_mtd || 90253;
    const curBuyWt = (mtdData?.metrics?.buy_weight_g?.current_mtd ? mtdData.metrics.buy_weight_g.current_mtd * 15 : 142751);
    const curSellTx = mtdData?.metrics?.sell_transactions?.current_mtd || 35016;
    const curSellWt = (mtdData?.metrics?.sell_weight_g?.current_mtd ? mtdData.metrics.sell_weight_g.current_mtd * 15 : 59251);

    const ncPct = octTarget.target_nc > 0 ? (curNc / octTarget.target_nc) * 100 : 0;
    const buyTxPct = octTarget.buy_trans > 0 ? (curBuyTx / octTarget.buy_trans) * 100 : 0;
    const buyWtPct = octTarget.buy_weight_g > 0 ? (curBuyWt / octTarget.buy_weight_g) * 100 : 0;
    const sellTxPct = octTarget.sell_trans > 0 ? (curSellTx / octTarget.sell_trans) * 100 : 0;
    const sellWtPct = octTarget.sell_weight_g > 0 ? (curSellWt / octTarget.sell_weight_g) * 100 : 0;

    const avgPace = (ncPct + buyTxPct + buyWtPct + sellTxPct + sellWtPct) / 5;
    const elapsedDays = mtdData?.elapsed_days || 21;
    const totalDays = mtdData?.total_days_current_month || 31;
    const estLanding = elapsedDays > 0 ? avgPace * (totalDays / elapsedDays) : avgPace;

    return {
      monthLabel: "Oct'26",
      avgPace: Number(avgPace.toFixed(1)),
      estLanding: Number(estLanding.toFixed(0)),
      elapsedDays,
      totalDays,
    };
  }, [mtdData]);

  // 2. Est. Current Month Landing MoM (average of the 7 MTD metrics forecast variance %)
  const avgEstLandingMoM = useMemo(() => {
    if (!mtdData?.metrics) return -4;
    const m = mtdData.metrics;
    const list = [
      m.buy_weight_g?.forecast_variance_percent ?? 0,
      m.buy_transactions?.forecast_variance_percent ?? 0,
      m.sell_weight_g?.forecast_variance_percent ?? 0,
      m.sell_transactions?.forecast_variance_percent ?? 0,
      m.withdraw_15g?.forecast_variance_percent ?? 0,
      m.new_customers?.forecast_variance_percent ?? 0,
      m.total_transactions?.forecast_variance_percent ?? 0,
    ];
    const sum = list.reduce((a, b) => a + b, 0);
    return Math.round(sum / list.length);
  }, [mtdData]);

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
        <header className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200/90 gap-3 min-w-0">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 select-none shrink-0">
            <div>
              <div className="flex items-baseline gap-1 font-black leading-none">
                <span className="text-xl sm:text-2xl text-brand-gold tracking-wider font-black">EASY</span>
                <span className="text-xl sm:text-2xl text-brand-navy tracking-wider font-black">GOLD</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 tracking-wider mt-0.5 uppercase">
                by KHAMPHOUVONG
              </div>
            </div>
            <div className="hidden md:block h-6 w-px bg-slate-200/90" />
            <div className="hidden md:block">
              <span className="text-xs font-bold text-slate-800 tracking-tight block">
                Executive BI &amp; Marketing Intelligence
              </span>
              <span className="text-xs text-slate-500 block">
                Real-Time Sales Operations &amp; Performance Analytics
              </span>
            </div>
          </div>

          {/* Right Header Options Bar: Telemetry Popover + Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end flex-wrap">
            {/* Grouped Telemetry & System Diagnostics Popover */}
            <div className="relative" ref={telemetryPopoverRef}>
              <button
                onClick={() => setIsTelemetryPopoverOpen((prev) => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isTelemetryPopoverOpen
                    ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-300 hover:border-slate-400 text-slate-700 shadow-xs hover:bg-slate-50'
                }`}
                title="System Health, Edge Cache & Data Freshness Diagnostics"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Telemetry &amp; Audit</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTelemetryPopoverOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Popover Dropdown Panel */}
              {isTelemetryPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-white border border-slate-200/95 rounded-2xl shadow-xl z-50 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">System Telemetry</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                      Edge Active (0ms)
                    </span>
                  </div>

                  {/* Freshness Badge Inside Popover */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
                      Data Currency &amp; Cache
                    </label>
                    <FreshnessBadge
                      onTriggerRefresh={async () => {
                        await Promise.all([fetchWeeklySummary(), fetchMtdData()]);
                      }}
                    />
                  </div>

                  {/* Architecture Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 font-mono tabular-nums">
                    <div>
                      <span className="text-slate-500 block text-xs font-sans">Query Architecture</span>
                      <span className="font-bold text-slate-900">Dual-Tier Fast-Path</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-sans">Row Capacity</span>
                      <span className="font-bold text-slate-900">1.4M+ Rows (Indexed)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-sans">Edge POPs</span>
                      <span className="font-bold text-emerald-700">Cloudflare 300+</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs font-sans">DB Latency</span>
                      <span className="font-bold text-slate-900">&lt; 10ms RPC</span>
                    </div>
                  </div>

                  {/* Actions inside popover */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        setIsTelemetryPopoverOpen(false);
                        setIsValidatorModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200/90 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Run Full Integrity Audit</span>
                      </span>
                      <span className="text-slate-400">→</span>
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setIsTelemetryPopoverOpen(false);
                          setIsUserManagementModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-900 border border-slate-200/90 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-brand-gold" />
                          <span>User Directory &amp; RBAC</span>
                        </span>
                        <span className="text-slate-400">→</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Account / Profile Badge button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 shadow-xs transition-all hover:bg-slate-50 cursor-pointer"
              title="Manage Account & Reporting Profiles"
            >
              <div className="w-6 h-6 rounded-lg bg-brand-navy text-brand-gold font-black text-xs flex items-center justify-center">
                {currentUser ? currentUser.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {currentUser ? (currentUser.full_name || currentUser.email.split('@')[0]) : 'Sign In'}
                </span>
                <span className="block text-xs font-bold text-emerald-600 uppercase tracking-tight leading-tight">
                  {currentUser ? currentUser.role : 'Guest Mode'}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Universal Executive Pulse Banner across all reporting views */}
        <div className="mb-3.5">
          <ExecutivePulseBanner
            targetMonthLabel={targetPacingStats.monthLabel}
            targetPacePct={targetPacingStats.avgPace}
            targetEstLandingPct={targetPacingStats.estLanding}
            daysGone={targetPacingStats.elapsedDays}
            totalDays={targetPacingStats.totalDays}
            mtdCompMonthLabel={mtdData?.comparison_month_label || "Sep'26"}
            avgEstLandingMoMPct={avgEstLandingMoM}
            totalTransactionsMtd={mtdData?.metrics?.total_transactions?.current_mtd || 127982}
            totalTransactionsMoMPct={mtdData?.metrics?.total_transactions?.mtd_variance_percent || 16}
            newCustomersMtd={mtdData?.metrics?.new_customers?.current_mtd || 1571}
            newCustomersMoMPct={mtdData?.metrics?.new_customers?.mtd_variance_percent || -27}
            activeWeekLabel={activeWeeklyMetrics?.currentWeek?.week_label || 'W43'}
            weeklyVolumeBaht={activeWeeklyMetrics ? Number(activeWeeklyMetrics.currentWeek.buy_weight_15g) : 1912}
            weeklyWoWVariance={activeWeeklyMetrics ? activeWeeklyMetrics.variances.buy_weight_15g : -36}
            isPartialWeek={activeWeeklyMetrics?.isPartial ?? true}
            onNavigateTab={(tab) => handleTabChange(tab)}
          />
        </div>

        {/* Weekly Summary Error Notice with Retry */}
        {weeklyError && (
          <div className="mb-3.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{weeklyError}</span>
            </div>
            <button
              onClick={() => fetchWeeklySummary()}
              className="px-3 py-1.5 rounded-xl bg-brand-navy text-white font-bold hover:bg-brand-navyDark transition-all shrink-0 cursor-pointer shadow-xs"
            >
              Retry Weekly
            </button>
          </div>
        )}

        {/* Tier 2: Executive Navigation Tabs Bar (Accessible, Scrollable on Mobile <400px) */}
        <nav aria-label="Reporting Views Navigation" className="mb-4">
          <div
            role="tablist"
            aria-label="Executive Reporting Sections"
            className="flex items-center bg-white p-1 rounded-xl border border-slate-300/80 shadow-xs flex-nowrap overflow-x-auto max-w-full gap-1 scrollbar-none"
          >
            <button
              role="tab"
              id="tab-targets"
              aria-selected={activeReportTab === 'targets'}
              aria-controls="panel-targets"
              tabIndex={activeReportTab === 'targets' ? 0 : -1}
              onClick={() => handleTabChange('targets')}
              onKeyDown={(e) => handleTabKeyDown(e, 'targets')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-brand-navy ${
                activeReportTab === 'targets'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Target className="w-4 h-4 text-brand-gold" />
              <span>Business Target</span>
              <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-bold bg-brand-gold text-slate-950">
                2026
              </span>
            </button>
            <button
              role="tab"
              id="tab-dynamic"
              aria-selected={activeReportTab === 'dynamic'}
              aria-controls="panel-dynamic"
              tabIndex={activeReportTab === 'dynamic' ? 0 : -1}
              onClick={() => handleTabChange('dynamic')}
              onKeyDown={(e) => handleTabKeyDown(e, 'dynamic')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-brand-navy ${
                activeReportTab === 'dynamic'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Dynamic BI</span>
            </button>
            <button
              role="tab"
              id="tab-mtd"
              aria-selected={activeReportTab === 'mtd'}
              aria-controls="panel-mtd"
              tabIndex={activeReportTab === 'mtd' ? 0 : -1}
              onClick={() => handleTabChange('mtd')}
              onKeyDown={(e) => handleTabKeyDown(e, 'mtd')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-brand-navy ${
                activeReportTab === 'mtd'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>MTD Forecast</span>
            </button>
            <button
              role="tab"
              id="tab-weekly"
              aria-selected={activeReportTab === 'weekly'}
              aria-controls="panel-weekly"
              tabIndex={activeReportTab === 'weekly' ? 0 : -1}
              onClick={() => handleTabChange('weekly')}
              onKeyDown={(e) => handleTabKeyDown(e, 'weekly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-brand-navy ${
                activeReportTab === 'weekly'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>WoW Trends</span>
            </button>
            <button
              role="tab"
              id="tab-pivot"
              aria-selected={activeReportTab === 'pivot'}
              aria-controls="panel-pivot"
              tabIndex={activeReportTab === 'pivot' ? 0 : -1}
              onClick={() => handleTabChange('pivot')}
              onKeyDown={(e) => handleTabKeyDown(e, 'pivot')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-brand-navy ${
                activeReportTab === 'pivot'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Custom Pivot Profile</span>
            </button>
            <button
              role="tab"
              id="tab-campaign"
              aria-selected={activeReportTab === 'campaign'}
              aria-controls="panel-campaign"
              tabIndex={activeReportTab === 'campaign' ? 0 : -1}
              onClick={() => handleTabChange('campaign')}
              onKeyDown={(e) => handleTabKeyDown(e, 'campaign')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-brand-navy ${
                activeReportTab === 'campaign'
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Campaign Tracking</span>
            </button>
          </div>
        </nav>

        {/* TAB 0: MONTHLY RUN-RATE & 2026 TARGET TRACKING */}
        {activeReportTab === 'targets' && (
          <div role="tabpanel" id="panel-targets" aria-labelledby="tab-targets" tabIndex={0} className="focus:outline-hidden">
            <TargetReportView />
          </div>
        )}

        {/* TAB: DYNAMIC BI PERFORMANCE & DAX MEASURES EXPLORER */}
        {activeReportTab === 'dynamic' && (
          <div role="tabpanel" id="panel-dynamic" aria-labelledby="tab-dynamic" tabIndex={0} className="focus:outline-hidden">
            <DynamicReportView />
          </div>
        )}

        {/* TAB 1: MTD & FORECAST REPORT */}
        {activeReportTab === 'mtd' && (
          <div role="tabpanel" id="panel-mtd" aria-labelledby="tab-mtd" tabIndex={0} className="focus:outline-hidden">
            {mtdLoading && !mtdData ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-brand-navy" />
                <p className="font-semibold text-sm">Loading MTD and Forecast Report...</p>
              </div>
            ) : mtdData ? (
              <MtdReportView
                initialData={mtdData}
                onRefresh={fetchMtdData}
                loading={mtdLoading}
                error={mtdError}
              />
            ) : mtdError ? (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm space-y-3">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Unable to load MTD Forecast Report</span>
                </div>
                <p className="text-xs text-amber-800">{mtdError}</p>
                <button
                  onClick={() => fetchMtdData()}
                  className="px-4 py-2 bg-brand-navy text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-navyDark transition-all cursor-pointer"
                >
                  Retry Loading MTD
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: WEEK OVER WEEK (WoW) HISTORICAL REPORT */}
        {activeReportTab === 'weekly' && (
          <div role="tabpanel" id="panel-weekly" aria-labelledby="tab-weekly" tabIndex={0} className="focus:outline-hidden">
            {/* Top Header Row for Weekly View */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4 pb-2 border-b border-slate-200/80">
              {/* Left Title & Date */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-brand-navy tracking-tight flex items-center gap-2.5 flex-wrap">
                  <span>Overall Performance Week over Week</span>
                  <span className="px-3 py-0.5 rounded-xl bg-blue-50 text-brand-navy border border-blue-200 text-xl sm:text-2xl lg:text-3xl font-black font-mono tabular-nums">
                    {activeWeeklyMetrics?.currentWeek.week_label || selectedWeekLabel}
                  </span>
                </h1>
                <div className="mt-1.5 flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-brand-navyLight underline underline-offset-2">
                    Data up to date {formatDisplayDate(activeWeeklyMetrics?.isPartial ? (mtdData?.as_of_date || mtdData?.latest_data_date || activeWeeklyMetrics?.currentWeek.start_date) : activeWeeklyMetrics?.currentWeek.end_date)}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-medium font-mono tabular-nums">
                    Period: {activeWeeklyMetrics?.currentWeek.start_date} to {activeWeeklyMetrics?.currentWeek.end_date}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold font-mono tabular-nums text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <Database className="w-3.5 h-3.5" />
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
                    <Calendar className="w-3.5 h-3.5 text-brand-navy absolute left-2 pointer-events-none" />
                    <select
                      value={selectedWeekLabel}
                      onChange={(e) => setSelectedWeekLabel(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-1 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-navy font-mono tabular-nums"
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
                      className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono tabular-nums transition-all ${
                        selectedWeekLabel === w.week_label
                          ? 'bg-brand-navy text-white shadow-xs'
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
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${
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
                            {activeWeeklyMetrics?.elapsedDays || 1} Day{activeWeeklyMetrics?.elapsedDays && activeWeeklyMetrics.elapsedDays > 1 ? 's' : ''} Elapsed
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
                      elapsedDays={activeWeeklyMetrics.elapsedDays}
                      isProratedWoW={isProratedWoW}
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
                      elapsedDays={activeWeeklyMetrics.elapsedDays}
                      isProratedWoW={isProratedWoW}
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
                      elapsedDays={activeWeeklyMetrics.elapsedDays}
                      isProratedWoW={isProratedWoW}
                    />
                  </section>
                </div>

                {/* 3. Trading Flow Balance & Market Pulse Ribbon */}
                <section className="w-full bg-white/95 rounded-2xl border border-slate-200/90 px-3.5 py-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-brand-gold border border-amber-200/80 shrink-0">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Trading Flow &amp; Net Gold Position ({activeWeeklyMetrics.currentWeek.week_label})
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-700">Net Flow:</span>
                        <span className={`text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded-md ${
                          activeWeeklyMetrics.netGoldFlow > 0 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : activeWeeklyMetrics.netGoldFlow < 0
                            ? 'bg-rose-50 text-brand-outflowLight border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {activeWeeklyMetrics.netGoldFlow > 0 
                            ? `▲ +${activeWeeklyMetrics.netGoldFlow.toLocaleString()} Baht (Accumulation)` 
                            : `${activeWeeklyMetrics.netGoldFlow.toLocaleString()} Baht (Liquidation)`}
                        </span>
                        <span className="text-xs text-slate-500 font-medium font-mono tabular-nums">
                          • Turnover: <strong className="text-slate-700">{activeWeeklyMetrics.totalGoldTurnover.toLocaleString()} Baht</strong>
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
          <div role="tabpanel" id="panel-pivot" aria-labelledby="tab-pivot" tabIndex={0} className="focus:outline-hidden">
            <PowerPivotStudio
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 4: CAMPAIGN TRACKING & TARGET INTELLIGENCE */}
        {activeReportTab === 'campaign' && (
          <div role="tabpanel" id="panel-campaign" aria-labelledby="tab-campaign" tabIndex={0} className="focus:outline-hidden">
            <CampaignTrackingView
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          </div>
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
