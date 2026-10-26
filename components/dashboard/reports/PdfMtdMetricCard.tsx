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
    const iconProps = { className: 'w-4 h-4 text-[#0c4ca3]' };
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
        return 'Buy Wt (15g)';
      case 'sell_weight_g':
        return 'Sell Wt (15g)';
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
    <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-2xs flex flex-col justify-between relative overflow-hidden min-w-0" style={{ minHeight: '215px' }}>
      {/* Top Accent Stripe */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${isForecastPositive ? 'bg-emerald-500' : isForecastNegative ? 'bg-rose-500' : 'bg-slate-300'}`}
      />

      {/* 1. HEADER (Title Row + Pace Badge Row - never collide) */}
      <div className="w-full pt-1 pb-1 border-b border-slate-100 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-md bg-blue-50 text-[#0c4ca3] shrink-0">
            {renderIcon()}
          </div>
          <span
            className="font-black text-slate-800 text-[12px] truncate block leading-tight"
            title={cleanLabel}
          >
            {cleanLabel}
          </span>
        </div>

        {/* Dedicated Pace Badge Row */}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
            MTD Pace:
          </span>
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tabular-nums ${
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
      <div className="flex flex-col items-center justify-center text-center py-1.5 my-0.5">
        <div
          className="text-[22px] font-black text-slate-900 tracking-tight font-sans block tabular-nums leading-none"
        >
          {metric.current_mtd.toLocaleString()}
        </div>

        {/* MTD Variance Badge */}
        <div className="mt-1.5 flex items-center justify-center">
          {isMtdPositive && (
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px] font-black tabular-nums">
              ▲ +{metric.mtd_variance_percent}%
            </span>
          )}
          {isMtdNegative && (
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px] font-black tabular-nums">
              ▼ {metric.mtd_variance_percent}%
            </span>
          )}
          {!isMtdPositive && !isMtdNegative && (
            <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-black tabular-nums">
              0%
            </span>
          )}
        </div>

        <div className="text-[9.5px] text-slate-500 font-semibold truncate leading-tight mt-1">
          vs. {comparisonMonthLabel} ({metric.comp_mtd.toLocaleString()})
        </div>
      </div>

      {/* 3. PROGRESS BAR */}
      <div className="py-1 px-0.5">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 mb-1 leading-none">
          <span>Prog: <strong className="text-slate-800">{targetAchievedPct}%</strong></span>
          <span className="text-slate-400">Tgt: {metric.full_comp_month.toLocaleString()}</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full ${isAheadOfPace ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, targetAchievedPct)}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
            style={{ left: `${Math.min(100, elapsedMonthPct)}%` }}
          />
        </div>
      </div>

      {/* 4. EST. MONTH END & VS FULL (Stacked cleanly - no collisions) */}
      <div className="py-1 border-t border-slate-100 text-[10px]">
        <div className="flex items-center justify-between leading-tight">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Est End:</span>
          <span className="font-black text-slate-900 text-[11px] tabular-nums">
            {metric.est_month_end.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between leading-tight mt-0.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase">vs {comparisonMonthLabel}:</span>
          <span
            className={`text-[10px] font-black tabular-nums ${
              isForecastPositive ? 'text-emerald-700' : isForecastNegative ? 'text-rose-700' : 'text-slate-600'
            }`}
          >
            {isForecastPositive ? `▲ +${metric.forecast_variance_percent}%` : isForecastNegative ? `▼ ${metric.forecast_variance_percent}%` : '0%'}
          </span>
        </div>
      </div>

      {/* 5. VELOCITY & BENCHMARK NEED (2-column grid layout) */}
      <div className="mt-1 p-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-[9px] grid grid-cols-2 gap-1 items-center">
        <div className="flex items-center gap-1 shrink-0 overflow-hidden">
          <Gauge className="w-3 h-3 text-[#0c4ca3] shrink-0" />
          <span className="text-slate-500 font-semibold">Vel:</span>
          <span className="font-black text-slate-800 tabular-nums truncate">{currentDailyRate.toLocaleString()}</span>
          <span className="text-slate-400 text-[8px]">/d</span>
        </div>
        <div className="flex items-center justify-end gap-1 shrink-0 overflow-hidden">
          <span className="text-slate-500 font-semibold">Need:</span>
          <span className={`font-black tabular-nums truncate ${targetDailyRate > currentDailyRate ? 'text-amber-700' : 'text-emerald-700'}`}>
            {targetDailyRate.toLocaleString()}
          </span>
          <span className="text-slate-400 text-[8px]">/d</span>
        </div>
      </div>
    </div>
  );
}
