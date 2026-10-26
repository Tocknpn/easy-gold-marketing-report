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
import { DEFAULT_DYNAMIC_REPORT_PAYLOAD } from '@/lib/constants/dynamicReportData';

interface DynamicChartsSectionProps {
  hourly: HourlyMetric[];
  banks: BankMetric[];
  branches: BranchMetric[];
  weightBrackets: WeightBracketMetric[];
  measures?: DaxMeasuresPayload;
  dayOfWeek?: DayOfWeekMetric[];
  timelineTrend?: TrendPoint[];
}

const BASELINE_DAY_OF_WEEK: DayOfWeekMetric[] = [
  { day_code: 'mon', day_label: 'Mon', day_full: 'Monday', total_tx: 9250, buy_tx: 6650, sell_tx: 2600, buy_weight_g: 708.2, sell_weight_g: 269.4, total_amount_lak: 16350000000 },
  { day_code: 'tue', day_label: 'Tue', day_full: 'Tuesday', total_tx: 8910, buy_tx: 6410, sell_tx: 2500, buy_weight_g: 682.5, sell_weight_g: 259.0, total_amount_lak: 15750000000 },
  { day_code: 'wed', day_label: 'Wed', day_full: 'Wednesday', total_tx: 9420, buy_tx: 6780, sell_tx: 2640, buy_weight_g: 721.0, sell_weight_g: 274.2, total_amount_lak: 16650000000 },
  { day_code: 'thu', day_label: 'Thu', day_full: 'Thursday', total_tx: 9860, buy_tx: 7100, sell_tx: 2760, buy_weight_g: 755.4, sell_weight_g: 286.5, total_amount_lak: 17420000000 },
  { day_code: 'fri', day_label: 'Fri', day_full: 'Friday (Payday)', total_tx: 12850, buy_tx: 9250, sell_tx: 3600, buy_weight_g: 984.6, sell_weight_g: 373.8, total_amount_lak: 22710000000 },
  { day_code: 'sat', day_label: 'Sat', day_full: 'Saturday', total_tx: 10950, buy_tx: 7880, sell_tx: 3070, buy_weight_g: 838.2, sell_weight_g: 318.5, total_amount_lak: 19350000000 },
  { day_code: 'sun', day_label: 'Sun', day_full: 'Sunday', total_tx: 5412, buy_tx: 3878, sell_tx: 1534, buy_weight_g: 414.0, sell_weight_g: 158.2, total_amount_lak: 9560000000 },
];

