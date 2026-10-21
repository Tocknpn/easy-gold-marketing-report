'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { prorateLinear } from '@/lib/utils/runRate';
import { ArrowUpRight, Coins } from 'lucide-react';

interface SellActivitySectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  selectedWeek?: string;
  isPartialWeek?: boolean;
  elapsedDays?: number;
  isProratedWoW?: boolean;
}

export function SellActivitySection({
  currentWeek,
  history,
  variances,
  selectedWeek,
  isPartialWeek = false,
  elapsedDays = 7,
  isProratedWoW = false,
}: SellActivitySectionProps) {
  // Extract historical trend series
  const weightData = history.map((w) => ({ week: w.week_label, value: Number(w.sell_weight_15g) }));
  const txData = history.map((w) => ({ week: w.week_label, value: w.sell_transactions }));
  const ticketData = history.map((w) => ({ week: w.week_label, value: Number(w.sell_ticket_size_g) }));
  const valueData = history.map((w) => ({
    week: w.week_label,
    value: w.sell_value_mil_lak ?? 0,
  }));

  // Current sell value in Mil LAK (zero if unrecorded, never fake 3.14 multiplier)
  const currentSellValue = currentWeek.sell_value_mil_lak ?? 0;

  // Accurate linear prorated estimates for partial week only when prorate toggle is OFF
  const showProratedEstimate = Boolean(isPartialWeek) && !isProratedWoW && elapsedDays < 7;
  const proratedWeight = showProratedEstimate ? prorateLinear(Number(currentWeek.sell_weight_15g), elapsedDays, 7) : undefined;
  const proratedTx = showProratedEstimate ? prorateLinear(currentWeek.sell_transactions, elapsedDays, 7) : undefined;
  const proratedValue = showProratedEstimate && currentSellValue > 0 ? prorateLinear(currentSellValue, elapsedDays, 7) : undefined;

  return (
    <div className="border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 bg-white shadow-xs h-full flex flex-col justify-between">
      {/* Neutral Trading Indigo Header Banner */}
      <div className="bg-[#4338ca] text-white font-bold text-xs sm:text-sm tracking-wider px-3.5 py-2.5 rounded-xl mb-3 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/15">
            <Coins className="w-3.5 h-3.5 text-indigo-100" />
          </div>
          <span className="uppercase tracking-wide font-black">Sell Activity</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-100 bg-white/15 px-2 py-0.5 rounded-md">
            <ArrowUpRight className="w-3 h-3 text-indigo-200" />
            Outflow
          </span>
        </div>
        <span className="text-xs font-bold font-mono tabular-nums text-indigo-100 bg-white/15 px-2 py-0.5 rounded-md">
          {currentWeek.week_label}
        </span>
      </div>

      {/* 4 Cards in 2x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 flex-1">
        {/* Card 1: Gold Weight (15g) */}
        <MetricKpiCard
          title="Gold Weight (15g)"
          value={Number(currentWeek.sell_weight_15g)}
          variancePercent={variances.sell_weight_15g}
          historyData={weightData}
          themeColor="indigo"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Baht"
          proratedEstimate={proratedWeight}
          isPartialWeek={showProratedEstimate}
        />

        {/* Card 2: Transaction */}
        <MetricKpiCard
          title="Transaction"
          value={currentWeek.sell_transactions}
          variancePercent={variances.sell_transactions}
          historyData={txData}
          themeColor="indigo"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Count"
          proratedEstimate={proratedTx}
          isPartialWeek={showProratedEstimate}
        />

        {/* Card 3: Value (mil LAK) */}
        <MetricKpiCard
          title="Value (mil LAK)"
          value={currentSellValue > 0 ? currentSellValue : 'N/A'}
          variancePercent={variances.sell_value_mil_lak ?? variances.sell_weight_15g}
          historyData={valueData}
          themeColor="indigo"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Volume"
          proratedEstimate={proratedValue}
          isPartialWeek={showProratedEstimate && currentSellValue > 0}
        />

        {/* Card 4: Ticket Size (g) */}
        <MetricKpiCard
          title="Ticket Size (g)"
          value={Number(currentWeek.sell_ticket_size_g)}
          variancePercent={variances.sell_ticket_size_g}
          historyData={ticketData}
          themeColor="indigo"
          isDecimal={true}
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Avg/Tx"
        />
      </div>
    </div>
  );
}
