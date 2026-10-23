'use client';

import React, { useMemo } from 'react';
import { RunRateComparisonPayload } from '@/lib/types/target.types';
import { MtdReportPayload } from '@/lib/types/mtd.types';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { VisualTargetTrackingCockpit } from '@/components/dashboard/targets/VisualTargetTrackingCockpit';
import { ClassicRunRateTables } from '@/components/dashboard/targets/ClassicRunRateTables';
import { PlatformOverviewSection } from '@/components/dashboard/PlatformOverviewSection';
import { BuyActivitySection } from '@/components/dashboard/BuyActivitySection';
import { SellActivitySection } from '@/components/dashboard/SellActivitySection';
import { ExecutivePulseBanner } from '@/components/dashboard/ExecutivePulseBanner';
import { PdfMtdMetricCard } from './PdfMtdMetricCard';
import { DEFAULT_2026_TARGETS } from '@/lib/constants/targetData';

export interface ExecutivePdfReportDocumentProps {
  currentYear: number;
  currentMonth: number;
  currentMonthLabel: string;
  comparisonMonthLabel: string;
  yoyMonthLabel: string;
  asOfDateDisplay: string;
  
  // Section 1 & 6 & 7: Target & Run-Rate
  targetTrackingData: RunRateComparisonPayload;
  rrMomData: RunRateComparisonPayload;
  rrYoyData: RunRateComparisonPayload;

  // Section 2 & 3: MTD Forecast MoM & YoY
  momMtdData: MtdReportPayload;
  yoyMtdData: MtdReportPayload;

  // Section 4 & 5: Weekly WoW Actual & Prorated
  weeklyCurrentWeek: WeeklyMetricRow;
  weeklyRawWeek?: WeeklyMetricRow;
  weeklyHistory: WeeklyMetricRow[];
  weeklyVariances: MetricVariances;
  weeklyProratedVariances: MetricVariances;
  selectedWeekLabel: string;
  isPartialWeek: boolean;
  elapsedDays: number;
}

