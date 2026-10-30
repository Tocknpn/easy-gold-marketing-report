'use client';

import React from 'react';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  UserPlus, 
  ShoppingBag, 
  ShieldCheck, 
  ChevronRight,
  Flame,
  Gauge
} from 'lucide-react';

export interface ExecutivePulseProps {
  // 1. Target Pacing (from Business Target)
  targetMonthLabel: string;
  targetPacePct: number;
  targetEstLandingPct: number;
  daysGone: number;
  totalDays: number;

  // 2. Est. Month-End Landing MoM (Avg of 7 MTD metrics)
  mtdCompMonthLabel: string;
  avgEstLandingMoMPct: number;

  // 3. All Transaction Count MTD
  totalTransactionsMtd: number;
  totalTransactionsMoMPct: number;

  // 4. NC MTD Pace
  newCustomersMtd: number;
  newCustomersMoMPct: number;

  // 5. Weekly Buy Momentum
  activeWeekLabel: string;
  weeklyVolumeBaht: number;
  weeklyWoWVariance: number;
  isPartialWeek: boolean;

  // Tab navigation jump
  onNavigateTab: (tab: 'targets' | 'weekly' | 'mtd') => void;
}

export function ExecutivePulseBanner({
  targetMonthLabel,
  targetPacePct,
  targetEstLandingPct,
  daysGone,
  totalDays,
  mtdCompMonthLabel,
  avgEstLandingMoMPct,
  totalTransactionsMtd,
  totalTransactionsMoMPct,
  newCustomersMtd,
  newCustomersMoMPct,
  activeWeekLabel,
  weeklyVolumeBaht,
  weeklyWoWVariance,
  isPartialWeek,
  onNavigateTab,
}: ExecutivePulseProps) {
  const timeElapsedPct = totalDays > 0 ? Math.round((daysGone / totalDays) * 100) : 68;
  const isTargetAhead = targetPacePct >= timeElapsedPct;
  const isLandingPositive = avgEstLandingMoMPct >= 0;
  const isTotalTxPositive = totalTransactionsMoMPct >= 0;
  const isNcPositive = newCustomersMoMPct >= 0;
  const isWeeklyPositive = weeklyWoWVariance >= 0;

  return (
    <div id="email-snap-quick-brief" className="w-full bg-white text-slate-900 rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200/90 mb-4 transition-all">
      {/* Top Header Label */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-gold animate-pulse shadow-xs" />
          <h2 className="text-xs font-black uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
            Quick Brief Top line performance
          </h2>
        </div>
      </div>

      {/* 5 Core Executive Takeaway Pillars in Bright Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 items-stretch">
        
        {/* Card 1: Target Pacing (Business Target) */}
        <div 
          onClick={() => onNavigateTab('targets')}
          className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-tight text-[11px] text-slate-700">
              <Target className="w-3.5 h-3.5 text-brand-navy" />
              Target Pacing ({targetMonthLabel})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-sans tabular-nums text-slate-900 tracking-tight">
                {targetPacePct.toFixed(1)}%
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                isTargetAhead 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {isTargetAhead ? '▲ Ahead' : '▼ Behind'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold font-mono">
              Day {daysGone}/{totalDays}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-600 font-medium mt-1.5 line-clamp-1">
            Avg 5 targets • Est: {targetEstLandingPct.toFixed(0)}% hit
          </p>
        </div>

        {/* Card 2: Est. Current Month Landing MoM (Avg of 7 MTD metrics) */}
        <div 
          onClick={() => onNavigateTab('mtd')}
          className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-tight text-[11px] text-slate-700">
              <Gauge className="w-3.5 h-3.5 text-[#0c4ca3]" />
              Est. Landing (MoM)
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-black font-sans tabular-nums tracking-tight ${
                isLandingPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {isLandingPositive ? `+${avgEstLandingMoMPct}%` : `${avgEstLandingMoMPct}%`}
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                isLandingPositive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                MoM Avg
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold font-mono truncate max-w-[80px]">
              vs {mtdCompMonthLabel}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-600 font-medium mt-1.5 line-clamp-1">
            Avg of 7 MTD metrics forecast
          </p>
        </div>

        {/* Card 3: All Transaction count MTD (MoM) */}
        <div 
          onClick={() => onNavigateTab('mtd')}
          className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-tight text-[11px] text-slate-700">
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
              All Trans MTD Pace
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-sans tabular-nums text-slate-900 tracking-tight">
                {totalTransactionsMtd.toLocaleString()}
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                isTotalTxPositive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {isTotalTxPositive ? `▲ +${totalTransactionsMoMPct}%` : `▼ ${totalTransactionsMoMPct}%`}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-600 font-medium mt-1.5 line-clamp-1">
            Total transactions vs {mtdCompMonthLabel}
          </p>
        </div>

        {/* Card 4: NC MTD Pace (MoM) */}
        <div 
          onClick={() => onNavigateTab('mtd')}
          className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-tight text-[11px] text-slate-700">
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              NC MTD Pace
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-sans tabular-nums text-slate-900 tracking-tight">
                {newCustomersMtd.toLocaleString()}
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                isNcPositive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {isNcPositive ? `▲ +${newCustomersMoMPct}%` : `▼ ${newCustomersMoMPct}%`}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-600 font-medium mt-1.5 line-clamp-1">
            New customers vs {mtdCompMonthLabel}
          </p>
        </div>

        {/* Card 5: Weekly Trading Momentum */}
        <div 
          onClick={() => onNavigateTab('weekly')}
          className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-tight text-[11px] text-slate-700">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Weekly Momentum ({activeWeekLabel})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between mt-1 flex-wrap gap-1">
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black font-sans tabular-nums text-slate-900 tracking-tight">
                {weeklyVolumeBaht.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500">Baht</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${
                isWeeklyPositive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {isWeeklyPositive ? `+${weeklyWoWVariance}%` : `${weeklyWoWVariance}%`} WoW
              </span>
              {isPartialWeek && (
                <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded">
                  Partial
                </span>
              )}
            </div>
          </div>
          <p className="text-[10.5px] text-slate-600 font-medium mt-1.5 line-clamp-1">
            Retail buy activity accounts for volume
          </p>
        </div>

      </div>
    </div>
  );
}
