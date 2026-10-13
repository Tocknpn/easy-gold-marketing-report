'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';

interface BuyActivitySectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
}

export function BuyActivitySection({
  currentWeek,
  history,
  variances,
}: BuyActivitySectionProps) {
  // Extract historical trend series
  const weightData = history.map((w) => ({ week: w.week_label, value: Number(w.buy_weight_15g) }));
  const txData = history.map((w) => ({ week: w.week_label, value: w.buy_transactions }));
  const ticketData = history.map((w) => ({ week: w.week_label, value: Number(w.buy_ticket_size_g) }));

  return (
    <div className="border-[2.5px] border-dotted border-[#285430] rounded-2xl p-3 sm:p-4 bg-[#f6faf6] shadow-sm">
      {/* Forest Green Header Banner */}
      <div className="bg-[#285430] text-white font-black text-xl sm:text-2xl tracking-wide px-6 py-3 rounded-xl uppercase mb-4 shadow-sm flex items-center justify-between">
        <span>Buy Activity</span>
        <span className="text-xs sm:text-sm font-normal text-emerald-100 normal-case tracking-normal">
          Active Week: {currentWeek.week_label}
        </span>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Gold Weight (15g) */}
        <MetricKpiCard
          title="Gold Weight (15g)"
          value={Number(currentWeek.buy_weight_15g)}
          variancePercent={variances.buy_weight_15g}
          historyData={weightData}
          themeColor="green"
        />

        {/* Card 2: Transaction */}
        <MetricKpiCard
          title="Transaction"
          value={currentWeek.buy_transactions}
          variancePercent={variances.buy_transactions}
          historyData={txData}
          themeColor="green"
        />

        {/* Card 3: Ticket Size (g) */}
        <MetricKpiCard
          title="Ticket Size (g)"
          value={Number(currentWeek.buy_ticket_size_g)}
          variancePercent={variances.buy_ticket_size_g}
          historyData={ticketData}
          themeColor="green"
          isDecimal={true}
        />
      </div>
    </div>
  );
}
