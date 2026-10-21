'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { ArrowDownLeft, ShoppingBag } from 'lucide-react';

interface BuyActivitySectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  selectedWeek?: string;
  isPartialWeek?: boolean;
}

export function BuyActivitySection({
  currentWeek,
  history,
  variances,
  selectedWeek,
  isPartialWeek = false,
}: BuyActivitySectionProps) {
  // Extract historical trend series
  const weightData = history.map((w) => ({ week: w.week_label, value: Number(w.buy_weight_15g) }));
  const txData = history.map((w) => ({ week: w.week_label, value: w.buy_transactions }));
  const ticketData = history.map((w) => ({ week: w.week_label, value: Number(w.buy_ticket_size_g) }));
  const valueData = history.map((w) => ({
    week: w.week_label,
    value: w.buy_value_mil_lak ?? Math.round(Number(w.buy_weight_15g) * 15 * 3.14),
  }));

  // Current buy value in Mil LAK
  const currentBuyValue =
    currentWeek.buy_value_mil_lak ??
    Math.round(Number(currentWeek.buy_weight_15g) * 15 * 3.14);

  // Prorated estimates for partial week
  const isPartial = isPartialWeek || currentWeek.week_label === 'W43';
  const proratedWeight = isPartial ? Math.round(Number(currentWeek.buy_weight_15g) * 7) : undefined;
  const proratedTx = isPartial ? Math.round(currentWeek.buy_transactions * 7) : undefined;
  const proratedValue = isPartial ? Math.round(currentBuyValue * 7) : undefined;

  return (
    <div className="border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 bg-white shadow-xs h-full flex flex-col justify-between">
      {/* Forest Green Header Banner */}
      <div className="bg-brand-inflowLight text-white font-bold text-xs sm:text-sm tracking-wider px-3.5 py-2.5 rounded-xl mb-3 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/15">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-100" />
          </div>
          <span className="uppercase tracking-wide font-black">Buy Activity</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 bg-white/10 px-2 py-0.5 rounded-md">
            <ArrowDownLeft className="w-3 h-3 text-emerald-300" />
            Inflow
          </span>
        </div>
        <span className="text-xs font-bold font-mono tabular-nums text-emerald-100 bg-white/10 px-2 py-0.5 rounded-md">
          Active: {currentWeek.week_label}
        </span>
      </div>

      {/* 4 Cards in 2x2 Grid: Equal 3-Pillar Row Alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 flex-1">
        {/* Card 1: Gold Weight (15g) */}
        <MetricKpiCard
          title="Gold Weight (15g)"
          value={Number(currentWeek.buy_weight_15g)}
          variancePercent={variances.buy_weight_15g}
          historyData={weightData}
          themeColor="green"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Baht"
          proratedEstimate={proratedWeight}
          isPartialWeek={isPartial}
        />

        {/* Card 2: Transaction */}
        <MetricKpiCard
          title="Transaction"
          value={currentWeek.buy_transactions}
          variancePercent={variances.buy_transactions}
          historyData={txData}
          themeColor="green"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Count"
          proratedEstimate={proratedTx}
          isPartialWeek={isPartial}
        />

        {/* Card 3: Value (mil LAK) */}
        <MetricKpiCard
          title="Value (mil LAK)"
          value={currentBuyValue}
          variancePercent={variances.buy_value_mil_lak ?? variances.buy_weight_15g}
          historyData={valueData}
          themeColor="green"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Revenue"
          proratedEstimate={proratedValue}
          isPartialWeek={isPartial}
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
          subtitle="Avg/Tx"
        />
      </div>
    </div>
  );
}