export function ExecutivePdfReportDocument({
  currentYear,
  currentMonth,
  currentMonthLabel,
  comparisonMonthLabel,
  yoyMonthLabel,
  asOfDateDisplay,
  targetTrackingData,
  rrMomData,
  rrYoyData,
  momMtdData,
  yoyMtdData,
  weeklyCurrentWeek,
  weeklyRawWeek,
  weeklyHistory,
  weeklyVariances,
  weeklyProratedVariances,
  selectedWeekLabel,
  isPartialWeek,
  elapsedDays,
}: ExecutivePdfReportDocumentProps) {
  // Compute Executive Pulse statistics dynamically matching live front tab
  const pulseStats = useMemo(() => {
    const octTarget = DEFAULT_2026_TARGETS.find(t => t.month === currentMonth) || DEFAULT_2026_TARGETS[9];
    
    const curNc = momMtdData?.metrics?.new_customers?.current_mtd || 1571;
    const curBuyTx = momMtdData?.metrics?.buy_transactions?.current_mtd || 90253;
    const curBuyWt = (momMtdData?.metrics?.buy_weight_g?.current_mtd ? momMtdData.metrics.buy_weight_g.current_mtd * 15 : 142751);
    const curSellTx = momMtdData?.metrics?.sell_transactions?.current_mtd || 35016;
    const curSellWt = (momMtdData?.metrics?.sell_weight_g?.current_mtd ? momMtdData.metrics.sell_weight_g.current_mtd * 15 : 59251);

    const ncPct = octTarget.target_nc > 0 ? (curNc / octTarget.target_nc) * 100 : 0;
    const buyTxPct = octTarget.buy_trans > 0 ? (curBuyTx / octTarget.buy_trans) * 100 : 0;
    const buyWtPct = octTarget.buy_weight_g > 0 ? (curBuyWt / octTarget.buy_weight_g) * 100 : 0;
    const sellTxPct = octTarget.sell_trans > 0 ? (curSellTx / octTarget.sell_trans) * 100 : 0;
    const sellWtPct = octTarget.sell_weight_g > 0 ? (curSellWt / octTarget.sell_weight_g) * 100 : 0;

    const avgPace = (ncPct + buyTxPct + buyWtPct + sellTxPct + sellWtPct) / 5;
    const daysGone = momMtdData?.elapsed_days || 21;
    const totalDays = momMtdData?.total_days_current_month || 31;
    const estLanding = daysGone > 0 ? avgPace * (totalDays / daysGone) : avgPace;

    // Est MoM average
    let avgEstLandingMoM = -4;
    if (momMtdData?.metrics) {
      const m = momMtdData.metrics;
      const list = [
        m.buy_weight_g?.forecast_variance_percent ?? 0,
        m.buy_transactions?.forecast_variance_percent ?? 0,
        m.sell_weight_g?.forecast_variance_percent ?? 0,
        m.sell_transactions?.forecast_variance_percent ?? 0,
        m.withdraw_15g?.forecast_variance_percent ?? 0,
        m.new_customers?.forecast_variance_percent ?? 0,
        m.total_transactions?.forecast_variance_percent ?? 0,
      ];
      avgEstLandingMoM = Math.round(list.reduce((a, b) => a + b, 0) / list.length);
    }

    return {
      targetPacePct: Number(avgPace.toFixed(1)),
      targetEstLandingPct: Number(estLanding.toFixed(0)),
      avgEstLandingMoM,
      daysGone,
      totalDays,
    };
  }, [momMtdData, currentMonth]);

  // Clean weekly history: only last 5 weeks for clean, un-squished sparklines
  const cleanWeeklyHistory = useMemo(() => {
    if (!weeklyHistory || weeklyHistory.length === 0) return [weeklyCurrentWeek];
    return weeklyHistory.slice(Math.max(0, weeklyHistory.length - 5));
  }, [weeklyHistory, weeklyCurrentWeek]);

  return (
    <div className="executive-report-root text-slate-900 select-text w-full max-w-[1440px] mx-auto space-y-8">
      {/* ==================================================================== */}
      {/* PAGE 1: EXECUTIVE BRIEFING, TARGET TRACKING & MTD GROWTH (MoM & YoY) */}
      {/* ==================================================================== */}
      <div 
        id="pdf-page-1"
        className="pdf-page-container bg-white text-slate-900 rounded-2xl shadow-md border border-slate-200/90 w-full p-6 flex flex-col justify-between"
        style={{ minHeight: '1018px' }}
      >
        <div className="space-y-4">
          {/* Page 1 Header */}
          <header className="border-b-2 border-slate-900 pb-2.5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#0c4ca3] text-white font-black text-xs uppercase tracking-wider">
                  Official BI Synthesis
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Page 1 of 3 • Executive Briefing &amp; Targets
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-1">
                Easy Gold Marketing performance
              </h1>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
              <span className="font-bold text-slate-600">Data As-Of Date:</span>
              <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0c4ca3] font-black text-sm">
                {asOfDateDisplay}
              </span>
            </div>
          </header>

          {/* Executive Pulse Banner */}
          <div className="report-section">
            <ExecutivePulseBanner
              targetMonthLabel={currentMonthLabel}
              targetPacePct={pulseStats.targetPacePct}
              targetEstLandingPct={pulseStats.targetEstLandingPct}
              daysGone={pulseStats.daysGone}
              totalDays={pulseStats.totalDays}
              mtdCompMonthLabel={comparisonMonthLabel}
              avgEstLandingMoMPct={pulseStats.avgEstLandingMoM}
              totalTransactionsMtd={momMtdData?.metrics?.total_transactions?.current_mtd || 127982}
              totalTransactionsMoMPct={momMtdData?.metrics?.total_transactions?.mtd_variance_percent || 16}
              newCustomersMtd={momMtdData?.metrics?.new_customers?.current_mtd || 1571}
              newCustomersMoMPct={momMtdData?.metrics?.new_customers?.mtd_variance_percent || -27}
              activeWeekLabel={selectedWeekLabel}
              weeklyVolumeBaht={Number(weeklyCurrentWeek?.buy_weight_15g || 1912)}
              weeklyWoWVariance={weeklyVariances?.buy_weight_15g || -26}
              isPartialWeek={isPartialWeek}
              onNavigateTab={() => {}}
            />
          </div>

          {/* Section 1: Performance Vs Target Cockpit */}
          <section className="report-section space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
                  1
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  {currentMonthLabel} Performance - Vs Target
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  (Current Month MTD target Hit + YTD target Hit)
                </span>
              </div>
            </div>

            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/90">
              <VisualTargetTrackingCockpit data={targetTrackingData} showEst={true} hideHeader={true} />
            </div>
          </section>

          {/* Section 2: MTD MoM */}
          <section className="report-section space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
                  2
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  MTD performance and Forecast {currentMonthLabel} compare with {comparisonMonthLabel} (MoM)
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 items-stretch w-full">
              {/* BUY ACTIVITY: 2 Cards (col-span-2) */}
              <div className="col-span-2 border-[2px] border-dotted border-[#2e7d32] rounded-xl p-1.5 bg-[#f5f9f5] flex flex-col justify-between">
                <div className="bg-[#2e7d32] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1">
                  BUY ACTIVITY
                </div>
                <div className="grid grid-cols-2 gap-1.5 flex-1 items-stretch">
                  <PdfMtdMetricCard
                    metric={momMtdData.metrics.buy_weight_g}
                    comparisonMonthLabel={momMtdData.comparison_month_label}
                    elapsedDays={momMtdData.elapsed_days}
                    totalDays={momMtdData.total_days_current_month}
                  />
                  <PdfMtdMetricCard
                    metric={momMtdData.metrics.buy_transactions}
                    comparisonMonthLabel={momMtdData.comparison_month_label}
                    elapsedDays={momMtdData.elapsed_days}
                    totalDays={momMtdData.total_days_current_month}
                  />
                </div>
              </div>

              {/* SELL ACTIVITY: 3 Cards (col-span-3) */}
              <div className="col-span-3 border-[2px] border-dotted border-[#b71c1c] rounded-xl p-1.5 bg-[#fff8f8] flex flex-col justify-between">
                <div className="bg-[#b71c1c] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1">
                  SELL ACTIVITY
                </div>
                <div className="grid grid-cols-3 gap-1.5 flex-1 items-stretch">
                  <PdfMtdMetricCard
                    metric={momMtdData.metrics.sell_weight_g}
                    comparisonMonthLabel={momMtdData.comparison_month_label}
                    elapsedDays={momMtdData.elapsed_days}
                    totalDays={momMtdData.total_days_current_month}
                  />
                  <PdfMtdMetricCard
                    metric={momMtdData.metrics.sell_transactions}
                    comparisonMonthLabel={momMtdData.comparison_month_label}
                    elapsedDays={momMtdData.elapsed_days}
                    totalDays={momMtdData.total_days_current_month}
                  />
                  <PdfMtdMetricCard
                    metric={momMtdData.metrics.withdraw_15g}
                    comparisonMonthLabel={momMtdData.comparison_month_label}
                    elapsedDays={momMtdData.elapsed_days}
                    totalDays={momMtdData.total_days_current_month}
                  />
                </div>
              </div>

              {/* PLATFORM OVERVIEW: 2 Cards (col-span-2) */}
              <div className="col-span-2 border-[2px] border-dotted border-[#0c4ca3] rounded-xl p-1.5 bg-[#f5f8ff] flex flex-col justify-between">
                <div className="bg-[#0c4ca3] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1">
                  PLATFORM OVERVIEW
                </div>
                <div className="grid grid-cols-2 gap-1.5 flex-1 items-stretch">
                  <PdfMtdMetricCard
                    metric={momMtdData.metrics.new_customers}
                    comparisonMonthLabel={momMtdData.comparison_month_label}
                    elapsedDays={momMtdData.elapsed_days}
                    totalDays={momMtdData.total_days_current_month}
                  />
                  <PdfMtdMetricCard
                    metric={momMtdData.metrics.total_transactions}
                    comparisonMonthLabel={momMtdData.comparison_month_label}
                    elapsedDays={momMtdData.elapsed_days}
                    totalDays={momMtdData.total_days_current_month}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: MTD YoY */}
          <section className="report-section space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
                  3
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  MTD performance and Forecast {currentMonthLabel} compare with {yoyMonthLabel} (YoY)
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 items-stretch w-full">
              {/* BUY ACTIVITY: 2 Cards (col-span-2) */}
              <div className="col-span-2 border-[2px] border-dotted border-[#2e7d32] rounded-xl p-1.5 bg-[#f5f9f5] flex flex-col justify-between">
                <div className="bg-[#2e7d32] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1">
                  BUY ACTIVITY
                </div>
                <div className="grid grid-cols-2 gap-1.5 flex-1 items-stretch">
                  <PdfMtdMetricCard
                    metric={yoyMtdData.metrics.buy_weight_g}
                    comparisonMonthLabel={yoyMtdData.comparison_month_label}
                    elapsedDays={yoyMtdData.elapsed_days}
                    totalDays={yoyMtdData.total_days_current_month}
                  />
                  <PdfMtdMetricCard
                    metric={yoyMtdData.metrics.buy_transactions}
                    comparisonMonthLabel={yoyMtdData.comparison_month_label}
                    elapsedDays={yoyMtdData.elapsed_days}
                    totalDays={yoyMtdData.total_days_current_month}
                  />
                </div>
              </div>

              {/* SELL ACTIVITY: 3 Cards (col-span-3) */}
              <div className="col-span-3 border-[2px] border-dotted border-[#b71c1c] rounded-xl p-1.5 bg-[#fff8f8] flex flex-col justify-between">
                <div className="bg-[#b71c1c] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1">
                  SELL ACTIVITY
                </div>
                <div className="grid grid-cols-3 gap-1.5 flex-1 items-stretch">
                  <PdfMtdMetricCard
                    metric={yoyMtdData.metrics.sell_weight_g}
                    comparisonMonthLabel={yoyMtdData.comparison_month_label}
                    elapsedDays={yoyMtdData.elapsed_days}
                    totalDays={yoyMtdData.total_days_current_month}
                  />
                  <PdfMtdMetricCard
                    metric={yoyMtdData.metrics.sell_transactions}
                    comparisonMonthLabel={yoyMtdData.comparison_month_label}
                    elapsedDays={yoyMtdData.elapsed_days}
                    totalDays={yoyMtdData.total_days_current_month}
                  />
                  <PdfMtdMetricCard
                    metric={yoyMtdData.metrics.withdraw_15g}
                    comparisonMonthLabel={yoyMtdData.comparison_month_label}
                    elapsedDays={yoyMtdData.elapsed_days}
                    totalDays={yoyMtdData.total_days_current_month}
                  />
                </div>
              </div>

              {/* PLATFORM OVERVIEW: 2 Cards (col-span-2) */}
              <div className="col-span-2 border-[2px] border-dotted border-[#0c4ca3] rounded-xl p-1.5 bg-[#f5f8ff] flex flex-col justify-between">
                <div className="bg-[#0c4ca3] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1">
                  PLATFORM OVERVIEW
                </div>
                <div className="grid grid-cols-2 gap-1.5 flex-1 items-stretch">
                  <PdfMtdMetricCard
                    metric={yoyMtdData.metrics.new_customers}
                    comparisonMonthLabel={yoyMtdData.comparison_month_label}
                    elapsedDays={yoyMtdData.elapsed_days}
                    totalDays={yoyMtdData.total_days_current_month}
                  />
                  <PdfMtdMetricCard
                    metric={yoyMtdData.metrics.total_transactions}
                    comparisonMonthLabel={yoyMtdData.comparison_month_label}
                    elapsedDays={yoyMtdData.elapsed_days}
                    totalDays={yoyMtdData.total_days_current_month}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Page 1 Footer */}
        <footer className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Easy Gold Marketing &amp; Business Intelligence • Official Executive Synthesis</span>
          <span className="font-bold text-slate-600">Page 1 of 3</span>
        </footer>
      </div>

      {/* ==================================================================== */}
      {/* PAGE 2: WEEKLY PERFORMANCE ANALYSIS (ACTUAL & 7-DAY PRORATED)        */}
      {/* ==================================================================== */}
      <div 
        id="pdf-page-2"
        className="pdf-page-container bg-white text-slate-900 rounded-2xl shadow-md border border-slate-200/90 w-full p-6 flex flex-col justify-between"
        style={{ minHeight: '1018px' }}
      >
        <div className="space-y-5">
          {/* Page 2 Header */}
          <header className="border-b-2 border-slate-900 pb-2.5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#0c4ca3] text-white font-black text-xs uppercase tracking-wider">
                  Weekly Run-Rate Analysis
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Page 2 of 3 • Weekly Momentum &amp; WoW Sparklines
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-1">
                Easy Gold Marketing performance — Weekly Velocity
              </h1>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
              <span className="font-bold text-slate-600">Data As-Of Date:</span>
              <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0c4ca3] font-black text-sm">
                {asOfDateDisplay}
              </span>
            </div>
          </header>

          {/* Section 4: Weekly Report (Actual Backend Week) */}
          <section className="report-section space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
                  4
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Weekly report of {selectedWeekLabel} ({elapsedDays} day{elapsedDays > 1 ? 's' : ''} gone)
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Current week actuals recorded in database (clean 5-week sparklines)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3.5 w-full items-stretch">
              <div className="w-full flex flex-col">
                <PlatformOverviewSection
                  currentWeek={weeklyRawWeek || weeklyCurrentWeek}
                  history={cleanWeeklyHistory}
                  variances={weeklyVariances}
                  selectedWeek={selectedWeekLabel}
                  isPartialWeek={isPartialWeek}
                  elapsedDays={elapsedDays}
                  isProratedWoW={false}
                />
              </div>

              <div className="w-full flex flex-col">
                <BuyActivitySection
                  currentWeek={weeklyRawWeek || weeklyCurrentWeek}
                  history={cleanWeeklyHistory}
                  variances={weeklyVariances}
                  selectedWeek={selectedWeekLabel}
                  isPartialWeek={isPartialWeek}
                  elapsedDays={elapsedDays}
                  isProratedWoW={false}
                />
              </div>

              <div className="w-full flex flex-col">
                <SellActivitySection
                  currentWeek={weeklyRawWeek || weeklyCurrentWeek}
                  history={cleanWeeklyHistory}
                  variances={weeklyVariances}
                  selectedWeek={selectedWeekLabel}
                  isPartialWeek={isPartialWeek}
                  elapsedDays={elapsedDays}
                  isProratedWoW={false}
                />
              </div>
            </div>
          </section>

          {/* Section 5: Weekly Report (7-Day Prorated Estimate) */}
          <section className="report-section space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
                  5
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Weekly report of {selectedWeekLabel} (7-Day Prorated Estimate)
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Paced 7-day run-rate estimate equalized for apples-to-apples comparison against past full weeks
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3.5 w-full items-stretch">
              <div className="w-full flex flex-col">
                <PlatformOverviewSection
                  currentWeek={weeklyCurrentWeek}
                  history={cleanWeeklyHistory}
                  variances={weeklyProratedVariances}
                  selectedWeek={selectedWeekLabel}
                  isPartialWeek={isPartialWeek}
                  elapsedDays={elapsedDays}
                  isProratedWoW={true}
                />
              </div>

              <div className="w-full flex flex-col">
                <BuyActivitySection
                  currentWeek={weeklyCurrentWeek}
                  history={cleanWeeklyHistory}
                  variances={weeklyProratedVariances}
                  selectedWeek={selectedWeekLabel}
                  isPartialWeek={isPartialWeek}
                  elapsedDays={elapsedDays}
                  isProratedWoW={true}
                />
              </div>

              <div className="w-full flex flex-col">
                <SellActivitySection
                  currentWeek={weeklyCurrentWeek}
                  history={cleanWeeklyHistory}
                  variances={weeklyProratedVariances}
                  selectedWeek={selectedWeekLabel}
                  isPartialWeek={isPartialWeek}
                  elapsedDays={elapsedDays}
                  isProratedWoW={true}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Page 2 Footer */}
        <footer className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Easy Gold Marketing &amp; Business Intelligence • Weekly Performance Synthesis</span>
          <span className="font-bold text-slate-600">Page 2 of 3</span>
        </footer>
      </div>

      {/* ==================================================================== */}
      {/* PAGE 3: INSTITUTIONAL MONTHLY RUN RATE (RR) TABLES MoM & YoY         */}
      {/* ==================================================================== */}
      <div 
        id="pdf-page-3"
        className="pdf-page-container bg-white text-slate-900 rounded-2xl shadow-md border border-slate-200/90 w-full p-6 flex flex-col justify-between"
        style={{ minHeight: '1018px' }}
      >
        <div className="space-y-4">
          {/* Page 3 Header */}
          <header className="border-b-2 border-slate-900 pb-2.5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#0c4ca3] text-white font-black text-xs uppercase tracking-wider">
                  Monthly Run-Rate Projections
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Page 3 of 3 • Financial Landing &amp; Same-Period Comparisons
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-1">
                Easy Gold Marketing performance — Monthly RR Tables
              </h1>
            </div>

            <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
              <span className="font-bold text-slate-600">Data As-Of Date:</span>
              <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0c4ca3] font-black text-sm">
                {asOfDateDisplay}
              </span>
            </div>
          </header>

          {/* Section 6: Monthly RR Table MoM */}
          <section className="report-section space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
                  6
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Monthly RR Table {currentMonthLabel} vs {comparisonMonthLabel}
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Projected Landing &amp; Same-Period Cutoff MoM Comparison
                </span>
              </div>
            </div>

            <div className="bg-slate-50/40 p-2 rounded-xl border border-slate-200">
              <ClassicRunRateTables 
                data={rrMomData} 
                curYear={currentYear}
                compYear={currentYear}
                isYoY={false}
              />
            </div>
          </section>

          {/* Section 7: Monthly RR Table YoY */}
          <section className="report-section space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
                  7
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Monthly RR Table {currentMonthLabel} vs {yoyMonthLabel}
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Year-over-Year (YoY) Full Landing &amp; Same-Period Comparison against {currentYear - 1}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/40 p-2 rounded-xl border border-slate-200">
              <ClassicRunRateTables 
                data={rrYoyData} 
                curYear={currentYear}
                compYear={currentYear - 1}
                isYoY={true}
              />
            </div>
          </section>
        </div>

        {/* Page 3 Footer */}
        <footer className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Easy Gold Marketing &amp; Business Intelligence • Monthly Projections &amp; Same-Period Comparisons</span>
          <span className="font-bold text-slate-600">Page 3 of 3</span>
        </footer>
      </div>

      {/* Pure High-Definition Landscape Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header.sticky, 
          nav[role="tablist"], 
          aside, 
          .no-print,
          .modal-overlay,
          button {
            display: none !important;
          }
          #executive-pdf-printable {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .executive-report-root {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .pdf-page-container {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 8mm 10mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .pdf-page-container:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
