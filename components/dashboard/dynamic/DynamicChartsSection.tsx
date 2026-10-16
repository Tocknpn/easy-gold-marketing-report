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
  Check
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
}

const BASELINE_MONTH_TREND: TrendPoint[] = [
  { label: "May '26", subLabel: 'Closed', buy_val: 245000, sell_val: 82000, total_val: 327000, buy_tx: 98200, sell_tx: 37000, total_tx: 135200, buy_weight_g: 165400, sell_weight_g: 72100, net_weight_g: 93300 },
  { label: "Jun '26", subLabel: 'Closed', buy_val: 268000, sell_val: 89500, total_val: 357500, buy_tx: 102400, sell_tx: 40400, total_tx: 142800, buy_weight_g: 178200, sell_weight_g: 79400, net_weight_g: 98800 },
  { label: "Jul '26", subLabel: 'Closed', buy_val: 295000, sell_val: 98400, total_val: 393400, buy_tx: 112800, sell_tx: 45600, total_tx: 158400, buy_weight_g: 198500, sell_weight_g: 88200, net_weight_g: 110300 },
  { label: "Aug '26", subLabel: 'Closed', buy_val: 310500, sell_val: 101200, total_val: 411700, buy_tx: 116400, sell_tx: 45700, total_tx: 162100, buy_weight_g: 208400, sell_weight_g: 91500, net_weight_g: 116900 },
  { label: "Sep '26", subLabel: 'Record', buy_val: 337200, sell_val: 104200, total_val: 441400, buy_tx: 123977, sell_tx: 47724, total_tx: 171701, buy_weight_g: 225716, sell_weight_g: 98490, net_weight_g: 127226 },
  { label: "Oct '26", subLabel: 'MTD Pace', buy_val: 382400, sell_val: 115600, total_val: 498000, buy_tx: 135126, sell_tx: 48569, total_tx: 183695, buy_weight_g: 242500, sell_weight_g: 105200, net_weight_g: 137300 },
];

const BASELINE_WEEK_TREND: TrendPoint[] = [
  { label: 'W37', subLabel: 'Sep 08-14', buy_val: 68400, sell_val: 24100, total_val: 92500, buy_tx: 27812, sell_tx: 10387, total_tx: 38199, buy_weight_g: 43755, sell_weight_g: 21180, net_weight_g: 22575 },
  { label: 'W38', subLabel: 'Sep 15-21', buy_val: 65500, sell_val: 26800, total_val: 92300, buy_tx: 25586, sell_tx: 11932, total_tx: 37765, buy_weight_g: 43755, sell_weight_g: 25905, net_weight_g: 17850 },
  { label: 'W39', subLabel: 'Sep 22-28', buy_val: 62800, sell_val: 25200, total_val: 88000, buy_tx: 24932, sell_tx: 11148, total_tx: 37134, buy_weight_g: 39150, sell_weight_g: 17985, net_weight_g: 21165 },
  { label: 'W40', subLabel: 'Sep 29-Oct 05', buy_val: 105400, sell_val: 39600, total_val: 145000, buy_tx: 42150, sell_tx: 17890, total_tx: 60431, buy_weight_g: 68400, sell_weight_g: 29800, net_weight_g: 38600 },
  { label: 'W41', subLabel: 'Oct 06-12', buy_val: 71200, sell_val: 25100, total_val: 96300, buy_tx: 28420, sell_tx: 11104, total_tx: 39744, buy_weight_g: 45900, sell_weight_g: 18700, net_weight_g: 27200 },
  { label: 'W42', subLabel: 'Oct 13-18 (P)', buy_val: 12500, sell_val: 4350, total_val: 16850, buy_tx: 3612, sell_tx: 1462, total_tx: 5074, buy_weight_g: 2700, sell_weight_g: 3690, net_weight_g: -990 },
];

