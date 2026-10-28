'use client';

import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Landmark, 
  Building2, 
  BarChart3, 
  AlertCircle, 
  CalendarDays,
  TrendingUp,
  Layers,
  Activity,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  HourlyMetric, 
  BankMetric, 
  BranchMetric, 
  WeightBracketMetric, 
  DaxMeasuresPayload,
  DayOfWeekMetric,
  TrendPoint
} from '@/lib/types/dynamicReport.types';
interface DynamicChartsSectionProps {
  hourly: HourlyMetric[];
  banks: BankMetric[];
  branches: BranchMetric[];
  weightBrackets: WeightBracketMetric[];
  measures?: DaxMeasuresPayload;
  dayOfWeek?: DayOfWeekMetric[];
  timelineTrend?: TrendPoint[];
  yearTrend?: TrendPoint[];
}

const EMPTY_HOURLY: HourlyMetric[] = Array.from({ length: 24 }, (_, hr) => ({
  hour: hr,
  hour_label: `${String(hr).padStart(2, '0')}:00`,
  total_tx: 0,
  buy_tx: 0,
  sell_tx: 0,
  total_weight_g: 0,
  buy_weight_g: 0,
  sell_weight_g: 0,
  total_amount_lak: 0,
  buy_amount_lak: 0,
  sell_amount_lak: 0,
}));

