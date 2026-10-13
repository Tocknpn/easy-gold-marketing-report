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
}

export function MetricKpiCard({
  title,
  value,
  variancePercent,
  historyData,
  themeColor,
  isDecimal = false,
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between transition-all hover:shadow-md">
      {/* Top Header & Metric */}
      <div className="flex flex-col items-center">
        {/* Title */}
        <h4 className="text-center font-bold text-slate-800 text-sm md:text-base tracking-normal underline decoration-slate-400/80 underline-offset-4">
          {title}
        </h4>

        {/* Big KPI Metric */}
        <div className="text-center text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight my-2.5 font-sans">
          {formattedValue}
        </div>

        {/* Variance Percentage Indicator */}
        <div className="flex items-center justify-center gap-1.5 font-extrabold text-xl lg:text-2xl mb-3">
          {isNeutral && (
            <span className="text-slate-700">0%</span>
          )}
          {isPositive && (
            <span className="text-emerald-700 flex items-center">
              ▲ {variancePercent}%
            </span>
          )}
          {isNegative && (
            <span className="text-[#c5221f] flex items-center">
              ▼ {Math.abs(variancePercent)}%
            </span>
          )}
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="w-full h-[1.5px] bg-slate-200/70 mb-4" />
      </div>

      {/* Embedded 5-Week Trend Combo Chart */}
      <div className="w-full h-44 mt-auto">
        <WeeklyComboChart
          data={historyData}
          themeColor={themeColor}
          isDecimal={isDecimal}
        />
      </div>
    </div>
  );
}