const BASELINE_DAY_TREND: TrendPoint[] = [
  { label: 'Oct 01', subLabel: 'Wed', buy_val: 10250, sell_val: 3740, total_val: 13990, buy_tx: 4280, sell_tx: 1640, total_tx: 5920, buy_weight_g: 455, sell_weight_g: 172, net_weight_g: 283, nc: 580, withdraw_tx: 142, withdraw_weight_g: 28 },
  { label: 'Oct 02', subLabel: 'Thu', buy_val: 10680, sell_val: 3890, total_val: 14570, buy_tx: 4410, sell_tx: 1700, total_tx: 6110, buy_weight_g: 472, sell_weight_g: 179, net_weight_g: 293, nc: 610, withdraw_tx: 155, withdraw_weight_g: 31 },
  { label: 'Oct 03', subLabel: 'Fri', buy_val: 10120, sell_val: 3780, total_val: 13900, buy_tx: 4190, sell_tx: 1650, total_tx: 5840, buy_weight_g: 448, sell_weight_g: 174, net_weight_g: 274, nc: 570, withdraw_tx: 138, withdraw_weight_g: 26 },
  { label: 'Oct 04', subLabel: 'Sat', buy_val: 8540, sell_val: 3210, total_val: 11750, buy_tx: 3520, sell_tx: 1400, total_tx: 4920, buy_weight_g: 378, sell_weight_g: 148, net_weight_g: 230, nc: 460, withdraw_tx: 112, withdraw_weight_g: 22 },
  { label: 'Oct 05', subLabel: 'Sun', buy_val: 11050, sell_val: 4020, total_val: 15070, buy_tx: 4580, sell_tx: 1760, total_tx: 6340, buy_weight_g: 489, sell_weight_g: 185, net_weight_g: 304, nc: 640, withdraw_tx: 160, withdraw_weight_g: 32 },
  { label: 'Oct 06', subLabel: 'Mon', buy_val: 10540, sell_val: 3850, total_val: 14390, buy_tx: 4370, sell_tx: 1680, total_tx: 6050, buy_weight_g: 466, sell_weight_g: 177, net_weight_g: 289, nc: 590, withdraw_tx: 148, withdraw_weight_g: 29 },
  { label: 'Oct 07', subLabel: 'Tue', buy_val: 10760, sell_val: 3940, total_val: 14700, buy_tx: 4460, sell_tx: 1720, total_tx: 6180, buy_weight_g: 476, sell_weight_g: 181, net_weight_g: 295, nc: 620, withdraw_tx: 152, withdraw_weight_g: 30 },
  { label: 'Oct 08', subLabel: 'Wed', buy_val: 10080, sell_val: 3710, total_val: 13790, buy_tx: 4170, sell_tx: 1620, total_tx: 5790, buy_weight_g: 445, sell_weight_g: 170, net_weight_g: 275, nc: 560, withdraw_tx: 136, withdraw_weight_g: 27 },
  { label: 'Oct 09', subLabel: 'Thu', buy_val: 11260, sell_val: 4100, total_val: 15360, buy_tx: 4660, sell_tx: 1790, total_tx: 6450, buy_weight_g: 498, sell_weight_g: 189, net_weight_g: 309, nc: 670, withdraw_tx: 168, withdraw_weight_g: 34 },
  { label: 'Oct 10', subLabel: 'Fri', buy_val: 12020, sell_val: 4370, total_val: 16390, buy_tx: 4980, sell_tx: 1910, total_tx: 6890, buy_weight_g: 531, sell_weight_g: 201, net_weight_g: 330, nc: 730, withdraw_tx: 184, withdraw_weight_g: 38 },
  { label: 'Oct 11', subLabel: 'Sat', buy_val: 10480, sell_val: 3960, total_val: 14440, buy_tx: 4328, sell_tx: 1734, total_tx: 6062, buy_weight_g: 464, sell_weight_g: 182, net_weight_g: 282, nc: 600, withdraw_tx: 144, withdraw_weight_g: 29 },
  { label: 'Oct 12', subLabel: 'Sun', buy_val: 8760, sell_val: 3340, total_val: 12100, buy_tx: 3612, sell_tx: 1462, total_tx: 5074, buy_weight_g: 388, sell_weight_g: 154, net_weight_g: 234, nc: 490, withdraw_tx: 120, withdraw_weight_g: 24 },
];

const BASELINE_WEEK_TREND: TrendPoint[] = [
  { label: 'W37', subLabel: 'Sep 08-14', buy_val: 68400, sell_val: 24100, total_val: 92500, buy_tx: 27812, sell_tx: 10387, total_tx: 38199, buy_weight_g: 43755, sell_weight_g: 21180, net_weight_g: 22575, nc: 3420, withdraw_tx: 890, withdraw_weight_g: 185 },
  { label: 'W38', subLabel: 'Sep 15-21', buy_val: 65500, sell_val: 26800, total_val: 92300, buy_tx: 25586, sell_tx: 11932, total_tx: 37765, buy_weight_g: 43755, sell_weight_g: 25905, net_weight_g: 17850, nc: 3310, withdraw_tx: 920, withdraw_weight_g: 195 },
  { label: 'W39', subLabel: 'Sep 22-28', buy_val: 62800, sell_val: 25200, total_val: 88000, buy_tx: 24932, sell_tx: 11148, total_tx: 37134, buy_weight_g: 39150, sell_weight_g: 17985, net_weight_g: 21165, nc: 3180, withdraw_tx: 860, withdraw_weight_g: 178 },
  { label: 'W40', subLabel: 'Sep 29-Oct 05', buy_val: 105400, sell_val: 39600, total_val: 145000, buy_tx: 42150, sell_tx: 17890, total_tx: 60431, buy_weight_g: 68400, sell_weight_g: 29800, net_weight_g: 38600, nc: 6150, withdraw_tx: 1420, withdraw_weight_g: 310 },
  { label: 'W41', subLabel: 'Oct 06-12', buy_val: 71200, sell_val: 25100, total_val: 96300, buy_tx: 28420, sell_tx: 11104, total_tx: 39744, buy_weight_g: 45900, sell_weight_g: 18700, net_weight_g: 27200, nc: 3890, withdraw_tx: 980, withdraw_weight_g: 215 },
  { label: 'W42', subLabel: 'Oct 13-18 (P)', buy_val: 12500, sell_val: 4350, total_val: 16850, buy_tx: 3612, sell_tx: 1462, total_tx: 5074, buy_weight_g: 2700, sell_weight_g: 3690, net_weight_g: -990, nc: 520, withdraw_tx: 135, withdraw_weight_g: 32 },
];

