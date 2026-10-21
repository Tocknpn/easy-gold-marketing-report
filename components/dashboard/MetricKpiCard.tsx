'use client';

import React from 'react';
import { ThemeSectionColor } from '@/lib/types/dashboard.types';
import { WeeklyComboChart } from './WeeklyComboChart';

interface MetricKpiCardProps {
  title: string;
  value: string | number;
  variancePercent: number;
  historyData: Array<{ week: string; value: number }>;
  themeColor: ThemeSectionColor;
  isDecimal?: boolean;
  selectedWeek?: string;
  subtitle?: string;
  proratedEstimate?: string | number;
  isPartialWeek?: boolean;
}

export function MetricKpiCard({
  title,
  value,
  variancePercent,
  historyData,
  themeColor,
  isDecimal = false,
  selectedWeek,
  subtitle,
  proratedEstimate,
  isPartialWeek = false,
}: MetricKpiCardProps) {
  const isPositive = variancePercent > 0;
  const isNegative = variancePercent < 0;
  const isNeutral = variancePercent === 0;

  // Formatting display value
  const formattedValue =
    typeof value === 'number'
      ? isDecimal
        ? value.toFixed(1)
        : value.toLocaleString()
      : value;

  // Color accents for subtle card highlights
  const accentBorderColors = {
    blue: 'hover:border-blue-300 focus-within:border-blue-400',
    green: 'hover:border-emerald-300 focus-within:border-emerald-400',
    red: 'hover:border-rose-300 focus-within:border-rose-400',
  };

  const indicatorDots = {
    blue: 'bg-blue-600',
    green: 'bg-emerald-600',
    red: 'bg-rose-600',
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-200 flex flex-col justify-between group ${accentBorderColors[themeColor]}`}>
      {/* Top Header & Metric */}
      <div>
        {/* Title Row with Status Dot */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${indicatorDots[themeColor]}`} />
            <h4 className="font-bold text-slate-700 text-xs sm:text-[13px] tracking-tight truncate" title={title}>
              {title}
            </h4>
          </div>
          {subtitle && (
            <span className="text-xs text-slate-500 font-medium shrink-0">
              {subtitle}
            </span>
          )}
        </div>

        {/* Hero KPI Metric + Variance Badge Row */}
        <div className="flex items-baseline justify-between gap-2 my-1">
          {/* Main Number */}
          <div className="text-2xl sm:text-[26px] lg:text-[28px] font-black text-slate-900 tracking-tight font-mono tabular-nums leading-none">
            {formattedValue}
          </div>

          {/* Variance Badge */}
          <div className="shrink-0">
            {isNeutral && (
              <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono tabular-nums bg-slate-100 text-slate-600 border border-slate-200">
                0%
              </span>
            )}
            {isPositive && (
              <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-0.5 shadow-2xs">
                ▲ {variancePercent}%
              </span>
            )}
            {isNegative && (
              <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono tabular-nums bg-rose-50 text-brand-outflowLight border border-rose-200/80 flex items-center gap-0.5 shadow-2xs">
                ▼ {Math.abs(variancePercent)}%
              </span>
            )}
          </div>
        </div>

        {/* Partial Week Prorated Context Badge (if applicable) */}
        {isPartialWeek && proratedEstimate && (
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-medium bg-amber-50/80 border border-amber-200/60 rounded-md px-2 py-0.5 mt-1">
            <span>⚡ 7D Est:</span>
            <span className="font-bold font-mono tabular-nums text-slate-900">
              {typeof proratedEstimate === 'number' ? proratedEstimate.toLocaleString() : proratedEstimate}
            </span>
          </div>
        )}
      </div>

      {/* Embedded 5-Week Trend Combo Chart */}
      <div className="w-full h-24 sm:h-26 mt-2 pt-1 border-t border-slate-100">
        <WeeklyComboChart
          data={historyData}
          themeColor={themeColor}
          isDecimal={isDecimal}
          selectedWeek={selectedWeek}
          height={95}
        />
      </div>
    </div>
  );
}
