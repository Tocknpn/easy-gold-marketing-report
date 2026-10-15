'use client';

import React from 'react';
import { CampaignTargetAchievementPayload } from '@/lib/types/campaign.types';
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CampaignTargetTableProps {
  data: CampaignTargetAchievementPayload;
}

export function CampaignTargetTable({ data }: CampaignTargetTableProps) {
  // Format numbers cleanly
  const formatNum = (val: number, decimals: number = 0) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const isEcBehind = data.ec_pct_hit_rr < 100;
  const isNcBehind = data.nc_pct_hit_rr < 100;
  const isDailyBehind = data.daily_compare_pct < 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden flex flex-col">
      {/* Table Header matching Excel Image 3 & 4 */}
      <div className="bg-[#f0f4f9] px-4 py-3 border-b border-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#0c4ca3]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Campaign Target & Run-Rate (RR) Projection
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          Target Achievement & Pace Analysis
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse select-text">
          {/* Column Headers */}
          <thead className="bg-[#b9d7ea]/40 text-slate-900 border-b-2 border-slate-300 text-[11px] font-black uppercase">
            <tr>
              <th className="py-2.5 px-4 border-r border-slate-300 w-1/3">
                Metric
              </th>
              <th className="py-2.5 px-4 border-r border-slate-300 text-right w-1/3">
                <div className="flex flex-col items-end">
                  <span>MTD</span>
                  <span className="text-[10px] font-semibold text-slate-600 font-sans">
                    {data.elapsed_days} Days
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-4 border-r border-slate-300 text-right w-1/3">
                <div className="flex flex-col items-end">
                  <span>RR (Full Projection)</span>
                  <span className="text-[10px] font-semibold text-slate-600 font-sans">
                    {data.total_days} Days
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 font-mono text-xs">
            {/* 1. Time Gone */}
            <tr className="bg-slate-50/50">
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-bold text-slate-700">
                %Time Gone
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {data.pct_time_gone}%
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                100%
              </td>
            </tr>

            {/* 2. EC Target Group */}
            <tr className="border-t-2 border-slate-300">
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-bold text-[#0c4ca3]">
                {data.condition_label}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-[#0c4ca3]">
                {formatNum(data.ec_actual_mtd)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-[#0c4ca3]">
                {formatNum(data.ec_rr_projected)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-bold text-slate-900">
                Campaign Target (EC)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-black text-slate-900">
                {formatNum(data.ec_target)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-black text-slate-900">
                {formatNum(data.ec_target)}
              </td>
            </tr>
            <tr className="border-b-2 border-slate-300">
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-bold text-slate-700">
                %Target Hit
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {data.ec_pct_hit_mtd}%
              </td>
              {/* Highlight cell matching pink/red tint in Excel */}
              <td className={`py-2 px-4 border-r border-slate-300 text-right font-black ${
                isEcBehind ? 'bg-[#fce4ec] text-[#c2185b]' : 'bg-[#e8f5e9] text-[#2e7d32]'
              }`}>
                {data.ec_pct_hit_rr}%
              </td>
            </tr>

            {/* 3. NC Target Group */}
            <tr>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-bold text-slate-800">
                Total NC
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.nc_actual_mtd)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.nc_rr_projected)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-bold text-slate-900">
                Campaign Target (NC)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-black text-slate-900">
                {formatNum(data.nc_target)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-black text-slate-900">
                {formatNum(data.nc_target)}
              </td>
            </tr>
            <tr className="border-b-2 border-slate-300">
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-bold text-slate-700">
                %Target Hit
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {data.nc_pct_hit_mtd}%
              </td>
              <td className={`py-2 px-4 border-r border-slate-300 text-right font-black ${
                isNcBehind ? 'bg-[#fce4ec] text-[#c2185b]' : 'bg-[#e8f5e9] text-[#2e7d32]'
              }`}>
                {data.nc_pct_hit_rr}%
              </td>
            </tr>

            {/* 4. Volume & Size Metrics */}
            <tr>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-medium text-slate-700">
                MTD Buy weight (g)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.mtd_buy_weight_g, 1)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.rr_buy_weight_g, 1)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-medium text-slate-700">
                MTD Buy Value (mil LAK)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.mtd_buy_value_mil_lak, 1)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.rr_buy_value_mil_lak, 1)}
              </td>
            </tr>
            <tr className="border-b-2 border-slate-300">
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-medium text-slate-700">
                MTD Ticket Size (g)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.mtd_ticket_size_g, 1)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.rr_ticket_size_g, 1)}
              </td>
            </tr>

            {/* 5. Daily Pace Comparison */}
            <tr>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-medium text-slate-700">
                Avg. Buy Trans Target per day
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-900">
                {formatNum(data.avg_buy_trans_target_per_day, 1)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-medium text-slate-700">
                Act. Buy Trans per day
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-900">
                {formatNum(data.act_buy_trans_per_day, 1)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-bold">
              <td className="py-2.5 px-4 border-r border-slate-300 font-sans font-black text-slate-900">
                Daily Compare
              </td>
              <td className="py-2.5 px-4 border-r border-slate-300 text-right font-bold text-slate-400">
                -
              </td>
              <td className={`py-2.5 px-4 border-r border-slate-300 text-right font-black ${
                isDailyBehind ? 'bg-[#fce4ec] text-[#c2185b]' : 'bg-[#e8f5e9] text-[#2e7d32]'
              }`}>
                {data.daily_compare_pct > 0 ? `+${data.daily_compare_pct}%` : `${data.daily_compare_pct}%`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
