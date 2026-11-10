'use client';

import React from 'react';
import { ThemeSectionColor } from '@/lib/types/dashboard.types';
import { SparklineChart } from './SparklineChart';

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

  // Partial week: pace = 7-day run-rate vs last week's full total (last week = point before the selected week)
  const estimateNum =
    proratedEstimate === undefined ? undefined : Number(String(proratedEstimate).replace(/,/g, ''));
  const showRunRate = isPartialWeek && estimateNum !== undefined && Number.isFinite(estimateNum);
  const selIdx = historyData.findIndex((h) => h.week === selectedWeek);
  const prevValue = selIdx > 0 ? historyData[selIdx - 1].value : undefined;
  const pacePct =
    showRunRate && prevValue && prevValue > 0 ? Math.round(((estimateNum as number) / prevValue - 1) * 100) : undefined;
  const pace =
    pacePct === undefined
      ? null
      : pacePct >= 5
      ? { label: 'Fast', arrow: '▲', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200/80' }
      : pacePct <= -5
      ? { label: 'Slow', arrow: '▼', cls: 'text-rose-700 bg-rose-50 border-rose-200/80' }
      : { label: 'Steady', arrow: '●', cls: 'text-slate-700 bg-slate-50 border-slate-200' };
  const estimateText =
    typeof proratedEstimate === 'number' ? proratedEstimate.toLocaleString() : proratedEstimate;

  // Curated border & indicator styling
  const accentBorderColors: Record<string, string> = {
    blue: 'border-slate-200/90 hover:border-blue-400 focus-within:border-blue-500',
    green: 'border-slate-200/90 hover:border-emerald-400 focus-within:border-emerald-500',
    indigo: 'border-slate-200/90 hover:border-indigo-400 focus-within:border-indigo-500',
    purple: 'border-slate-200/90 hover:border-purple-400 focus-within:border-purple-500',
    red: 'border-slate-200/90 hover:border-rose-400 focus-within:border-rose-500',
  };

  const indicatorDots: Record<string, string> = {
    blue: 'bg-blue-600',
    green: 'bg-emerald-600',
    indigo: 'bg-indigo-600',
    purple: 'bg-purple-600',
    red: 'bg-rose-600',
  };

  return (
    <div
      className={`bg-white rounded-xl border p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between group ${
        accentBorderColors[themeColor] || accentBorderColors.blue
      }`}
    >
      <div>
        {/* Title Row with Domain Status Indicator */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                indicatorDots[themeColor] || indicatorDots.blue
              }`}
            />
            <h4 className="font-bold text-slate-700 text-xs sm:text-[13px] tracking-tight truncate" title={title}>
              {title}
            </h4>
          </div>
          {subtitle && (
            <span className="text-[11px] text-slate-500 font-semibold shrink-0 uppercase tracking-wider">
              {subtitle}
            </span>
          )}
        </div>

        {/* Hero KPI Number + Variance Badge */}
        <div className={`flex justify-between gap-2 my-1 ${showRunRate ? 'items-start' : 'items-baseline'}`}>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums leading-none">
            {formattedValue}
          </div>

          {/* Step 1: WoW so far. Step 2 (partial week): pace. Step 3: 7-day landing. */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            {isNeutral && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums bg-slate-100 text-slate-600 border border-slate-200">
                0%
              </span>
            )}
            {isPositive && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                +{variancePercent}%
              </span>
            )}
            {isNegative && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums border bg-rose-50 text-rose-700 border-rose-200/80">
                {variancePercent}%
              </span>
            )}

            {showRunRate && (
              <>
                {pace && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black border tabular-nums whitespace-nowrap ${pace.cls}`}
                    title="7-day run-rate vs last week's full total"
                  >
                    {pace.arrow} {pace.label} {pacePct! > 0 ? `+${pacePct}` : pacePct}%
                  </span>
                )}
                <span
                  className="text-[10px] font-semibold text-slate-500 whitespace-nowrap"
                  title="Expected full-week total at the current daily pace"
                >
                  Landing <span className="font-black font-mono tabular-nums text-slate-900">{estimateText}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modern High-Clarity Sparkline Chart */}
      <div className="w-full mt-2 pt-1.5 border-t border-slate-100">
        <SparklineChart
          data={historyData}
          themeColor={themeColor}
          selectedWeek={selectedWeek}
          isDecimal={isDecimal}
          height={32}
        />
      </div>
    </div>
  );
}
