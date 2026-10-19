'use client';

import React from 'react';
import { CampaignBackwardComparisonPayload } from '@/lib/types/campaign.types';
import { History, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

interface CampaignBackwardCompareTableProps {
  data: CampaignBackwardComparisonPayload;
  asOfDate?: string;
  isLoading?: boolean;
}

export function CampaignBackwardCompareTable({ data, asOfDate, isLoading = false }: CampaignBackwardCompareTableProps) {
  const formatNum = (val: number, decimals: number = 0) => {
    return (val || 0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

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

  const renderComparePill = (pct: number, deltaVal?: number, unit: string = '') => {
    if (data.mtd_days === 0 || data.buy_trans_mtd === 0) {
      return (
        <div className="flex flex-col items-end gap-0.5">
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md font-mono font-bold text-[10px] bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs whitespace-nowrap">
            Upcoming Horizon
          </span>
          <span className="text-[10px] font-sans text-slate-400 font-semibold">
            Pre-event Benchmark
          </span>
        </div>
      );
    }
    const isPositive = pct >= 0;
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={`inline-flex items-center gap-0.5 py-0.5 px-2 rounded-md font-mono font-black text-xs shadow-2xs ${
            isPositive
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
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
  const ncMtd = data.nc_mtd ?? 0;
  const ncBackward = data.nc_backward ?? 0;
  const ncDelta = ncMtd - ncBackward;
  const ncPctCompare = data.nc_pct_compare !== undefined 
    ? data.nc_pct_compare 
    : (ncBackward > 0 ? Math.round(((ncMtd - ncBackward) / ncBackward) * 100) : 0);

  return (
    <div className="inline-block w-auto min-w-[380px] max-w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/92 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-4 transition-all">
          <div className="bg-white px-5 py-3.5 rounded-2xl shadow-xl border border-teal-100 flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
              <div className="w-7 h-7 border-2 border-teal-100 border-t-teal-700 rounded-full animate-spin" />
              <div className="absolute w-3.5 h-3.5 border-2 border-emerald-200 border-b-emerald-500 rounded-full animate-spin" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                <span>Computing Backward Benchmark</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Equal period baseline comparison...</p>
            </div>
          </div>
        </div>
      )}
      {/* Table Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0c4ca3] px-3.5 py-2 flex items-center justify-between text-white gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/10 text-emerald-400">
            <History className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white whitespace-nowrap">
              Comparison vs Same Period Backward
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/30 text-blue-100 border border-blue-400/30 font-mono whitespace-nowrap">
            <Calendar className="w-3 h-3 text-blue-200" />
            <span>Up to {displayAsOf}</span>
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-white/15 text-white border border-white/20 whitespace-nowrap">
            Equal {data.backward_days}d Baseline
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-auto border-collapse text-xs text-left select-text">
          {/* Header Row with content-based sizing */}
          <thead className="bg-slate-100/90 text-slate-800 border-b border-slate-200 text-[10px] font-black uppercase">
            <tr>
              <th className="py-2 px-3.5 whitespace-nowrap border-r border-slate-200">
                Category &amp; Dimension
              </th>
              <th className="py-2 px-3.5 text-right whitespace-nowrap border-r border-slate-200">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-slate-900 font-black">MTD Volume</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded-sm border border-blue-200">
                    {data.mtd_days}d
                  </span>
                </div>
              </th>
              <th className="py-2 px-3.5 text-right whitespace-nowrap border-r border-slate-200">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-slate-900 font-black">Backward Benchmark</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-1 py-0.2 rounded-sm">
                    {data.backward_days}d
                  </span>
                </div>
              </th>
              <th className="py-2 px-3.5 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-slate-900 font-black">% Growth Focus</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded-sm border border-emerald-200">
                    Variance
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {/* 1. Buy Transactions */}
            <tr className="hover:bg-blue-50/30 transition-colors">
              <td className="py-2 px-3 border-r border-slate-200 font-sans">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <span className="font-bold text-slate-900">Buy Transactions</span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm font-semibold border border-blue-100">
                    {data.buy_trans_condition_label}
                  </span>
                </div>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-black text-[#0c4ca3]">
                  {formatNum(data.buy_trans_mtd)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">trans</span>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-bold text-slate-700">
                  {formatNum(data.buy_trans_backward)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">trans</span>
              </td>
              <td className="py-2 px-3 text-right align-middle bg-slate-50/50">
                {renderComparePill(data.buy_trans_pct_compare, transDelta, 'trans')}
              </td>
            </tr>

            {/* 2. New Customers (NC) */}
            <tr className="hover:bg-purple-50/30 transition-colors">
              <td className="py-2 px-3 border-r border-slate-200 font-sans">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                  <span className="font-bold text-slate-900">New Customers (NC)</span>
                  <span className="text-[10px] text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded-sm font-semibold border border-purple-200">
                    Registers
                  </span>
                </div>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-black text-purple-950">
                  {formatNum(ncMtd)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">users</span>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-bold text-slate-700">
                  {formatNum(ncBackward)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">users</span>
              </td>
              <td className="py-2 px-3 text-right align-middle bg-slate-50/50">
                {renderComparePill(ncPctCompare, ncDelta, 'users')}
              </td>
            </tr>

            {/* 2. Buy Value (Mil LAK) */}
            <tr className="hover:bg-emerald-50/30 transition-colors">
              <td className="py-2 px-3 border-r border-slate-200 font-sans">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900">Gross Buy Value</span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-sm font-semibold border border-emerald-100">
                    Mil LAK
                  </span>
                </div>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-black text-emerald-900">
                  {formatNum(data.buy_value_lak_mtd, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">mil LAK</span>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-bold text-slate-700">
                  {formatNum(data.buy_value_lak_backward, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">mil LAK</span>
              </td>
              <td className="py-2 px-3 text-right align-middle bg-slate-50/50">
                {renderComparePill(data.buy_value_pct_compare, valueDelta, 'mil')}
              </td>
            </tr>

            {/* 3. Buy Weight (Grams) */}
            <tr className="hover:bg-amber-50/30 transition-colors">
              <td className="py-2 px-3 border-r border-slate-200 font-sans">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-bold text-slate-900">Gold Weight</span>
                  <span className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded-sm font-semibold border border-amber-200">
                    Grams
                  </span>
                </div>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-black text-amber-950">
                  {formatNum(data.buy_weight_g_mtd, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">g</span>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-bold text-slate-700">
                  {formatNum(data.buy_weight_g_backward, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">g</span>
              </td>
              <td className="py-2 px-3 text-right align-middle bg-slate-50/50">
                {renderComparePill(data.buy_weight_pct_compare, weightDelta, 'g')}
              </td>
            </tr>

            {/* 4. Ticket Size (Grams) */}
            <tr className="hover:bg-violet-50/30 transition-colors">
              <td className="py-2 px-3 border-r border-slate-200 font-sans">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                  <span className="font-bold text-slate-900">Ticket Basket Size</span>
                  <span className="text-[10px] text-violet-900 bg-violet-50 px-1.5 py-0.5 rounded-sm font-semibold border border-violet-100">
                    g / ticket
                  </span>
                </div>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-black text-violet-950">
                  {formatNum(data.ticket_size_g_mtd, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">g/tx</span>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right align-middle">
                <span className="text-xs font-bold text-slate-700">
                  {formatNum(data.ticket_size_g_backward, 1)}
                </span>
                <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">g/tx</span>
              </td>
              <td className="py-2 px-3 text-right align-middle bg-slate-50/50">
                {renderComparePill(data.ticket_size_pct_compare, ticketDelta, 'g')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
