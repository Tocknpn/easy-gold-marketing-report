'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';

interface BuyActivitySectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  selectedWeek?: string;
}

export function BuyActivitySection({
  currentWeek,
  history,
  variances,
  selectedWeek,
}: BuyActivitySectionProps) {
  // Extract historical trend series
  const weightData = history.map((w) => ({ week: w.week_label, value: Number(w.buy_weight_15g) }));
  const txData = history.map((w) => ({ week: w.week_label, value: w.buy_transactions }));
  const ticketData = history.map((w) => ({ week: w.week_label, value: Number(w.buy_ticket_size_g) }));

  return (
    <div className="border-[2px] border-dotted border-[#285430] rounded-xl p-2.5 sm:p-3 bg-[#f6faf6] shadow-xs">
      {/* Forest Green Header Banner */}
      <div className="bg-[#285430] text-white font-black text-sm sm:text-base tracking-wider px-4 py-1.5 rounded-lg uppercase mb-2.5 shadow-xs flex items-center justify-between">
        <span>Buy Activity</span>
        <span className="text-[11px] sm:text-xs font-semibold text-emerald-100 normal-case tracking-normal">
          Active Week: {currentWeek.week_label}
        </span>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Card 1: Gold Weight (15g) */}
        <MetricKpiCard
          title="Gold Weight (15g)"
          value={Number(currentWeek.buy_weight_15g)}
          variancePercent={variances.buy_weight_15g}
          historyData={weightData}
          themeColor="green"
          selectedWeek={selectedWeek || currentWeek.week_label}
        />

        {/* Card 2: Transaction */}
        <MetricKpiCard
          title="Transaction"
          value={currentWeek.buy_transactions}
          variancePercent={variances.buy_transactions}
          historyData={txData}
          themeColor="green"
          selectedWeek={selectedWeek || currentWeek.week_label}
        />

        {/* Card 3: Ticket Size (g) */}
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
