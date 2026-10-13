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
  ArrowLeftRight 
} from 'lucide-react';

interface MtdMetricCardProps {
  metric: MtdMetricItem;
  comparisonMonthLabel: string;
}

export function MtdMetricCard({ metric, comparisonMonthLabel }: MtdMetricCardProps) {
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

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all flex flex-col justify-between">
      {/* 1. Header with Icon and Label */}
      <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
        <div className="shrink-0">{renderIcon()}</div>
        <h4 className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight text-center">
          {metric.label}
        </h4>
      </div>

      {/* 2. Top Half: Current MTD Actuals */}
      <div className="flex flex-col items-center justify-center text-center pb-3">
        {/* Big Number */}
        <div className="text-2xl sm:text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight leading-none mb-1.5 font-sans">
          {metric.current_mtd.toLocaleString()}
        </div>

        {/* MTD Variance Badge */}
        <div className="flex items-center justify-center gap-1 font-extrabold text-sm sm:text-base mb-1">
          {isMtdPositive && (
            <span className="text-[#2d7d46] flex items-center">
              ▲ {metric.mtd_variance_percent}%
            </span>
          )}
          {isMtdNegative && (
            <span className="text-[#c5221f] flex items-center">
              ▼ {Math.abs(metric.mtd_variance_percent)}%
            </span>
          )}
          {!isMtdPositive && !isMtdNegative && (
            <span className="text-slate-600">0%</span>
          )}
        </div>

        {/* vs Comparison Period Text */}
        <div className="text-[11px] sm:text-xs text-slate-400 font-medium">
          vs. {comparisonMonthLabel} ({metric.comp_mtd.toLocaleString()})
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-[1px] bg-slate-200/80 mb-3" />

      {/* 3. Bottom Half: Est. Month End Forecast */}
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 tracking-wide uppercase mb-1">
          Est. Month End
        </span>

        {/* Forecast Landing Number */}
        <div className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
          {metric.est_month_end.toLocaleString()}
        </div>

        {/* Forecast Variance */}
        <div className="flex items-center justify-center gap-1 font-bold text-xs sm:text-sm mb-0.5">
          {isForecastPositive && (
            <span className="text-[#2d7d46] flex items-center">
              ▲ {metric.forecast_variance_percent}%
            </span>
          )}
          {isForecastNegative && (
            <span className="text-[#c5221f] flex items-center">
              ▼ {Math.abs(metric.forecast_variance_percent)}%
            </span>
          )}
          {!isForecastPositive && !isForecastNegative && (
            <span className="text-slate-600">0%</span>
          )}
        </div>

        {/* vs Full Comparison Month Text */}
        <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
          vs. Full {comparisonMonthLabel} ({metric.full_comp_month.toLocaleString()})
        </div>
      </div>
    </div>
  );
}
