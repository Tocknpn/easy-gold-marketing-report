'use client';

import React from 'react';
import { Clock, Landmark, Building2, Scale } from 'lucide-react';
import { HourlyMetric, BankMetric, BranchMetric, WeightBracketMetric } from '@/lib/types/dynamicReport.types';

interface DynamicChartsSectionProps {
  hourly: HourlyMetric[];
  banks: BankMetric[];
  branches: BranchMetric[];
  weightBrackets: WeightBracketMetric[];
}

export function DynamicChartsSection({
  hourly,
  banks,
  branches,
  weightBrackets,
}: DynamicChartsSectionProps) {
  const maxHourlyTx = Math.max(...hourly.map((h) => h.total_tx), 1);
  const maxBankTx = Math.max(...banks.map((b) => b.total_tx), 1);
  const maxBranchTx = Math.max(...branches.map((br) => br.total_tx), 1);
  const totalWeightCount = weightBrackets.reduce((acc, wb) => acc + wb.count, 0) || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* 1. Hourly Trading Activity (00:00 - 23:00) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0c4ca3]" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Hourly Trading Volume (Peak Hours)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">24-Hour Cycle</span>
        </div>

        {/* 24-Column Mini Bar Chart */}
        <div className="h-44 flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 px-1 border-b border-slate-100">
          {hourly.map((h) => {
            const heightPct = Math.max(4, Math.round((h.total_tx / maxHourlyTx) * 100));
            const isPeak = h.hour >= 9 && h.hour <= 16;
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                  <strong>{h.hour_label}</strong>: {h.total_tx.toLocaleString()} tx ({h.buy_weight_g}g)
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all group-hover:brightness-110 ${
                    isPeak ? 'bg-[#0c4ca3]' : 'bg-slate-300'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-1">
          <span>00:00</span>
          <span>06:00</span>
          <span className="text-[#0c4ca3] font-black">12:00 (Peak)</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </div>

      {/* 2. Bank Volume & Share Distribution */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#0c4ca3]" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Bank Share & Settlement Channels
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Share of Transactions</span>
        </div>

        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
          {banks.slice(0, 6).map((b) => {
            const barWidth = Math.max(4, Math.round((b.total_tx / maxBankTx) * 100));
            return (
              <div key={b.bank_name}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0c4ca3]" />
                    {b.bank_name}
                  </span>
                  <span className="text-slate-500 font-semibold">
                    {b.total_tx.toLocaleString()} tx ({b.share_pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0c4ca3] h-full rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Gold Weight Brackets (<0.5g to >15g) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#e5a812]" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Gold Weight Ticket Distribution
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Retail vs Wholesale</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {weightBrackets.map((wb) => {
            const pct = Math.round((wb.count / totalWeightCount) * 100);
            return (
              <div key={wb.weight_bracket} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[11px] font-extrabold text-slate-700 truncate">{wb.weight_bracket}</div>
                <div className="text-base font-black text-[#0c4ca3] mt-1">{wb.count.toLocaleString()}</div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-0.5">
                  <span>{pct}% share</span>
                  <span>{wb.total_weight_g.toLocaleString()}g</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Branch & Physical Withdraw Network */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#6b21a8]" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Top Branches & In-Store Withdrawals
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Khamphouvong Network</span>
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {branches.slice(0, 5).map((br) => {
            const barWidth = Math.max(5, Math.round((br.total_tx / maxBranchTx) * 100));
            return (
              <div key={br.branch_name} className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800 truncate max-w-[200px]">{br.branch_name}</span>
                  <span className="text-[#6b21a8] font-black">
                    {br.withdraw_tx > 0 ? `${br.withdraw_tx.toLocaleString()} withdrawals` : `${br.total_tx.toLocaleString()} tx`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#6b21a8] h-full rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
