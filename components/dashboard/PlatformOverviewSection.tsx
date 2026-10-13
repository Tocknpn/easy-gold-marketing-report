'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';

interface PlatformOverviewSectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  selectedWeek?: string;
}

export function PlatformOverviewSection({
  currentWeek,
  history,
  variances,
  selectedWeek,
}: PlatformOverviewSectionProps) {
  // Extract historical trend series
  const allTxData = history.map((w) => ({ week: w.week_label, value: w.all_transactions }));
  const userPartData = history.map((w) => ({ week: w.week_label, value: w.active_users }));
  const newRegData = history.map((w) => ({ week: w.week_label, value: w.new_registers }));
  const withdrawData = history.map((w) => ({ week: w.week_label, value: Number(w.withdraw_gold_grams) }));

  return (
    <div className="border-[2px] border-dotted border-[#1e56a0] rounded-xl p-2.5 sm:p-3 bg-[#f8faff] shadow-xs">
      {/* Blue Header Banner */}
      <div className="bg-[#1e56a0] text-white font-black text-sm sm:text-base tracking-wider px-4 py-1.5 rounded-lg uppercase mb-2.5 shadow-xs flex items-center justify-between">
        <span>Platform Overview</span>
        <span className="text-[11px] sm:text-xs font-semibold text-blue-100 normal-case tracking-normal">
          Active Week: {currentWeek.week_label}
        </span>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: All Transaction */}
        <MetricKpiCard
          title="All Transaction"
          value={currentWeek.all_transactions}
          variancePercent={variances.all_transactions}
          historyData={allTxData}
          themeColor="blue"
          selectedWeek={selectedWeek || currentWeek.week_label}
        />

        {/* Card 2: User Participate */}
        <MetricKpiCard
          title="User Participate"
          value={currentWeek.active_users}
          variancePercent={variances.active_users}
          historyData={userPartData}
          themeColor="blue"
          selectedWeek={selectedWeek || currentWeek.week_label}
        />

        {/* Card 3: New Register */}
        <MetricKpiCard
          title="New Register"
          value={currentWeek.new_registers}
          variancePercent={variances.new_registers}
          historyData={newRegData}
          themeColor="blue"
          selectedWeek={selectedWeek || currentWeek.week_label}
        />

        {/* Card 4: Gold Withdraw (g) */}
        <MetricKpiCard
          title="Gold Withdraw (g)"
          value={Number(currentWeek.withdraw_gold_grams)}
          variancePercent={variances.withdraw_gold_grams}
          historyData={withdrawData}
          themeColor="blue"
          selectedWeek={selectedWeek || currentWeek.week_label}
        />
      </div>
    </div>
  );
}
