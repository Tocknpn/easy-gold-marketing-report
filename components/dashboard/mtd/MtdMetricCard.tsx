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
  TrendingUp,
  TrendingDown,
  Gauge,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface MtdMetricCardProps {
  metric: MtdMetricItem;
  comparisonMonthLabel: string;
  elapsedDays?: number;
  totalDays?: number;
}

export function MtdMetricCard({ 
  metric, 
  comparisonMonthLabel,
  elapsedDays = 11,
  totalDays = 31
}: MtdMetricCardProps) {
  // Render corresponding icon
  const renderIcon = () => {
    const iconProps = { className: 'w-4 h-4 sm:w-5 sm:h-5 text-[#0c4ca3]' };
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

  // Senior Data Analyst Pacing Calculations
  // Current daily velocity achieved in current month MTD
  const currentDailyRate = Math.round(metric.current_mtd / Math.max(1, elapsedDays));
  // Required benchmark daily run-rate across the month to hit previous month total (e.g. 123,977 / 31 = 3,999/d)
  const targetDailyRate = Math.round(metric.full_comp_month / Math.max(1, totalDays));
  
  // Pacing Health: % Target Achieved vs % Month Elapsed
  const targetAchievedPct = metric.full_comp_month > 0 
    ? Math.round((metric.current_mtd / metric.full_comp_month) * 100) 
    : 0;
  const elapsedMonthPct = Math.round((elapsedDays / totalDays) * 100);
  const pacingDelta = targetAchievedPct - elapsedMonthPct;
  const isAheadOfPace = pacingDelta >= 0;

  // Formatted compact card title
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
    <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
      {/* Top Accent Stripe based on Forecast Health */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 transition-all ${
          isForecastPositive ? 'bg-emerald-500' : isForecastNegative ? 'bg-rose-500' : 'bg-slate-300'
        }`} 
      />

      {/* 1. Header with Icon, Label and Pacing Pill */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-2 pt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <div className="p-1 rounded-lg bg-blue-50 text-[#0c4ca3] shrink-0">
              {renderIcon()}
            </div>
            <h4 className="font-black text-slate-800 text-[11px] sm:text-xs tracking-tight whitespace-nowrap" title={cleanLabel}>
              {cleanLabel}
            </h4>
          </div>

          {/* Ahead / Behind Pace Badge */}
          <span 
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 uppercase tracking-tighter ${
              isAheadOfPace 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
            title={`Month is ${elapsedMonthPct}% elapsed. This metric has achieved ${targetAchievedPct}% of target.`}
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
        <div className="flex flex-col items-center justify-center text-center pb-2.5 pt-1">
          {/* Big Number */}
          <div className="text-2xl sm:text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight leading-none mb-1 font-sans">
            {metric.current_mtd.toLocaleString()}
          </div>

          {/* MTD Variance Badge */}
          <div className="flex items-center justify-center gap-1 font-extrabold text-xs sm:text-sm mb-1">
            {isMtdPositive && (
              <span className="text-emerald-700 flex items-center bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ▲ +{metric.mtd_variance_percent}%
              </span>
            )}
            {isMtdNegative && (
              <span className="text-rose-700 flex items-center bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                ▼ {metric.mtd_variance_percent}%
              </span>
            )}
            {!isMtdPositive && !isMtdNegative && (
              <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">0%</span>
            )}
          </div>

          {/* vs Comparison Period Text */}
          <div className="text-[11px] text-slate-500 font-medium">
            vs. {comparisonMonthLabel} ({metric.comp_mtd.toLocaleString()})
          </div>
        </div>

        {/* Progress Bar: Target Achieved vs Month Elapsed */}
        <div className="my-2 px-1">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
            <span>Progress: {targetAchievedPct}%</span>
            <span className="text-slate-400">Target: {metric.full_comp_month.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
            {/* Target Progress Bar */}
            <div 
              className={`h-full rounded-full transition-all ${
                isAheadOfPace ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, targetAchievedPct)}%` }}
            />
            {/* Time Elapsed Marker Line */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
              style={{ left: `${Math.min(100, elapsedMonthPct)}%` }}
              title={`Day ${elapsedDays}/${totalDays} (${elapsedMonthPct}% elapsed)`}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-[1px] bg-slate-200/80 my-2.5" />

      {/* 3. Bottom Half: Est. Month End Forecast & Required Daily Run-Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-left">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
              Est. Month End
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-none mt-0.5">
              {metric.est_month_end.toLocaleString()}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
              vs. Full {comparisonMonthLabel}
            </span>
            <div className="text-xs sm:text-sm font-black mt-0.5">
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

        {/* Dual Comparison Badge: Compare with Target */}
        {metric.target_val && (
          <div className="px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[10px] flex items-center justify-between">
            <span className="font-bold text-amber-900 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              2026 Target: {metric.target_val.toLocaleString()}
            </span>
            <span className={`font-mono font-black ${
              (metric.target_est_hit_percent || 0) >= 100 
                ? 'text-emerald-700' 
                : (metric.target_est_hit_percent || 0) >= 90 
                ? 'text-blue-700' 
                : 'text-amber-800'
            }`}>
              {metric.target_est_hit_percent || Math.round((metric.est_month_end / metric.target_val) * 100)}% Est. Hit
            </span>
          </div>
        )}

        {/* Senior Analyst Required Daily Run-Rate Callout (Guaranteed Single Row) */}
        <div className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[10px] sm:text-[10.5px] flex items-center justify-between gap-1 flex-nowrap whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-1 text-slate-500 font-semibold shrink-0">
            <Gauge className="w-3 h-3 text-[#0c4ca3] shrink-0" />
            <span>Velocity:</span>
          </div>
          <div className="font-extrabold text-slate-800 shrink-0 flex items-center gap-1">
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