const BASELINE_DAY_TREND: TrendPoint[] = [
  { label: 'Oct 01', subLabel: 'Wed', buy_val: 10250, sell_val: 3740, total_val: 13990, buy_tx: 4280, sell_tx: 1640, total_tx: 5920, buy_weight_g: 455, sell_weight_g: 172, net_weight_g: 283 },
  { label: 'Oct 02', subLabel: 'Thu', buy_val: 10680, sell_val: 3890, total_val: 14570, buy_tx: 4410, sell_tx: 1700, total_tx: 6110, buy_weight_g: 472, sell_weight_g: 179, net_weight_g: 293 },
  { label: 'Oct 03', subLabel: 'Fri', buy_val: 10120, sell_val: 3780, total_val: 13900, buy_tx: 4190, sell_tx: 1650, total_tx: 5840, buy_weight_g: 448, sell_weight_g: 174, net_weight_g: 274 },
  { label: 'Oct 04', subLabel: 'Sat', buy_val: 8540, sell_val: 3210, total_val: 11750, buy_tx: 3520, sell_tx: 1400, total_tx: 4920, buy_weight_g: 378, sell_weight_g: 148, net_weight_g: 230 },
  { label: 'Oct 05', subLabel: 'Sun', buy_val: 11050, sell_val: 4020, total_val: 15070, buy_tx: 4580, sell_tx: 1760, total_tx: 6340, buy_weight_g: 489, sell_weight_g: 185, net_weight_g: 304 },
  { label: 'Oct 06', subLabel: 'Mon', buy_val: 10540, sell_val: 3850, total_val: 14390, buy_tx: 4370, sell_tx: 1680, total_tx: 6050, buy_weight_g: 466, sell_weight_g: 177, net_weight_g: 289 },
  { label: 'Oct 07', subLabel: 'Tue', buy_val: 10760, sell_val: 3940, total_val: 14700, buy_tx: 4460, sell_tx: 1720, total_tx: 6180, buy_weight_g: 476, sell_weight_g: 181, net_weight_g: 295 },
  { label: 'Oct 08', subLabel: 'Wed', buy_val: 10080, sell_val: 3710, total_val: 13790, buy_tx: 4170, sell_tx: 1620, total_tx: 5790, buy_weight_g: 445, sell_weight_g: 170, net_weight_g: 275 },
  { label: 'Oct 09', subLabel: 'Thu', buy_val: 11260, sell_val: 4100, total_val: 15360, buy_tx: 4660, sell_tx: 1790, total_tx: 6450, buy_weight_g: 498, sell_weight_g: 189, net_weight_g: 309 },
  { label: 'Oct 10', subLabel: 'Fri', buy_val: 12020, sell_val: 4370, total_val: 16390, buy_tx: 4980, sell_tx: 1910, total_tx: 6890, buy_weight_g: 531, sell_weight_g: 201, net_weight_g: 330 },
  { label: 'Oct 11', subLabel: 'Sat', buy_val: 10480, sell_val: 3960, total_val: 14440, buy_tx: 4328, sell_tx: 1734, total_tx: 6062, buy_weight_g: 464, sell_weight_g: 182, net_weight_g: 282 },
  { label: 'Oct 12', subLabel: 'Sun', buy_val: 8760, sell_val: 3340, total_val: 12100, buy_tx: 3612, sell_tx: 1462, total_tx: 5074, buy_weight_g: 388, sell_weight_g: 154, net_weight_g: 234 },
];

