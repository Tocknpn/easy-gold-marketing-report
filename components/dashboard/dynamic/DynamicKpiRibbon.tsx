'use client';

import React from 'react';
import { 
  Users, 
  ArrowLeftRight, 
  UserPlus, 
  Coins, 
  ShoppingBag, 
  Tag, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Scale, 
  Percent, 
  Activity,
  Calculator
} from 'lucide-react';
import { DaxMeasuresPayload } from '@/lib/types/dynamicReport.types';

interface DynamicKpiRibbonProps {
  measures: DaxMeasuresPayload;
  isComparingPoP?: boolean;
}

export function DynamicKpiRibbon({ measures, isComparingPoP = false }: DynamicKpiRibbonProps) {
  const formatNumber = (val: number) => Math.round(val).toLocaleString('en-US');
  const formatDec = (val: number, dec: number = 2) => Number(val).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const formatMil = (valLak: number) => (valLak / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 });

  return (
    <div className="space-y-4 mb-6">
      {/* 1. Main 4-Column Grid: Platform Overview, Buy, Sell, Withdraw */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Platform Overview & Engagement (Navy Blue) */}
        <div className="bg-white rounded-2xl border border-blue-200/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0c4ca3]" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase text-[#0c4ca3] tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                Platform Engagement
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0c4ca3] border border-blue-200">
                All Activity
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Total Transactions</div>
                {isComparingPoP && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ▲ +13.8% PoP
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formatNumber(measures.total_transaction)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Unique Users</span>
                <span className="text-slate-800 font-extrabold text-sm">{formatNumber(measures.total_unique_user)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Freq / User</span>
                <span className="text-blue-700 font-extrabold text-sm">{formatDec(measures.freq_per_user_all)} tx</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">New Register</span>
                <span className="text-emerald-600 font-extrabold text-sm">{formatNumber(measures.new_register)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Total Gold Flow</span>
                <span className="text-amber-600 font-extrabold text-sm">{formatDec(measures.total_gold_weight_g, 1)} g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Buy Activity (Forest Green) */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#15803d]" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase text-[#15803d] tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4" />
                Buy Performance
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#15803d] border border-emerald-200">
                Inflow
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Buy Gold Weight (15g Baht)</div>
                {isComparingPoP && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ▲ +18.2% PoP
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#15803d] tracking-tight">
                {formatNumber(measures.gold_weight_buy_15g)} <span className="text-xs font-bold text-slate-500">Baht</span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                ({formatDec(measures.gold_weight_buy_g, 1)} grams)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Buy Trans</span>
                <span className="text-slate-800 font-extrabold text-sm">{formatNumber(measures.total_buy_transac)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Buyers</span>
                <span className="text-slate-800 font-extrabold text-sm">{formatNumber(measures.user_buy)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Ticket Size (g)</span>
                <span className="text-emerald-700 font-extrabold text-sm">{formatDec(measures.gold_buy_size_g, 3)} g</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">ABS (Money)</span>
                <span className="text-emerald-700 font-extrabold text-sm">{formatMil(measures.abs_buy_ticket_lak)}M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Sell Activity (Burgundy Red) */}
        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#991b1b]" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase text-[#991b1b] tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                Sell Performance
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#991b1b] border border-rose-200">
                Outflow
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Sell Gold Weight (15g Baht)</div>
                {isComparingPoP && (
                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    ▼ -14.5% PoP
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#991b1b] tracking-tight">
                {formatNumber(measures.gold_weight_sell_15g)} <span className="text-xs font-bold text-slate-500">Baht</span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                ({formatDec(measures.gold_weight_sell_g, 1)} grams)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Sell Trans</span>
                <span className="text-slate-800 font-extrabold text-sm">{formatNumber(measures.total_sell_transac)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Sellers</span>
                <span className="text-slate-800 font-extrabold text-sm">{formatNumber(measures.user_sell)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Ticket Size (g)</span>
                <span className="text-rose-700 font-extrabold text-sm">{formatDec(measures.gold_sell_size_g, 3)} g</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Avg Sell Size</span>
                <span className="text-rose-700 font-extrabold text-sm">{formatMil(measures.avg_sell_size_lak)}M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Withdraw Activity (Purple/Indigo) */}
        <div className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#6b21a8]" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase text-[#6b21a8] tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Withdraw Performance
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-[#6b21a8] border border-purple-200">
                Physical Bar
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Withdraw Weight (15g Baht)</div>
                {isComparingPoP && (
                  <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    ▲ +4.1% PoP
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#6b21a8] tracking-tight">
                {formatNumber(measures.withdraw_gold_15g)} <span className="text-xs font-bold text-slate-500">Baht</span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                ({formatDec(measures.withdraw_gold_g, 1)} grams)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Withdraw Trans</span>
                <span className="text-slate-800 font-extrabold text-sm">{formatNumber(measures.withdraw_trans)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Users</span>
                <span className="text-slate-800 font-extrabold text-sm">{formatNumber(measures.user_withdraw_gold)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Ticket Size (g)</span>
                <span className="text-purple-700 font-extrabold text-sm">{formatDec(measures.withdraw_ticket_size_g, 3)} g</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Withdraw Value</span>
                <span className="text-purple-700 font-extrabold text-sm">{formatMil(measures.withdraw_value_lak)}M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Secondary Ribbon: Pricing Dynamics, Net Flows, and Statistical Measures */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Flow & Share Dynamics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-[#0c4ca3]" />
            Net Flow & Volume Dynamics
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-500">%Net Flow (Transactions):</span>
                <span className="text-[#0c4ca3] font-black">{measures.net_flow_trans_pct}% Buy</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
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
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-500">%Net Flow (Revenue Value):</span>
                <span className="text-emerald-700 font-black">{measures.net_flow_value_pct}% Buy Revenue</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
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

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">Net Gold Balance (In - Out):</span>
              <span className={`font-black text-sm ${measures.net_gold_weight_g >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {measures.net_gold_weight_g >= 0 ? '+' : ''}{formatDec(measures.net_gold_weight_g, 2)} g
              </span>
            </div>
          </div>
        </div>

        {/* Gold Trading Price Benchmark */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-[#e5a812]" />
            Price Dynamics (LAK / 15g Baht)
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Period Open Price</span>
              <span className="text-slate-800 font-black text-base">{formatNumber(measures.open_price)}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Period Close Price</span>
              <span className="text-slate-800 font-black text-base">{formatNumber(measures.close_price)}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold bg-amber-50/70 border-amber-200">
            <span className="text-amber-900">Net Price Change:</span>
            <span className={`font-black flex items-center gap-1 ${measures.price_change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {measures.price_change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {measures.price_change >= 0 ? '+' : ''}{formatNumber(measures.price_change)} LAK
            </span>
          </div>
        </div>

        {/* Statistical Metrics (Min, Max, Avg, Median) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-[#0c4ca3]" />
            Statistical Distributions
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Average Value</span>
              <span className="text-slate-800 font-extrabold">{formatNumber(measures.avg_value_lak)} LAK</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Median Value (50%)</span>
              <span className="text-slate-800 font-extrabold">{formatNumber(measures.median_value_lak)} LAK</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Min Value</span>
              <span className="text-slate-800 font-extrabold">{formatNumber(measures.min_value_lak)} LAK</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Max Value</span>
              <span className="text-slate-800 font-extrabold">{formatMil(measures.max_value_lak)}M LAK</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between font-medium">
            <span>Avg Weight: <strong>{formatDec(measures.avg_weight_g, 4)}g</strong></span>
            <span>Median Weight: <strong>{formatDec(measures.median_weight_g, 4)}g</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
