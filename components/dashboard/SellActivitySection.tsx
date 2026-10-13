'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';

interface SellActivitySectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  selectedWeek?: string;
}

export function SellActivitySection({
  currentWeek,
  history,
  variances,
  selectedWeek,
}: SellActivitySectionProps) {
  // Extract historical trend series
  const weightData = history.map((w) => ({ week: w.week_label, value: Number(w.sell_weight_15g) }));
  const txData = history.map((w) => ({ week: w.week_label, value: w.sell_transactions }));
  const ticketData = history.map((w) => ({ week: w.week_label, value: Number(w.sell_ticket_size_g) }));

  return (
    <div className="border-[2px] border-dotted border-[#881337] rounded-xl p-2.5 sm:p-3 bg-[#faf5f6] shadow-xs">
      {/* Burgundy Header Banner */}
      <div className="bg-[#881337] text-white font-black text-sm sm:text-base tracking-wider px-4 py-1.5 rounded-lg uppercase mb-2.5 shadow-xs flex items-center justify-between">
        <span>Sell Activity</span>
        <span className="text-[11px] sm:text-xs font-semibold text-rose-100 normal-case tracking-normal">
          Active Week: {currentWeek.week_label}
        </span>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Card 1: Gold Weight (15g) */}
        <MetricKpiCard
          title="Gold Weight (15g)"
          value={Number(currentWeek.sell_weight_15g)}
          variancePercent={variances.sell_weight_15g}
          historyData={weightData}
          themeColor="red"
          selectedWeek={selectedWeek || currentWeek.week_label}
        />

        {/* Card 2: Transaction */}
        <MetricKpiCard
          title="Transaction"
          value={currentWeek.sell_transactions}
          variancePercent={variances.sell_transactions}
          historyData={txData}
          themeColor="red"
          selectedWeek={selectedWeek || currentWeek.week_label}
        />

        {/* Card 3: Ticket Size (g) */}
        <MetricKpiCard
          title="Ticket Size (g)"
          value={Number(currentWeek.sell_ticket_size_g)}
          variancePercent={variances.sell_ticket_size_g}
          historyData={ticketData}
          themeColor="red"
          isDecimal={true}
          selectedWeek={selectedWeek || currentWeek.week_label}
        />
      </div>
    </div>
  );
}