const BASELINE_YEAR_TREND: TrendPoint[] = [
  { label: '2024', subLabel: 'Full Year', buy_val: 1850000, sell_val: 620000, total_val: 2470000, buy_tx: 54200, sell_tx: 20800, total_tx: 75000, buy_weight_g: 88500, sell_weight_g: 34200, net_weight_g: 54300, nc: 8500, withdraw_tx: 2400, withdraw_weight_g: 4800 },
  { label: '2025', subLabel: 'Full Year', buy_val: 3120000, sell_val: 1040000, total_val: 4160000, buy_tx: 104500, sell_tx: 39800, total_tx: 144300, buy_weight_g: 172000, sell_weight_g: 68500, net_weight_g: 103500, nc: 14200, withdraw_tx: 4900, withdraw_weight_g: 9600 },
  { label: '2026', subLabel: 'YTD Pace', buy_val: 3950000, sell_val: 1280000, total_val: 5230000, buy_tx: 135126, sell_tx: 48569, total_tx: 183695, buy_weight_g: 242500, sell_weight_g: 105200, net_weight_g: 137300, nc: 18150, withdraw_tx: 6200, withdraw_weight_g: 12800 },
];

function getSmoothSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function getSmoothAreaPath(points: { x: number; y: number }[], baseline: number): string {
  if (points.length <= 1) return '';
  const linePath = getSmoothSplinePath(points);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  return `${linePath} L ${lastX.toFixed(1)} ${baseline.toFixed(1)} L ${firstX.toFixed(1)} ${baseline.toFixed(1)} Z`;
}

interface NiceScale {
  max: number;
  ticks: number[];
  step: number;
}

