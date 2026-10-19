'use client';

import React from 'react';
import { CampaignTargetAchievementPayload } from '@/lib/types/campaign.types';
import { Target, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Clock, Calendar } from 'lucide-react';

interface CampaignTargetTableProps {
  data: CampaignTargetAchievementPayload;
  asOfDate?: string;
  isLoading?: boolean;
}

export function CampaignTargetTable({ data, asOfDate, isLoading = false }: CampaignTargetTableProps) {
  // Format numbers cleanly with commas and decimals
  const formatNum = (val: number, decimals: number = 0) => {
    return (val || 0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const isEcBehind = data.ec_pct_hit_rr < 100;
  const isNcBehind = data.nc_pct_hit_rr < 100;
  const isDailyBehind = data.daily_compare_pct < 0;

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '14 Oct 2026';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = parseInt(parts[2], 10);
      const month = months[parseInt(parts[1], 10) - 1] || parts[1];
      return `${day} ${month} ${parts[0]}`;
    }
    return dateStr;
  };

  const displayAsOf = formatDate(asOfDate);

  return (
    <div className="inline-block w-auto min-w-[340px] max-w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/92 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-4 transition-all">
          <div className="bg-white px-5 py-3.5 rounded-2xl shadow-xl border border-blue-100 flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
              <div className="w-7 h-7 border-2 border-blue-100 border-t-[#0c4ca3] rounded-full animate-spin" />
              <div className="absolute w-3.5 h-3.5 border-2 border-amber-200 border-b-[#e5a812] rounded-full animate-spin" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                <span>Querying Supabase Live Data</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Computing actual transactions &amp; run-rate...</p>
            </div>
          </div>
        </div>
      )}
      {/* Table Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0c4ca3] px-3.5 py-2 flex items-center justify-between text-white gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/10 text-[#e5a812]">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white whitespace-nowrap">
              Campaign Target &amp; Run-Rate (RR) Projection
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/30 text-blue-100 border border-blue-400/30 font-mono whitespace-nowrap">
            <Calendar className="w-3 h-3 text-blue-200" />
            <span>Up to {displayAsOf}</span>
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-white/15 text-white border border-white/20 whitespace-nowrap">
            {data.total_days}d Horizon
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-auto border-collapse text-xs text-left select-text">
          {/* Column Headers with compact, content-derived proportions */}
          <thead className="bg-slate-100/90 text-slate-800 border-b border-slate-200 text-[10px] font-black uppercase">
            <tr>
              <th className="py-2 px-3.5 whitespace-nowrap border-r border-slate-200">
                Performance Metric &amp; Target
              </th>
              <th className="py-2 px-3.5 text-right whitespace-nowrap border-r border-slate-200">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-slate-900 font-black">MTD Volume</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded-sm border border-blue-200">
                    {data.elapsed_days}d
                  </span>
                </div>
              </th>
              <th className="py-2 px-3.5 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-slate-900 font-black">RR Full Projection</span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded-sm border border-purple-200">
                    {data.total_days}d
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {/* 1. Timeline Pace Row */}
            <tr className="bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>% Time Gone</span>
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                <span className="inline-flex items-center gap-1.5">
                  <span>{data.pct_time_gone}%</span>
                  <div className="w-10 h-1.5 rounded-full bg-slate-200 overflow-hidden hidden sm:inline-block">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${Math.min(data.pct_time_gone, 100)}%` }} 
                    />
                  </div>
                </span>
              </td>
              <td className="py-1.5 px-3 text-right font-bold text-slate-600">
                100%
              </td>
            </tr>

            {/* 2. Buy Transactions Target Group Header */}
            <tr className="bg-blue-50/50 border-t border-b border-blue-100">
              <td colSpan={3} className="py-1 px-3 font-sans font-black text-[10px] text-[#0c4ca3] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0c4ca3]" />
                  <span>Condition Buy Transactions Target</span>
                </div>
              </td>
            </tr>

            {/* Buy Trans Actual Metric - Clean with subtitle text removed */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-bold text-slate-800">
                <span className="text-[#0c4ca3] font-bold">{data.condition_label}</span>
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.ec_actual_mtd)}
              </td>
              <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                {formatNum(data.ec_rr_projected)}
              </td>
            </tr>

            {/* Buy Trans Target - Clean with subtitle text removed */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-medium text-slate-700">
                Campaign Target (Buy Trans)
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-700">
                {formatNum(data.ec_target)}
              </td>
              <td className="py-1.5 px-3 text-right font-bold text-slate-700">
                {formatNum(data.ec_target)}
              </td>
            </tr>

            {/* FOCUS ROW: Buy Trans % Target Hit */}
            <tr className={`border-y transition-colors ${
              isEcBehind 
                ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}>
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-black flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isEcBehind ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="text-xs uppercase tracking-tight">% Target Hit (Buy Focus)</span>
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-black">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
                  data.ec_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {data.ec_pct_hit_mtd}%
                </span>
              </td>
              <td className="py-1.5 px-3 text-right font-black">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black shadow-2xs ${
                  isEcBehind ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {isEcBehind ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  <span>{data.ec_pct_hit_rr}%</span>
                </span>
              </td>
            </tr>

            {/* 3. NC Target Group Header (Only if NC target > 0) */}
            {data.nc_target > 0 && (
              <>
                <tr className="bg-purple-50/50 border-t border-b border-purple-100">
                  <td colSpan={3} className="py-1 px-3 font-sans font-black text-[10px] text-purple-900 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                      <span>New Customer Acquisition Target (NC)</span>
                    </div>
                  </td>
                </tr>

                {/* NC Actual - Clean with subtitle removed */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-bold text-slate-800">
                    <span className="text-purple-700">Total NC</span>
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                    {formatNum(data.nc_actual_mtd)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                    {formatNum(data.nc_rr_projected)}
                  </td>
                </tr>

                {/* NC Target - Clean with subtitle removed */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-medium text-slate-700">
                    Campaign Target (NC)
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-700">
                    {formatNum(data.nc_target)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold text-slate-700">
                    {formatNum(data.nc_target)}
                  </td>
                </tr>

                {/* FOCUS ROW: NC % Target Hit */}
                <tr className={`border-y transition-colors ${
                  isNcBehind 
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}>
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-black flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isNcBehind ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <span className="text-xs uppercase tracking-tight">% Target Hit (NC Focus)</span>
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-black">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
                      data.nc_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {data.nc_pct_hit_mtd}%
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-black">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black shadow-2xs ${
                      isNcBehind ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {isNcBehind ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      <span>{data.nc_pct_hit_rr}%</span>
                    </span>
                  </td>
                </tr>
              </>
            )}

            {/* 4. Volume & Basket Size Header */}
            <tr className="bg-amber-50/40 border-t border-b border-amber-100">
              <td colSpan={3} className="py-1 px-3 font-sans font-black text-[10px] text-amber-900 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Gold Volume &amp; Value Deliverables</span>
                </div>
              </td>
            </tr>

            {/* Buy Weight */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-medium text-slate-700">
                MTD Buy Weight (g)
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.mtd_buy_weight_g, 1)}
              </td>
              <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                {formatNum(data.rr_buy_weight_g, 1)}
              </td>
            </tr>

            {/* Buy Value */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-medium text-slate-700">
                MTD Buy Value (mil LAK)
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.mtd_buy_value_mil_lak, 1)}
              </td>
              <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                {formatNum(data.rr_buy_value_mil_lak, 1)}
              </td>
            </tr>

            {/* Ticket Size */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-medium text-slate-700">
                MTD Ticket Size (g)
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.mtd_ticket_size_g, 1)}
              </td>
              <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                {formatNum(data.rr_ticket_size_g, 1)}
              </td>
            </tr>

            {/* 5. Daily Velocity Header */}
            <tr className="bg-slate-100 border-t border-b border-slate-200">
              <td colSpan={3} className="py-1 px-3 font-sans font-black text-[10px] text-slate-800 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span>Daily Run-Rate Pace vs Daily Quota</span>
                </div>
              </td>
            </tr>

            {/* Daily Targets */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-medium text-slate-700">
                Avg. Target Pace Required / Day
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-medium text-slate-400">
                -
              </td>
              <td className="py-1.5 px-3 text-right font-bold text-slate-800">
                {formatNum(data.avg_buy_trans_target_per_day, 1)} <span className="text-[10px] text-slate-500 font-sans font-normal">t/d</span>
              </td>
            </tr>

            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-medium text-slate-700">
                Actual Daily Run-Rate Pace / Day
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-medium text-slate-400">
                -
              </td>
              <td className="py-1.5 px-3 text-right font-bold text-blue-900">
                {formatNum(data.act_buy_trans_per_day, 1)} <span className="text-[10px] text-blue-600 font-sans font-normal">t/d</span>
              </td>
            </tr>

            {/* FOCUS ROW: Daily Compare */}
            <tr className={`border-t font-bold transition-colors ${
              isDailyBehind ? 'bg-rose-50/90 text-rose-950' : 'bg-emerald-50/90 text-emerald-950'
            }`}>
              <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-black flex items-center gap-1.5">
                {isDailyBehind ? <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> : <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
                <span className="text-xs uppercase tracking-tight">Daily Pace Compare (Velocity)</span>
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-400">
                -
              </td>
              <td className="py-1.5 px-3 text-right font-black">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-black shadow-2xs ${
                  isDailyBehind ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {data.daily_compare_pct > 0 ? `+${data.daily_compare_pct}%` : `${data.daily_compare_pct}%`}
                  <span className="text-[9px] font-sans font-normal opacity-90">
                    {data.daily_compare_pct >= 0 ? 'Ahead' : 'Behind'}
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
