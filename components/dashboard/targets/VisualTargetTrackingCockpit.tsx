'use client';

import React from 'react';
import { RunRateComparisonPayload } from '@/lib/types/target.types';
import { 
  UserPlus, 
  ShoppingCart, 
  Scale, 
  Tag, 
  TrendingDown, 
  Target as TargetIcon, 
  TrendingUp, 
  Sparkles,
  Info
} from 'lucide-react';

interface VisualTargetTrackingCockpitProps {
  data: RunRateComparisonPayload;
  /** Show %Est. Target Hit / Est. Year End columns. Hidden for completed past months. */
  showEst?: boolean;
  /** Suppress internal header when embedded inside a section that already renders a header */
  hideHeader?: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

export function VisualTargetTrackingCockpit({ data, showEst = true, hideHeader = false }: VisualTargetTrackingCockpitProps) {
  const {
    current_month_label,
    display_as_of_date,
    monthly_tracking,
    ytd_tracking,
  } = data;

  // Render metric icon
  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'nc':
        return <UserPlus className="w-4 h-4 text-white" />;
      case 'buy_tx':
        return <ShoppingCart className="w-4 h-4 text-white" />;
      case 'buy_wt':
        return <Scale className="w-4 h-4 text-white" />;
      case 'sell_tx':
        return <Tag className="w-4 h-4 text-white" />;
      case 'sell_wt':
        return <Scale className="w-4 h-4 text-white" />;
      default:
        return <Sparkles className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Visual Cockpit Header */}
      {!hideHeader && (
        <div className="flex items-baseline justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0c4ca3] tracking-tight">
              {current_month_label}&apos;26 Performance - Vs Target
            </h2>
            <p className="text-xs text-slate-500 font-bold">
              Data up to date {display_as_of_date}
            </p>
          </div>
        </div>
      )}