export function DynamicChartsSection({
  hourly,
  banks,
  branches,
  weightBrackets,
  measures,
}: DynamicChartsSectionProps) {
  // Chart Global Metric Mode: 'tx' (Transactions) | 'weight' (Gold Grams) | 'amount' (Revenue M LAK)
  const [metricMode, setMetricMode] = useState<'tx' | 'weight' | 'amount'>('tx');

  // Trend Chart Granularity State: 'day' | 'week' | 'month'
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'month'>('month');
  
  // Trend Chart Metric Dimension: 'value' (Revenue M LAK) | 'tx' (Transactions) | 'weight' (Gold Grams)
  const [trendMetric, setTrendMetric] = useState<'value' | 'tx' | 'weight'>('value');

  // Trend Chart Series Visibility Toggle (Legend filters)
  const [showBuySeries, setShowBuySeries] = useState<boolean>(true);
  const [showSellSeries, setShowSellSeries] = useState<boolean>(true);
  const [showNetSeries, setShowNetSeries] = useState<boolean>(true);

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

  const maxTrendVal = useMemo(() => {
    const vals: number[] = [];
    activeTrendData.forEach((p) => {
      if (showBuySeries) vals.push(getTrendPointVal(p, 'buy'));
      if (showSellSeries) vals.push(getTrendPointVal(p, 'sell'));
      if (showNetSeries) vals.push(getTrendPointVal(p, 'total'));
    });
    return Math.max(...vals, 1);
  }, [activeTrendData, trendMetric, showBuySeries, showSellSeries, showNetSeries]);

  const totalBuyTrendSum = activeTrendData.reduce((acc, p) => acc + getTrendPointVal(p, 'buy'), 0);
  const totalSellTrendSum = activeTrendData.reduce((acc, p) => acc + getTrendPointVal(p, 'sell'), 0);
  const totalNetTrendSum = totalBuyTrendSum - totalSellTrendSum;

  return (
    <div className="space-y-5 mb-6">
      {/* ========================================================================= */}
      {/* 1. HERO CUSTOMIZABLE TREND CHART (DAY / WEEK / MONTH & VALUE / TX / GOLD) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        {/* Trend Chart Control Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3.5 mb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0c4ca3] flex items-center justify-center border border-blue-200">
              <TrendingUp className="w-4 h-4 font-black" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                Multi-Period Trend Dynamics ({trendUnitLabel})
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Customizable multi-grain trajectory across Month, Week, or Day with multi-series toggles
              </p>
            </div>
          </div>

          {/* Granularity & Metric Selectors */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Metric Selector: Value / Tx / Weight */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-black text-slate-600">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">Metric:</span>
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
        <div className="flex flex-wrap items-center justify-between bg-slate-50/80 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 mb-4 gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Legend &amp; Series:</span>
            
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
              <span className="w-2.5 h-2.5 rounded-full bg-[#0c4ca3]" />
              <span>Buy {trendMetric === 'value' ? 'Turnover' : 'Volume'}:</span>
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
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span>Sell {trendMetric === 'value' ? 'Liquidation' : 'Volume'}:</span>
              <span className="text-rose-700">{totalSellTrendSum.toLocaleString()} {trendUnitLabel}</span>
            </button>

            {/* Net / Total Flow Series Legend Toggle */}
            <button
              type="button"
              onClick={() => setShowNetSeries(!showNetSeries)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black transition-all ${
                showNetSeries
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Net Balance (In - Out):</span>
              <span className="text-emerald-700">+{totalNetTrendSum.toLocaleString()} {trendUnitLabel}</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            Grain: <strong className="text-slate-800 uppercase">{trendGranularity}</strong> ({activeTrendData.length} Data Points)
          </div>
        </div>

        {/* Trend Chart Visual Canvas (Responsive Pure SVG / Bar Chart) */}
        <div className="h-60 sm:h-72 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
          {activeTrendData.map((pt, idx) => {
            const buyVal = getTrendPointVal(pt, 'buy');
            const sellVal = getTrendPointVal(pt, 'sell');
            const totalVal = getTrendPointVal(pt, 'total');
            const netVal = buyVal - sellVal;

            const buyHeightPct = Math.max(4, Math.round((buyVal / maxTrendVal) * 100));
            const sellHeightPct = Math.max(4, Math.round((sellVal / maxTrendVal) * 100));
            const isHighest = buyVal === Math.max(...activeTrendData.map((p) => getTrendPointVal(p, 'buy')));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Floating Tooltip */}
                <div className="absolute -top-20 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-xl pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
                  <div className="font-black text-amber-300 mb-0.5">{pt.label} {pt.subLabel ? `(${pt.subLabel})` : ''}</div>
                  <div className="flex items-center gap-2 text-blue-200">
                    <span>🔵 Buy:</span> <strong>{buyVal.toLocaleString()} {trendUnitLabel}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-rose-200">
                    <span>🔴 Sell:</span> <strong>{sellVal.toLocaleString()} {trendUnitLabel}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300 font-bold border-t border-slate-700 pt-0.5 mt-0.5">
                    <span>⚖️ Net:</span> <strong>{netVal >= 0 ? '+' : ''}{netVal.toLocaleString()} {trendUnitLabel}</strong>
                  </div>
                </div>

                {/* Highest Marker Badge */}
                {isHighest && (
                  <span className="text-[8.5px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 mb-1 absolute -top-5">
                    Peak
                  </span>
                )}

                {/* Dual Column Bars (Buy vs Sell) */}
                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1.5 h-full">
                  {/* Buy Bar */}
                  {showBuySeries && (
                    <div
                      className={`flex-1 rounded-t-md transition-all group-hover:brightness-110 ${
                        isHighest ? 'bg-gradient-to-t from-[#0c4ca3] to-blue-500' : 'bg-[#0c4ca3]'
                      }`}
                      style={{ height: `${buyHeightPct}%` }}
                    />
                  )}

                  {/* Sell Bar */}
                  {showSellSeries && (
                    <div
                      className="flex-1 rounded-t-md transition-all group-hover:brightness-110 bg-rose-500/90"
                      style={{ height: `${sellHeightPct}%` }}
                    />
                  )}
                </div>

                {/* Sub-label */}
                <span className="text-[10px] font-bold text-slate-600 mt-2 truncate w-full text-center">
                  {pt.label}
                </span>
                {pt.subLabel && (
                  <span className="text-[8.5px] text-slate-400 font-medium truncate w-full text-center -mt-0.5">
                    {pt.subLabel}
                  </span>
                )}
              </div>
            );
          })}
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
      {/* 2. ACTIVITY CURVES: HOURLY ACTIVITY & DAY ACTIVITY CURVE (TRX)            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card A: Hourly Trading Activity (00:00 - 23:00) with Buy/Sell Filter */}
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

            {/* 24-Column Mini Bar Chart */}
            <div className="h-44 flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 px-1 border-b border-slate-100">
              {hourly.map((h) => {
                const val = getHourlyVal(h);
                const heightPct = Math.max(4, Math.round((val / maxHourlyVal) * 100));
                const isPeak = h.hour >= 9 && h.hour <= 16;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                      <strong>{h.hour_label}</strong>: {val.toLocaleString()} {unitLabel} (Buy: {h.buy_weight_g}g | Sell: {h.sell_weight_g}g)
                    </div>

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

        {/* Card B: Day Activity Curve (Trx) with Buy/Sell Filter */}
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

            {/* 7-Day Day-of-Week Bar Chart */}
            <div className="h-44 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {BASELINE_DAY_OF_WEEK.map((d) => {
                const val = getDayVal(d);
                const heightPct = Math.max(5, Math.round((val / maxDayVal) * 100));
                const isPeakDay = d.day_code === 'fri';
                return (
                  <div key={d.day_code} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1.5 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-md">
                      <div className="font-bold text-amber-300">{d.day_full}</div>
                      <div>{val.toLocaleString()} {unitLabel} (Buy: {d.buy_tx.toLocaleString()} | Sell: {d.sell_tx.toLocaleString()})</div>
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
                    <span className={`text-[10px] mt-2 font-bold ${isPeakDay ? 'text-[#0c4ca3] font-black' : 'text-slate-500'}`}>
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

      {/* ========================================================================= */}
      {/* 3. GOLD WEIGHT TICKET DISTRIBUTION WITH ENHANCED PORTION SHARE COLORING   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#e5a812]" />
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Gold Weight Ticket Distribution (Color-Coded Portion Share)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Color intensity indicates portion volume (Green/Gold = Highest Dominance, Slate = Lowest Minor Portion)
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
        <div className="mb-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
          <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
            <span>Portfolio Share Breakdown (100% of Total Tickets):</span>
            <span className="text-[#0c4ca3]">Dominant: &lt; 0.5g ({enrichedBrackets.find(b => b.rank === 1)?.countPct || 73.4}%)</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200 gap-0.5">
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

        {/* Color-Coded Bracket Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {enrichedBrackets.map((wb) => {
            const style = getTicketTierStyle(wb.rank, wb.countPct);
            return (
              <div
                key={wb.weight_bracket}
                className={`p-3.5 rounded-2xl border transition-all ${style.cardClass} relative overflow-hidden flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {wb.weight_bracket}
                    </span>
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full border ${style.sharePillClass}`}>
                      {wb.countPct}% Share
                    </span>
                  </div>

                  {/* Volume Value */}
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-black text-slate-900">
                      {metricMode === 'weight'
                        ? `${wb.total_weight_g.toLocaleString()}g`
                        : `${wb.count.toLocaleString()} tx`}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${style.badgeClass}`}>
                      {style.badge}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Weight Share Sub-line */}
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`${style.barClass} h-full rounded-full transition-all`}
                      style={{ width: `${Math.min(100, Math.max(5, wb.countPct))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>{wb.count.toLocaleString()} orders</span>
                    <span>{wb.weightPct}% of total gold ({wb.total_weight_g.toLocaleString()}g)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BANK & BRANCH SETTLEMENT CHANNELS (RETAINED & POLISHED)                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bank Settlement Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#0c4ca3]" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Bank Settlement Distribution
                </h3>
              </div>
              {hasHighBankConcentration && (
                <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>High Channel Risk</span>
                </span>
              )}
            </div>

            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {banks.slice(0, 6).map((b) => {
                const val = getBankVal(b);
                const barWidth = Math.max(4, Math.round((val / maxBankVal) * 100));
                return (
                  <div key={b.bank_name}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-800 flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-[#0c4ca3]" />
                        {b.bank_name}
                      </span>
                      <span className="text-slate-500 font-semibold shrink-0">
                        {val.toLocaleString()} {unitLabel} ({b.share_pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0c4ca3] h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-400 font-medium flex justify-between mt-3">
            <span>Primary settlement gateway: <strong>{topBank?.bank_name || 'BCEL'}</strong></span>
            <span>Dependency: <strong>{topBank?.share_pct || 72}%</strong></span>
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
    </div>
  );
}
