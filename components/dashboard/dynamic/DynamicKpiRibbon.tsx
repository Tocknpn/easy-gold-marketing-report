'use client';

import React from 'react';
import { 
  ShoppingBag, 
  Tag, 
  Layers, 
  Activity,
  ArrowLeftRight
} from 'lucide-react';
import { DaxMeasuresPayload, PopComparisonMetrics } from '@/lib/types/dynamicReport.types';

interface DynamicKpiRibbonProps {
  measures: DaxMeasuresPayload;
  popComparison?: PopComparisonMetrics;
  isComparingPoP?: boolean;
}

export function DynamicKpiRibbon({ measures, popComparison, isComparingPoP = false }: DynamicKpiRibbonProps) {
  const formatNumber = (val: number) => Math.round(val || 0).toLocaleString('en-US');
  const formatDec = (val: number, dec: number = 2) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const formatMil = (valLak: number) => ((valLak || 0) / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 });

  const renderPopBadge = (pct?: number, prevLabel?: string) => {
    if (!isComparingPoP) return null;
    const val = Number(pct ?? 0);
    const isPos = val >= 0;
    return (
      <span
        title={prevLabel ? `Prior Period (${popComparison?.prev_start_date} to ${popComparison?.prev_end_date}): ${prevLabel}` : undefined}
        className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
          isPos
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-rose-700 bg-rose-50 border-rose-200'
        }`}
      >
        {isPos ? '▲ +' : '▼ '}
        {val.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="mb-6">
      {/* 5-Column Grid: Platform Overview, Buy, Sell, Withdraw, and Net Flow Dynamics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Platform Overview & Engagement (Navy Blue) */}
        <div className="bg-white rounded-2xl border border-blue-200/80 p-3.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0c4ca3]" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase text-[#0c4ca3] tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Platform Engagement
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0c4ca3] border border-blue-200">
                All Activity
              </span>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Transactions</div>
                {renderPopBadge(popComparison?.total_tx_pct, `${formatNumber(popComparison?.prev_total_transaction || 0)} tx`)}
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatNumber(measures.total_transaction)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Unique Users</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-800 font-extrabold text-xs">{formatNumber(measures.total_unique_user)}</span>
                  {isComparingPoP && popComparison && (
                    <span className={`text-[8.5px] font-bold ${popComparison.unique_user_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({popComparison.unique_user_pct >= 0 ? '+' : ''}{popComparison.unique_user_pct}%)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Freq / User</span>
                <span className="text-blue-700 font-extrabold text-xs">{formatDec(measures.freq_per_user_all)} tx</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">New Register</span>
                <div className="flex items-center gap-1">
                  <span className="text-emerald-600 font-extrabold text-xs">{formatNumber(measures.new_register)}</span>
                  {isComparingPoP && popComparison && (
                    <span className={`text-[8.5px] font-bold ${popComparison.new_register_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({popComparison.new_register_pct >= 0 ? '+' : ''}{popComparison.new_register_pct}%)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Total Gold Flow</span>
                <div className="flex items-center gap-1">
                  <span className="text-amber-600 font-extrabold text-xs">{formatDec(measures.total_gold_weight_g, 1)} g</span>
                  {isComparingPoP && popComparison && (
                    <span className={`text-[8.5px] font-bold ${popComparison.total_gold_flow_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({popComparison.total_gold_flow_pct >= 0 ? '+' : ''}{popComparison.total_gold_flow_pct}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Buy Activity (Forest Green) */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-3.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#15803d]" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase text-[#15803d] tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                Buy Performance
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#15803d] border border-emerald-200">
                Inflow
              </span>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Buy Gold Weight (15g Baht)</div>
                {renderPopBadge(popComparison?.buy_weight_pct, `${formatDec(popComparison?.prev_gold_weight_buy_g || 0, 1)} g`)}
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#15803d] tracking-tight">
                {formatNumber(measures.gold_weight_buy_15g)} <span className="text-xs font-bold text-slate-500">Baht</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                ({formatDec(measures.gold_weight_buy_g, 1)} grams)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Buy Trans</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-800 font-extrabold text-xs">{formatNumber(measures.total_buy_transac)}</span>
                  {isComparingPoP && popComparison && (
                    <span className={`text-[8.5px] font-bold ${popComparison.buy_tx_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({popComparison.buy_tx_pct >= 0 ? '+' : ''}{popComparison.buy_tx_pct}%)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Buyers</span>
                <span className="text-slate-800 font-extrabold text-xs">{formatNumber(measures.user_buy)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Ticket Size (g)</span>
                <span className="text-emerald-700 font-extrabold text-xs">{formatDec(measures.gold_buy_size_g, 3)} g</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">ABS (Money)</span>
                <span className="text-emerald-700 font-extrabold text-xs">{formatMil(measures.abs_buy_ticket_lak)}M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Sell Activity (Burgundy Red) */}
        <div className="bg-white rounded-2xl border border-rose-200/80 p-3.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#991b1b]" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase text-[#991b1b] tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Sell Performance
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#991b1b] border border-rose-200">
                Outflow
              </span>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Sell Gold Weight (15g Baht)</div>
                {renderPopBadge(popComparison?.sell_weight_pct, `${formatDec(popComparison?.prev_gold_weight_sell_g || 0, 1)} g`)}
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#991b1b] tracking-tight">
                {formatNumber(measures.gold_weight_sell_15g)} <span className="text-xs font-bold text-slate-500">Baht</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                ({formatDec(measures.gold_weight_sell_g, 1)} grams)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Sell Trans</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-800 font-extrabold text-xs">{formatNumber(measures.total_sell_transac)}</span>
                  {isComparingPoP && popComparison && (
                    <span className={`text-[8.5px] font-bold ${popComparison.sell_tx_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({popComparison.sell_tx_pct >= 0 ? '+' : ''}{popComparison.sell_tx_pct}%)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Sellers</span>
                <span className="text-slate-800 font-extrabold text-xs">{formatNumber(measures.user_sell)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Ticket Size (g)</span>
                <span className="text-rose-700 font-extrabold text-xs">{formatDec(measures.gold_sell_size_g, 3)} g</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Avg Sell Size</span>
                <span className="text-rose-700 font-extrabold text-xs">{formatMil(measures.avg_sell_size_lak)}M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Withdraw Activity (Purple/Indigo) */}
        <div className="bg-white rounded-2xl border border-purple-200/80 p-3.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#6b21a8]" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase text-[#6b21a8] tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Withdraw Performance
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-[#6b21a8] border border-purple-200">
                Physical Bar
              </span>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Withdraw Weight (15g Baht)</div>
                {renderPopBadge(popComparison?.withdraw_weight_pct, `${formatDec(popComparison?.prev_withdraw_gold_g || 0, 1)} g`)}
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#6b21a8] tracking-tight">
                {formatNumber(measures.withdraw_gold_15g)} <span className="text-xs font-bold text-slate-500">Baht</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                ({formatDec(measures.withdraw_gold_g, 1)} grams)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Withdraw Trans</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-800 font-extrabold text-xs">{formatNumber(measures.withdraw_trans)}</span>
                  {isComparingPoP && popComparison && (
                    <span className={`text-[8.5px] font-bold ${popComparison.withdraw_tx_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({popComparison.withdraw_tx_pct >= 0 ? '+' : ''}{popComparison.withdraw_tx_pct}%)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Users</span>
                <span className="text-slate-800 font-extrabold text-xs">{formatNumber(measures.user_withdraw_gold)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Ticket Size (g)</span>
                <span className="text-purple-700 font-extrabold text-xs">{formatDec(measures.withdraw_ticket_size_g, 3)} g</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[9.5px] uppercase">Withdraw Value</span>
                <span className="text-purple-700 font-extrabold text-xs">{formatMil(measures.withdraw_value_lak)}M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Net Flow & Volume Dynamics (Teal Accent, matching card style) */}
        <div className="bg-white rounded-2xl border border-teal-200/80 p-3.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0f766e]" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase text-[#0f766e] tracking-wider flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Net Flow Dynamics
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[#0f766e] border border-teal-200">
                In vs Out
              </span>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Net Gold Balance (In - Out)</div>
                {isComparingPoP && popComparison ? (
                  renderPopBadge(popComparison.net_weight_pct, `${formatDec(popComparison.prev_net_gold_weight_g || 0, 1)} g`)
                ) : (
                  <span className="text-[9px] font-black text-teal-800 bg-teal-50 px-1 py-0.5 rounded border border-teal-200">
                    {measures.net_flow_trans_pct}% Buy
                  </span>
                )}
              </div>
              <div className={`text-xl sm:text-2xl font-black tracking-tight ${measures.net_gold_weight_g >= 0 ? 'text-[#0f766e]' : 'text-rose-600'}`}>
                {measures.net_gold_weight_g >= 0 ? '+' : ''}{formatDec(measures.net_gold_weight_g, 1)} <span className="text-xs font-bold text-slate-500">grams</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Revenue share: {measures.net_flow_value_pct}% Buy
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <div className="flex justify-between text-[9.5px] font-bold text-slate-500 mb-0.5">
                  <span>Transactions Flow:</span>
                  <span className="text-[#0c4ca3] font-black">{measures.net_flow_trans_pct}% Buy</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-[#0c4ca3] h-full" 
                    style={{ width: `${Math.min(100, Math.max(0, measures.net_flow_trans_pct))}%` }} 
                  />
                  <div 
                    className="bg-[#991b1b] h-full" 
                    style={{ width: `${Math.min(100, Math.max(0, 100 - measures.net_flow_trans_pct))}%` }} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[9.5px] font-bold text-slate-500 mb-0.5">
                  <span>Revenue Flow:</span>
                  <span className="text-emerald-700 font-black">{measures.net_flow_value_pct}% Buy</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-[#15803d] h-full" 
                    style={{ width: `${Math.min(100, Math.max(0, measures.net_flow_value_pct))}%` }} 
                  />
                  <div 
                    className="bg-[#991b1b] h-full" 
                    style={{ width: `${Math.min(100, Math.max(0, 100 - measures.net_flow_value_pct))}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
