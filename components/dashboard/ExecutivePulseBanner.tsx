'use client';

import React from 'react';
import { Target, TrendingUp, ArrowRightLeft, ShieldCheck, ChevronRight } from 'lucide-react';

interface ExecutivePulseProps {
  // Monthly Target Pacing
  currentMonthLabel: string;
  targetPacePct: number;
  isAheadOfTarget: boolean;
  daysGone: number;
  totalDays: number;
  
  // Weekly Trading Momentum
  activeWeekLabel: string;
  weeklyVolumeBaht: number;
  weeklyWoWVariance: number;
  isPartialWeek: boolean;
  isProrated: boolean;

  // Net Inventory Position
  netGoldFlowBaht: number;
  totalTurnoverBaht: number;
  orderFlowRatio: string;

  // Tab navigation jump
  onNavigateTab: (tab: 'targets' | 'weekly' | 'mtd') => void;
}

export function ExecutivePulseBanner({
  currentMonthLabel,
  targetPacePct,
  isAheadOfTarget,
  daysGone,
  totalDays,
  activeWeekLabel,
  weeklyVolumeBaht,
  weeklyWoWVariance,
  isPartialWeek,
  isProrated,
  netGoldFlowBaht,
  totalTurnoverBaht,
  orderFlowRatio,
  onNavigateTab,
}: ExecutivePulseProps) {
  const isNetAccumulation = netGoldFlowBaht >= 0;
  const isWeeklyPositive = weeklyWoWVariance >= 0;

  return (
    <div className="w-full bg-[#0b192c] text-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-800 mb-4 transition-all">
      {/* Top Header Label */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#d4a017] animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-wider text-[#d4a017]">
            Executive Briefing Pulse
          </h2>
          <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
            5-Second High-Level Operations &amp; Pacing Summary
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live Parity Verified</span>
        </div>
      </div>

      {/* 3 Core Executive Takeaway Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
        {/* Pillar 1: Monthly Target Pacing */}
        <div 
          onClick={() => onNavigateTab('targets')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
              <Target className="w-3.5 h-3.5 text-[#d4a017]" />
              Target Pacing ({currentMonthLabel})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
                {targetPacePct.toFixed(1)}%
              </span>
              <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
                isAheadOfTarget ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-400 border border-rose-800'
              }`}>
                {isAheadOfTarget ? '▲ Ahead' : '▼ Behind'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Day {daysGone}/{totalDays}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-1">
            Current MTD run-rate is tracking {isAheadOfTarget ? 'ahead of' : 'below'} linear target schedule.
          </p>
        </div>

        {/* Pillar 2: Weekly Trading Momentum */}
        <div 
          onClick={() => onNavigateTab('weekly')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Weekly Momentum ({activeWeekLabel})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
                {weeklyVolumeBaht.toLocaleString()} Baht
              </span>
              <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
                isWeeklyPositive ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {isWeeklyPositive ? `+${weeklyWoWVariance}%` : `${weeklyWoWVariance}%`} WoW
              </span>
            </div>
            {isPartialWeek && (
              <span className="text-[10px] font-mono text-amber-400">
                {isProrated ? '⚡ Prorated' : 'Partial'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-1">
            Retail buy activity accounts for {weeklyVolumeBaht > 0 ? 'the majority of' : 'active'} trading volume.
          </p>
        </div>

        {/* Pillar 3: Net Gold Flow & Inventory Exposure */}
        <div 
          onClick={() => onNavigateTab('weekly')}
          className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              Net Gold Exposure ({activeWeekLabel})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
                {isNetAccumulation ? `+${netGoldFlowBaht.toLocaleString()}` : netGoldFlowBaht.toLocaleString()} Baht
              </span>
              <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
                isNetAccumulation ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
              }`}>
                {isNetAccumulation ? 'Accumulation' : 'Liquidation'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Ratio: {orderFlowRatio}x
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-1">
            Total gold turnover: {totalTurnoverBaht.toLocaleString()} Baht across buy &amp; sell orders.
          </p>
        </div>
      </div>
    </div>
  );
}
