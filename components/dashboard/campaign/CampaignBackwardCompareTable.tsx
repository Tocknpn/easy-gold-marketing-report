'use client';

import React from 'react';
import { CampaignBackwardComparisonPayload } from '@/lib/types/campaign.types';
import { History, TrendingUp, TrendingDown } from 'lucide-react';

interface CampaignBackwardCompareTableProps {
  data: CampaignBackwardComparisonPayload;
}

export function CampaignBackwardCompareTable({ data }: CampaignBackwardCompareTableProps) {
  const formatNum = (val: number, decimals: number = 0) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const renderCompareBadge = (pct: number) => {
    const isPositive = pct >= 0;
    return (
      <span
        className={`inline-block py-1 px-3 rounded-md font-mono font-black text-xs ${
          isPositive
            ? 'bg-[#e8f5e9] text-[#2e7d32]'
            : 'bg-[#fce4ec] text-[#c2185b]'
        }`}
      >
        {isPositive ? `+${pct}%` : `${pct}%`}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden flex flex-col">
      {/* Table Header matching Excel Image 3 & 4 */}
      <div className="bg-[#f0f4f9] px-4 py-3 border-b border-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#0c4ca3]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Comparison vs Same Period Backward (Baseline Benchmark)
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          Historical Period Growth Variance
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse select-text">
          <thead className="bg-[#b9d7ea]/40 text-slate-900 border-b-2 border-slate-300 text-[11px] font-black uppercase">
            <tr>
              <th className="py-2.5 px-4 border-r border-slate-300 w-1/4">
                Category
              </th>
              <th className="py-2.5 px-4 border-r border-slate-300 w-2/5">
                Comparison Dimension
              </th>
              <th className="py-2.5 px-4 border-r border-slate-300 text-right w-1/5">
                <div className="flex flex-col items-end">
                  <span>MTD Volume</span>
                  <span className="text-[10px] font-semibold text-slate-600 font-sans">
                    {data.mtd_days} Days
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-4 border-r border-slate-300 text-right w-1/5">
                <div className="flex flex-col items-end">
                  <span>Backward Period</span>
                  <span className="text-[10px] font-semibold text-slate-600 font-sans">
                    {data.backward_days} Days
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-4 text-right w-1/6">
                % Compare
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 font-mono text-xs">
            {/* 1. Buy Transaction */}
            <tr className="bg-white">
              <td rowSpan={3} className="py-3 px-4 border-r border-slate-300 font-sans font-bold text-slate-900 align-top bg-slate-50/40">
                Buy Transaction
              </td>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-semibold text-[#0c4ca3]">
                {data.buy_trans_condition_label}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-[#0c4ca3]">
                {formatNum(data.buy_trans_mtd)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td rowSpan={3} className="py-2 px-4 text-right align-middle font-black bg-slate-50/20">
                {renderCompareBadge(data.buy_trans_pct_compare)}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-2 px-4 border-r border-slate-300 font-sans text-slate-600">
                {data.backward_days} Days backward trns
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-700">
                {formatNum(data.buy_trans_backward)}
              </td>
            </tr>
            <tr className="border-b-2 border-slate-300 bg-slate-50/30">
              <td className="py-1.5 px-4 border-r border-slate-300 font-sans font-bold text-slate-500 text-[11px]">
                % compare
              </td>
              <td colSpan={2} className="py-1.5 px-4 border-r border-slate-300 text-center font-sans text-[11px] text-slate-400">
                Period-to-Period delta
              </td>
            </tr>

            {/* 2. Buy Value (LAK) */}
            <tr className="bg-white">
              <td rowSpan={3} className="py-3 px-4 border-r border-slate-300 font-sans font-bold text-slate-900 align-top bg-slate-50/40">
                Buy value (mil LAK)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-semibold text-slate-800">
                MTD buy value (mil LAK)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.buy_value_lak_mtd, 1)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td rowSpan={3} className="py-2 px-4 text-right align-middle font-black bg-slate-50/20">
                {renderCompareBadge(data.buy_value_pct_compare)}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-2 px-4 border-r border-slate-300 font-sans text-slate-600">
                {data.backward_days} Days backward value
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-700">
                {formatNum(data.buy_value_lak_backward, 1)}
              </td>
            </tr>
            <tr className="border-b-2 border-slate-300 bg-slate-50/30">
              <td className="py-1.5 px-4 border-r border-slate-300 font-sans font-bold text-slate-500 text-[11px]">
                % compare
              </td>
              <td colSpan={2} className="py-1.5 px-4 border-r border-slate-300 text-center font-sans text-[11px] text-slate-400">
                Period-to-Period delta
              </td>
            </tr>

            {/* 3. Buy Weight (g) */}
            <tr className="bg-white">
              <td rowSpan={3} className="py-3 px-4 border-r border-slate-300 font-sans font-bold text-slate-900 align-top bg-slate-50/40">
                Buy weight (g)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-semibold text-slate-800">
                MTD buy weight (g)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.buy_weight_g_mtd, 1)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td rowSpan={3} className="py-2 px-4 text-right align-middle font-black bg-slate-50/20">
                {renderCompareBadge(data.buy_weight_pct_compare)}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-2 px-4 border-r border-slate-300 font-sans text-slate-600">
                {data.backward_days} Days backward value
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-700">
                {formatNum(data.buy_weight_g_backward, 1)}
              </td>
            </tr>
            <tr className="border-b-2 border-slate-300 bg-slate-50/30">
              <td className="py-1.5 px-4 border-r border-slate-300 font-sans font-bold text-slate-500 text-[11px]">
                % compare
              </td>
              <td colSpan={2} className="py-1.5 px-4 border-r border-slate-300 text-center font-sans text-[11px] text-slate-400">
                Period-to-Period delta
              </td>
            </tr>

            {/* 4. Buy Ticket Size (g) */}
            <tr className="bg-white">
              <td rowSpan={3} className="py-3 px-4 border-r border-slate-300 font-sans font-bold text-slate-900 align-top bg-slate-50/40">
                Buy Ticket size (g)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 font-sans font-semibold text-slate-800">
                MTD Ticket size (g)
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-800">
                {formatNum(data.ticket_size_g_mtd, 0)}
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td rowSpan={3} className="py-2 px-4 text-right align-middle font-black bg-slate-50/20">
                {renderCompareBadge(data.ticket_size_pct_compare)}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-2 px-4 border-r border-slate-300 font-sans text-slate-600">
                {data.backward_days} Days backward value
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-semibold text-slate-400">
                -
              </td>
              <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-700">
                {formatNum(data.ticket_size_g_backward, 0)}
              </td>
            </tr>
            <tr className="border-b-2 border-slate-300 bg-slate-50/30">
              <td className="py-1.5 px-4 border-r border-slate-300 font-sans font-bold text-slate-500 text-[11px]">
                % compare
              </td>
              <td colSpan={2} className="py-1.5 px-4 border-r border-slate-300 text-center font-sans text-[11px] text-slate-400">
                Period-to-Period delta
              </td>
            </tr>

            {/* 5. Normal Baseline Run-Rate Comparison (Image 4) */}
            {data.baseline_normal_rr_per_day !== undefined && data.baseline_pct_compare !== undefined && (
              <tr className="bg-amber-50/40">
                <td className="py-3 px-4 border-r border-slate-300 font-sans font-bold text-amber-900">
                  Buy Trans for normal RR
                </td>
                <td className="py-2 px-4 border-r border-slate-300 font-sans text-slate-700">
                  <div>Avg. Normal RR of Q3 per Day: <span className="font-mono font-bold">{data.baseline_normal_rr_per_day}</span></div>
                  <div>Avg. Campaign Daily Actual: <span className="font-mono font-bold text-[#0c4ca3]">{data.avg_campaign_daily_actual}</span></div>
                </td>
                <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-[#0c4ca3]">
                  {data.avg_campaign_daily_actual}
                </td>
                <td className="py-2 px-4 border-r border-slate-300 text-right font-bold text-slate-600">
                  {data.baseline_normal_rr_per_day}
                </td>
                <td className="py-2 px-4 text-right align-middle font-black">
                  {renderCompareBadge(data.baseline_pct_compare)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
