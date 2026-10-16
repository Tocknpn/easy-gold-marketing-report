'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { ArrowUpRight, Coins } from 'lucide-react';

interface SellActivitySectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  selectedWeek?: string;
  isPartialWeek?: boolean;
}

export function SellActivitySection({
  currentWeek,
  history,
  variances,
  selectedWeek,
  isPartialWeek = false,
}: SellActivitySectionProps) {
  // Extract historical trend series
  const weightData = history.map((w) => ({ week: w.week_label, value: Number(w.sell_weight_15g) }));
  const txData = history.map((w) => ({ week: w.week_label, value: w.sell_transactions }));
  const ticketData = history.map((w) => ({ week: w.week_label, value: Number(w.sell_ticket_size_g) }));

  // Prorated estimates for partial week
  const isPartial = isPartialWeek || currentWeek.week_label === 'W42';
  const proratedWeight = isPartial ? Math.round(Number(currentWeek.sell_weight_15g) * 7) : undefined;
  const proratedTx = isPartial ? Math.round(currentWeek.sell_transactions * 7) : undefined;

  return (
    <div className="border border-rose-200/80 rounded-2xl p-3 sm:p-3.5 bg-gradient-to-b from-[#fdf6f7] via-white to-[#fdf6f7] shadow-xs h-full flex flex-col justify-between">
      {/* Burgundy Header Banner */}
      <div className="bg-gradient-to-r from-[#6e112a] via-[#7d1232] to-[#881337] text-white font-black text-xs sm:text-sm tracking-wider px-3.5 py-2 rounded-xl mb-3 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/20 backdrop-blur-xs">
            <Coins className="w-3.5 h-3.5 text-rose-100" />
          </div>
          <span className="uppercase tracking-wide font-black">Sell Activity</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-rose-200 bg-white/10 px-2 py-0.5 rounded-md">
            <ArrowUpRight className="w-3 h-3 text-rose-300" />
            Outflow
          </span>
        </div>
        <span className="text-[11px] font-bold text-rose-100 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
          Active: {currentWeek.week_label}
        </span>
      </div>

      {/* 3 Cards Grid - 2 Rows matching Platform Overview 2x2 footprint */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 flex-1">
        {/* Card 1: Gold Weight (15g) */}
        <MetricKpiCard
          title="Gold Weight (15g)"
          value={Number(currentWeek.sell_weight_15g)}
          variancePercent={variances.sell_weight_15g}
          historyData={weightData}
          themeColor="red"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Baht"
          proratedEstimate={proratedWeight}
          isPartialWeek={isPartial}
        />

        {/* Card 2: Transaction */}
        <MetricKpiCard
          title="Transaction"
          value={currentWeek.sell_transactions}
          variancePercent={variances.sell_transactions}
          historyData={txData}
          themeColor="red"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Count"
          proratedEstimate={proratedTx}
          isPartialWeek={isPartial}
        />

        {/* Card 3: Ticket Size (g) */}
        <div className="sm:col-span-2">
          <MetricKpiCard
            title="Ticket Size (g)"
            value={Number(currentWeek.sell_ticket_size_g)}
            variancePercent={variances.sell_ticket_size_g}
            historyData={ticketData}
            themeColor="red"
            isDecimal={true}
            selectedWeek={selectedWeek || currentWeek.week_label}
            subtitle="Avg/Tx"
          />
        </div>
      </div>
    </div>
  );
}
