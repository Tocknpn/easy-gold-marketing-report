'use client';

import React from 'react';
import { CampaignTargetAchievementPayload } from '@/lib/types/campaign.types';
import { Target, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface CampaignTargetTableProps {
  data: CampaignTargetAchievementPayload;
}

export function CampaignTargetTable({ data }: CampaignTargetTableProps) {
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0c4ca3] px-4 py-3.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/10 text-[#e5a812]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Campaign Target &amp; Run-Rate (RR) Projection
            </h4>
            <p className="text-[10px] text-blue-100/80 font-medium">
              Target Achievement &amp; Pace Velocity Analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-white/15 text-white border border-white/20">
            {data.total_days} Days Horizon
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse select-text">
          {/* Column Headers with balanced, readable proportions */}
          <thead className="bg-slate-100/90 text-slate-800 border-b border-slate-200 text-[11px] font-black uppercase">
            <tr>
              <th className="py-2.5 px-4 w-[46%] border-r border-slate-200">
                Performance Metric &amp; Target
              </th>
              <th className="py-2.5 px-4 text-right w-[27%] border-r border-slate-200">
                <div className="flex flex-col items-end">
                  <span className="text-slate-900 font-black">MTD Volume</span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-200 mt-0.5">
                    {data.elapsed_days} Days Elapsed
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-4 text-right w-[27%]">
                <div className="flex flex-col items-end">
                  <span className="text-slate-900 font-black">RR Full Projection</span>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-sm border border-purple-200 mt-0.5">
                    {data.total_days} Days Target
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {/* 1. Timeline Pace Row */}
            <tr className="bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-bold text-slate-700 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>% Time Gone</span>
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-bold text-slate-900">
                <span className="inline-flex items-center gap-1.5">
                  <span>{data.pct_time_gone}%</span>
                  <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden hidden sm:inline-block">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${Math.min(data.pct_time_gone, 100)}%` }} 
                    />
                  </div>
                </span>
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-600">
                100%
              </td>
            </tr>

            {/* 2. EC Target Group Header */}
            <tr className="bg-blue-50/50 border-t border-b border-blue-100">
              <td colSpan={3} className="py-1.5 px-4 font-sans font-black text-[11px] text-[#0c4ca3] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0c4ca3]" />
                  <span>Condition Transactions Target (EC)</span>
                </div>
              </td>
            </tr>

            {/* EC Actual Metric */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-semibold text-slate-800">
                <span className="text-[#0c4ca3] font-bold">{data.condition_label}</span>
                <span className="text-[10px] text-slate-400 block font-normal font-sans">Qualified Buy Transactions</span>
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.ec_actual_mtd)}
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-900">
                {formatNum(data.ec_rr_projected)}
              </td>
            </tr>

            {/* EC Target */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-semibold text-slate-700">
                Campaign Target (EC)
                <span className="text-[10px] text-slate-400 block font-normal font-sans">Set campaign goal</span>
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-bold text-slate-700">
                {formatNum(data.ec_target)}
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-700">
                {formatNum(data.ec_target)}
              </td>
            </tr>

            {/* FOCUS ROW: EC % Target Hit */}
            <tr className={`border-y transition-colors ${
              isEcBehind 
                ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}>
              <td className="py-2.5 px-4 border-r border-slate-200 font-sans font-black flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isEcBehind ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="text-xs uppercase tracking-tight">% Target Hit (EC Focus)</span>
              </td>
              <td className="py-2.5 px-4 border-r border-slate-200 text-right font-black">
                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                  data.ec_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {data.ec_pct_hit_mtd}%
                </span>
              </td>
              <td className="py-2.5 px-4 text-right font-black">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-black shadow-xs ${
                  isEcBehind ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {isEcBehind ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  <span>{data.ec_pct_hit_rr}%</span>
                </span>
              </td>
            </tr>

            {/* 3. NC Target Group Header */}
            <tr className="bg-purple-50/50 border-t border-b border-purple-100">
              <td colSpan={3} className="py-1.5 px-4 font-sans font-black text-[11px] text-purple-900 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>New Customer Acquisition Target (NC)</span>
                </div>
              </td>
            </tr>

            {/* NC Actual */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-semibold text-slate-800">
                <span className="text-purple-700 font-bold">Total NC</span>
                <span className="text-[10px] text-slate-400 block font-normal font-sans">First-time buying accounts</span>
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.nc_actual_mtd)}
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-900">
                {formatNum(data.nc_rr_projected)}
              </td>
            </tr>

            {/* NC Target */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-semibold text-slate-700">
                Campaign Target (NC)
                <span className="text-[10px] text-slate-400 block font-normal font-sans">New acquisition quota</span>
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-bold text-slate-700">
                {formatNum(data.nc_target)}
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-700">
                {formatNum(data.nc_target)}
              </td>
            </tr>

            {/* FOCUS ROW: NC % Target Hit */}
            <tr className={`border-y transition-colors ${
              isNcBehind 
                ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}>
              <td className="py-2.5 px-4 border-r border-slate-200 font-sans font-black flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isNcBehind ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="text-xs uppercase tracking-tight">% Target Hit (NC Focus)</span>
              </td>
              <td className="py-2.5 px-4 border-r border-slate-200 text-right font-black">
                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                  data.nc_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {data.nc_pct_hit_mtd}%
                </span>
              </td>
              <td className="py-2.5 px-4 text-right font-black">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-black shadow-xs ${
                  isNcBehind ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {isNcBehind ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  <span>{data.nc_pct_hit_rr}%</span>
                </span>
              </td>
            </tr>

            {/* 4. Volume & Basket Size Header */}
            <tr className="bg-amber-50/40 border-t border-b border-amber-100">
              <td colSpan={3} className="py-1.5 px-4 font-sans font-black text-[11px] text-amber-900 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Gold Volume &amp; Value Deliverables</span>
                </div>
              </td>
            </tr>

            {/* Buy Weight */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-medium text-slate-700">
                MTD Buy Weight (g)
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.mtd_buy_weight_g, 1)}
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-900">
                {formatNum(data.rr_buy_weight_g, 1)}
              </td>
            </tr>

            {/* Buy Value */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-medium text-slate-700">
                MTD Buy Value (mil LAK)
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.mtd_buy_value_mil_lak, 1)}
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-900">
                {formatNum(data.rr_buy_value_mil_lak, 1)}
              </td>
            </tr>

            {/* Ticket Size */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-medium text-slate-700">
                MTD Ticket Size (g)
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-bold text-slate-900">
                {formatNum(data.mtd_ticket_size_g, 1)}
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-900">
                {formatNum(data.rr_ticket_size_g, 1)}
              </td>
            </tr>

            {/* 5. Daily Velocity Header */}
            <tr className="bg-slate-100 border-t border-b border-slate-200">
              <td colSpan={3} className="py-1.5 px-4 font-sans font-black text-[11px] text-slate-800 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  <span>Daily Run-Rate Pace vs Daily Quota</span>
                </div>
              </td>
            </tr>

            {/* Daily Targets */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-medium text-slate-700">
                Avg. Target Pace Required / Day
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-medium text-slate-400">
                -
              </td>
              <td className="py-2 px-4 text-right font-bold text-slate-800">
                {formatNum(data.avg_buy_trans_target_per_day, 1)}
                <span className="text-[10px] text-slate-500 font-sans font-normal ml-1">t/d</span>
              </td>
            </tr>

            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-medium text-slate-700">
                Actual Daily Run-Rate Pace / Day
              </td>
              <td className="py-2 px-4 border-r border-slate-200 text-right font-medium text-slate-400">
                -
              </td>
              <td className="py-2 px-4 text-right font-bold text-blue-900">
                {formatNum(data.act_buy_trans_per_day, 1)}
                <span className="text-[10px] text-blue-600 font-sans font-normal ml-1">t/d</span>
              </td>
            </tr>

            {/* FOCUS ROW: Daily Compare */}
            <tr className={`border-t font-bold transition-colors ${
              isDailyBehind ? 'bg-rose-50/90 text-rose-950' : 'bg-emerald-50/90 text-emerald-950'
            }`}>
              <td className="py-2.5 px-4 border-r border-slate-200 font-sans font-black flex items-center gap-1.5">
                {isDailyBehind ? <TrendingDown className="w-4 h-4 text-rose-600" /> : <TrendingUp className="w-4 h-4 text-emerald-600" />}
                <span className="text-xs uppercase tracking-tight">Daily Pace Compare (Velocity)</span>
              </td>
              <td className="py-2.5 px-4 border-r border-slate-200 text-right font-bold text-slate-400">
                -
              </td>
              <td className="py-2.5 px-4 text-right font-black">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-black shadow-xs ${
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
