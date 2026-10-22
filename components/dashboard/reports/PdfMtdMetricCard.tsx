'use client';

import React from 'react';
import { MtdMetricItem } from '@/lib/types/mtd.types';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Tag, 
  Scale, 
  Layers, 
  UserPlus, 
  ArrowLeftRight,
  Gauge,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface PdfMtdMetricCardProps {
  metric: MtdMetricItem;
  comparisonMonthLabel: string;
  elapsedDays?: number;
  totalDays?: number;
}

export function PdfMtdMetricCard({
  metric,
  comparisonMonthLabel,
  elapsedDays = 21,
  totalDays = 31,
}: PdfMtdMetricCardProps) {
  const renderIcon = () => {
    const iconProps = { className: 'w-3.5 h-3.5 text-[#0c4ca3]' };
    switch (metric.icon_name) {
      case 'shopping-bag':
        return <ShoppingBag {...iconProps} />;
      case 'shopping-cart':
        return <ShoppingCart {...iconProps} />;
      case 'tag':
        return <Tag {...iconProps} />;
      case 'scale':
        return <Scale {...iconProps} />;
      case 'layers':
        return <Layers {...iconProps} />;
      case 'user-plus':
        return <UserPlus {...iconProps} />;
      case 'arrow-left-right':
        return <ArrowLeftRight {...iconProps} />;
      default:
        return <ShoppingBag {...iconProps} />;
    }
  };

  const isMtdPositive = metric.mtd_variance_percent > 0;
  const isMtdNegative = metric.mtd_variance_percent < 0;
  const isForecastPositive = metric.forecast_variance_percent > 0;
  const isForecastNegative = metric.forecast_variance_percent < 0;

  // Velocity calculations
  const currentDailyRate = Math.round(metric.current_mtd / Math.max(1, elapsedDays));
  const targetDailyRate = Math.round(metric.full_comp_month / Math.max(1, totalDays));

  // Pacing calculations
  const targetAchievedPct = metric.full_comp_month > 0
    ? Math.round((metric.current_mtd / metric.full_comp_month) * 100)
    : 0;
  const elapsedMonthPct = Math.round((elapsedDays / totalDays) * 100);
  const pacingDelta = targetAchievedPct - elapsedMonthPct;
  const isAheadOfPace = pacingDelta >= 0;

  // Clean concise label specifically for PDF single-line fit
  const cleanLabel = (() => {
    switch (metric.id) {
      case 'buy_weight_g':
        return 'Buy Wt';
      case 'sell_weight_g':
        return 'Sell Wt';
      case 'buy_transactions':
        return 'Buy Trx';
      case 'sell_transactions':
        return 'Sell Trx';
      case 'new_customers':
        return 'NC';
      case 'total_transactions':
        return 'Total Trx';
      case 'withdraw_15g':
        return 'Withdraw';
      default:
        return (metric.label || '')
          .replace('Transaction', 'Trx')
          .replace('New Customer', 'NC')
          .replace('Weight', 'Wt')
          .replace(' (baht)', '')
          .replace(' (Baht)', '')
          .replace(' (15g)', '');
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-2 shadow-2xs flex flex-col justify-between relative overflow-hidden min-w-0">
      {/* Top Accent Stripe */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 ${
          isForecastPositive ? 'bg-emerald-500' : isForecastNegative ? 'bg-rose-500' : 'bg-slate-300'
        }`} 
      />

      {/* 1. HEADER (Strict 1-Line: Icon + Name ... Compact Pace Badge, ZERO Overlap) */}
      <div className="w-full mb-1 pt-0.5 min-w-0">
        <div className="flex items-center justify-between gap-1 w-full min-w-0 flex-nowrap">
          <div className="flex items-center gap-1 min-w-0 shrink">
            <div className="p-0.5 rounded bg-blue-50 text-[#0c4ca3] shrink-0">
              {renderIcon()}
            </div>
            <span 
              className="font-black text-slate-800 text-[10.5px] truncate tracking-tight whitespace-nowrap"
              title={cleanLabel}
            >
              {cleanLabel}
            </span>
          </div>

          {/* Ahead / Behind Pace Badge */}
          <span 
            className={`text-[8px] font-black px-1 py-0.5 rounded shrink-0 uppercase whitespace-nowrap tracking-tighter ${
              isAheadOfPace 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isAheadOfPace ? `+${pacingDelta}% Pace` : `${pacingDelta}% Pace`}
          </span>
        </div>
      </div>

      {/* 2. CURRENT MTD ACTUALS */}
      <div className="flex flex-col items-center justify-center text-center py-0.5">
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none mb-0.5 font-sans">
          {metric.current_mtd.toLocaleString()}
        </div>

        {/* MTD Variance Badge */}
        <div className="flex items-center justify-center gap-1 font-black text-[10.5px] mb-0.5">
          {isMtdPositive && (
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
              ▲ +{metric.mtd_variance_percent}%
            </span>
          )}
          {isMtdNegative && (
            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-200">
              ▼ {metric.mtd_variance_percent}%
            </span>
          )}
          {!isMtdPositive && !isMtdNegative && (
            <span className="text-slate-600 bg-slate-50 px-1.5 py-0.2 rounded-full border border-slate-200">0%</span>
          )}
        </div>

        <div className="text-[9px] text-slate-500 font-medium truncate">
          vs. {comparisonMonthLabel} ({metric.comp_mtd.toLocaleString()})
        </div>
      </div>

      {/* 3. PROGRESS BAR */}
      <div className="my-1 px-0.5">
        <div className="flex items-center justify-between text-[8.5px] font-bold text-slate-500 mb-0.5">
          <span>Prog: {targetAchievedPct}%</span>
          <span className="text-slate-400">Tgt: {metric.full_comp_month.toLocaleString()}</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
          <div 
            className={`h-full rounded-full ${
              isAheadOfPace ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, targetAchievedPct)}%` }}
          />
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
            style={{ left: `${Math.min(100, elapsedMonthPct)}%` }}
          />
        </div>
      </div>

      <div className="w-full h-[1px] bg-slate-200/80 my-1" />

      {/* 4. EST. MONTH END & VS FULL (Guaranteed 1-Line Row) */}
      <div className="pt-0.5 pb-0.5">
        <div className="flex items-center justify-between gap-1 text-[9px] w-full min-w-0 flex-nowrap whitespace-nowrap">
          <div className="flex items-baseline gap-1 shrink-0">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Est End:</span>
            <span className="font-black text-slate-900 text-[11px] font-sans">
              {metric.est_month_end.toLocaleString()}
            </span>
          </div>

          <div className="flex items-baseline gap-0.5 shrink-0">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">vs {comparisonMonthLabel}:</span>
            <span className={`text-[9.5px] font-black ${
              isForecastPositive ? 'text-emerald-700' : isForecastNegative ? 'text-rose-700' : 'text-slate-600'
            }`}>
              {isForecastPositive ? `▲+${metric.forecast_variance_percent}%` : isForecastNegative ? `▼${metric.forecast_variance_percent}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. VELOCITY & BENCHMARK NEED (Guaranteed 100% visible, no cut off) */}
      <div className="mt-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/90 text-[8.5px] flex items-center justify-between gap-1 w-full min-w-0 flex-nowrap whitespace-nowrap">
        <div className="flex items-center gap-0.5 shrink-0">
          <Gauge className="w-2.5 h-2.5 text-[#0c4ca3] shrink-0" />
          <span className="text-slate-500 font-semibold">Vel:</span>
          <span className="font-black text-slate-800">{currentDailyRate.toLocaleString()}</span>
          <span className="text-slate-400 text-[7.5px]">/d</span>
        </div>
        <span className="text-slate-300 shrink-0">|</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-slate-500 font-semibold">Need:</span>
          <span className={`font-black ${targetDailyRate > currentDailyRate ? 'text-amber-700' : 'text-emerald-700'}`}>
            {targetDailyRate.toLocaleString()}
          </span>
          <span className="text-slate-400 text-[7.5px]">/d</span>
        </div>
      </div>
    </div>
  );
}