const EMPTY_DAY_OF_WEEK: DayOfWeekMetric[] = [
  { day_code: 'mon', day_label: 'Mon', day_full: 'Monday', total_tx: 0, buy_tx: 0, sell_tx: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { day_code: 'tue', day_label: 'Tue', day_full: 'Tuesday', total_tx: 0, buy_tx: 0, sell_tx: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { day_code: 'wed', day_label: 'Wed', day_full: 'Wednesday', total_tx: 0, buy_tx: 0, sell_tx: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { day_code: 'thu', day_label: 'Thu', day_full: 'Thursday', total_tx: 0, buy_tx: 0, sell_tx: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { day_code: 'fri', day_label: 'Fri', day_full: 'Friday (Payday)', total_tx: 0, buy_tx: 0, sell_tx: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { day_code: 'sat', day_label: 'Sat', day_full: 'Saturday', total_tx: 0, buy_tx: 0, sell_tx: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { day_code: 'sun', day_label: 'Sun', day_full: 'Sunday', total_tx: 0, buy_tx: 0, sell_tx: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
];

const EMPTY_WEIGHT_BRACKETS: WeightBracketMetric[] = [
  { weight_bracket: '< 0.5g', count: 0, buy_count: 0, sell_count: 0, total_weight_g: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { weight_bracket: '0.5g - 1g', count: 0, buy_count: 0, sell_count: 0, total_weight_g: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { weight_bracket: '1g - 5g', count: 0, buy_count: 0, sell_count: 0, total_weight_g: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { weight_bracket: '5g - 15g', count: 0, buy_count: 0, sell_count: 0, total_weight_g: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { weight_bracket: '15g - 75g (1-5 Baht)', count: 0, buy_count: 0, sell_count: 0, total_weight_g: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
  { weight_bracket: '>= 75g (>5 Baht)', count: 0, buy_count: 0, sell_count: 0, total_weight_g: 0, buy_weight_g: 0, sell_weight_g: 0, total_amount_lak: 0, buy_amount_lak: 0, sell_amount_lak: 0 },
];

function getSmoothSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
  }

  // Smooth natural cubic spline with tangent clamping (prevents weird overshoot/sag)
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Controlled tangents
    let m1 = (p2.y - p0.y) / (p2.x - p0.x || 1);
    let m2 = (p3.y - p1.y) / (p3.x - p1.x || 1);

    // Clamp slopes when adjacent points flat or extrema
    if (Math.abs(dy) < 0.001) {
      m1 = 0;
      m2 = 0;
    } else {
      if (m1 * dy <= 0) m1 = 0;
      if (m2 * dy <= 0) m2 = 0;
    }

    const cp1x = p1.x + dx / 3;
    const cp1y = p1.y + (m1 * dx) / 3;
    const cp2x = p2.x - dx / 3;
    const cp2y = p2.y - (m2 * dx) / 3;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function getSmoothAreaPath(points: { x: number; y: number }[], baseline: number): string {
  if (points.length <= 1) return '';
  const linePath = getSmoothSplinePath(points);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  return `${linePath} L ${lastX.toFixed(1)},${baseline.toFixed(1)} L ${firstX.toFixed(1)},${baseline.toFixed(1)} Z`;
}

interface NiceScale {
  max: number;
  ticks: number[];
  step: number;
}

function getNiceScale(rawMax: number, targetTicks = 5): NiceScale {
  if (rawMax <= 0) {
    return { max: 20000, ticks: [0, 5000, 10000, 15000, 20000], step: 5000 };
  }
  const safeMax = Math.max(rawMax * 1.05, 10);
  const rawStep = safeMax / (targetTicks - 1);
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, exponent);
  const fraction = rawStep / magnitude;

  let niceFraction = 1;
  if (fraction <= 1.2) niceFraction = 1;
  else if (fraction <= 2.2) niceFraction = 2;
  else if (fraction <= 3.2) niceFraction = 2.5;
  else if (fraction <= 6.5) niceFraction = 5;
  else niceFraction = 10;

  const step = niceFraction * magnitude;
  const max = Math.ceil(safeMax / step) * step;

  const ticks: number[] = [];
  for (let val = 0; val <= max + step * 0.001; val += step) {
    ticks.push(Math.round(val));
  }
  return { max, ticks, step };
}

function formatAxisTick(val: number): string {
  if (val === 0) return '0';
  if (Math.abs(val) >= 1_000_000) {
    const m = val / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    const k = val / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return val.toLocaleString();
}

export function DynamicChartsSection({
  hourly,
  banks,
  branches,
  weightBrackets,
  measures,
  dayOfWeek,
  timelineTrend,
  yearTrend,
}: DynamicChartsSectionProps) {
  const activeHourly = useMemo(() => {
    if (hourly && hourly.length > 0) return hourly;
    return EMPTY_HOURLY;
  }, [hourly]);

  const activeBanks = useMemo(() => {
    if (banks && banks.length > 0) return banks;
    return [];
  }, [banks]);

  const activeBranches = useMemo(() => {
    if (branches && branches.length > 0) return branches;
    return [];
  }, [branches]);

  const activeWeightBrackets = useMemo(() => {
    if (weightBrackets && weightBrackets.length > 0) return weightBrackets;
    return EMPTY_WEIGHT_BRACKETS;
  }, [weightBrackets]);

  const activeDayOfWeek: DayOfWeekMetric[] = useMemo(() => {
    if (dayOfWeek && dayOfWeek.length > 0) return dayOfWeek;
    return EMPTY_DAY_OF_WEEK;
  }, [dayOfWeek]);

  // Chart Global Metric Mode for Lower Sections: 'tx' (Transactions) | 'weight' (Gold Grams) | 'amount' (Revenue M LAK)
  const [metricMode, setMetricMode] = useState<'tx' | 'weight' | 'amount'>('tx');

  // Trend Chart Granularity State: 'day' | 'week' | 'year' (DEFAULT is Day)
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'year'>('day');
  
  // Trend Chart Metric Mode: 'tx' (Transaction Trend - DEFAULT) | 'weight' (Weight (g) Trend)
  const [trendMetric, setTrendMetric] = useState<'tx' | 'weight'>('tx');

  // Trend Chart Interactive Series Visibility Toggles (Legend Checkboxes)
  const [showBuyLine, setShowBuyLine] = useState<boolean>(true);
  const [showSellLine, setShowSellLine] = useState<boolean>(true);
  const [showNcLine, setShowNcLine] = useState<boolean>(true);
  const [showWithdrawLine, setShowWithdrawLine] = useState<boolean>(true);

  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Bank Settlement View & Side Options
  const [bankMetricType, setBankMetricType] = useState<'tx' | 'weight' | 'value'>('tx');
  const [bankSideFilter, setBankSideFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Hourly Activity Trx Type Filter: 'all' | 'buy' | 'sell'
  const [hourlyTrxType, setHourlyTrxType] = useState<'all' | 'buy' | 'sell'>('all');

  // Day Activity Trx Type Filter: 'all' | 'buy' | 'sell'
  const [dayTrxType, setDayTrxType] = useState<'all' | 'buy' | 'sell'>('all');

  // Ticket Distribution Side Filter: 'all' | 'buy' | 'sell'
  const [ticketSideFilter, setTicketSideFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Value getters based on metric mode (100% live SQL values)
  const getHourlyVal = (h: HourlyMetric) => {
    if (hourlyTrxType === 'buy') {
      if (metricMode === 'weight') return Number((h.buy_weight_g || 0).toFixed(1));
      if (metricMode === 'amount') return Math.round(((h.buy_amount_lak ?? h.total_amount_lak) || 0) / 1000000);
      return h.buy_tx || 0;
    }
    if (hourlyTrxType === 'sell') {
      if (metricMode === 'weight') return Number((h.sell_weight_g || 0).toFixed(1));
      if (metricMode === 'amount') return Math.round(((h.sell_amount_lak ?? h.total_amount_lak) || 0) / 1000000);
      return h.sell_tx || 0;
    }
    if (metricMode === 'weight') return Number(((h.total_weight_g ?? (h.buy_weight_g + h.sell_weight_g)) || 0).toFixed(1));
    if (metricMode === 'amount') return Math.round((h.total_amount_lak || 0) / 1000000);
    return h.total_tx || 0;
  };

  const getDayVal = (d: DayOfWeekMetric) => {
    if (dayTrxType === 'buy') {
      if (metricMode === 'weight') return Number((d.buy_weight_g || 0).toFixed(1));
      if (metricMode === 'amount') return Math.round(((d.buy_amount_lak ?? d.total_amount_lak) || 0) / 1000000);
      return d.buy_tx || 0;
    }
    if (dayTrxType === 'sell') {
      if (metricMode === 'weight') return Number((d.sell_weight_g || 0).toFixed(1));
      if (metricMode === 'amount') return Math.round(((d.sell_amount_lak ?? d.total_amount_lak) || 0) / 1000000);
      return d.sell_tx || 0;
    }
    if (metricMode === 'weight') return Number(((d.total_weight_g ?? (d.buy_weight_g + d.sell_weight_g)) || 0).toFixed(1));
    if (metricMode === 'amount') return Math.round((d.total_amount_lak || 0) / 1000000);
    return d.total_tx || 0;
  };

  const getBankVal = (b: BankMetric) => {
    if (metricMode === 'weight') return Math.round(b.total_weight_g || 0);
    if (metricMode === 'amount') return Math.round((b.total_amount_lak || 0) / 1000000);
    return b.total_tx || 0;
  };

  const getBranchVal = (br: BranchMetric) => {
    if (metricMode === 'weight') return Math.round(br.total_weight_g || 0);
    if (metricMode === 'amount') return Math.round((br.total_amount_lak || 0) / 1000000);
    return br.total_tx || 0;
  };

  const unitLabel = metricMode === 'weight' ? 'g' : metricMode === 'amount' ? 'M LAK' : 'tx';

  const maxHourlyVal = Math.max(...activeHourly.map(getHourlyVal), 1);
  const maxDayVal = Math.max(...activeDayOfWeek.map(getDayVal), 1);
  const maxBankVal = Math.max(...activeBanks.map(getBankVal), 1);
  const maxBranchVal = Math.max(...activeBranches.map(getBranchVal), 1);

  const enrichedBrackets = useMemo(() => {
    const baseList = activeWeightBrackets.map((wb, index) => {
      let sideCount = wb.count || 0;
      let sideWeight = wb.total_weight_g || 0;
      let sideAmountLak = wb.total_amount_lak || 0;

      if (ticketSideFilter === 'buy') {
        sideCount = wb.buy_count ?? 0;
        sideWeight = Number((wb.buy_weight_g ?? 0).toFixed(2));
        sideAmountLak = wb.buy_amount_lak ?? 0;
      } else if (ticketSideFilter === 'sell') {
        sideCount = wb.sell_count ?? 0;
        sideWeight = Number((wb.sell_weight_g ?? 0).toFixed(2));
        sideAmountLak = wb.sell_amount_lak ?? 0;
      }

      return {
        ...wb,
        count: sideCount,
        total_weight_g: sideWeight,
        total_amount_lak: sideAmountLak,
        originalIndex: index,
      };
    });

    const sumCount = baseList.reduce((acc, wb) => acc + wb.count, 0) || 1;
    const sumWeight = baseList.reduce((acc, wb) => acc + wb.total_weight_g, 0) || 1;
    const sumAmount = baseList.reduce((acc, wb) => acc + wb.total_amount_lak, 0) || 1;

    const list = baseList.map((wb) => {
      const countPct = baseList.reduce((acc, x) => acc + x.count, 0) > 0
        ? Number(((wb.count / sumCount) * 100).toFixed(1))
        : 0;
      const weightPct = baseList.reduce((acc, x) => acc + x.total_weight_g, 0) > 0
        ? Number(((wb.total_weight_g / sumWeight) * 100).toFixed(1))
        : 0;
      const amountPct = baseList.reduce((acc, x) => acc + x.total_amount_lak, 0) > 0
        ? Number(((wb.total_amount_lak / sumAmount) * 100).toFixed(1))
        : 0;
      return {
        ...wb,
        countPct,
        weightPct,
        amountPct,
      };
    });

    const sortedByShare = [...list].sort((a, b) => b.countPct - a.countPct);
    const rankedList = list.map((item) => {
      const rank = sortedByShare.findIndex((s) => s.weight_bracket === item.weight_bracket) + 1;
      return {
        ...item,
        rank,
      };
    });

    return rankedList.sort((a, b) => a.originalIndex - b.originalIndex);
  }, [activeWeightBrackets, ticketSideFilter]);

  const getTicketTierStyle = (rank: number, countPct: number) => {
    if (rank === 1 || countPct >= 50) {
      return {
        badge: '🏆 Highest Share (#1)',
        badgeClass: 'bg-emerald-600 text-white font-black',
        cardClass: 'bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-teal-50/60 border-emerald-300 ring-1 ring-emerald-200/80 shadow-2xs',
        barClass: 'bg-gradient-to-r from-emerald-500 to-teal-600',
        textColor: 'text-emerald-950',
        sharePillClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black',
      };
    }
    if (rank === 2 || countPct >= 12) {
      return {
        badge: '🥈 High Volume (#2)',
        badgeClass: 'bg-blue-600 text-white font-bold',
        cardClass: 'bg-gradient-to-br from-blue-50/80 to-indigo-50/30 border-blue-200 shadow-2xs',
        barClass: 'bg-blue-500',
        textColor: 'text-blue-950',
        sharePillClass: 'bg-blue-100 text-blue-800 border-blue-200 font-bold',
      };
    }
    if (rank === 3 || rank === 4 || countPct >= 2) {
      return {
        badge: `Rank #${rank} · Moderate`,
        badgeClass: 'bg-amber-600 text-white font-semibold',
        cardClass: 'bg-amber-50/60 border-amber-200',
        barClass: 'bg-amber-500',
        textColor: 'text-amber-950',
        sharePillClass: 'bg-amber-100 text-amber-800 border-amber-200 font-semibold',
      };
    }
    return {
      badge: `📉 Lowest Portion (#${rank})`,
      badgeClass: 'bg-slate-400 text-white font-medium',
      cardClass: 'bg-slate-50 border-slate-200',
      barClass: 'bg-slate-300',
      textColor: 'text-slate-700',
      sharePillClass: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
    };
  };

  // Active trend series data (100% live DB timeline)
  const activeTrendData: TrendPoint[] = useMemo(() => {
    const baseTimeline = timelineTrend || [];
    if (trendGranularity === 'day') return baseTimeline;
    if (trendGranularity === 'week') {
      const weeks: TrendPoint[] = [];
      for (let i = 0; i < baseTimeline.length; i += 7) {
        const chunk = baseTimeline.slice(i, i + 7);
        const first = chunk[0];
        const last = chunk[chunk.length - 1];
        weeks.push({
          label: `W${Math.floor(i / 7) + 1}`,
          subLabel: `${first.label} - ${last.label}`,
          buy_val: Math.round(chunk.reduce((acc, p) => acc + p.buy_val, 0) * 10) / 10,
          sell_val: Math.round(chunk.reduce((acc, p) => acc + p.sell_val, 0) * 10) / 10,
          total_val: Math.round(chunk.reduce((acc, p) => acc + p.total_val, 0) * 10) / 10,
          buy_tx: chunk.reduce((acc, p) => acc + p.buy_tx, 0),
          sell_tx: chunk.reduce((acc, p) => acc + p.sell_tx, 0),
          total_tx: chunk.reduce((acc, p) => acc + p.total_tx, 0),
          buy_weight_g: Math.round(chunk.reduce((acc, p) => acc + p.buy_weight_g, 0) * 10) / 10,
          sell_weight_g: Math.round(chunk.reduce((acc, p) => acc + p.sell_weight_g, 0) * 10) / 10,
          net_weight_g: Math.round(chunk.reduce((acc, p) => acc + p.net_weight_g, 0) * 10) / 10,
          nc: chunk.reduce((acc, p) => acc + p.nc, 0),
          withdraw_tx: chunk.reduce((acc, p) => acc + (p.withdraw_tx ?? 0), 0),
          withdraw_weight_g: Math.round(chunk.reduce((acc, p) => acc + (p.withdraw_weight_g ?? 0), 0) * 10) / 10,
        });
      }
      return weeks;
    }
    if (yearTrend && yearTrend.length > 0) return yearTrend;
    // Group daily points by YYYY-MM if yearTrend not provided
    const byMonth = new Map<string, TrendPoint>();
    for (const pt of baseTimeline) {
      const ym = pt.tx_date ? pt.tx_date.slice(0, 7) : pt.label;
      const cur = byMonth.get(ym) || {
        label: ym,
        subLabel: ym,
        buy_val: 0,
        sell_val: 0,
        total_val: 0,
        buy_tx: 0,
        sell_tx: 0,
        total_tx: 0,
        buy_weight_g: 0,
        sell_weight_g: 0,
        net_weight_g: 0,
        nc: 0,
        withdraw_tx: 0,
        withdraw_weight_g: 0,
      };
      cur.buy_val += pt.buy_val;
      cur.sell_val += pt.sell_val;
      cur.total_val += pt.total_val;
      cur.buy_tx += pt.buy_tx;
      cur.sell_tx += pt.sell_tx;
      cur.total_tx += pt.total_tx;
      cur.buy_weight_g = Number((cur.buy_weight_g + pt.buy_weight_g).toFixed(2));
      cur.sell_weight_g = Number((cur.sell_weight_g + pt.sell_weight_g).toFixed(2));
      cur.net_weight_g = Number((cur.net_weight_g + pt.net_weight_g).toFixed(2));
      cur.nc += pt.nc;
      cur.withdraw_tx = (cur.withdraw_tx || 0) + (pt.withdraw_tx || 0);
      cur.withdraw_weight_g = Number(((cur.withdraw_weight_g || 0) + (pt.withdraw_weight_g || 0)).toFixed(2));
      byMonth.set(ym, cur);
    }
    return Array.from(byMonth.values());
  }, [timelineTrend, yearTrend, trendGranularity]);

  const trendUnitLabel = trendMetric === 'tx' ? 'tx' : 'g';

  // Value getters for the active metric mode
  const getPointBuy = (p: TrendPoint) => trendMetric === 'tx' ? p.buy_tx : p.buy_weight_g;
  const getPointSell = (p: TrendPoint) => trendMetric === 'tx' ? p.sell_tx : p.sell_weight_g;
  const getPointWithdraw = (p: TrendPoint) => {
    if (trendMetric === 'tx') return p.withdraw_tx ?? 0;
    return p.withdraw_weight_g ?? 0;
  };
  const getPointNc = (p: TrendPoint) => p.nc;

  // Nice Scale computed from whichever series are currently visible
  const primaryScale = useMemo(() => {
    const candidateMaxes: number[] = [1];
    activeTrendData.forEach((p) => {
      if (showBuyLine) candidateMaxes.push(getPointBuy(p));
      if (showSellLine) candidateMaxes.push(getPointSell(p));
      if (showWithdrawLine) candidateMaxes.push(getPointWithdraw(p));
      if (trendMetric === 'tx' && showNcLine) candidateMaxes.push(getPointNc(p));
    });
    const peak = Math.max(...candidateMaxes);
    return getNiceScale(peak, 5);
  }, [activeTrendData, trendMetric, showBuyLine, showSellLine, showWithdrawLine, showNcLine]);

  const maxVal = primaryScale.max;
  const primaryTicks = primaryScale.ticks;

  // Summary totals for currently displayed active series
  const totalBuy = activeTrendData.reduce((acc, p) => acc + getPointBuy(p), 0);
  const totalSell = activeTrendData.reduce((acc, p) => acc + getPointSell(p), 0);
  const totalWithdraw = activeTrendData.reduce((acc, p) => acc + getPointWithdraw(p), 0);
  const totalNc = activeTrendData.reduce((acc, p) => acc + getPointNc(p), 0);

  // SVG Canvas Dimension (Full Border Width without Dead Gaps matching viewBox="0 0 1200 320")
  const svgWidth = 1200;
  const svgHeight = 320;
  const marginLeft = 48;
  const marginRight = 16;
  const marginTop = 24;
  const marginBottom = 36;
  const plotWidth = svgWidth - marginLeft - marginRight;
  const plotHeight = svgHeight - marginTop - marginBottom;
  const plotBaseline = marginTop + plotHeight;
  const nPoints = activeTrendData.length;
  const getX = (i: number) => nPoints > 1 ? marginLeft + (i / (nPoints - 1)) * plotWidth : marginLeft + plotWidth / 2;

  // Geometric coordinates for curves and nodes spanning from edge to edge
  const buyPoints = useMemo(() => {
    return activeTrendData.map((pt, i) => {
      const cx = getX(i);
      const val = getPointBuy(pt);
      const cy = maxVal > 0 ? plotBaseline - (val / maxVal) * plotHeight : plotBaseline;
      return { x: cx, y: cy };
    });
  }, [activeTrendData, marginLeft, plotWidth, nPoints, maxVal, plotBaseline, plotHeight, trendMetric]);

  const sellPoints = useMemo(() => {
    return activeTrendData.map((pt, i) => {
      const cx = getX(i);
      const val = getPointSell(pt);
      const cy = maxVal > 0 ? plotBaseline - (val / maxVal) * plotHeight : plotBaseline;
      return { x: cx, y: cy };
    });
  }, [activeTrendData, marginLeft, plotWidth, nPoints, maxVal, plotBaseline, plotHeight, trendMetric]);

  const withdrawPoints = useMemo(() => {
    return activeTrendData.map((pt, i) => {
      const cx = getX(i);
      const val = getPointWithdraw(pt);
      const cy = maxVal > 0 ? plotBaseline - (val / maxVal) * plotHeight : plotBaseline;
      return { x: cx, y: cy };
    });
  }, [activeTrendData, marginLeft, plotWidth, nPoints, maxVal, plotBaseline, plotHeight, trendMetric]);

  const ncPoints = useMemo(() => {
    return activeTrendData.map((pt, i) => {
      const cx = getX(i);
      const val = getPointNc(pt);
      const cy = maxVal > 0 ? plotBaseline - (val / maxVal) * plotHeight : plotBaseline;
      return { x: cx, y: cy };
    });
  }, [activeTrendData, marginLeft, plotWidth, nPoints, maxVal, plotBaseline, plotHeight]);

  // Spline paths and area fills
  const buySplinePath = useMemo(() => showBuyLine ? getSmoothSplinePath(buyPoints) : '', [buyPoints, showBuyLine]);
  const buySplineArea = useMemo(() => showBuyLine ? getSmoothAreaPath(buyPoints, plotBaseline) : '', [buyPoints, showBuyLine, plotBaseline]);

  const sellSplinePath = useMemo(() => showSellLine ? getSmoothSplinePath(sellPoints) : '', [sellPoints, showSellLine]);
  const sellSplineArea = useMemo(() => showSellLine ? getSmoothAreaPath(sellPoints, plotBaseline) : '', [sellPoints, showSellLine, plotBaseline]);

  const withdrawSplinePath = useMemo(() => showWithdrawLine ? getSmoothSplinePath(withdrawPoints) : '', [withdrawPoints, showWithdrawLine]);
  const withdrawSplineArea = useMemo(() => showWithdrawLine ? getSmoothAreaPath(withdrawPoints, plotBaseline) : '', [withdrawPoints, showWithdrawLine, plotBaseline]);

  const ncSplinePath = useMemo(() => (trendMetric === 'tx' && showNcLine) ? getSmoothSplinePath(ncPoints) : '', [ncPoints, showNcLine, trendMetric]);

  return (
    <div className="space-y-5 mb-6">
      {/* ========================================================================= */}
      {/* 1. HERO TREND CHART: MULTI-LINE PERFORMANCE DYNAMICS                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        {/* Trend Chart Control Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-3.5 mb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0c4ca3] flex items-center justify-center border border-blue-200">
              <TrendingUp className="w-4 h-4 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  Performance Trend ({trendMetric === 'tx' ? 'Transaction Trend' : 'Weight Trend'})
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#0c4ca3] border border-blue-200">
                  {trendMetric === 'tx' ? '4 Series Available' : '3 Series Available'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {trendMetric === 'tx'
                  ? 'Multi-line tracking for Buy, Sell, New Register, and Gold Withdraw transactions'
                  : 'Multi-line physical gold volume tracking (grams) for Buy, Sell, and Physical Withdraw'}
              </p>
            </div>
          </div>

          {/* Granularity & Trend Mode Selectors */}
          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            {/* Metric Mode Switcher: Transaction (tx) vs Weight (g) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-black text-slate-600">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Trend:</span>
              <button
                type="button"
                onClick={() => setTrendMetric('tx')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  trendMetric === 'tx'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>Transaction (tx)</span>
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric('weight')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  trendMetric === 'weight'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>Weight (g)</span>
              </button>
            </div>

            {/* Granularity Selector: Day / Week / Year (DEFAULT: Day) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-black text-slate-600">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Grain:</span>
              <button
                type="button"
                onClick={() => setTrendGranularity('day')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendGranularity === 'day'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setTrendGranularity('week')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendGranularity === 'week'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setTrendGranularity('year')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendGranularity === 'year'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Year
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Legend with Checkboxes to Select/Deselect Lines */}
        <div className="flex flex-wrap items-center justify-between bg-slate-50/80 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 mb-4 gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lines (Click to toggle):</span>
            
            {/* 1. Buy Line Checkbox (Blue: #3b82f6) */}
            <button
              type="button"
              onClick={() => setShowBuyLine(!showBuyLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showBuyLine
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              {showBuyLine ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
              <span className="w-2.5 h-1 bg-blue-500 rounded-full" />
              <span>Buy:</span>
              <span className="text-blue-700">{totalBuy.toLocaleString()} {trendUnitLabel}</span>
            </button>

            {/* 2. Sell Line Checkbox (Orange: #f97316) */}
            <button
              type="button"
              onClick={() => setShowSellLine(!showSellLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showSellLine
                  ? 'bg-orange-50 text-orange-800 border-orange-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              {showSellLine ? <CheckSquare className="w-3.5 h-3.5 text-orange-500" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
              <span className="w-2.5 h-1 bg-orange-500 rounded-full" />
              <span>Sell:</span>
              <span className="text-orange-800">{totalSell.toLocaleString()} {trendUnitLabel}</span>
            </button>

            {/* 3. New Register Line Checkbox (Green: #10b981) */}
            {trendMetric === 'tx' && (
              <button
                type="button"
                onClick={() => setShowNcLine(!showNcLine)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                  showNcLine
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
                }`}
              >
                {showNcLine ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span className="w-2.5 h-1 bg-emerald-500 rounded-full" />
                <span>New Register:</span>
                <span className="text-emerald-700">{totalNc.toLocaleString()} users</span>
              </button>
            )}

            {/* 4. Withdraw Line Checkbox (Purple / Violet: #a855f7) */}
            <button
              type="button"
              onClick={() => setShowWithdrawLine(!showWithdrawLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showWithdrawLine
                  ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              {showWithdrawLine ? <CheckSquare className="w-3.5 h-3.5 text-purple-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
              <span className="w-2.5 h-1 bg-purple-500 rounded-full" />
              <span>Withdraw:</span>
              <span className="text-purple-700">{totalWithdraw.toLocaleString()} {trendUnitLabel}</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            Grain: <strong className="text-slate-800 uppercase">{trendGranularity}</strong> ({activeTrendData.length} Points)
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MULTI-LINE SPLINE VISUAL CANVAS (CLEAN 1200x320 SVG - PIC2 REFERENCE STYLE) */}
        {/* ========================================================================= */}
        <div className="relative w-full bg-slate-50/30 rounded-2xl border border-slate-200/70 p-2 sm:p-3 overflow-hidden shadow-2xs">
          <svg
            viewBox="0 0 1200 320"
            className="w-full h-auto select-none overflow-visible"
            style={{ minHeight: '260px', maxHeight: '380px' }}
            shapeRendering="geometricPrecision"
            textRendering="geometricPrecision"
          >
            <defs>
              {/* Buy Soft Blue Gradient Area */}
              <linearGradient id="refBuyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              {/* Sell Soft Orange Gradient Area */}
              <linearGradient id="refSellGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.20" />
                <stop offset="60%" stopColor="#fdba74" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              {/* New Register Soft Green Gradient Area */}
              <linearGradient id="refNcGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="60%" stopColor="#6ee7b7" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              {/* Withdraw Soft Purple Gradient Area */}
              <linearGradient id="refWithdrawGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.16" />
                <stop offset="60%" stopColor="#d8b4fe" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Scale Marks */}
            {primaryTicks.map((tickVal, gIdx) => {
              const ratio = maxVal > 0 ? tickVal / maxVal : 0;
              const yPos = plotBaseline - ratio * plotHeight;

              return (
                <g key={`gridline-${gIdx}`}>
                  <line
                    x1={marginLeft}
                    y1={yPos}
                    x2={svgWidth - marginRight}
                    y2={yPos}
                    stroke="#f1f5f9"
                    strokeDasharray={gIdx === 0 ? 'none' : '4 4'}
                    strokeWidth={gIdx === 0 ? '1.2' : '1'}
                  />
                  <text
                    x={marginLeft - 8}
                    y={yPos + 4}
                    textAnchor="end"
                    className="text-[11px] font-medium fill-slate-400 select-none font-sans"
                  >
                    {formatAxisTick(tickVal)}
                  </text>
                </g>
              );
            })}

            {/* Layered Translucent Area Fills (Pic2 stacking order) */}
            {showBuyLine && buySplineArea && (
              <path d={buySplineArea} fill="url(#refBuyGradient)" className="pointer-events-none" />
            )}
            {showSellLine && sellSplineArea && (
              <path d={sellSplineArea} fill="url(#refSellGradient)" className="pointer-events-none" />
            )}
            {trendMetric === 'tx' && showNcLine && (
              <path d={getSmoothAreaPath(ncPoints, plotBaseline)} fill="url(#refNcGradient)" className="pointer-events-none" />
            )}
            {showWithdrawLine && withdrawSplineArea && (
              <path d={withdrawSplineArea} fill="url(#refWithdrawGradient)" className="pointer-events-none" />
            )}

            {/* Spline Lines with Natural Curves (Pic2 Reference Colors) */}
            {/* 1. Buy Line (Bright Blue) */}
            {showBuyLine && buySplinePath && (
              <path
                d={buySplinePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )}

            {/* 2. Sell Line (Warm Orange) */}
            {showSellLine && sellSplinePath && (
              <path
                d={sellSplinePath}
                fill="none"
                stroke="#f97316"
                strokeWidth="2.0"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )}

            {/* 3. New Register Line (Emerald Green) */}
            {trendMetric === 'tx' && showNcLine && ncSplinePath && (
              <path
                d={ncSplinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )}

            {/* 4. Withdraw Line (Purple / Violet) */}
            {showWithdrawLine && withdrawSplinePath && (
              <path
                d={withdrawSplinePath}
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )}

            {/* Interactive Vertical Hover Bands & Solid Node Dots (Pic2 exact style) */}
            {activeTrendData.map((pt, i) => {
              const cx = getX(i);
              const isHovered = hoveredTrendIndex === i;
              const prevX = i > 0 ? getX(i - 1) : marginLeft;
              const nextX = i < nPoints - 1 ? getX(i + 1) : svgWidth - marginRight;
              const hitLeft = i === 0 ? marginLeft : (prevX + cx) / 2;
              const hitRight = i === nPoints - 1 ? svgWidth - marginRight : (cx + nextX) / 2;
              const hitWidth = Math.max(1, hitRight - hitLeft);

              const buyPt = buyPoints[i];
              const sellPt = sellPoints[i];
              const withdrawPt = withdrawPoints[i];
              const ncPt = ncPoints[i];

              return (
                <g key={`point-${i}`}>
                  {/* Invisible Hit Area for smooth hover */}
                  <rect
                    x={hitLeft}
                    y={marginTop}
                    width={hitWidth}
                    height={plotHeight + 30}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredTrendIndex(i)}
                    onMouseLeave={() => setHoveredTrendIndex(null)}
                  />

                  {/* Vertical Guide Line on Hover */}
                  {isHovered && (
                    <line
                      x1={cx}
                      y1={marginTop}
                      x2={cx}
                      y2={plotBaseline}
                      stroke="#94a3b8"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      className="pointer-events-none"
                    />
                  )}

                  {/* Pic2 Solid Node Dots: Buy (Blue) */}
                  {showBuyLine && buyPt && (
                    <circle
                      cx={buyPt.x}
                      cy={buyPt.y}
                      r={isHovered ? 4.5 : 2.8}
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 1.5 : 0.8}
                      className="pointer-events-none transition-all duration-100"
                    />
                  )}

                  {/* Pic2 Solid Node Dots: Sell (Orange) */}
                  {showSellLine && sellPt && (
                    <circle
                      cx={sellPt.x}
                      cy={sellPt.y}
                      r={isHovered ? 4.5 : 2.8}
                      fill="#f97316"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 1.5 : 0.8}
                      className="pointer-events-none transition-all duration-100"
                    />
                  )}

                  {/* Pic2 Solid Node Dots: New Register (Emerald Green) */}
                  {trendMetric === 'tx' && showNcLine && ncPt && (
                    <circle
                      cx={ncPt.x}
                      cy={ncPt.y}
                      r={isHovered ? 4.2 : 2.6}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 1.5 : 0.8}
                      className="pointer-events-none transition-all duration-100"
                    />
                  )}

                  {/* Pic2 Solid Node Dots: Withdraw (Purple) */}
                  {showWithdrawLine && withdrawPt && (
                    <circle
                      cx={withdrawPt.x}
                      cy={withdrawPt.y}
                      r={isHovered ? 4.2 : 2.6}
                      fill="#a855f7"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 1.5 : 0.8}
                      className="pointer-events-none transition-all duration-100"
                    />
                  )}

                  {/* X-Axis Tick Label (Pic2: Clean small font, like '10-01') */}
                  <text
                    x={cx}
                    y={plotBaseline + 16}
                    textAnchor="middle"
                    className={`text-[9.5px] select-none transition-all font-sans ${
                      isHovered ? 'font-bold fill-blue-600' : 'font-medium fill-slate-400'
                    }`}
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip Card on Hover */}
          {hoveredTrendIndex !== null && activeTrendData[hoveredTrendIndex] && (
            (() => {
              const pt = activeTrendData[hoveredTrendIndex];
              const bVal = getPointBuy(pt);
              const sVal = getPointSell(pt);
              const wVal = getPointWithdraw(pt);
              const ncVal = getPointNc(pt);
              const cx = getX(hoveredTrendIndex);
              const leftPercent = Math.min(86, Math.max(14, (cx / svgWidth) * 100));

              return (
                <div
                  className="absolute top-3 pointer-events-none transition-all duration-150 z-30"
                  style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[180px]">
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                      <span className="font-extrabold text-blue-400">{pt.label}</span>
                      {pt.subLabel && <span className="text-[10px] text-slate-400 font-medium">{pt.subLabel}</span>}
                    </div>

                    <div className="space-y-1">
                      {showBuyLine && (
                        <div className="flex items-center justify-between text-blue-300">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Buy:
                          </span>
                          <span className="font-mono font-black">{bVal.toLocaleString()} {trendUnitLabel}</span>
                        </div>
                      )}

                      {showSellLine && (
                        <div className="flex items-center justify-between text-orange-300">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            Sell:
                          </span>
                          <span className="font-mono font-black">{sVal.toLocaleString()} {trendUnitLabel}</span>
                        </div>
                      )}

                      {trendMetric === 'tx' && showNcLine && (
                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            New Register:
                          </span>
                          <span className="font-mono font-black">{ncVal.toLocaleString()} users</span>
                        </div>
                      )}

                      {showWithdrawLine && (
                        <div className="flex items-center justify-between text-purple-300">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            Withdraw:
                          </span>
                          <span className="font-mono font-black">{wVal.toLocaleString()} {trendUnitLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION DIVIDER & GLOBAL METRIC SWITCHER FOR LOWER SECTIONS               */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#0c4ca3]" />
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Operational Dynamics, Curves &amp; Channel Distribution
          </h3>
        </div>

        {/* Metric Switcher Pills for Activity and Channel Sections */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto text-[11px] font-extrabold text-slate-600">
          <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">View By:</span>
          <button
            type="button"
            onClick={() => setMetricMode('tx')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'tx'
                ? 'bg-[#0c4ca3] text-white shadow-2xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Transactions (tx)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('weight')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'weight'
                ? 'bg-[#0c4ca3] text-white shadow-2xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Gold Weight (g)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('amount')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'amount'
                ? 'bg-[#0c4ca3] text-white shadow-2xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Revenue (M LAK)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ACTIVITY CURVES: HOURLY ACTIVITY & DAY ACTIVITY CURVE WITH DATA LABELS */}
      {/* ========================================================================= */}
      {(() => {
        const totalDayWeekSum = activeDayOfWeek.reduce((acc, d) => acc + getDayVal(d), 0);
        const totalDayWeekVal = totalDayWeekSum || 1;
        const totalHourlySum = activeHourly.reduce((acc, h) => acc + getHourlyVal(h), 0);
        const totalHourlyVal = totalHourlySum || 1;

        // Dynamically rank top 6 peak hours for the active side & metric
        const sortedHoursByVal = [...activeHourly]
          .filter((h) => getHourlyVal(h) > 0)
          .sort((a, b) => getHourlyVal(b) - getHourlyVal(a));
        const peakHourSet = new Set(sortedHoursByVal.slice(0, 6).map((h) => h.hour));
        const topHour = sortedHoursByVal[0] || null;
        const topHourSharePct = topHour && totalHourlySum > 0
          ? Number(((getHourlyVal(topHour) / totalHourlyVal) * 100).toFixed(1))
          : 0;

        // Dynamically rank top 2 peak days of week for the active side & metric
        const sortedDaysByVal = [...activeDayOfWeek]
          .filter((d) => getDayVal(d) > 0)
          .sort((a, b) => getDayVal(b) - getDayVal(a));
        const peakDaySet = new Set(sortedDaysByVal.slice(0, 2).map((d) => d.day_code));
        const topDay = sortedDaysByVal[0] || null;
        const secondDay = sortedDaysByVal[1] || null;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card A: Hourly Activity Curve */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0c4ca3]" />
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Hourly Activity Curve ({unitLabel})
                    </h3>
                  </div>

                  {/* Trx Type Filter: All / Buy / Sell */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-black">
                    <button
                      type="button"
                      onClick={() => setHourlyTrxType('all')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        hourlyTrxType === 'all'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      All Types
                    </button>
                    <button
                      type="button"
                      onClick={() => setHourlyTrxType('buy')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        hourlyTrxType === 'buy'
                          ? 'bg-[#15803d] text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Buy Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setHourlyTrxType('sell')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        hourlyTrxType === 'sell'
                          ? 'bg-[#e5a812] text-slate-950 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Sell Only
                    </button>
                  </div>
                </div>

                {/* 24-Column Mini Bar Chart with % Contribution Share Data Labels */}
                <div className="h-48 flex items-end gap-1 sm:gap-1.5 pt-8 pb-2 px-1 border-b border-slate-100">
                  {activeHourly.map((h) => {
                    const val = getHourlyVal(h);
                    const heightPct = totalHourlySum > 0 ? Math.max(3, Math.round((val / maxHourlyVal) * 100)) : 2;
                    const isPeak = peakHourSet.has(h.hour);
                    const isTop1 = topHour?.hour === h.hour;
                    const sharePct = totalHourlySum > 0 ? Number(((val / totalHourlyVal) * 100).toFixed(1)) : 0;
                    const isProminent = isPeak || sharePct >= 4.0;

                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip Insight */}
                        <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
                          <div className="font-bold text-amber-300">{h.hour_label} · {sharePct}% of 24h</div>
                          <div>{val.toLocaleString()} {unitLabel} (Buy: {h.buy_tx.toLocaleString()} tx / {h.buy_weight_g}g | Sell: {h.sell_tx.toLocaleString()} tx / {h.sell_weight_g}g)</div>
                        </div>

                        {/* Top Data Label: % Contribution Share */}
                        {isProminent && val > 0 && (
                          <span className={`text-[8.5px] font-black tracking-tighter mb-1 transition-all ${
                            isTop1
                              ? hourlyTrxType === 'buy'
                                ? 'text-[#15803d] scale-105'
                                : hourlyTrxType === 'sell'
                                ? 'text-amber-700 scale-105'
                                : 'text-[#0c4ca3] scale-105'
                              : isPeak
                              ? hourlyTrxType === 'buy'
                                ? 'text-emerald-700'
                                : hourlyTrxType === 'sell'
                                ? 'text-amber-600'
                                : 'text-[#0c4ca3]'
                              : 'text-slate-400'
                          }`}>
                            {sharePct}%
                          </span>
                        )}

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-sm transition-all group-hover:brightness-110 ${
                            hourlyTrxType === 'sell'
                              ? isPeak ? 'bg-[#e5a812]' : 'bg-amber-200/80'
                              : hourlyTrxType === 'buy'
                              ? isPeak ? 'bg-[#15803d]' : 'bg-emerald-200/80'
                              : isPeak ? 'bg-[#0c4ca3]' : 'bg-slate-300'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-1">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span className={`font-black ${
                    hourlyTrxType === 'buy' ? 'text-[#15803d]' : hourlyTrxType === 'sell' ? 'text-amber-700' : 'text-[#0c4ca3]'
                  }`}>
                    {topHour ? `${topHour.hour_label} (Peak: ${topHourSharePct}%)` : '12:00 (No Data)'}
                  </span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>

              <div className="pt-2 mt-3 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium flex justify-between">
                <span>
                  Peak Hour: <strong>{topHour ? `${topHour.hour_label} (${getHourlyVal(topHour).toLocaleString()} ${unitLabel})` : 'None'}</strong>
                </span>
                <span>Active Filter: <strong className="uppercase text-[#0c4ca3]">{hourlyTrxType} Trx</strong></span>
              </div>
            </div>

            {/* Card B: Day Activity Curve (Trx) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#0c4ca3]" />
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Day Activity Curve (Trx) ({unitLabel})
                    </h3>
                  </div>

                  {/* Trx Type Filter: All / Buy / Sell */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-black">
                    <button
                      type="button"
                      onClick={() => setDayTrxType('all')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        dayTrxType === 'all'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      All Types
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayTrxType('buy')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        dayTrxType === 'buy'
                          ? 'bg-[#15803d] text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Buy Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayTrxType('sell')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        dayTrxType === 'sell'
                          ? 'bg-[#e5a812] text-slate-950 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Sell Only
                    </button>
                  </div>
                </div>

                {/* 7-Column Day of Week Bar Chart */}
                <div className="h-48 flex items-end gap-2 sm:gap-3 pt-8 pb-2 px-1 border-b border-slate-100">
                  {activeDayOfWeek.map((d) => {
                    const val = getDayVal(d);
                    const heightPct = totalDayWeekSum > 0 ? Math.max(6, Math.round((val / maxDayVal) * 100)) : 2;
                    const isPeak = peakDaySet.has(d.day_code);
                    const sharePct = totalDayWeekSum > 0 ? Number(((val / totalDayWeekVal) * 100).toFixed(1)) : 0;

                    return (
                      <div key={d.day_code} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
                          <div className="font-bold text-amber-300">{d.day_full} · {sharePct}% of Week</div>
                          <div>{val.toLocaleString()} {unitLabel} (Buy: {d.buy_tx.toLocaleString()} tx / {d.buy_weight_g}g | Sell: {d.sell_tx.toLocaleString()} tx / {d.sell_weight_g}g)</div>
                        </div>

                        {/* Top Data Label */}
                        <span className={`text-[9px] font-black tracking-tight mb-1 transition-all ${
                          isPeak
                            ? dayTrxType === 'buy'
                              ? 'text-[#15803d]'
                              : dayTrxType === 'sell'
                              ? 'text-amber-700'
                              : 'text-[#0c4ca3]'
                            : 'text-slate-500'
                        }`}>
                          {sharePct}%
                        </span>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-md transition-all group-hover:brightness-110 ${
                            dayTrxType === 'sell'
                              ? isPeak ? 'bg-[#e5a812]' : 'bg-amber-200/80'
                              : dayTrxType === 'buy'
                              ? isPeak ? 'bg-[#15803d]' : 'bg-emerald-200/80'
                              : isPeak ? 'bg-[#0c4ca3]' : 'bg-slate-300'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2 px-1">
                  {activeDayOfWeek.map((d) => (
                    <span
                      key={d.day_code}
                      className={peakDaySet.has(d.day_code) ? 'text-[#0c4ca3] font-black' : ''}
                    >
                      {d.day_label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 mt-3 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium flex justify-between">
                <span>
                  Peak Days: <strong>{topDay ? `${topDay.day_label}${secondDay ? ` & ${secondDay.day_label}` : ''}` : 'None'}</strong>
                </span>
                <span>Active Filter: <strong className="uppercase text-[#0c4ca3]">{dayTrxType} Trx</strong></span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3. GOLD WEIGHT TICKET DISTRIBUTION                                        */}
      {/* ========================================================================= */}
      {(() => {
        const dominantBracket = [...enrichedBrackets].sort((a, b) => b.countPct - a.countPct)[0];
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0c4ca3]" />
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Gold Weight Ticket Distribution
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Live SQL breakdown of order counts, physical gold mass, and revenue across 6 ticket brackets
                  </p>
                </div>
              </div>

              {/* Side View Switcher: All / Buy / Sell */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black self-start sm:self-auto gap-0.5">
                <button
                  type="button"
                  onClick={() => setTicketSideFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    ticketSideFilter === 'all'
                      ? 'bg-[#0c4ca3] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Volumes
                </button>
                <button
                  type="button"
                  onClick={() => setTicketSideFilter('buy')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    ticketSideFilter === 'buy'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buy Side
                </button>
                <button
                  type="button"
                  onClick={() => setTicketSideFilter('sell')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    ticketSideFilter === 'sell'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sell Side
                </button>
              </div>
            </div>

            {/* 100% Macro Portion Share Spectrum Bar */}
            <div className="mb-3.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5 flex-wrap gap-1">
                <span>Portfolio Share Breakdown ({ticketSideFilter === 'all' ? '100% of Total Tickets' : ticketSideFilter === 'buy' ? '100% of Buy Tickets' : '100% of Sell Tickets'}):</span>
                <span className="text-[#0c4ca3] font-black">
                  Dominant: {dominantBracket?.weight_bracket || '< 0.5g'} ({dominantBracket?.countPct ?? 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 gap-0.5">
                {enrichedBrackets.map((wb) => {
                  const style = getTicketTierStyle(wb.rank, wb.countPct);
                  return (
                    <div
                      key={wb.weight_bracket}
                      className={`${style.barClass} h-full transition-all`}
                      style={{ width: `${Math.max(1.5, wb.countPct)}%` }}
                      title={`${wb.weight_bracket}: ${wb.countPct}% share (${wb.count.toLocaleString()} tx)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Re-Balanced 6x1 Desktop Grid (Responsive 2x3 on mobile, 6x1 on desktop) */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {enrichedBrackets.map((wb) => {
                const style = getTicketTierStyle(wb.rank, wb.countPct);
                return (
                  <div
                    key={wb.weight_bracket}
                    className={`p-3.5 rounded-2xl border transition-all ${style.cardClass} relative overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-xs min-h-[140px]`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 truncate" title={wb.weight_bracket}>
                          {wb.weight_bracket}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 font-bold ${style.sharePillClass}`}>
                          {metricMode === 'weight' ? `${wb.weightPct}%` : metricMode === 'amount' ? `${wb.amountPct}%` : `${wb.countPct}%`}
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight block">
                          {metricMode === 'weight'
                            ? `${wb.total_weight_g.toLocaleString()}g`
                            : metricMode === 'amount'
                            ? `${Math.round((wb.total_amount_lak || 0) / 1000000).toLocaleString()}M LAK`
                            : `${wb.count.toLocaleString()} tx`}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 block leading-tight mt-0.5">
                          {wb.weightPct}% of gold ({wb.total_weight_g.toLocaleString()}g)
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                      <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className={`${style.barClass} h-full rounded-full transition-all`}
                          style={{ width: `${Math.min(100, Math.max(5, wb.countPct))}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[9.5px] text-slate-500 font-medium">
                        <span>{wb.count.toLocaleString()} tix</span>
                        <span className="font-bold text-slate-600">Rank #{wb.rank}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. BANK & BRANCH SETTLEMENT CHANNELS WITH %TRNX / %WEIGHT / %VALUE        */}
      {/* ========================================================================= */}
      {(() => {
        const processedBanks = activeBanks.map((b) => {
          let tx = b.total_tx || 0;
          let weightG = b.total_weight_g || 0;
          let amountLak = b.total_amount_lak || 0;

          if (bankSideFilter === 'buy') {
            tx = b.buy_tx ?? 0;
            weightG = b.buy_weight_g ?? 0;
            amountLak = b.buy_amount_lak ?? 0;
          } else if (bankSideFilter === 'sell') {
            tx = b.sell_tx ?? 0;
            weightG = b.sell_weight_g ?? 0;
            amountLak = b.sell_amount_lak ?? 0;
          }

          const activeVal =
            bankMetricType === 'tx'
              ? tx
              : bankMetricType === 'weight'
              ? Number(weightG.toFixed(1))
              : Math.round(amountLak / 1000000);
          return {
            ...b,
            activeTx: tx,
            activeWeightG: Number(weightG.toFixed(1)),
            activeAmountLak: amountLak,
            activeVal,
          };
        }).filter((b) => b.activeVal > 0 || b.total_tx > 0);

        const sumActiveVal = processedBanks.reduce((acc, item) => acc + item.activeVal, 0);
        const totalActiveVal = sumActiveVal || 1;
        const enrichedBanks = processedBanks.map((item) => {
          const dynamicSharePct = sumActiveVal > 0 ? Number(((item.activeVal / totalActiveVal) * 100).toFixed(1)) : 0;
          return {
            ...item,
            dynamicSharePct,
          };
        }).sort((a, b) => b.activeVal - a.activeVal);

        const topProcessedBank = enrichedBanks.length > 0 ? enrichedBanks[0] : null;
        const hasHighDynamicConcentration = topProcessedBank && topProcessedBank.dynamicSharePct > 60;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bank Settlement Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 gap-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-[#0c4ca3]" />
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Bank Settlement Distribution
                    </h3>
                  </div>
                  {hasHighDynamicConcentration && (
                    <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 self-start sm:self-auto">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>High Channel Concentration</span>
                    </span>
                  )}
                </div>

                {/* Sub-Header: Metric Toggle (%trnx vs %weight vs %value) & Side Toggle (Buy vs Sell vs All) */}
                <div className="flex flex-wrap items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-100 mb-3 gap-2">
                  <div className="flex items-center gap-1 text-[10px] font-black">
                    <span className="text-slate-400 font-bold px-1 uppercase">Metric:</span>
                    <button
                      type="button"
                      onClick={() => setBankMetricType('tx')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        bankMetricType === 'tx'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      % Trnx
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankMetricType('weight')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        bankMetricType === 'weight'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      % Weight
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankMetricType('value')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        bankMetricType === 'value'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      % Value
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-black">
                    <span className="text-slate-400 font-bold px-1 uppercase">Side:</span>
                    <button
                      type="button"
                      onClick={() => setBankSideFilter('all')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        bankSideFilter === 'all'
                          ? 'bg-slate-800 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankSideFilter('buy')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        bankSideFilter === 'buy'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Buy Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankSideFilter('sell')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        bankSideFilter === 'sell'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sell Side
                    </button>
                  </div>
                </div>

                {/* Bank List with Dynamic Share Bars */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {enrichedBanks.length === 0 ? (
                    <div className="text-xs text-slate-400 font-semibold py-8 text-center">
                      No bank settlement transactions match active filter
                    </div>
                  ) : (
                    enrichedBanks.slice(0, 10).map((b) => {
                      const barWidth = Math.max(2, b.dynamicSharePct);
                      const isDominant = b.bank_name === topProcessedBank?.bank_name;

                      return (
                        <div key={b.bank_name}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-800 flex items-center gap-1.5 truncate">
                              <span className={`w-2 h-2 rounded-full ${
                                bankSideFilter === 'sell' ? 'bg-rose-600' : 'bg-[#0c4ca3]'
                              }`} />
                              {b.bank_name}
                            </span>
                            <span className="text-slate-600 font-semibold shrink-0">
                              {bankMetricType === 'tx'
                                ? `${b.activeTx.toLocaleString()} tx`
                                : bankMetricType === 'weight'
                                ? `${b.activeWeightG.toLocaleString()} g`
                                : `${b.activeVal.toLocaleString()} M LAK`}
                              <strong className="text-slate-900 ml-1.5 font-black">
                                ({b.dynamicSharePct}%)
                              </strong>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                bankSideFilter === 'sell'
                                  ? isDominant ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-rose-400'
                                  : isDominant ? 'bg-gradient-to-r from-[#0c4ca3] to-blue-500' : 'bg-blue-400'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium flex justify-between mt-3">
                <span>
                  Primary {bankSideFilter === 'buy' ? 'Buy' : bankSideFilter === 'sell' ? 'Sell' : ''} gateway:{' '}
                  <strong className="text-slate-800">{topProcessedBank?.bank_name || 'N/A'}</strong>
                </span>
                <span>
                  Dependency: <strong className="text-[#0c4ca3] font-black">{topProcessedBank?.dynamicSharePct ?? 0}%</strong>
                </span>
              </div>
            </div>

            {/* Branch & Physical Withdraw Network */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#6b21a8]" />
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Top Branches &amp; Physical Network ({unitLabel})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Khamphouvong Network</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeBranches.length === 0 ? (
                    <div className="text-xs text-slate-400 font-semibold py-8 text-center">
                      No branch transactions match active filter
                    </div>
                  ) : (
                    activeBranches.slice(0, 12).map((br) => {
                      const val = getBranchVal(br);
                      const barWidth = Math.max(4, Math.round((val / maxBranchVal) * 100));
                      return (
                        <div key={br.branch_name} className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex justify-between text-xs font-bold mb-1 gap-2">
                            <span className="text-slate-800 truncate max-w-[230px]" title={br.branch_name}>{br.branch_name}</span>
                            <span className="text-[#6b21a8] font-black shrink-0">
                              {val.toLocaleString()} {unitLabel}
                              {br.withdraw_tx > 0 ? ` (${br.withdraw_tx.toLocaleString()} wd)` : ''}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#6b21a8] h-full rounded-full transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-400 font-medium flex justify-between mt-3">
                <span>Physical &amp; Digital Delivery Network</span>
                <span>Total Network: <strong>{activeBranches.length} locations</strong></span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
