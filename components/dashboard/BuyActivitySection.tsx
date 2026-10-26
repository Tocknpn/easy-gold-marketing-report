'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { prorateLinear } from '@/lib/utils/runRate';
import { ArrowDownLeft, ShoppingBag } from 'lucide-react';

interface BuyActivitySectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  selectedWeek?: string;
  isPartialWeek?: boolean;
  elapsedDays?: number;
  isProratedWoW?: boolean;
}

export function BuyActivitySection({
  currentWeek,
  history,
  variances,
  selectedWeek,
  isPartialWeek = false,
  elapsedDays = 7,
  isProratedWoW = false,
}: BuyActivitySectionProps) {
  // Extract historical trend series
  const weightData = history.map((w) => ({ week: w.week_label, value: Number(w.buy_weight_15g) }));
  const txData = history.map((w) => ({ week: w.week_label, value: w.buy_transactions }));
  const ticketData = history.map((w) => ({ week: w.week_label, value: Number(w.buy_ticket_size_g) }));
  const valueData = history.map((w) => ({
    week: w.week_label,
    value: w.buy_value_mil_lak ?? 0,
  }));

  // Current buy value in Mil LAK (zero if unrecorded, never fake 3.14 multiplier)
  const currentBuyValue = currentWeek.buy_value_mil_lak ?? 0;

  // Accurate linear prorated estimates for partial week only when prorate toggle is OFF
  const showProratedEstimate = Boolean(isPartialWeek) && !isProratedWoW && elapsedDays < 7;
  const proratedWeight = showProratedEstimate ? prorateLinear(Number(currentWeek.buy_weight_15g), elapsedDays, 7) : undefined;
  const proratedTx = showProratedEstimate ? prorateLinear(currentWeek.buy_transactions, elapsedDays, 7) : undefined;
  const proratedValue = showProratedEstimate && currentBuyValue > 0 ? prorateLinear(currentBuyValue, elapsedDays, 7) : undefined;

  return (
    <div className="border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 bg-white shadow-xs h-full flex flex-col justify-between">
      {/* Forest Emerald Header Banner */}
      <div className="bg-[#059669] text-white font-bold text-xs sm:text-sm tracking-wider px-3.5 py-2.5 rounded-xl mb-3 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/15">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-100" />
          </div>
          <span className="uppercase tracking-wide font-black">Buy Activity</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-100 bg-white/15 px-2 py-0.5 rounded-md">
            <ArrowDownLeft className="w-3 h-3 text-emerald-200" />
            Inflow
          </span>
        </div>
        <span className="text-xs font-bold font-mono tabular-nums text-emerald-100 bg-white/15 px-2 py-0.5 rounded-md">
          {currentWeek.week_label}
        </span>
      </div>

      {/* 4 Cards in 2x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 flex-1">
        {/* Card 1: Gold Weight (15g) */}
        <MetricKpiCard
          title="Gold Weight (15g)"
          value={Number(currentWeek.buy_weight_15g)}
          variancePercent={variances.buy_weight_15g}
          historyData={weightData}
          themeColor="green"
          selectedWeek={selectedWeek || currentWeek.week_label}
          proratedEstimate={proratedWeight}
          isPartialWeek={showProratedEstimate}
        />

        {/* Card 2: Transaction */}
        <MetricKpiCard
          title="Transaction"
          value={currentWeek.buy_transactions}
          variancePercent={variances.buy_transactions}
          historyData={txData}
          themeColor="green"
          selectedWeek={selectedWeek || currentWeek.week_label}
          proratedEstimate={proratedTx}
          isPartialWeek={showProratedEstimate}
        />

        {/* Card 3: Value (mil LAK) */}
        <MetricKpiCard
          title="Value (mil LAK)"
          value={currentBuyValue > 0 ? currentBuyValue : 'N/A'}
          variancePercent={variances.buy_value_mil_lak ?? variances.buy_weight_15g}
          historyData={valueData}
          themeColor="green"
          selectedWeek={selectedWeek || currentWeek.week_label}
          proratedEstimate={proratedValue}
          isPartialWeek={showProratedEstimate && currentBuyValue > 0}
        />

        {/* Card 4: Ticket Size (g) */}
        <MetricKpiCard
          title="Ticket Size (g)"
          value={Number(currentWeek.buy_ticket_size_g)}
          variancePercent={variances.buy_ticket_size_g}
          historyData={ticketData}
          themeColor="green"
          isDecimal={true}
          selectedWeek={selectedWeek || currentWeek.week_label}
        />
      </div>
    </div>
  );
}
