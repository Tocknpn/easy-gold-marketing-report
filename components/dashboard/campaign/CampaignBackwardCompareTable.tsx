'use client';

import React from 'react';
import { CampaignBackwardComparisonPayload } from '@/lib/types/campaign.types';
import { History, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CampaignBackwardCompareTableProps {
  data: CampaignBackwardComparisonPayload;
}

export function CampaignBackwardCompareTable({ data }: CampaignBackwardCompareTableProps) {
  const formatNum = (val: number, decimals: number = 0) => {
    return (val || 0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const renderComparePill = (pct: number, deltaVal?: number, unit: string = '') => {
    const isPositive = pct >= 0;
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-lg font-mono font-black text-xs shadow-xs transition-transform hover:scale-105 ${
            isPositive
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{isPositive ? `+${pct}%` : `${pct}%`}</span>
        </span>
        {deltaVal !== undefined && (
          <span className={`text-[10px] font-mono font-bold ${
            isPositive ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {isPositive ? '+' : ''}{formatNum(deltaVal, unit === 'g' || unit === 'mil' ? 1 : 0)} {unit}
          </span>
        )}
      </div>
    );
  };

  const transDelta = data.buy_trans_mtd - data.buy_trans_backward;
  const valueDelta = data.buy_value_lak_mtd - data.buy_value_lak_backward;
  const weightDelta = data.buy_weight_g_mtd - data.buy_weight_g_backward;
  const ticketDelta = data.ticket_size_g_mtd - data.ticket_size_g_backward;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0c4ca3] px-4 py-3.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/10 text-emerald-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Comparison vs Same Period Backward
            </h4>
            <p className="text-[10px] text-blue-100/80 font-medium">
              Baseline Growth &amp; Period-over-Period Performance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-white/15 text-white border border-white/20">
            Equal {data.backward_days}d Baseline
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse select-text">
          {/* Header Row */}
          <thead className="bg-slate-100/90 text-slate-800 border-b border-slate-200 text-[11px] font-black uppercase">
            <tr>
              <th className="py-2.5 px-4 w-[36%] border-r border-slate-200">
                Category &amp; Dimension
              </th>
              <th className="py-2.5 px-4 text-right w-[22%] border-r border-slate-200">
                <div className="flex flex-col items-end">
                  <span className="text-slate-900 font-black">MTD Volume</span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-200 mt-0.5">
                    {data.mtd_days} Days Active
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-4 text-right w-[22%] border-r border-slate-200">
                <div className="flex flex-col items-end">
                  <span className="text-slate-900 font-black">Backward Benchmark</span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded-sm mt-0.5">
                    {data.backward_days} Days Baseline
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-4 text-right w-[20%]">
                <div className="flex flex-col items-end">
                  <span className="text-slate-900 font-black">% Growth Focus</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-200 mt-0.5">
                    Variance Delta
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {/* 1. Buy Transactions */}
            <tr className="hover:bg-blue-50/30 transition-colors">
              <td className="py-3 px-4 border-r border-slate-200 font-sans">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span>Buy Transactions</span>
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {data.buy_trans_condition_label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Comparing current MTD vs same duration preceding launch
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 border-r border-slate-200 text-right align-middle">
                <span className="text-sm font-black text-[#0c4ca3] block">
                  {formatNum(data.buy_trans_mtd)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">transactions</span>
              </td>
              <td className="py-3 px-4 border-r border-slate-200 text-right align-middle">
                <span className="text-sm font-bold text-slate-700 block">
                  {formatNum(data.buy_trans_backward)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">transactions</span>
              </td>
              <td className="py-3 px-4 text-right align-middle bg-slate-50/50">
                {renderComparePill(data.buy_trans_pct_compare, transDelta, 'trans')}
              </td>
            </tr>

            {/* 2. Buy Value (Mil LAK) */}
            <tr className="hover:bg-emerald-50/30 transition-colors">
              <td className="py-3 px-4 border-r border-slate-200 font-sans">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Buy Value (LAK)</span>
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Gross Trading Volume (Mil LAK)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Monetary purchasing value generated
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 border-r border-slate-200 text-right align-middle">
                <span className="text-sm font-black text-emerald-900 block">
                  {formatNum(data.buy_value_lak_mtd, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">million LAK</span>
              </td>
              <td className="py-3 px-4 border-r border-slate-200 text-right align-middle">
                <span className="text-sm font-bold text-slate-700 block">
                  {formatNum(data.buy_value_lak_backward, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">million LAK</span>
              </td>
              <td className="py-3 px-4 text-right align-middle bg-slate-50/50">
                {renderComparePill(data.buy_value_pct_compare, valueDelta, 'mil')}
              </td>
            </tr>

            {/* 3. Buy Weight (Grams) */}
            <tr className="hover:bg-amber-50/30 transition-colors">
              <td className="py-3 px-4 border-r border-slate-200 font-sans">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Gold Weight (Grams)</span>
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Total Physical Gold Purchased
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Net grams acquired by customers
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 border-r border-slate-200 text-right align-middle">
                <span className="text-sm font-black text-amber-950 block">
                  {formatNum(data.buy_weight_g_mtd, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">grams</span>
              </td>
              <td className="py-3 px-4 border-r border-slate-200 text-right align-middle">
                <span className="text-sm font-bold text-slate-700 block">
                  {formatNum(data.buy_weight_g_backward, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">grams</span>
              </td>
              <td className="py-3 px-4 text-right align-middle bg-slate-50/50">
                {renderComparePill(data.buy_weight_pct_compare, weightDelta, 'g')}
              </td>
            </tr>

            {/* 4. Ticket Size (Grams) */}
            <tr className="hover:bg-violet-50/30 transition-colors">
              <td className="py-3 px-4 border-r border-slate-200 font-sans">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-900 border border-violet-200 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                    <span>Ticket Basket Size</span>
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Average Weight per Transaction
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Basket density and customer depth
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 border-r border-slate-200 text-right align-middle">
                <span className="text-sm font-black text-violet-950 block">
                  {formatNum(data.ticket_size_g_mtd, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">g / ticket</span>
              </td>
              <td className="py-3 px-4 border-r border-slate-200 text-right align-middle">
                <span className="text-sm font-bold text-slate-700 block">
                  {formatNum(data.ticket_size_g_backward, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">g / ticket</span>
              </td>
              <td className="py-3 px-4 text-right align-middle bg-slate-50/50">
                {renderComparePill(data.ticket_size_pct_compare, ticketDelta, 'g')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