      {/* Dual Cards Grid: Monthly Target Tracking & YTD Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* ==================================================================== */}
        {/* CARD 1: MONTHLY TARGET TRACKING                                      */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            {/* Card Header with Days Gone */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Monthly Target Tracking
              </h3>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {monthly_tracking.days_gone} Days Gone ={' '}
                </span>
                <span className="text-base sm:text-lg font-black text-[#0c4ca3]">
                  {monthly_tracking.days_gone_pct}%
                </span>
              </div>
            </div>

            {/* Target Column Label */}
            <div className="flex justify-between pt-2 pb-1">
              <span className="text-[10px] font-bold text-slate-500">Actual / Target</span>
              {showEst && (
                <span className="text-[10px] font-black text-slate-700 tracking-tight">
                  %Est Target Hit
                </span>
              )}
            </div>

            {/* Metrics List with Progress Bars & Benchmark Line */}
            <div className="space-y-2.5">
              {monthly_tracking.metrics.map((metric) => {
                const isAhead = metric.est_target_hit_pct >= 100;
                const barColor = isAhead ? 'bg-[#10b981]' : 'bg-[#ef4444]';
                const hitColor = isAhead ? 'text-[#10b981]' : 'text-slate-900';

                return (
                  <div key={`m-${metric.id}`} className="flex items-center gap-3">
                    {/* Icon Circle */}
                    <div className="w-8 h-8 rounded-full bg-[#0c4ca3] flex items-center justify-center shrink-0 shadow-xs">
                      {getMetricIcon(metric.id)}
                    </div>

                    {/* Metric Label */}
                    <div className="w-28 sm:w-32 shrink-0 leading-tight">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1 block">
                        {metric.label}
                      </span>
                      <span className="text-[9px] font-mono font-medium text-slate-500 block">
                        {fmt(metric.actual)} / {fmt(metric.target)}
                      </span>
                    </div>

                    {/* Progress Bar Container with vertical benchmark line */}
                    <div className="flex-1 relative h-5 bg-slate-100 rounded-md overflow-hidden flex items-center">
                      {/* Vertical Benchmark Line for % Month Gone */}
                      <div
                        className="absolute top-0 bottom-0 w-[1.5px] bg-slate-400 z-10"
                        style={{ left: `${Math.min(100, monthly_tracking.days_gone_pct)}%` }}
                      >
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black text-slate-500">
                          {/* only show label on first metric if needed */}
                        </div>
                      </div>

                      {/* Actual Progress Fill */}
                      <div
                        className={`h-full ${barColor} transition-all duration-500 flex items-center justify-end pr-1.5`}
                        style={{ width: `${Math.min(100, Math.max(5, metric.current_pct))}%` }}
                      >
                        <span className="text-[10px] font-black text-white drop-shadow-xs">
                          {metric.current_pct}%
                        </span>
                      </div>
                    </div>

                    {/* Right Readout: %Est Target Hit */}
                    {showEst && (
                      <div className="w-11 text-right shrink-0">
                        <span className={`font-mono text-xs sm:text-sm font-black ${hitColor}`}>
                          {metric.est_target_hit_pct}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Badges */}
          <div className="grid grid-cols-3 gap-2 pt-6 mt-4 border-t border-slate-100">
            {/* Below Target */}
            <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-red-700 leading-none block">
                  {monthly_tracking.counts.below}
                </span>
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-tight block">
                  Below Target (&lt;90%)
                </span>
              </div>
            </div>

            {/* Near Target */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <TargetIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-blue-700 leading-none block">
                  {monthly_tracking.counts.near}
                </span>
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tight block">
                  Near Target (90-100%)
                </span>
              </div>
            </div>

            {/* Metrics Ahead */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-emerald-700 leading-none block">
                  {monthly_tracking.counts.ahead}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight block">
                  Ahead (&gt;100%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CARD 2: YTD TRACKING (2026)                                          */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            {/* Card Header with Year Days Gone */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                YTD Tracking ({ytd_tracking.year})
              </h3>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {ytd_tracking.days_gone} Days Gone ={' '}
                </span>
                <span className="text-base sm:text-lg font-black text-[#0c4ca3]">
                  {ytd_tracking.days_gone_pct}%
                </span>
              </div>
            </div>

            {/* Target Column Label */}
            <div className="flex justify-between pt-2 pb-1">
              <span className="text-[10px] font-bold text-slate-500">Actual / Target</span>
              {showEst && (
                <span className="text-[10px] font-black text-slate-700 tracking-tight">
                  Est. Year End
                </span>
              )}
            </div>

            {/* Metrics List with Progress Bars & Benchmark Line */}
            <div className="space-y-2.5">
              {ytd_tracking.metrics.map((metric) => {
                const isAhead = metric.est_year_end_pct >= 100;
                const barColor = isAhead ? 'bg-[#10b981]' : 'bg-[#ef4444]';
                const hitColor = isAhead ? 'text-[#10b981]' : 'text-slate-900';

                return (
                  <div key={`ytd-${metric.id}`} className="flex items-center gap-3">
                    {/* Icon Circle */}
                    <div className="w-8 h-8 rounded-full bg-[#0c4ca3] flex items-center justify-center shrink-0 shadow-xs">
                      {getMetricIcon(metric.id)}
                    </div>

                    {/* Metric Label */}
                    <div className="w-28 sm:w-32 shrink-0 leading-tight">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1 block">
                        {metric.label}
                      </span>
                      <span className="text-[9px] font-mono font-medium text-slate-500 block">
                        {fmt(metric.ytd_actual)} / {fmt(metric.ytd_target)}
                      </span>
                    </div>

                    {/* Progress Bar Container with vertical benchmark line */}
                    <div className="flex-1 relative h-5 bg-slate-100 rounded-md overflow-hidden flex items-center">
                      {/* Vertical Benchmark Line for % Year Gone */}
                      <div
                        className="absolute top-0 bottom-0 w-[1.5px] bg-slate-400 z-10"
                        style={{ left: `${Math.min(100, ytd_tracking.days_gone_pct)}%` }}
                      />

                      {/* Actual Progress Fill */}
                      <div
                        className={`h-full ${barColor} transition-all duration-500 flex items-center justify-end pr-1.5`}
                        style={{ width: `${Math.min(100, Math.max(5, metric.current_pct))}%` }}
                      >
                        <span className="text-[10px] font-black text-white drop-shadow-xs">
                          {metric.current_pct}%
                        </span>
                      </div>
                    </div>

                    {/* Right Readout: Est. Year End % */}
                    {showEst && (
                      <div className="w-11 text-right shrink-0">
                        <span className={`font-mono text-xs sm:text-sm font-black ${hitColor}`}>
                          {metric.est_year_end_pct}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Badges */}
          <div className="grid grid-cols-3 gap-2 pt-6 mt-4 border-t border-slate-100">
            {/* Below Target */}
            <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-red-700 leading-none block">
                  {ytd_tracking.counts.below}
                </span>
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-tight block">
                  Below Target (&lt;90%)
                </span>
              </div>
            </div>

            {/* Near Target */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <TargetIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-blue-700 leading-none block">
                  {ytd_tracking.counts.near}
                </span>
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tight block">
                  Near Target (90-100%)
                </span>
              </div>
            </div>

            {/* Metrics Ahead */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-emerald-700 leading-none block">
                  {ytd_tracking.counts.ahead}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight block">
                  Ahead (&gt;100%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
