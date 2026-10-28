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
  AlertCircle,
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

  const cleanLabel = (() => {
    switch (metric.id) {
      case 'buy_weight_g':
        return 'Buy Weight (baht)';
      case 'sell_weight_g':
        return 'Sell Weight (Baht)';
      case 'buy_transactions':
        return 'Buy Trx';
      case 'sell_transactions':
        return 'Sell Trx';
      case 'new_customers':
        return 'NC';
      case 'total_transactions':
        return 'Total Trx';
      case 'withdraw_15g':
        return 'Withdraw (15g)';
      default:
        return (metric.label || '')
          .replace('Transaction', 'Trx')
          .replace('New Customer', 'NC');
    }
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden min-w-0 flex-1">
      {/* Top Accent Stripe */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          isForecastPositive ? 'bg-emerald-500' : isForecastNegative ? 'bg-rose-500' : 'bg-slate-300'
        }`}
      />

      {/* 1. Header with Icon, Label and Pacing Pill */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-1.5 pt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <div className="p-1 rounded-lg bg-blue-50 text-[#0c4ca3] shrink-0">
              {renderIcon()}
            </div>
            <h4 className="font-black text-slate-800 text-xs tracking-tight whitespace-nowrap" title={cleanLabel}>
              {cleanLabel}
            </h4>
          </div>

          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 uppercase tracking-tighter ${
              isAheadOfPace
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isAheadOfPace ? (
              <>
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>+{pacingDelta}% Pace</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-2.5 h-2.5" />
                <span>{pacingDelta}% Pace</span>
              </>
            )}
          </span>
        </div>

        {/* 2. Current MTD Actuals */}
        <div className="flex flex-col items-center justify-center text-center pb-2 pt-0.5">
          <div className="text-[28px] font-black text-slate-900 tracking-tight leading-snug mb-0.5 font-sans tabular-nums">
            {metric.current_mtd.toLocaleString()}
          </div>

          <div className="flex items-center justify-center gap-1 font-extrabold text-xs mb-1">
            {isMtdPositive && (
              <span className="text-emerald-700 flex items-center bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 tabular-nums">
                ▲ +{metric.mtd_variance_percent}%
              </span>
            )}
            {isMtdNegative && (
              <span className="text-rose-700 flex items-center bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 tabular-nums">
                ▼ {metric.mtd_variance_percent}%
              </span>
            )}
            {!isMtdPositive && !isMtdNegative && (
              <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 tabular-nums">
                0%
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium leading-snug">
            vs. {comparisonMonthLabel} ({metric.comp_mtd.toLocaleString()})
          </div>
        </div>

        {/* 3. Progress Bar */}
        <div className="my-1 px-0.5">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 leading-snug">
            <span>Progress: {targetAchievedPct}%</span>
            <span className="text-slate-400">Target: {metric.full_comp_month.toLocaleString()}</span>
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
      </div>

      {/* Divider */}
      <div className="w-full h-[1px] bg-slate-200/80 my-1.5" />

      {/* 4. Bottom Half: Est. Month End & Velocity */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-left">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block leading-snug">
              Est. Month End
            </span>
            <div className="text-lg font-black text-slate-800 tracking-tight leading-snug tabular-nums">
              {metric.est_month_end.toLocaleString()}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block leading-snug">
              vs. Full {comparisonMonthLabel}
            </span>
            <div className="text-xs font-black leading-snug tabular-nums">
              {isForecastPositive && (
                <span className="text-emerald-700">▲ +{metric.forecast_variance_percent}%</span>
              )}
              {isForecastNegative && (
                <span className="text-rose-700">▼ {metric.forecast_variance_percent}%</span>
              )}
              {!isForecastPositive && !isForecastNegative && (
                <span className="text-slate-600">0%</span>
              )}
            </div>
          </div>
        </div>

        {/* Velocity Callout (Single Clean Row) */}
        <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[10.5px] flex items-center justify-between gap-1 whitespace-nowrap">
          <div className="flex items-center gap-1 text-slate-500 font-semibold shrink-0">
            <Gauge className="w-3.5 h-3.5 text-[#0c4ca3] shrink-0" />
            <span>Velocity:</span>
          </div>
          <div className="font-extrabold text-slate-800 shrink-0 flex items-center gap-1 tabular-nums">
            <span>{currentDailyRate.toLocaleString()}</span>
            <span className="text-slate-400 font-normal">/d</span>
            <span className="text-slate-300">|</span>
            <span className={targetDailyRate > currentDailyRate ? 'text-amber-700' : 'text-emerald-700'}>
              Need {targetDailyRate.toLocaleString()}/d
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
