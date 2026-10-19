'use client';

import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Landmark, 
  Building2, 
  Scale, 
  BarChart3, 
  Coins, 
  AlertCircle, 
  Calendar, 
  CalendarDays,
  TrendingUp,
  Sliders,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Layers,
  Activity
} from 'lucide-react';
import { 
  HourlyMetric, 
  BankMetric, 
  BranchMetric, 
  WeightBracketMetric, 
  DaxMeasuresPayload 
} from '@/lib/types/dynamicReport.types';

interface DynamicChartsSectionProps {
  hourly: HourlyMetric[];
  banks: BankMetric[];
  branches: BranchMetric[];
  weightBrackets: WeightBracketMetric[];
  measures?: DaxMeasuresPayload;
}

// 7-day cyclical baseline data for Day Activity Curve
interface DayOfWeekMetric {
  day_code: string;
  day_label: string;
  day_full: string;
  total_tx: number;
  buy_tx: number;
  sell_tx: number;
  buy_weight_g: number;
  sell_weight_g: number;
  total_amount_lak: number;
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

// Baseline trend points for Day, Week, and Month
interface TrendPoint {
  label: string;
  subLabel?: string;
  buy_val: number;
  sell_val: number;
  total_val: number;
  buy_tx: number;
  sell_tx: number;
  total_tx: number;
  buy_weight_g: number;
  sell_weight_g: number;
  net_weight_g: number;
  nc: number; // Total New Customers (First-time buyers)
}

const BASELINE_MONTH_TREND: TrendPoint[] = [
  { label: "May '26", subLabel: 'Closed', buy_val: 245000, sell_val: 82000, total_val: 327000, buy_tx: 98200, sell_tx: 37000, total_tx: 135200, buy_weight_g: 165400, sell_weight_g: 72100, net_weight_g: 93300, nc: 11240 },
  { label: "Jun '26", subLabel: 'Closed', buy_val: 268000, sell_val: 89500, total_val: 357500, buy_tx: 102400, sell_tx: 40400, total_tx: 142800, buy_weight_g: 178200, sell_weight_g: 79400, net_weight_g: 98800, nc: 12450 },
  { label: "Jul '26", subLabel: 'Closed', buy_val: 295000, sell_val: 98400, total_val: 393400, buy_tx: 112800, sell_tx: 45600, total_tx: 158400, buy_weight_g: 198500, sell_weight_g: 88200, net_weight_g: 110300, nc: 14120 },
  { label: "Aug '26", subLabel: 'Closed', buy_val: 310500, sell_val: 101200, total_val: 411700, buy_tx: 116400, sell_tx: 45700, total_tx: 162100, buy_weight_g: 208400, sell_weight_g: 91500, net_weight_g: 116900, nc: 14850 },
  { label: "Sep '26", subLabel: 'Record', buy_val: 337200, sell_val: 104200, total_val: 441400, buy_tx: 123977, sell_tx: 47724, total_tx: 171701, buy_weight_g: 225716, sell_weight_g: 98490, net_weight_g: 127226, nc: 16240 },
  { label: "Oct '26", subLabel: 'MTD Pace', buy_val: 382400, sell_val: 115600, total_val: 498000, buy_tx: 135126, sell_tx: 48569, total_tx: 183695, buy_weight_g: 242500, sell_weight_g: 105200, net_weight_g: 137300, nc: 18150 },
];

const BASELINE_WEEK_TREND: TrendPoint[] = [
  { label: 'W37', subLabel: 'Sep 08-14', buy_val: 68400, sell_val: 24100, total_val: 92500, buy_tx: 27812, sell_tx: 10387, total_tx: 38199, buy_weight_g: 43755, sell_weight_g: 21180, net_weight_g: 22575, nc: 3420 },
  { label: 'W38', subLabel: 'Sep 15-21', buy_val: 65500, sell_val: 26800, total_val: 92300, buy_tx: 25586, sell_tx: 11932, total_tx: 37765, buy_weight_g: 43755, sell_weight_g: 25905, net_weight_g: 17850, nc: 3310 },
  { label: 'W39', subLabel: 'Sep 22-28', buy_val: 62800, sell_val: 25200, total_val: 88000, buy_tx: 24932, sell_tx: 11148, total_tx: 37134, buy_weight_g: 39150, sell_weight_g: 17985, net_weight_g: 21165, nc: 3180 },
  { label: 'W40', subLabel: 'Sep 29-Oct 05', buy_val: 105400, sell_val: 39600, total_val: 145000, buy_tx: 42150, sell_tx: 17890, total_tx: 60431, buy_weight_g: 68400, sell_weight_g: 29800, net_weight_g: 38600, nc: 6150 },
  { label: 'W41', subLabel: 'Oct 06-12', buy_val: 71200, sell_val: 25100, total_val: 96300, buy_tx: 28420, sell_tx: 11104, total_tx: 39744, buy_weight_g: 45900, sell_weight_g: 18700, net_weight_g: 27200, nc: 3890 },
  { label: 'W42', subLabel: 'Oct 13-18 (P)', buy_val: 12500, sell_val: 4350, total_val: 16850, buy_tx: 3612, sell_tx: 1462, total_tx: 5074, buy_weight_g: 2700, sell_weight_g: 3690, net_weight_g: -990, nc: 520 },
];

const BASELINE_DAY_TREND: TrendPoint[] = [
  { label: 'Oct 01', subLabel: 'Wed', buy_val: 10250, sell_val: 3740, total_val: 13990, buy_tx: 4280, sell_tx: 1640, total_tx: 5920, buy_weight_g: 455, sell_weight_g: 172, net_weight_g: 283, nc: 580 },
  { label: 'Oct 02', subLabel: 'Thu', buy_val: 10680, sell_val: 3890, total_val: 14570, buy_tx: 4410, sell_tx: 1700, total_tx: 6110, buy_weight_g: 472, sell_weight_g: 179, net_weight_g: 293, nc: 610 },
  { label: 'Oct 03', subLabel: 'Fri', buy_val: 10120, sell_val: 3780, total_val: 13900, buy_tx: 4190, sell_tx: 1650, total_tx: 5840, buy_weight_g: 448, sell_weight_g: 174, net_weight_g: 274, nc: 570 },
  { label: 'Oct 04', subLabel: 'Sat', buy_val: 8540, sell_val: 3210, total_val: 11750, buy_tx: 3520, sell_tx: 1400, total_tx: 4920, buy_weight_g: 378, sell_weight_g: 148, net_weight_g: 230, nc: 460 },
  { label: 'Oct 05', subLabel: 'Sun', buy_val: 11050, sell_val: 4020, total_val: 15070, buy_tx: 4580, sell_tx: 1760, total_tx: 6340, buy_weight_g: 489, sell_weight_g: 185, net_weight_g: 304, nc: 640 },
  { label: 'Oct 06', subLabel: 'Mon', buy_val: 10540, sell_val: 3850, total_val: 14390, buy_tx: 4370, sell_tx: 1680, total_tx: 6050, buy_weight_g: 466, sell_weight_g: 177, net_weight_g: 289, nc: 590 },
  { label: 'Oct 07', subLabel: 'Tue', buy_val: 10760, sell_val: 3940, total_val: 14700, buy_tx: 4460, sell_tx: 1720, total_tx: 6180, buy_weight_g: 476, sell_weight_g: 181, net_weight_g: 295, nc: 620 },
  { label: 'Oct 08', subLabel: 'Wed', buy_val: 10080, sell_val: 3710, total_val: 13790, buy_tx: 4170, sell_tx: 1620, total_tx: 5790, buy_weight_g: 445, sell_weight_g: 170, net_weight_g: 275, nc: 560 },
  { label: 'Oct 09', subLabel: 'Thu', buy_val: 11260, sell_val: 4100, total_val: 15360, buy_tx: 4660, sell_tx: 1790, total_tx: 6450, buy_weight_g: 498, sell_weight_g: 189, net_weight_g: 309, nc: 670 },
  { label: 'Oct 10', subLabel: 'Fri', buy_val: 12020, sell_val: 4370, total_val: 16390, buy_tx: 4980, sell_tx: 1910, total_tx: 6890, buy_weight_g: 531, sell_weight_g: 201, net_weight_g: 330, nc: 730 },
  { label: 'Oct 11', subLabel: 'Sat', buy_val: 10480, sell_val: 3960, total_val: 14440, buy_tx: 4328, sell_tx: 1734, total_tx: 6062, buy_weight_g: 464, sell_weight_g: 182, net_weight_g: 282, nc: 600 },
  { label: 'Oct 12', subLabel: 'Sun', buy_val: 8760, sell_val: 3340, total_val: 12100, buy_tx: 3612, sell_tx: 1462, total_tx: 5074, buy_weight_g: 388, sell_weight_g: 154, net_weight_g: 234, nc: 490 },
];

// Smooth cubic Bezier spline path generator for Pinterest-grade curves
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

// Generate closed area polygon under cubic Bezier spline down to baseline
function getSmoothAreaPath(points: { x: number; y: number }[], baseline: number): string {
  if (points.length <= 1) return '';
  const linePath = getSmoothSplinePath(points);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  return `${linePath} L ${lastX.toFixed(1)} ${baseline.toFixed(1)} L ${firstX.toFixed(1)} ${baseline.toFixed(1)} Z`;
}

// Standard "Nice Numbers" Scale Engine (like Power BI / Excel / Tableau)
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
}: DynamicChartsSectionProps) {
  // Chart Global Metric Mode: 'tx' (Transactions) | 'weight' (Gold Grams) | 'amount' (Revenue M LAK)
  const [metricMode, setMetricMode] = useState<'tx' | 'weight' | 'amount'>('tx');

  // Trend Chart Visualization Style: 'stacked' (Power BI Ref 1) | 'spline_waves' (Pinterest Ref 2) | 'clustered' (Combo)
  const [trendChartStyle, setTrendChartStyle] = useState<'stacked' | 'spline_waves' | 'clustered'>('stacked');

  // Trend Chart Granularity State: 'day' | 'week' | 'month'
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'month'>('month');
  
  // Trend Chart Metric Dimension: 'value' (Revenue M LAK) | 'tx' (Transactions) | 'weight' (Gold Grams)
  const [trendMetric, setTrendMetric] = useState<'value' | 'tx' | 'weight'>('value');

  // Trend Chart Series Visibility Toggle (Legend filters)
  const [showBuySeries, setShowBuySeries] = useState<boolean>(true);
  const [showSellSeries, setShowSellSeries] = useState<boolean>(true);
  const [showNetSeries, setShowNetSeries] = useState<boolean>(true);
  const [showTxLine, setShowTxLine] = useState<boolean>(true);
  const [showNcLine, setShowNcLine] = useState<boolean>(true);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Bank Settlement View & Side Options
  const [bankMetricType, setBankMetricType] = useState<'tx' | 'value'>('tx');
  const [bankSideFilter, setBankSideFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Hourly Activity Trx Type Filter: 'all' | 'buy' | 'sell'
  const [hourlyTrxType, setHourlyTrxType] = useState<'all' | 'buy' | 'sell'>('all');

  // Day Activity Trx Type Filter: 'all' | 'buy' | 'sell'
  const [dayTrxType, setDayTrxType] = useState<'all' | 'buy' | 'sell'>('all');

  // Day Activity View Mode: 'dow' (Day of Week Mon-Sun) | 'daily' (Calendar Timeline)
  const [dayViewMode, setDayViewMode] = useState<'dow' | 'daily'>('dow');

  // Ticket Distribution Sort State: 'order' (by weight band) | 'share' (highest portion first)
  const [ticketSortMode, setTicketSortMode] = useState<'order' | 'share'>('share');

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

  const maxHourlyVal = Math.max(...hourly.map(getHourlyVal), 1);
  const maxDayVal = Math.max(...BASELINE_DAY_OF_WEEK.map(getDayVal), 1);
  const maxBankVal = Math.max(...banks.map(getBankVal), 1);
  const maxBranchVal = Math.max(...branches.map(getBranchVal), 1);

  // Gold Weight Tickets Share Analysis
  const totalWeightCount = weightBrackets.reduce((acc, wb) => acc + wb.count, 0) || 1;
  const totalWeightGrams = weightBrackets.reduce((acc, wb) => acc + wb.total_weight_g, 0) || 1;

  // Compute enriched ticket distribution with share percentages and ranks
  const enrichedBrackets = useMemo(() => {
    const list = weightBrackets.map((wb, index) => {
      const countPct = Number(((wb.count / totalWeightCount) * 100).toFixed(1));
      const weightPct = Number(((wb.total_weight_g / totalWeightGrams) * 100).toFixed(1));
      return {
        ...wb,
        originalIndex: index,
        countPct,
        weightPct,
      };
    });

    // Determine ranking based on countPct
    const sortedByShare = [...list].sort((a, b) => b.countPct - a.countPct);
    const rankedList = list.map((item) => {
      const rank = sortedByShare.findIndex((s) => s.weight_bracket === item.weight_bracket) + 1;
      return {
        ...item,
        rank,
      };
    });

    if (ticketSortMode === 'share') {
      return rankedList.sort((a, b) => b.countPct - a.countPct);
    }
    return rankedList.sort((a, b) => a.originalIndex - b.originalIndex);
  }, [weightBrackets, totalWeightCount, totalWeightGrams, ticketSortMode]);

  // Heat Tier Theme Mapping for Gold Weight Ticket Distribution
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

  // Top bank share check
  const topBank = banks.length > 0 ? banks[0] : null;
  const hasHighBankConcentration = topBank && topBank.share_pct > 60;

  // Active trend series data
  const activeTrendData: TrendPoint[] = useMemo(() => {
    if (trendGranularity === 'day') return BASELINE_DAY_TREND;
    if (trendGranularity === 'week') return BASELINE_WEEK_TREND;
    return BASELINE_MONTH_TREND;
  }, [trendGranularity]);

  // Scaled trend values
  const getTrendPointVal = (p: TrendPoint, series: 'buy' | 'sell' | 'total' | 'net') => {
    if (trendMetric === 'value') {
      if (series === 'buy') return p.buy_val;
      if (series === 'sell') return p.sell_val;
      if (series === 'total') return p.total_val;
      return p.buy_val - p.sell_val;
    }
    if (trendMetric === 'tx') {
      if (series === 'buy') return p.buy_tx;
      if (series === 'sell') return p.sell_tx;
      if (series === 'total') return p.total_tx;
      return p.buy_tx - p.sell_tx;
    }
    // Gold Weight (g)
    if (series === 'buy') return p.buy_weight_g;
    if (series === 'sell') return p.sell_weight_g;
    if (series === 'total') return p.buy_weight_g + p.sell_weight_g;
    return p.net_weight_g;
  };

  const trendUnitLabel = trendMetric === 'value' ? 'M LAK' : trendMetric === 'tx' ? 'tx' : 'g';

  // Standard Nice Scale for Primary Left Axis (M LAK, Tx, or Gold Weight)
  const primaryScale = useMemo(() => {
    if (trendChartStyle === 'stacked') {
      const peaks = activeTrendData.map((p) => {
        let sum = 0;
        if (showBuySeries) sum += getTrendPointVal(p, 'buy');
        if (showSellSeries) sum += getTrendPointVal(p, 'sell');
        return sum;
      });
      const peak = Math.max(...peaks, 1);
      return getNiceScale(peak, 5);
    } else {
      const vals: number[] = [];
      activeTrendData.forEach((p) => {
        if (showBuySeries) vals.push(getTrendPointVal(p, 'buy'));
        if (showSellSeries) vals.push(getTrendPointVal(p, 'sell'));
        if (showNetSeries) vals.push(Math.abs(getTrendPointVal(p, 'buy') - getTrendPointVal(p, 'sell')));
      });
      const peak = Math.max(...vals, 1);
      return getNiceScale(peak, 5);
    }
  }, [activeTrendData, trendMetric, trendChartStyle, showBuySeries, showSellSeries, showNetSeries]);

  const maxPrimaryVal = primaryScale.max;
  const primaryTicks = primaryScale.ticks;

  // Standard Nice Scale for Secondary Right Axis: Total Tx (Curve)
  const txScale = useMemo(() => {
    const peak = Math.max(...activeTrendData.map((p) => p.total_tx), 1);
    // When left axis is tx and in stacked mode, add 20% headroom so line doesn't collide with stacked bar top
    const headroom = (trendChartStyle === 'stacked' && trendMetric === 'tx') ? 1.25 : 1.0;
    return getNiceScale(peak * headroom, 5);
  }, [activeTrendData, trendChartStyle, trendMetric]);

  const maxTxVal = txScale.max;

  // Standard Nice Scale for Secondary Right Axis: New Customers (NC Curve)
  const ncScale = useMemo(() => {
    const peak = Math.max(...activeTrendData.map((p) => p.nc), 1);
    return getNiceScale(peak, 5);
  }, [activeTrendData]);

  const maxNcVal = ncScale.max;

  const totalBuyTrendSum = activeTrendData.reduce((acc, p) => acc + getTrendPointVal(p, 'buy'), 0);
  const totalSellTrendSum = activeTrendData.reduce((acc, p) => acc + getTrendPointVal(p, 'sell'), 0);
  const totalNetTrendSum = totalBuyTrendSum - totalSellTrendSum;
  const totalTxTrendSum = activeTrendData.reduce((acc, p) => acc + p.total_tx, 0);
  const totalNcTrendSum = activeTrendData.reduce((acc, p) => acc + p.nc, 0);

  // SVG Canvas Dimension (Standard 1000 x 350 with spacious margins & crisp 1:1 scaling)
  const svgWidth = 1000;
  const svgHeight = 350;
  const marginLeft = 66;
  const marginRight = 78;
  const marginTop = 36;
  const marginBottom = 44;
  const plotWidth = svgWidth - marginLeft - marginRight; // 856
  const plotHeight = svgHeight - marginTop - marginBottom; // 270
  const plotBaseline = marginTop + plotHeight; // y = 306
  const nPoints = activeTrendData.length;
  const stepWidth = plotWidth / nPoints;

  // Pre-calculate geometric coordinates for curves and nodes
  const buyPoints = useMemo(() => {
    return activeTrendData.map((pt, i) => {
      const cx = marginLeft + (i + 0.5) * stepWidth;
      const val = getTrendPointVal(pt, 'buy');
      const cy = maxPrimaryVal > 0 ? plotBaseline - (val / maxPrimaryVal) * plotHeight : plotBaseline;
      return { x: cx, y: cy };
    });
  }, [activeTrendData, marginLeft, stepWidth, maxPrimaryVal, plotBaseline, plotHeight, trendMetric]);

  const sellPoints = useMemo(() => {
    return activeTrendData.map((pt, i) => {
      const cx = marginLeft + (i + 0.5) * stepWidth;
      const val = getTrendPointVal(pt, 'sell');
      const cy = maxPrimaryVal > 0 ? plotBaseline - (val / maxPrimaryVal) * plotHeight : plotBaseline;
      return { x: cx, y: cy };
    });
  }, [activeTrendData, marginLeft, stepWidth, maxPrimaryVal, plotBaseline, plotHeight, trendMetric]);

  const txPoints = useMemo(() => {
    return activeTrendData.map((pt, i) => {
      const cx = marginLeft + (i + 0.5) * stepWidth;
      const cy = maxTxVal > 0 ? plotBaseline - (pt.total_tx / maxTxVal) * plotHeight : plotBaseline;
      return { x: cx, y: cy };
    });
  }, [activeTrendData, marginLeft, stepWidth, maxTxVal, plotBaseline, plotHeight]);

  const ncPoints = useMemo(() => {
    return activeTrendData.map((pt, i) => {
      const cx = marginLeft + (i + 0.5) * stepWidth;
      const cy = maxNcVal > 0 ? plotBaseline - (pt.nc / maxNcVal) * plotHeight : plotBaseline;
      return { x: cx, y: cy };
    });
  }, [activeTrendData, marginLeft, stepWidth, maxNcVal, plotBaseline, plotHeight]);

  // Smooth Bezier spline curves and glowing gradient areas
  const txSplinePath = useMemo(() => showTxLine ? getSmoothSplinePath(txPoints) : '', [txPoints, showTxLine]);
  const txSplineArea = useMemo(() => showTxLine ? getSmoothAreaPath(txPoints, plotBaseline) : '', [txPoints, showTxLine, plotBaseline]);

  const ncSplinePath = useMemo(() => showNcLine ? getSmoothSplinePath(ncPoints) : '', [ncPoints, showNcLine]);

  const buySplinePath = useMemo(() => showBuySeries ? getSmoothSplinePath(buyPoints) : '', [buyPoints, showBuySeries]);
  const buySplineArea = useMemo(() => showBuySeries ? getSmoothAreaPath(buyPoints, plotBaseline) : '', [buyPoints, showBuySeries, plotBaseline]);

  const sellSplinePath = useMemo(() => showSellSeries ? getSmoothSplinePath(sellPoints) : '', [sellPoints, showSellSeries]);
  const sellSplineArea = useMemo(() => showSellSeries ? getSmoothAreaPath(sellPoints, plotBaseline) : '', [sellPoints, showSellSeries, plotBaseline]);

  return (
    <div className="space-y-5 mb-6">
      {/* ========================================================================= */}
      {/* 1. HERO CUSTOMIZABLE COMBO CHART: LINE + CLUSTER WITH DUAL AXIS           */}
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
                  Multi-Period Dynamics (Dual-Axis)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {trendChartStyle === 'stacked'
                    ? 'Stacked & Line (Ref 1)'
                    : trendChartStyle === 'spline_waves'
                    ? 'Spline Waves (Ref 2)'
                    : 'Clustered Combo'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {trendChartStyle === 'stacked'
                  ? `Primary Axis: Stacked Turnover Flow (${trendUnitLabel}) · Secondary Axis: Transactions & Customer Acquisition`
                  : trendChartStyle === 'spline_waves'
                  ? `Primary Axis: Fluid Spline Wave Area (${trendUnitLabel}) · Secondary Axis: Volume & Acquisition Waves`
                  : `Primary Axis: Clustered Turnover & Volume (${trendUnitLabel}) · Secondary Axis: Total Transactions & NC Acquisition`}
              </p>
            </div>
          </div>

          {/* Granularity, Style & Metric Selectors */}
          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            {/* Chart Style Switcher (Stacked Ref 1 vs Spline Waves Ref 2 vs Clustered) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-black text-slate-600">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Style:</span>
              <button
                type="button"
                onClick={() => setTrendChartStyle('stacked')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  trendChartStyle === 'stacked'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Stacked Column + Dual-Axis Trend (Pinterest Ref 1)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stacked &amp; Line</span>
              </button>
              <button
                type="button"
                onClick={() => setTrendChartStyle('spline_waves')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  trendChartStyle === 'spline_waves'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Smooth Spline Curves & Gradient Glow Waves (Pinterest Ref 2)"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Spline Waves</span>
              </button>
              <button
                type="button"
                onClick={() => setTrendChartStyle('clustered')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  trendChartStyle === 'clustered'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Side-by-side Clustered Bars"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Clustered</span>
              </button>
            </div>

            {/* Metric Selector: Value / Tx / Weight */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-black text-slate-600">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Left Axis:</span>
              <button
                type="button"
                onClick={() => setTrendMetric('value')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendMetric === 'value'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Value (M LAK)
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric('tx')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendMetric === 'tx'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Transactions (tx)
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric('weight')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendMetric === 'weight'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Gold Weight (g)
              </button>
            </div>

            {/* Granularity Selector: Day / Week / Month */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-black text-slate-600">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Grain:</span>
              <button
                type="button"
                onClick={() => setTrendGranularity('month')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendGranularity === 'month'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Month
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
                onClick={() => setTrendGranularity('day')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendGranularity === 'day'
                    ? 'bg-[#0c4ca3] text-white shadow-2xs'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Day
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Legend with Values & Clickable Visibility Toggles */}
        <div className="flex flex-wrap items-center justify-between bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 mb-4 gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Series &amp; Axes:</span>
            
            {/* Buy Series Legend Toggle */}
            <button
              type="button"
              onClick={() => setShowBuySeries(!showBuySeries)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showBuySeries
                  ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0c4ca3]" />
              <span>
                {trendChartStyle === 'stacked'
                  ? 'Buy Stack (Base):'
                  : trendChartStyle === 'spline_waves'
                  ? 'Buy Wave (Sky):'
                  : 'Buy Bar (Left):'}
              </span>
              <span className="text-[#0c4ca3]">{totalBuyTrendSum.toLocaleString()} {trendUnitLabel}</span>
            </button>

            {/* Sell Series Legend Toggle */}
            <button
              type="button"
              onClick={() => setShowSellSeries(!showSellSeries)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showSellSeries
                  ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600" />
              <span>
                {trendChartStyle === 'stacked'
                  ? 'Sell Stack (Top):'
                  : trendChartStyle === 'spline_waves'
                  ? 'Sell Wave (Rose):'
                  : 'Sell Bar (Left):'}
              </span>
              <span className="text-rose-700">{totalSellTrendSum.toLocaleString()} {trendUnitLabel}</span>
            </button>

            {/* Total Transactions Trend Toggle (Line - Secondary Axis) */}
            <button
              type="button"
              onClick={() => setShowTxLine(!showTxLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showTxLine
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              <span className="w-3 h-1 bg-indigo-600 rounded-full" />
              <span>Total Transactions (Curve 2nd):</span>
              <span className="text-indigo-700">{totalTxTrendSum.toLocaleString()} tx</span>
            </button>

            {/* Total NC New Customers Performance Toggle (Line - Secondary Axis) */}
            <button
              type="button"
              onClick={() => setShowNcLine(!showNcLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showNcLine
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              <span className="w-3 h-1 bg-emerald-600 rounded-full" />
              <span>Total NC (Curve 2nd):</span>
              <span className="text-emerald-700">{totalNcTrendSum.toLocaleString()} NC</span>
            </button>

            {/* Net Balance Pill */}
            <button
              type="button"
              onClick={() => setShowNetSeries(!showNetSeries)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                showNetSeries
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Net: +{totalNetTrendSum.toLocaleString()} {trendUnitLabel}</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            Grain: <strong className="text-slate-800 uppercase">{trendGranularity}</strong> ({activeTrendData.length} Periods)
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COMBO CHART VISUAL CANVAS (PRECISION SVG DUAL-AXIS VISUALIZATION)          */}
        {/* ========================================================================= */}
        <div className="relative w-full bg-gradient-to-b from-slate-50/60 to-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 overflow-hidden shadow-xs">
          {/* Dual Axis Header Badges */}
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider px-1 mb-2 text-slate-400">
            <span className="flex items-center gap-1.5 text-[#0c4ca3]">
              <span className="w-2 h-2 rounded-full bg-[#0c4ca3]" />
              Left Axis: {trendChartStyle === 'stacked' ? 'Stacked Turnover' : trendChartStyle === 'spline_waves' ? 'Spline Curves' : 'Clustered Volume'} ({trendUnitLabel})
            </span>
            <span className="flex items-center gap-2.5 text-indigo-700">
              <span className="text-indigo-600 font-extrabold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Total Tx ({formatAxisTick(maxTxVal)} max)
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                NC Acquisition ({formatAxisTick(maxNcVal)} max)
              </span>
              <span className="text-slate-400 font-bold">Right Axis ▶</span>
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-[320px] sm:h-[350px] lg:h-[375px] select-none"
            preserveAspectRatio="xMidYMid meet"
            shapeRendering="geometricPrecision"
            textRendering="geometricPrecision"
          >
            <defs>
              {/* Buy Bar Gradient */}
              <linearGradient id="buyComboGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e40af" />
                <stop offset="60%" stopColor="#0c4ca3" />
                <stop offset="100%" stopColor="#082f6e" />
              </linearGradient>

              {/* Sell Bar Gradient */}
              <linearGradient id="sellComboGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="70%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#9f1239" />
              </linearGradient>

              {/* Spline Wave Soft Gradients (Pinterest Ref 2) */}
              <linearGradient id="buyWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.28" />
                <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="sellWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.24" />
                <stop offset="65%" stopColor="#fda4af" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="txWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                <stop offset="65%" stopColor="#818cf8" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Standard Y-Axis Scale Marks */}
            {primaryTicks.map((tickVal, gIdx) => {
              const ratio = maxPrimaryVal > 0 ? tickVal / maxPrimaryVal : 0;
              const yPos = plotBaseline - ratio * plotHeight;
              const rightTxVal = Math.round(maxTxVal * ratio);
              const rightNcVal = Math.round(maxNcVal * ratio);

              return (
                <g key={`gridline-${gIdx}`}>
                  {/* Clean Gridline */}
                  <line
                    x1={marginLeft}
                    y1={yPos}
                    x2={svgWidth - marginRight}
                    y2={yPos}
                    stroke={gIdx === 0 ? '#cbd5e1' : '#f1f5f9'}
                    strokeDasharray={gIdx === 0 ? 'none' : '4 4'}
                    strokeWidth={gIdx === 0 ? '1.5' : '1'}
                  />

                  {/* Left Primary Axis Labels (Standard Ticks: 0, 20k, 40k...) */}
                  <text
                    x={marginLeft - 10}
                    y={yPos + 3.5}
                    textAnchor="end"
                    className="text-[10px] font-bold fill-slate-500 font-mono tracking-tight"
                  >
                    {formatAxisTick(tickVal)}
                  </text>

                  {/* Right Secondary Axis Labels (Total Tx & NC) */}
                  <text
                    x={svgWidth - marginRight + 10}
                    y={yPos + 3.5}
                    textAnchor="start"
                    className="text-[10px] font-bold fill-indigo-600 font-mono tracking-tight"
                  >
                    {formatAxisTick(rightTxVal)}
                    <tspan className="fill-emerald-600 text-[9px] font-semibold" dx="4">
                      ({formatAxisTick(rightNcVal)})
                    </tspan>
                  </text>
                </g>
              );
            })}

            {/* Translucent Tx Glow Area for Stacked & Clustered Modes */}
            {trendChartStyle !== 'spline_waves' && showTxLine && txSplineArea && (
              <path d={txSplineArea} fill="url(#txWaveGradient)" className="pointer-events-none" />
            )}

            {/* ========================================================================= */}
            {/* OPTION 1: STACKED COLUMN & LINE COMBO (Pinterest Ref 1)                    */}
            {/* ========================================================================= */}
            {trendChartStyle === 'stacked' && (
              activeTrendData.map((pt, i) => {
                const buyVal = getTrendPointVal(pt, 'buy');
                const sellVal = getTrendPointVal(pt, 'sell');
                const totalStackedVal = (showBuySeries ? buyVal : 0) + (showSellSeries ? sellVal : 0);
                const cx = marginLeft + (i + 0.5) * stepWidth;
                const colWidth = Math.min(42, stepWidth * 0.40);
                const xCol = cx - colWidth / 2;

                const hBuy = (maxPrimaryVal > 0 && showBuySeries) ? (buyVal / maxPrimaryVal) * plotHeight : 0;
                const hSell = (maxPrimaryVal > 0 && showSellSeries) ? (sellVal / maxPrimaryVal) * plotHeight : 0;

                const yBuy = plotBaseline - hBuy;
                const ySell = yBuy - hSell;

                const isHovered = hoveredTrendIndex === i;
                const peakStackedVal = Math.max(
                  ...activeTrendData.map((p) => (showBuySeries ? getTrendPointVal(p, 'buy') : 0) + (showSellSeries ? getTrendPointVal(p, 'sell') : 0))
                );
                const isPeak = totalStackedVal > 0 && totalStackedVal === peakStackedVal;

                return (
                  <g key={`stacked-col-${i}`}>
                    {/* Hover Column Backdrop */}
                    <rect
                      x={marginLeft + i * stepWidth}
                      y={marginTop}
                      width={stepWidth}
                      height={plotHeight}
                      fill={isHovered ? 'rgba(99, 102, 241, 0.08)' : 'transparent'}
                      className="cursor-pointer transition-colors"
                      onMouseEnter={() => setHoveredTrendIndex(i)}
                      onMouseLeave={() => setHoveredTrendIndex(null)}
                    />

                    {/* Buy Segment (Bottom of Stack) */}
                    {showBuySeries && hBuy > 0 && (
                      <rect
                        x={xCol}
                        y={yBuy}
                        width={colWidth}
                        height={Math.max(3, hBuy)}
                        rx={showSellSeries && hSell > 0 ? "0" : "5"}
                        ry={showSellSeries && hSell > 0 ? "0" : "5"}
                        fill="url(#buyComboGradient)"
                        className={`transition-all duration-200 cursor-pointer ${
                          isHovered ? 'opacity-100 brightness-110 filter drop-shadow-md' : 'opacity-95'
                        }`}
                        onMouseEnter={() => setHoveredTrendIndex(i)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                      />
                    )}

                    {/* Sell Segment (Top of Stack) */}
                    {showSellSeries && hSell > 0 && (
                      <rect
                        x={xCol}
                        y={ySell}
                        width={colWidth}
                        height={Math.max(3, hSell)}
                        rx="5"
                        ry="5"
                        fill="url(#sellComboGradient)"
                        className={`transition-all duration-200 cursor-pointer ${
                          isHovered ? 'opacity-100 brightness-110 filter drop-shadow-md' : 'opacity-90'
                        }`}
                        onMouseEnter={() => setHoveredTrendIndex(i)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                      />
                    )}

                    {/* Floating Pill on Hover: Total value displayed clearly without colliding */}
                    {isHovered && totalStackedVal > 0 && (
                      <g transform={`translate(${cx}, ${Math.min(ySell, yBuy) - 8})`} className="pointer-events-none">
                        <rect x="-24" y="-15" width="48" height="16" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                        <text x="0" y="-3.5" textAnchor="middle" className="text-[9px] font-black fill-white tracking-tight">
                          {formatAxisTick(totalStackedVal)}
                        </text>
                      </g>
                    )}

                    {/* Peak Badge */}
                    {isPeak && (
                      <g transform={`translate(${cx}, ${Math.min(ySell, yBuy) - (isHovered ? 28 : 14)})`}>
                        <rect x="-18" y="-9" width="36" height="13" rx="3.5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
                        <text x="0" y="0.5" textAnchor="middle" className="text-[7.5px] font-black fill-amber-800 uppercase tracking-wider">
                          PEAK
                        </text>
                      </g>
                    )}

                    {/* Period X-Axis Label */}
                    <text
                      x={cx}
                      y={plotBaseline + 18}
                      textAnchor="middle"
                      className={`text-[10.5px] select-none transition-all ${
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
              })
            )}

            {/* ========================================================================= */}
            {/* OPTION 2: SMOOTH SPLINE AREA WAVES (Pinterest Ref 2)                      */}
            {/* ========================================================================= */}
            {trendChartStyle === 'spline_waves' && (
              <g>
                {/* Hover Backdrop Columns & Interactive Vertical Guides */}
                {activeTrendData.map((pt, i) => {
                  const cx = marginLeft + (i + 0.5) * stepWidth;
                  const isHovered = hoveredTrendIndex === i;

                  return (
                    <g key={`spline-backdrop-${i}`}>
                      <rect
                        x={marginLeft + i * stepWidth}
                        y={marginTop}
                        width={stepWidth}
                        height={plotHeight}
                        fill={isHovered ? 'rgba(99, 102, 241, 0.08)' : 'transparent'}
                        className="cursor-pointer transition-colors"
                        onMouseEnter={() => setHoveredTrendIndex(i)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                      />
                      {isHovered && (
                        <line
                          x1={cx}
                          y1={marginTop}
                          x2={cx}
                          y2={plotBaseline}
                          stroke="#6366f1"
                          strokeDasharray="3 3"
                          strokeWidth="1.2"
                          className="pointer-events-none"
                        />
                      )}
                      {/* Period X-Axis Label */}
                      <text
                        x={cx}
                        y={plotBaseline + 18}
                        textAnchor="middle"
                        className={`text-[10.5px] select-none transition-all ${
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

                {/* Translucent Area Fills Under Spline Curves */}
                {showBuySeries && buySplineArea && (
                  <path d={buySplineArea} fill="url(#buyWaveGradient)" className="pointer-events-none" />
                )}
                {showSellSeries && sellSplineArea && (
                  <path d={sellSplineArea} fill="url(#sellWaveGradient)" className="pointer-events-none" />
                )}
                {showTxLine && txSplineArea && (
                  <path d={txSplineArea} fill="url(#txWaveGradient)" className="pointer-events-none" />
                )}

                {/* Smooth Spline Stroke Lines (Pinterest Ref 2) */}
                {showBuySeries && buySplinePath && (
                  <path
                    d={buySplinePath}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none filter drop-shadow-sm"
                  />
                )}
                {showSellSeries && sellSplinePath && (
                  <path
                    d={sellSplinePath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="3.0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none filter drop-shadow-sm"
                  />
                )}

                {/* Circular Nodes for Buy & Sell Curves (Pinterest White-Center Nodes) */}
                {activeTrendData.map((pt, i) => {
                  const buyPt = buyPoints[i];
                  const sellPt = sellPoints[i];
                  const isHovered = hoveredTrendIndex === i;

                  return (
                    <g key={`spline-nodes-${i}`} className="pointer-events-none">
                      {showBuySeries && buyPt && (
                        <g>
                          <circle
                            cx={buyPt.x}
                            cy={buyPt.y}
                            r={isHovered ? 6.5 : 4.5}
                            fill="#ffffff"
                            stroke="#0284c7"
                            strokeWidth={isHovered ? 3.2 : 2.5}
                            className="transition-all"
                          />
                          {isHovered && (
                            <circle cx={buyPt.x} cy={buyPt.y} r="10" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.7" />
                          )}
                        </g>
                      )}

                      {showSellSeries && sellPt && (
                        <g>
                          <circle
                            cx={sellPt.x}
                            cy={sellPt.y}
                            r={isHovered ? 6.5 : 4.5}
                            fill="#ffffff"
                            stroke="#f43f5e"
                            strokeWidth={isHovered ? 3.2 : 2.5}
                            className="transition-all"
                          />
                          {isHovered && (
                            <circle cx={sellPt.x} cy={sellPt.y} r="10" fill="none" stroke="#fda4af" strokeWidth="1.5" strokeOpacity="0.7" />
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* ========================================================================= */}
            {/* OPTION 3: CLUSTERED COLUMNS (Original Upgraded)                            */}
            {/* ========================================================================= */}
            {trendChartStyle === 'clustered' && (
              activeTrendData.map((pt, i) => {
                const buyVal = getTrendPointVal(pt, 'buy');
                const sellVal = getTrendPointVal(pt, 'sell');
                const cx = marginLeft + (i + 0.5) * stepWidth;

                const clusterWidth = Math.min(52, stepWidth * 0.52);
                const showBoth = showBuySeries && showSellSeries;
                const barWidth = showBoth ? Math.max(8, clusterWidth / 2 - 2) : clusterWidth;

                const hBuy = maxPrimaryVal > 0 ? (buyVal / maxPrimaryVal) * plotHeight : 0;
                const hSell = maxPrimaryVal > 0 ? (sellVal / maxPrimaryVal) * plotHeight : 0;

                const xBuy = showBoth ? cx - barWidth - 1.5 : cx - barWidth / 2;
                const yBuy = plotBaseline - Math.max(4, hBuy);

                const xSell = showBoth ? cx + 1.5 : cx - barWidth / 2;
                const ySell = plotBaseline - Math.max(4, hSell);

                const isPeak = buyVal === Math.max(...activeTrendData.map((p) => getTrendPointVal(p, 'buy')));
                const isHovered = hoveredTrendIndex === i;

                return (
                  <g key={`bar-${i}`}>
                    {/* Hover Backdrop Highlight */}
                    <rect
                      x={marginLeft + i * stepWidth}
                      y={marginTop}
                      width={stepWidth}
                      height={plotHeight}
                      fill={isHovered ? 'rgba(99, 102, 241, 0.08)' : 'transparent'}
                      className="cursor-pointer transition-colors"
                      onMouseEnter={() => setHoveredTrendIndex(i)}
                      onMouseLeave={() => setHoveredTrendIndex(null)}
                    />

                    {/* Buy Bar (Cluster Left) */}
                    {showBuySeries && (
                      <rect
                        x={xBuy}
                        y={yBuy}
                        width={barWidth}
                        height={Math.max(4, hBuy)}
                        rx="4"
                        ry="4"
                        fill="url(#buyComboGradient)"
                        className={`transition-all duration-200 cursor-pointer ${
                          isHovered ? 'opacity-100 brightness-110 filter drop-shadow-md' : 'opacity-95'
                        }`}
                        onMouseEnter={() => setHoveredTrendIndex(i)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                      />
                    )}

                    {/* Sell Bar (Cluster Right) */}
                    {showSellSeries && (
                      <rect
                        x={xSell}
                        y={ySell}
                        width={barWidth}
                        height={Math.max(4, hSell)}
                        rx="4"
                        ry="4"
                        fill="url(#sellComboGradient)"
                        className={`transition-all duration-200 cursor-pointer ${
                          isHovered ? 'opacity-100 brightness-110 filter drop-shadow-md' : 'opacity-90'
                        }`}
                        onMouseEnter={() => setHoveredTrendIndex(i)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                      />
                    )}

                    {/* Peak Marker Badge */}
                    {isPeak && (
                      <g transform={`translate(${cx}, ${Math.min(yBuy, ySell) - 10})`}>
                        <rect x="-18" y="-10" width="36" height="12" rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
                        <text x="0" y="-1" textAnchor="middle" className="text-[8px] font-black fill-amber-800 uppercase tracking-tighter">
                          PEAK
                        </text>
                      </g>
                    )}

                    {/* Period X-Axis Label */}
                    <text
                      x={cx}
                      y={plotBaseline + 18}
                      textAnchor="middle"
                      className={`text-[10.5px] select-none transition-all ${
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
              })
            )}

            {/* ========================================================================= */}
            {/* DUAL AXIS OVERLAY TREND CURVES (SMOOTH BEZIER SPLINES ACROSS ALL MODES)   */}
            {/* ========================================================================= */}
            {/* Line 1: Total Transactions Curve (Right Axis) */}
            {showTxLine && txSplinePath && (
              <path
                d={txSplinePath}
                fill="none"
                stroke="#6366f1"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-sm pointer-events-none"
              />
            )}

            {/* Line 2: New Customers (NC) Curve (Right Axis) */}
            {showNcLine && ncSplinePath && (
              <path
                d={ncSplinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.6"
                strokeDasharray="4 2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-sm pointer-events-none"
              />
            )}

            {/* Nodes on Total Tx Curve and NC Curve (Pinterest Solid White Center) */}
            {activeTrendData.map((pt, i) => {
              const txPt = txPoints[i];
              const ncPt = ncPoints[i];
              const isHovered = hoveredTrendIndex === i;

              return (
                <g key={`trend-nodes-${i}`} className="pointer-events-none">
                  {/* Total Transactions Node */}
                  {showTxLine && txPt && (
                    <g>
                      <circle
                        cx={txPt.x}
                        cy={txPt.y}
                        r={isHovered ? 6.5 : 4.5}
                        fill="#ffffff"
                        stroke="#4f46e5"
                        strokeWidth={isHovered ? 3.2 : 2.5}
                        className="transition-all"
                      />
                      {isHovered && (
                        <circle cx={txPt.x} cy={txPt.y} r="10" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.7" />
                      )}
                    </g>
                  )}

                  {/* NC Node */}
                  {showNcLine && ncPt && (
                    <g>
                      <circle
                        cx={ncPt.x}
                        cy={ncPt.y}
                        r={isHovered ? 6 : 4}
                        fill="#ffffff"
                        stroke="#059669"
                        strokeWidth={isHovered ? 3 : 2.2}
                        className="transition-all"
                      />
                      {isHovered && (
                        <circle cx={ncPt.x} cy={ncPt.y} r="9" fill="none" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.7" />
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating HUD Tooltip Card on Hover */}
          {hoveredTrendIndex !== null && activeTrendData[hoveredTrendIndex] && (
            (() => {
              const pt = activeTrendData[hoveredTrendIndex];
              const buyVal = getTrendPointVal(pt, 'buy');
              const sellVal = getTrendPointVal(pt, 'sell');
              const netVal = buyVal - sellVal;
              const ncSharePct = ((pt.nc / pt.total_tx) * 100).toFixed(1);

              return (
                <div
                  className="absolute z-30 pointer-events-none transition-all duration-150 top-3 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-[11px] min-w-[240px]"
                  style={{
                    left: `${Math.min(78, Math.max(12, ((marginLeft + (hoveredTrendIndex + 0.5) * stepWidth) / svgWidth) * 100))}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                    <span className="font-black text-amber-300">
                      {pt.label} {pt.subLabel ? `(${pt.subLabel})` : ''}
                    </span>
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-bold uppercase">
                      {trendGranularity} Grain
                    </span>
                  </div>

                  {/* Left Axis Clustered Volume */}
                  <div className="space-y-1 mb-2">
                    <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Left Axis (Volume &amp; Flow):
                    </div>
                    <div className="flex justify-between items-center text-blue-200">
                      <span>🔵 Buy Turnover:</span>
                      <strong className="text-white">{buyVal.toLocaleString()} {trendUnitLabel}</strong>
                    </div>
                    <div className="flex justify-between items-center text-rose-200">
                      <span>🔴 Sell Liquidation:</span>
                      <strong className="text-white">{sellVal.toLocaleString()} {trendUnitLabel}</strong>
                    </div>
                    <div className="flex justify-between items-center text-emerald-300 font-bold border-t border-slate-800 pt-1">
                      <span>⚖️ Net Balance:</span>
                      <strong className={netVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {netVal >= 0 ? '+' : ''}{netVal.toLocaleString()} {trendUnitLabel}
                      </strong>
                    </div>
                  </div>

                  {/* Right Axis Secondary Metrics (Total Tx & Total NC) */}
                  <div className="space-y-1 border-t border-slate-800 pt-2 bg-slate-800/50 -mx-1.5 px-2 py-1.5 rounded-xl">
                    <div className="text-[9.5px] font-bold text-indigo-300 uppercase tracking-wider flex justify-between">
                      <span>Right Axis (Combo Trend):</span>
                      <span className="text-emerald-300 font-black">{ncSharePct}% NC Ratio</span>
                    </div>
                    <div className="flex justify-between items-center text-indigo-200">
                      <span className="flex items-center gap-1">🟣 Total Transactions:</span>
                      <strong className="text-white font-black">{pt.total_tx.toLocaleString()} tx</strong>
                    </div>
                    <div className="flex justify-between items-center text-emerald-300">
                      <span className="flex items-center gap-1">🟢 New Customers (NC):</span>
                      <strong className="text-white font-black">{pt.nc.toLocaleString()} NC</strong>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Global View-By Metric Switcher for the Breakdown Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#0c4ca3]" />
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Operational Dynamics, Curves &amp; Channel Distribution
          </h3>
        </div>

        {/* Metric Switcher Pills */}
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
        // Calculate totals for % contribution shares
        const totalDayWeekVal = BASELINE_DAY_OF_WEEK.reduce((acc, d) => acc + getDayVal(d), 0) || 1;
        const totalHourlyVal = hourly.reduce((acc, h) => acc + getHourlyVal(h), 0) || 1;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card A: Hourly Trading Activity (00:00 - 23:00) with Buy/Sell Filter & % Data Labels */}
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
                  {hourly.map((h) => {
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

                        {/* Top Data Label: % Contribution Share on prominent hours */}
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

            {/* Card B: Day Activity Curve (Trx) with Data Labels on EVERY Day Bar */}
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

                {/* 7-Day Day-of-Week Bar Chart with % Contribution Share Data Labels */}
                <div className="h-48 flex items-end gap-2 sm:gap-3 pt-8 pb-2 px-2 border-b border-slate-100">
                  {BASELINE_DAY_OF_WEEK.map((d) => {
                    const val = getDayVal(d);
                    const heightPct = Math.max(5, Math.round((val / maxDayVal) * 100));
                    const isPeakDay = d.day_code === 'fri';
                    const sharePct = ((val / totalDayWeekVal) * 100).toFixed(1);

                    return (
                      <div key={d.day_code} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip Insight */}
                        <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1.5 px-2 rounded-lg pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
                          <div className="font-bold text-amber-300">{d.day_full} · {sharePct}% Share</div>
                          <div>{val.toLocaleString()} {unitLabel} (Buy: {d.buy_tx.toLocaleString()} | Sell: {d.sell_tx.toLocaleString()})</div>
                        </div>

                        {/* Top Data Label Badge (% Contribution Share) */}
                        <div className="mb-1.5 text-center">
                          <span
                            className={`text-[9.5px] px-1.5 py-0.5 rounded transition-all shadow-2xs ${
                              isPeakDay
                                ? 'bg-blue-600 text-white font-black'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 font-bold'
                            }`}
                          >
                            {isPeakDay ? `🔥 ${sharePct}%` : `${sharePct}%`}
                          </span>
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-md transition-all group-hover:brightness-110 ${
                            dayTrxType === 'sell'
                              ? isPeakDay ? 'bg-rose-600' : 'bg-rose-300'
                              : isPeakDay ? 'bg-gradient-to-t from-[#0c4ca3] to-blue-500' : 'bg-[#0c4ca3]'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />

                        {/* Day Label */}
                        <span className={`text-[10.5px] mt-2 font-bold ${isPeakDay ? 'text-[#0c4ca3] font-black' : 'text-slate-500'}`}>
                          {d.day_label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Labels & Peak Indicator */}
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-2 px-1">
                  <span>Weekdays Pattern</span>
                  <span className="text-[#0c4ca3] font-black flex items-center gap-1">
                    🔥 Friday Peak Velocity (18.7%)
                  </span>
                  <span>Weekend Trading</span>
                </div>
              </div>

              <div className="pt-2 mt-3 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium flex justify-between">
                <span>Cycle: <strong>7-Day Weekly Rhythm</strong></span>
                <span>Active Filter: <strong className="uppercase text-[#0c4ca3]">{dayTrxType} Trx</strong></span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3. GOLD WEIGHT TICKET DISTRIBUTION: RE-BALANCED & REALIGNED COMPACT CARDS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#e5a812]" />
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Gold Weight Ticket Distribution (Realigned &amp; Balanced)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Sleek portion breakdown with synchronized order counts and total gold mass distribution
              </p>
            </div>
          </div>

          {/* Sort Switcher: Highest Share vs Weight Order */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-black self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTicketSortMode('share')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                ticketSortMode === 'share'
                  ? 'bg-[#0c4ca3] text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sort: Highest Share First
            </button>
            <button
              type="button"
              onClick={() => setTicketSortMode('order')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                ticketSortMode === 'order'
                  ? 'bg-[#0c4ca3] text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sort: Weight Order
            </button>
          </div>
        </div>

        {/* 100% Macro Portion Share Spectrum Bar */}
        <div className="mb-3.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
          <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
            <span>Portfolio Share Breakdown (100% of Total Tickets):</span>
            <span className="text-[#0c4ca3] font-black">Dominant: &lt; 0.5g ({enrichedBrackets.find(b => b.rank === 1)?.countPct || 73.4}%)</span>
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

        {/* Re-Balanced Compact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {enrichedBrackets.map((wb) => {
            const style = getTicketTierStyle(wb.rank, wb.countPct);
            return (
              <div
                key={wb.weight_bracket}
                className={`p-3 rounded-2xl border transition-all ${style.cardClass} relative overflow-hidden flex flex-col justify-between`}
              >
                <div>
                  {/* Row 1: Bracket, Tier Badge & Share Pill */}
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {wb.weight_bracket}
                      </span>
                      <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${style.badgeClass}`}>
                        {style.badge}
                      </span>
                    </div>
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full border shrink-0 ${style.sharePillClass}`}>
                      {wb.countPct}% Share
                    </span>
                  </div>

                  {/* Row 2: Volume Count & Weight Contribution Side-by-Side */}
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {metricMode === 'weight'
                        ? `${wb.total_weight_g.toLocaleString()}g`
                        : `${wb.count.toLocaleString()} tx`}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">
                      {wb.weightPct}% of gold ({wb.total_weight_g.toLocaleString()}g)
                    </span>
                  </div>
                </div>

                {/* Row 3: Slim Progress Bar & Micro Footer */}
                <div className="mt-2.5 pt-1.5 border-t border-slate-200/60">
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mb-1">
                    <div
                      className={`${style.barClass} h-full rounded-full transition-all`}
                      style={{ width: `${Math.min(100, Math.max(5, wb.countPct))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>{wb.count.toLocaleString()} tickets</span>
                    <span>Ticket Rank #{wb.rank}</span>
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
        // Calculate dynamic bank values based on bankMetricType (%trnx vs %value) and bankSideFilter (all vs buy vs sell)
        const processedBanks = banks.map((b) => {
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
            {/* Bank Settlement Distribution with Metric (%trnx vs %value) & Side (Buy/Sell/All) Toggles */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                {/* Header with Title and Risk Badge */}
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
                  {/* Metric Switcher: % Trnx vs % Value */}
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

                  {/* Side Switcher: All vs Buy Side vs Sell Side */}
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

              {/* Dynamic Footer with Top Gateway Dependency */}
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
                  {branches.slice(0, 5).map((br) => {
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
                <span>Total Network: <strong>{branches.length} locations</strong></span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
