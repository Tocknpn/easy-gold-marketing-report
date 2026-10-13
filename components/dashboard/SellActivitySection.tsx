'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';

interface SellActivitySectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
}

export function SellActivitySection({
  currentWeek,
  history,
  variances,
}: SellActivitySectionProps) {
  // Extract historical trend series
  const weightData = history.map((w) => ({ week: w.week_label, value: Number(w.sell_weight_15g) }));
  const txData = history.map((w) => ({ week: w.week_label, value: w.sell_transactions }));
  const ticketData = history.map((w) => ({ week: w.week_label, value: Number(w.sell_ticket_size_g) }));

  return (
    <div className="border-[2.5px] border-dotted border-[#881337] rounded-2xl p-3 sm:p-4 bg-[#faf5f6] shadow-sm">
      {/* Burgundy Header Banner */}
      <div className="bg-[#881337] text-white font-black text-xl sm:text-2xl tracking-wide px-6 py-3 rounded-xl uppercase mb-4 shadow-sm flex items-center justify-between">
        <span>Sell Activity</span>
        <span className="text-xs sm:text-sm font-normal text-rose-100 normal-case tracking-normal">
          Active Week: {currentWeek.week_label}
        </span>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Gold Weight (15g) */}
        <MetricKpiCard
          title="Gold Weight (15g)"
          value={Number(currentWeek.sell_weight_15g)}
          variancePercent={variances.sell_weight_15g}
          historyData={weightData}
          themeColor="red"
        />

        {/* Card 2: Transaction */}
        <MetricKpiCard
          title="Transaction"
          value={currentWeek.sell_transactions}
          variancePercent={variances.sell_transactions}
          historyData={txData}
          themeColor="red"
        />

        {/* Card 3: Ticket Size (g) */}
        <MetricKpiCard
          title="Ticket Size (g)"
          value={Number(currentWeek.sell_ticket_size_g)}
          variancePercent={variances.sell_ticket_size_g}
          historyData={ticketData}
          themeColor="red"
          isDecimal={true}
        />
      </div>
    </div>
  );
}
