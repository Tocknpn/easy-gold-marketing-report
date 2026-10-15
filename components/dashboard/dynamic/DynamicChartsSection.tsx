'use client';

import React, { useState } from 'react';
import { Clock, Landmark, Building2, Scale, BarChart3, Coins, AlertCircle } from 'lucide-react';
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
  // Chart Metric Toggle: 'tx' (Transactions) | 'weight' (Gold Grams) | 'amount' (Revenue LAK)
  const [metricMode, setMetricMode] = useState<'tx' | 'weight' | 'amount'>('tx');

  // Value getters based on metric mode
  const getHourlyVal = (h: HourlyMetric) => {
    if (metricMode === 'weight') return Math.round(h.buy_weight_g + h.sell_weight_g);
    if (metricMode === 'amount') return Math.round(h.total_amount_lak / 1000000); // in Millions LAK
    return h.total_tx;
  };

  const getBankVal = (b: BankMetric) => {
    if (metricMode === 'weight') return Math.round(b.total_weight_g);
    if (metricMode === 'amount') return Math.round(b.total_amount_lak / 1000000);
    return b.total_tx;
  };

  const getBranchVal = (br: BranchMetric) => {
    if (metricMode === 'weight') return Math.round(br.total_weight_g);
    if (metricMode === 'amount') return Math.round(br.total_amount_lak / 1000000);
    return br.total_tx;
  };

  const unitLabel = metricMode === 'weight' ? 'g' : metricMode === 'amount' ? 'M LAK' : 'tx';

  const maxHourlyVal = Math.max(...hourly.map(getHourlyVal), 1);
  const maxBankVal = Math.max(...banks.map(getBankVal), 1);
  const maxBranchVal = Math.max(...branches.map(getBranchVal), 1);
  const totalWeightCount = weightBrackets.reduce((acc, wb) => acc + wb.count, 0) || 1;
  const totalWeightGrams = weightBrackets.reduce((acc, wb) => acc + wb.total_weight_g, 0) || 1;

  // Top bank share check
  const topBank = banks.length > 0 ? banks[0] : null;
  const hasHighBankConcentration = topBank && topBank.share_pct > 60;

  return (
    <div className="space-y-4 mb-6">
      {/* Chart Section Header with Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#0c4ca3]" />
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Multi-Dimensional Visual Analytics &amp; Channel Dynamics
          </h3>
        </div>

        {/* Metric Switcher Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto text-[11px] font-extrabold text-slate-600">
          <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase">View By:</span>
          <button
            onClick={() => setMetricMode('tx')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'tx'
                ? 'bg-[#0c4ca3] text-white shadow-2xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Transactions (tx)
          </button>
          <button
            onClick={() => setMetricMode('weight')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'weight'
                ? 'bg-[#0c4ca3] text-white shadow-2xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Gold Weight (g)
          </button>
          <button
            onClick={() => setMetricMode('amount')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'amount'
                ? 'bg-[#0c4ca3] text-white shadow-2xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Revenue (M LAK)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Hourly Trading Activity (00:00 - 23:00) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0c4ca3]" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Hourly Activity Curve ({unitLabel})
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">24-Hour Cycle</span>
          </div>

          {/* 24-Column Mini Bar Chart */}
          <div className="h-44 flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 px-1 border-b border-slate-100">
            {hourly.map((h) => {
              const val = getHourlyVal(h);
              const heightPct = Math.max(4, Math.round((val / maxHourlyVal) * 100));
              const isPeak = h.hour >= 9 && h.hour <= 16;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                    <strong>{h.hour_label}</strong>: {val.toLocaleString()} {unitLabel} (Buy: {h.buy_weight_g}g | Sell: {h.sell_weight_g}g)
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
            <span className="text-[#0c4ca3] font-black">12:00 (Peak Window)</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* 2. Bank Volume & Share Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#0c4ca3]" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Bank Settlement Distribution
                </h3>
              </div>
              {hasHighBankConcentration && (
                <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>High Channel Risk</span>
                </span>
              )}
            </div>

            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {banks.slice(0, 6).map((b) => {
                const val = getBankVal(b);
                const barWidth = Math.max(4, Math.round((val / maxBankVal) * 100));
                return (
                  <div key={b.bank_name}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-800 flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-[#0c4ca3]" />
                        {b.bank_name}
                      </span>
                      <span className="text-slate-500 font-semibold shrink-0">
                        {val.toLocaleString()} {unitLabel} ({b.share_pct}%)
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

          <div className="pt-2 border-t border-slate-100 text-[10.5px] text-slate-400 font-medium flex justify-between">
            <span>Primary settlement gateway: <strong>{topBank?.bank_name || 'BCEL'}</strong></span>
            <span>Dependency: <strong>{topBank?.share_pct || 72}%</strong></span>
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
              const countPct = Math.round((wb.count / totalWeightCount) * 100);
              const weightPct = Math.round((wb.total_weight_g / totalWeightGrams) * 100);
              return (
                <div key={wb.weight_bracket} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                  <div className="text-[11px] font-extrabold text-slate-700 truncate">{wb.weight_bracket}</div>
                  <div className="text-base font-black text-[#0c4ca3] mt-1">
                    {metricMode === 'weight' ? `${wb.total_weight_g.toLocaleString()}g` : wb.count.toLocaleString()}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-0.5">
                    <span>{countPct}% tx share</span>
                    <span>{weightPct}% weight</span>
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
                Top Branches &amp; Physical Network
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Khamphouvong Network</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {branches.slice(0, 5).map((br) => {
              const val = getBranchVal(br);
              const barWidth = Math.max(5, Math.round((val / maxBranchVal) * 100));
              return (
                <div key={br.branch_name} className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800 truncate max-w-[200px]">{br.branch_name}</span>
                    <span className="text-[#6b21a8] font-black">
                      {br.withdraw_tx > 0 ? `${br.withdraw_tx.toLocaleString()} withdrawals` : `${val.toLocaleString()} ${unitLabel}`}
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
    </div>
  );
}
