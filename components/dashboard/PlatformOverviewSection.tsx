'use client';

import React from 'react';
import { MetricKpiCard } from './MetricKpiCard';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { Activity } from 'lucide-react';

interface PlatformOverviewSectionProps {
  currentWeek: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  selectedWeek?: string;
  isPartialWeek?: boolean;
}

export function PlatformOverviewSection({
  currentWeek,
  history,
  variances,
  selectedWeek,
  isPartialWeek = false,
}: PlatformOverviewSectionProps) {
  // Extract historical trend series
  const allTxData = history.map((w) => ({ week: w.week_label, value: w.all_transactions }));
  const userPartData = history.map((w) => ({ week: w.week_label, value: w.active_users }));
  const newRegData = history.map((w) => ({ week: w.week_label, value: w.new_registers }));
  const withdrawData = history.map((w) => ({ week: w.week_label, value: Number(w.withdraw_gold_grams) }));

  // Prorated estimates for W42 (~1-2 days elapsed, multiplied by 7 for standard week)
  const isPartial = isPartialWeek || currentWeek.week_label === 'W42';
  const proratedAllTx = isPartial ? Math.round(currentWeek.all_transactions * 7) : undefined;
  const proratedUsers = isPartial ? Math.round(currentWeek.active_users * 3.5) : undefined;
  const proratedNewReg = isPartial ? Math.round(currentWeek.new_registers * 7) : undefined;
  const proratedWithdraw = isPartial ? Number((Number(currentWeek.withdraw_gold_grams) * 7).toFixed(1)) : undefined;

  return (
    <div className="border border-blue-200/80 rounded-2xl p-3 sm:p-3.5 bg-gradient-to-b from-[#f8faff] via-white to-[#f8faff] shadow-xs">
      {/* Modern Gradient Blue Header Banner */}
      <div className="bg-gradient-to-r from-[#0c4ca3] via-[#1558b8] to-[#1e56a0] text-white font-black text-xs sm:text-sm tracking-wider px-3.5 py-2 rounded-xl mb-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-white/20 backdrop-blur-xs">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="uppercase tracking-wide font-black">Platform Overview</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-blue-100 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
            Active: {currentWeek.week_label}
          </span>
        </div>
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
          subtitle="Orders"
          proratedEstimate={proratedAllTx}
          isPartialWeek={isPartial}
        />

        {/* Card 2: User Participate */}
        <MetricKpiCard
          title="User Participate"
          value={currentWeek.active_users}
          variancePercent={variances.active_users}
          historyData={userPartData}
          themeColor="blue"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Active"
          proratedEstimate={proratedUsers}
          isPartialWeek={isPartial}
        />

        {/* Card 3: New Register */}
        <MetricKpiCard
          title="New Register"
          value={currentWeek.new_registers}
          variancePercent={variances.new_registers}
          historyData={newRegData}
          themeColor="blue"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Signups"
          proratedEstimate={proratedNewReg}
          isPartialWeek={isPartial}
        />

        {/* Card 4: Gold Withdraw (g) */}
        <MetricKpiCard
          title="Gold Withdraw (g)"
          value={Number(currentWeek.withdraw_gold_grams)}
          variancePercent={variances.withdraw_gold_grams}
          historyData={withdrawData}
          themeColor="blue"
          selectedWeek={selectedWeek || currentWeek.week_label}
          subtitle="Physical"
          proratedEstimate={proratedWithdraw}
          isPartialWeek={isPartial}
        />
      </div>
    </div>
  );
}