function getNiceScale(rawMax: number, targetTicks = 5): NiceScale {
  if (rawMax <= 0) {
    return { max: 100, ticks: [0, 25, 50, 75, 100], step: 25 };
  }
  const safeMax = Math.max(rawMax * 1.08, 10);
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
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
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
}: DynamicChartsSectionProps) {
  // Robust Fallback: prevent blank charts if Supabase RPC returns empty arrays
  const activeHourly = useMemo(() => {
    if (hourly && hourly.length > 0) return hourly;
    return DEFAULT_DYNAMIC_REPORT_PAYLOAD.hourly;
  }, [hourly]);

  const activeBanks = useMemo(() => {
    if (banks && banks.length > 0) return banks;
    return DEFAULT_DYNAMIC_REPORT_PAYLOAD.banks;
  }, [banks]);

  const activeBranches = useMemo(() => {
    if (branches && branches.length > 0) return branches;
    return DEFAULT_DYNAMIC_REPORT_PAYLOAD.branches;
  }, [branches]);

  const activeWeightBrackets = useMemo(() => {
    if (weightBrackets && weightBrackets.length > 0) return weightBrackets;
    return DEFAULT_DYNAMIC_REPORT_PAYLOAD.weight_brackets;
  }, [weightBrackets]);

  const activeDayOfWeek: DayOfWeekMetric[] = useMemo(() => {
    if (dayOfWeek && dayOfWeek.length > 0) return dayOfWeek;
    return BASELINE_DAY_OF_WEEK;
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
  const [bankMetricType, setBankMetricType] = useState<'tx' | 'value'>('tx');
  const [bankSideFilter, setBankSideFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Hourly Activity Trx Type Filter: 'all' | 'buy' | 'sell'
  const [hourlyTrxType, setHourlyTrxType] = useState<'all' | 'buy' | 'sell'>('all');

  // Day Activity Trx Type Filter: 'all' | 'buy' | 'sell'
  const [dayTrxType, setDayTrxType] = useState<'all' | 'buy' | 'sell'>('all');

  // Ticket Distribution Side Filter: 'all' | 'buy' | 'sell'
  const [ticketSideFilter, setTicketSideFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Value getters based on metric mode
  const getHourlyVal = (h: HourlyMetric) => {
    if (hourlyTrxType === 'buy') {
      if (metricMode === 'weight') return Math.round(h.buy_weight_g);
      if (metricMode === 'amount') return Math.round((h.total_amount_lak * 0.72) / 1000000);
      return h.buy_tx;
    }
    if (hourlyTrxType === 'sell') {
      if (metricMode === 'weight') return Math.round(h.sell_weight_g);
      if (metricMode === 'amount') return Math.round((h.total_amount_lak * 0.28) / 1000000);
      return h.sell_tx;
    }
    if (metricMode === 'weight') return Math.round(h.buy_weight_g + h.sell_weight_g);
    if (metricMode === 'amount') return Math.round(h.total_amount_lak / 1000000);
    return h.total_tx;
  };

  const getDayVal = (d: DayOfWeekMetric) => {
    if (dayTrxType === 'buy') {
      if (metricMode === 'weight') return Math.round(d.buy_weight_g);
      if (metricMode === 'amount') return Math.round((d.total_amount_lak * 0.72) / 1000000);
      return d.buy_tx;
    }
    if (dayTrxType === 'sell') {
      if (metricMode === 'weight') return Math.round(d.sell_weight_g);
      if (metricMode === 'amount') return Math.round((d.total_amount_lak * 0.28) / 1000000);
      return d.sell_tx;
    }
    if (metricMode === 'weight') return Math.round(d.buy_weight_g + d.sell_weight_g);
    if (metricMode === 'amount') return Math.round(d.total_amount_lak / 1000000);
    return d.total_tx;
  };

  const getBankVal = (b: BankMetric) => {
    if (metricMode === 'weight') return Math.round(b.total_weight_g);
    if (metricMode === 'amount') return Math.round(b.total_amount_lak / 1000000);
    return b.total_tx;
  };

  const getBranchVal = (br: BranchMetric) => {
    if (metricMode === 'weight') return Math.round(br.total_weight_g);
    if (metricMode === 'amount') return Math.round(br.total_amount_lak / 1000000);
    return br.total_tx;
  };

  const unitLabel = metricMode === 'weight' ? 'g' : metricMode === 'amount' ? 'M LAK' : 'tx';

  const maxHourlyVal = Math.max(...activeHourly.map(getHourlyVal), 1);
  const maxDayVal = Math.max(...activeDayOfWeek.map(getDayVal), 1);
  const maxBankVal = Math.max(...activeBanks.map(getBankVal), 1);
  const maxBranchVal = Math.max(...activeBranches.map(getBranchVal), 1);

  // Gold Weight Tickets Share Analysis with Buy vs Sell Dynamic Distribution
  const buyRatio = measures?.total_buy_transac ? measures.total_buy_transac / (measures.total_buy_transac + measures.total_sell_transac || 1) : 0.748;
  const sellRatio = 1 - buyRatio;
  const buyWeightRatio = measures?.gold_weight_buy_g ? measures.gold_weight_buy_g / (measures.gold_weight_buy_g + measures.gold_weight_sell_g || 1) : 0.75;
  const sellWeightRatio = 1 - buyWeightRatio;

  const enrichedBrackets = useMemo(() => {
    // 1. Project counts and weight based on active side filter
    const baseList = activeWeightBrackets.map((wb, index) => {
      let sideCount = wb.count;
      let sideWeight = wb.total_weight_g;

      if (ticketSideFilter === 'buy') {
        sideCount = Math.round(wb.count * buyRatio);
        sideWeight = Number((wb.total_weight_g * buyWeightRatio).toFixed(1));
      } else if (ticketSideFilter === 'sell') {
        sideCount = Math.round(wb.count * sellRatio);
        sideWeight = Number((wb.total_weight_g * sellWeightRatio).toFixed(1));
      }

      return {
        ...wb,
        count: sideCount,
        total_weight_g: sideWeight,
        originalIndex: index,
      };
    });

    const sumCount = baseList.reduce((acc, wb) => acc + wb.count, 0) || 1;
    const sumWeight = baseList.reduce((acc, wb) => acc + wb.total_weight_g, 0) || 1;

    const list = baseList.map((wb) => {
      const countPct = Number(((wb.count / sumCount) * 100).toFixed(1));
      const weightPct = Number(((wb.total_weight_g / sumWeight) * 100).toFixed(1));
      return {
        ...wb,
        countPct,
        weightPct,
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
  }, [activeWeightBrackets, ticketSideFilter, buyRatio, sellRatio, buyWeightRatio, sellWeightRatio]);

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

  // Active trend series data (dynamically computed from live DB timeline or fallback baseline)
  const activeTrendData: TrendPoint[] = useMemo(() => {
    if (timelineTrend && timelineTrend.length > 0) {
      if (trendGranularity === 'day') return timelineTrend;
      if (trendGranularity === 'week') {
        const weeks: TrendPoint[] = [];
        for (let i = 0; i < timelineTrend.length; i += 7) {
          const chunk = timelineTrend.slice(i, i + 7);
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
            withdraw_tx: chunk.reduce((acc, p) => acc + (p.withdraw_tx ?? Math.round(p.sell_tx * 0.08)), 0),
            withdraw_weight_g: Math.round(chunk.reduce((acc, p) => acc + (p.withdraw_weight_g ?? Math.round(p.sell_weight_g * 0.12)), 0) * 10) / 10,
          });
        }
        return weeks;
      }
      // Year grain: aggregate period or compare with prior
      return BASELINE_YEAR_TREND;
    }
    if (trendGranularity === 'day') return BASELINE_DAY_TREND;
    if (trendGranularity === 'week') return BASELINE_WEEK_TREND;
    return BASELINE_YEAR_TREND;
  }, [timelineTrend, trendGranularity]);

  const trendUnitLabel = trendMetric === 'tx' ? 'tx' : 'g';

  // Value getters for the active metric mode
  const getPointBuy = (p: TrendPoint) => trendMetric === 'tx' ? p.buy_tx : p.buy_weight_g;
  const getPointSell = (p: TrendPoint) => trendMetric === 'tx' ? p.sell_tx : p.sell_weight_g;
  const getPointWithdraw = (p: TrendPoint) => {
    if (trendMetric === 'tx') return p.withdraw_tx ?? Math.round(p.sell_tx * 0.08);
    return p.withdraw_weight_g ?? Math.round(p.sell_weight_g * 0.12);
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

  // SVG Canvas Dimension (Full Border Width without Dead Gaps)
  const svgWidth = 1000;
  const svgHeight = 350;
  const marginLeft = 38;
  const marginRight = 8;
  const marginTop = 32;
  const marginBottom = 40;
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
        <div className="flex flex-wrap items-center justify-between bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 mb-4 gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lines (Click to toggle):</span>
            
            {/* 1. Buy Line Checkbox */}
            <button
              type="button"
              onClick={() => setShowBuyLine(!showBuyLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showBuyLine
                  ? 'bg-blue-50 text-[#0c4ca3] border-blue-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              {showBuyLine ? <CheckSquare className="w-3.5 h-3.5 text-[#0c4ca3]" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
              <span className="w-2.5 h-1 bg-[#0c4ca3] rounded-full" />
              <span>Buy:</span>
              <span className="text-[#0c4ca3]">{totalBuy.toLocaleString()} {trendUnitLabel}</span>
            </button>

            {/* 2. Sell Line Checkbox */}
            <button
              type="button"
              onClick={() => setShowSellLine(!showSellLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showSellLine
                  ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              {showSellLine ? <CheckSquare className="w-3.5 h-3.5 text-rose-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
              <span className="w-2.5 h-1 bg-rose-600 rounded-full" />
              <span>Sell:</span>
              <span className="text-rose-700">{totalSell.toLocaleString()} {trendUnitLabel}</span>
            </button>

            {/* 3. New Register Line Checkbox (Only in Transaction Trend mode) */}
            {trendMetric === 'tx' && (
              <button
                type="button"
                onClick={() => setShowNcLine(!showNcLine)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                  showNcLine
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                    : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
                }`}
              >
                {showNcLine ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span className="w-2.5 h-1 bg-emerald-600 rounded-full" />
                <span>New Register:</span>
                <span className="text-emerald-700">{totalNc.toLocaleString()} users</span>
              </button>
            )}

            {/* 4. Withdraw Line Checkbox */}
            <button
              type="button"
              onClick={() => setShowWithdrawLine(!showWithdrawLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showWithdrawLine
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              {showWithdrawLine ? <CheckSquare className="w-3.5 h-3.5 text-amber-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
              <span className="w-2.5 h-1 bg-amber-600 rounded-full" />
              <span>Withdraw:</span>
              <span className="text-amber-700">{totalWithdraw.toLocaleString()} {trendUnitLabel}</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            Grain: <strong className="text-slate-800 uppercase">{trendGranularity}</strong> ({activeTrendData.length} Points)
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MULTI-LINE SPLINE VISUAL CANVAS (PRECISION SVG 1000x350 - FULL BORDER)    */}
        {/* ========================================================================= */}
        <div className="relative w-full bg-gradient-to-b from-slate-50/60 to-white rounded-2xl border border-slate-200/80 p-1 sm:p-2 overflow-hidden shadow-xs">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-[320px] sm:h-[350px] lg:h-[375px] select-none"
            preserveAspectRatio="none"
            shapeRendering="geometricPrecision"
            textRendering="geometricPrecision"
          >
            <defs>
              {/* Buy Glow Gradient */}
              <linearGradient id="buyWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0c4ca3" stopOpacity="0.22" />
                <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              {/* Sell Glow Gradient */}
              <linearGradient id="sellWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d48" stopOpacity="0.20" />
                <stop offset="70%" stopColor="#fda4af" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              {/* Withdraw Glow Gradient */}
              <linearGradient id="withdrawWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                <stop offset="70%" stopColor="#fde68a" stopOpacity="0.04" />
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
                    stroke={gIdx === 0 ? '#cbd5e1' : '#f1f5f9'}
                    strokeDasharray={gIdx === 0 ? 'none' : '4 4'}
                    strokeWidth={gIdx === 0 ? '1.5' : '1'}
                  />
                  <text
                    x={marginLeft - 6}
                    y={yPos + 3.5}
                    textAnchor="end"
                    className="text-[10px] font-bold fill-slate-500 font-mono tracking-tight"
                  >
                    {formatAxisTick(tickVal)}
                  </text>
                </g>
              );
            })}

            {/* Translucent Area Fills Under Spline Curves */}
            {showBuyLine && buySplineArea && (
              <path d={buySplineArea} fill="url(#buyWaveGradient)" className="pointer-events-none" />
            )}
            {showSellLine && sellSplineArea && (
              <path d={sellSplineArea} fill="url(#sellWaveGradient)" className="pointer-events-none" />
            )}
            {showWithdrawLine && withdrawSplineArea && (
              <path d={withdrawSplineArea} fill="url(#withdrawWaveGradient)" className="pointer-events-none" />
            )}

            {/* Spline Lines */}
            {/* 1. Buy Line (Blue) */}
            {showBuyLine && buySplinePath && (
              <path
                d={buySplinePath}
                fill="none"
                stroke="#0c4ca3"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none filter drop-shadow-sm"
              />
            )}

            {/* 2. Sell Line (Rose) */}
            {showSellLine && sellSplinePath && (
              <path
                d={sellSplinePath}
                fill="none"
                stroke="#e11d48"
                strokeWidth="3.0"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none filter drop-shadow-sm"
              />
            )}

            {/* 3. New Register Line (Emerald - Only in Tx mode) */}
            {trendMetric === 'tx' && showNcLine && ncSplinePath && (
              <path
                d={ncSplinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeDasharray="4 2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none filter drop-shadow-sm"
              />
            )}

            {/* 4. Withdraw Line (Amber) */}
            {showWithdrawLine && withdrawSplinePath && (
              <path
                d={withdrawSplinePath}
                fill="none"
                stroke="#d97706"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none filter drop-shadow-sm"
              />
            )}

            {/* Interactive Vertical Hover Bands & Circular Nodes */}
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
                    height={plotHeight}
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
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      className="pointer-events-none"
                    />
                  )}

                  {/* Nodes on Splines */}
                  {showBuyLine && buyPt && (
                    <circle
                      cx={buyPt.x}
                      cy={buyPt.y}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#0c4ca3"
                      strokeWidth={isHovered ? 3 : 2.2}
                      className="pointer-events-none transition-all"
                    />
                  )}

                  {showSellLine && sellPt && (
                    <circle
                      cx={sellPt.x}
                      cy={sellPt.y}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#e11d48"
                      strokeWidth={isHovered ? 3 : 2.2}
                      className="pointer-events-none transition-all"
                    />
                  )}

                  {trendMetric === 'tx' && showNcLine && ncPt && (
                    <circle
                      cx={ncPt.x}
                      cy={ncPt.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill="#ffffff"
                      stroke="#10b981"
                      strokeWidth={isHovered ? 2.8 : 2}
                      className="pointer-events-none transition-all"
                    />
                  )}

                  {showWithdrawLine && withdrawPt && (
                    <circle
                      cx={withdrawPt.x}
                      cy={withdrawPt.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill="#ffffff"
                      stroke="#d97706"
                      strokeWidth={isHovered ? 2.8 : 2}
                      className="pointer-events-none transition-all"
                    />
                  )}

                  {/* X-Axis Tick Label */}
                  <text
                    x={cx}
                    y={plotBaseline + 18}
                    textAnchor="middle"
                    className={`text-[10px] select-none transition-all ${
                      isHovered ? 'font-black fill-[#0c4ca3]' : 'font-bold fill-slate-600'
                    }`}
                  >
                    {pt.label}
                  </text>
                  {pt.subLabel && (
                    <text
                      x={cx}
                      y={plotBaseline + 31}
                      textAnchor="middle"
                      className="text-[9px] font-medium fill-slate-400 select-none"
                    >
                      {pt.subLabel}
                    </text>
                  )}
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
              const leftPercent = Math.min(84, Math.max(16, (cx / svgWidth) * 100));

              return (
                <div
                  className="absolute top-4 pointer-events-none transition-all duration-150 z-30"
                  style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 text-xs min-w-[190px]">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                      <span className="font-extrabold text-amber-300">{pt.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{pt.subLabel}</span>
                    </div>

                    <div className="space-y-1">
                      {showBuyLine && (
                        <div className="flex items-center justify-between text-[#60a5fa]">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-[#0c4ca3]" />
                            Buy:
                          </span>
                          <span className="font-mono font-black">{bVal.toLocaleString()} {trendUnitLabel}</span>
                        </div>
                      )}

                      {showSellLine && (
                        <div className="flex items-center justify-between text-rose-400">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
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
                        <div className="flex items-center justify-between text-amber-400">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
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
        const totalDayWeekVal = activeDayOfWeek.reduce((acc, d) => acc + getDayVal(d), 0) || 1;
        const totalHourlyVal = activeHourly.reduce((acc, h) => acc + getHourlyVal(h), 0) || 1;

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
                      className={`px-2 py-0.5 rounded-md transition-all ${
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
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        hourlyTrxType === 'buy'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Buy Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setHourlyTrxType('sell')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        hourlyTrxType === 'sell'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
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
                    const heightPct = Math.max(4, Math.round((val / maxHourlyVal) * 100));
                    const isPeak = h.hour >= 9 && h.hour <= 16;
                    const sharePct = Number(((val / totalHourlyVal) * 100).toFixed(1));
                    const isProminent = sharePct >= 4.0 || (h.hour >= 10 && h.hour <= 15);

                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip Insight */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
                          <div className="font-bold text-amber-300">{h.hour_label} · {sharePct}% of 24h</div>
                          <div>{val.toLocaleString()} {unitLabel} (Buy: {h.buy_weight_g}g | Sell: {h.sell_weight_g}g)</div>
                        </div>

                        {/* Top Data Label: % Contribution Share */}
                        {isProminent && (
                          <span className={`text-[8.5px] font-black tracking-tighter mb-1 transition-all ${
                            isPeak ? 'text-[#0c4ca3]' : 'text-slate-400'
                          }`}>
                            {sharePct}%
                          </span>
                        )}

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-sm transition-all group-hover:brightness-110 ${
                            hourlyTrxType === 'sell'
                              ? isPeak ? 'bg-rose-600' : 'bg-rose-200'
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
                  <span className="text-[#0c4ca3] font-black">12:00 (Peak Window)</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>

              <div className="pt-2 mt-3 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium flex justify-between">
                <span>Cycle: <strong>24-Hour Dayparts</strong></span>
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
                      className={`px-2 py-0.5 rounded-md transition-all ${
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
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        dayTrxType === 'buy'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Buy Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayTrxType('sell')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        dayTrxType === 'sell'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
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
                    const heightPct = Math.max(8, Math.round((val / maxDayVal) * 100));
                    const isPeak = d.day_code === 'fri' || d.day_code === 'sat';
                    const sharePct = Number(((val / totalDayWeekVal) * 100).toFixed(1));

                    return (
                      <div key={d.day_code} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
                          <div className="font-bold text-amber-300">{d.day_full} · {sharePct}% of Week</div>
                          <div>{val.toLocaleString()} {unitLabel} (Buy: {d.buy_weight_g}g | Sell: {d.sell_weight_g}g)</div>
                        </div>

                        {/* Top Data Label */}
                        <span className={`text-[9px] font-black tracking-tight mb-1 transition-all ${
                          isPeak ? 'text-[#0c4ca3]' : 'text-slate-500'
                        }`}>
                          {sharePct}%
                        </span>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-md transition-all group-hover:brightness-110 ${
                            dayTrxType === 'sell'
                              ? isPeak ? 'bg-rose-600' : 'bg-rose-300'
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
                      className={d.day_code === 'fri' ? 'text-[#0c4ca3] font-black' : ''}
                    >
                      {d.day_label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 mt-3 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium flex justify-between">
                <span>Pattern: <strong>Friday &amp; Weekend Payday Spikes</strong></span>
                <span>Active Filter: <strong className="uppercase text-[#0c4ca3]">{dayTrxType} Trx</strong></span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3. GOLD WEIGHT TICKET DISTRIBUTION                                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0c4ca3]" />
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Gold Weight Ticket Distribution
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Sleek portion breakdown with synchronized order counts and total gold mass distribution
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
            <span className="text-[#0c4ca3] font-black">Dominant: {enrichedBrackets[0]?.weight_bracket} ({enrichedBrackets[0]?.countPct || 73.4}%)</span>
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
                      {wb.countPct}%
                    </span>
                  </div>

                  <div className="mt-1">
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight block">
                      {metricMode === 'weight'
                        ? `${wb.total_weight_g.toLocaleString()}g`
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

      {/* ========================================================================= */}
      {/* 4. BANK & BRANCH SETTLEMENT CHANNELS WITH %TRNX / %VALUE & BUY/SELL SIDES */}
      {/* ========================================================================= */}
      {(() => {
        const processedBanks = activeBanks.map((b) => {
          let tx = b.total_tx;
          let amountLak = b.total_amount_lak;

          if (bankSideFilter === 'buy') {
            tx = b.buy_tx ?? Math.round(b.total_tx * 0.75);
            amountLak = b.buy_amount_lak ?? Math.round(b.total_amount_lak * 0.76);
          } else if (bankSideFilter === 'sell') {
            tx = b.sell_tx ?? Math.round(b.total_tx * 0.25);
            amountLak = b.sell_amount_lak ?? Math.round(b.total_amount_lak * 0.24);
          }

          const activeVal = bankMetricType === 'tx' ? tx : Math.round(amountLak / 1000000);
          return {
            ...b,
            activeTx: tx,
            activeAmountLak: amountLak,
            activeVal,
          };
        });

        const totalActiveVal = processedBanks.reduce((acc, item) => acc + item.activeVal, 0) || 1;
        const enrichedBanks = processedBanks.map((item) => {
          const dynamicSharePct = Number(((item.activeVal / totalActiveVal) * 100).toFixed(1));
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

                {/* Sub-Header: Metric Toggle (%trnx vs %value) & Side Toggle (Buy vs Sell vs All) */}
                <div className="flex flex-wrap items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-100 mb-3 gap-2">
                  <div className="flex items-center gap-1 text-[10px] font-black">
                    <span className="text-slate-400 font-bold px-1 uppercase">Metric:</span>
                    <button
                      type="button"
                      onClick={() => setBankMetricType('tx')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        bankMetricType === 'tx'
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      % Trnx
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankMetricType('value')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
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
                      className={`px-2 py-0.5 rounded-md transition-all ${
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
                      className={`px-2 py-0.5 rounded-md transition-all ${
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
                      className={`px-2 py-0.5 rounded-md transition-all ${
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
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {enrichedBanks.slice(0, 6).map((b) => {
                    const barWidth = Math.max(3, b.dynamicSharePct);
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
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium flex justify-between mt-3">
                <span>
                  Primary {bankSideFilter === 'buy' ? 'Buy' : bankSideFilter === 'sell' ? 'Sell' : ''} gateway:{' '}
                  <strong className="text-slate-800">{topProcessedBank?.bank_name || 'BCEL'}</strong>
                </span>
                <span>
                  Dependency: <strong className="text-[#0c4ca3] font-black">{topProcessedBank?.dynamicSharePct || 72}%</strong>
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
                      Top Branches &amp; Physical Network
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Khamphouvong Network</span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {activeBranches.slice(0, 5).map((br) => {
                    const val = getBranchVal(br);
                    const barWidth = Math.max(5, Math.round((val / maxBranchVal) * 100));
                    return (
                      <div key={br.branch_name} className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-800 truncate max-w-[200px]">{br.branch_name}</span>
                          <span className="text-[#6b21a8] font-black">
                            {br.withdraw_tx > 0 ? `${br.withdraw_tx.toLocaleString()} withdrawals` : `${val.toLocaleString()} ${unitLabel}`}
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
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-400 font-medium flex justify-between mt-3">
                <span>Physical Delivery Branches</span>
                <span>Total Network: <strong>{activeBranches.length} locations</strong></span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
