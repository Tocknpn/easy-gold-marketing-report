'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';

interface PlatformOverviewSectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
}

export function PlatformOverviewSection({
  currentWeek,
  history,
  variances,
}: PlatformOverviewSectionProps) {
  // Extract historical trend series
  const allTxData = history.map((w) => ({ week: w.week_label, value: w.all_transactions }));
  const userPartData = history.map((w) => ({ week: w.week_label, value: w.active_users }));
  const newRegData = history.map((w) => ({ week: w.week_label, value: w.new_registers }));
  const withdrawData = history.map((w) => ({ week: w.week_label, value: Number(w.withdraw_gold_grams) }));

  return (
    <div className="border-[2.5px] border-dotted border-[#1e56a0] rounded-2xl p-3 sm:p-4 bg-[#f8faff] shadow-sm">
      {/* Blue Header Banner */}
      <div className="bg-[#1e56a0] text-white font-black text-xl sm:text-2xl tracking-wide px-6 py-3 rounded-xl uppercase mb-4 shadow-sm flex items-center justify-between">
        <span>Platform Overview</span>
        <span className="text-xs sm:text-sm font-normal text-blue-100 normal-case tracking-normal">
          Active Week: {currentWeek.week_label}
        </span>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: All Transaction */}
        <MetricKpiCard
          title="All Transaction"
          value={currentWeek.all_transactions}
          variancePercent={variances.all_transactions}
          historyData={allTxData}
          themeColor="blue"
        />

        {/* Card 2: User Participate */}
        <MetricKpiCard
          title="User Participate"
          value={currentWeek.active_users}
          variancePercent={variances.active_users}
          historyData={userPartData}
          themeColor="blue"
        />

        {/* Card 3: New Register */}
        <MetricKpiCard
          title="New Register"
          value={currentWeek.new_registers}
          variancePercent={variances.new_registers}
          historyData={newRegData}
          themeColor="blue"
        />

        {/* Card 4: Gold Withdraw (g) */}
        <MetricKpiCard
          title="Gold Withdraw (g)"
          value={Number(currentWeek.withdraw_gold_grams)}
          variancePercent={variances.withdraw_gold_grams}
          historyData={withdrawData}
          themeColor="blue"
        />
      </div>
    </div>
  );
}
