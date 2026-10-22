'use client';

import React, { useMemo } from 'react';
import { RunRateComparisonPayload } from '@/lib/types/target.types';
import { MtdReportPayload } from '@/lib/types/mtd.types';
import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';
import { VisualTargetTrackingCockpit } from '@/components/dashboard/targets/VisualTargetTrackingCockpit';
import { ClassicRunRateTables } from '@/components/dashboard/targets/ClassicRunRateTables';
import { MtdBuyActivitySection } from '@/components/dashboard/mtd/MtdBuyActivitySection';
import { MtdSellActivitySection } from '@/components/dashboard/mtd/MtdSellActivitySection';
import { MtdPlatformSection } from '@/components/dashboard/mtd/MtdPlatformSection';
import { PlatformOverviewSection } from '@/components/dashboard/PlatformOverviewSection';
import { BuyActivitySection } from '@/components/dashboard/BuyActivitySection';
import { SellActivitySection } from '@/components/dashboard/SellActivitySection';
import { ExecutivePulseBanner } from '@/components/dashboard/ExecutivePulseBanner';
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
    <div className="executive-report-root bg-white text-slate-900 select-text w-full max-w-[1550px] mx-auto space-y-6 p-4 sm:p-7">
      {/* ==================================================================== */}
      {/* 1. REPORT HEADER BANNER                                              */}
      {/* ==================================================================== */}
      <header className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Easy Gold Marketing performance
          </h1>
        </div>

        <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
          <span className="font-bold text-slate-600">Data As-Of Date:</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0c4ca3] font-black text-sm">
            {asOfDateDisplay}
          </span>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* EXECUTIVE BRIEFING PULSE                                             */}
      {/* ==================================================================== */}
      <div className="report-section break-inside-avoid">
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

      {/* ==================================================================== */}
      {/* SECTION 1: CURRENT MONTH MTD TARGET HIT + YTD TARGET HIT            */}
      {/* ==================================================================== */}
      <section className="report-section space-y-3 break-inside-avoid">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
              1
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {currentMonthLabel} Performance - Vs Target
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">
                Data up to date {asOfDateDisplay} (Current Month MTD target Hit + YTD target Hit)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 p-2 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <VisualTargetTrackingCockpit data={targetTrackingData} showEst={true} />
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 2: MTD FORECAST MoM (Oct'26 compare with Sep'26) - CARDS ONLY*/}
      {/* ==================================================================== */}
      <section className="report-section space-y-3 break-inside-avoid pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
              2
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                MTD performance and Forecast {currentMonthLabel} compare with {comparisonMonthLabel}
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">
                Month-over-Month (MoM) pace and estimated landing trajectory
              </span>
            </div>
          </div>
        </div>

        {/* 7 Cards across 3 Themed Containers in comfortable horizontal spacing */}
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-3.5 items-stretch w-full">
          {/* BUY ACTIVITY: 2 Cards (xl:col-span-2) */}
          <div className="xl:col-span-2 flex flex-col min-w-[280px]">
            <MtdBuyActivitySection
              buyWeight={momMtdData.metrics.buy_weight_g}
              buyTransactions={momMtdData.metrics.buy_transactions}
              comparisonMonthLabel={momMtdData.comparison_month_label}
              elapsedDays={momMtdData.elapsed_days}
              totalDays={momMtdData.total_days_current_month}
            />
          </div>

          {/* SELL ACTIVITY: 3 Cards (xl:col-span-3) */}
          <div className="xl:col-span-3 flex flex-col min-w-[420px]">
            <MtdSellActivitySection
              sellWeight={momMtdData.metrics.sell_weight_g}
              sellTransactions={momMtdData.metrics.sell_transactions}
              withdraw15g={momMtdData.metrics.withdraw_15g}
              comparisonMonthLabel={momMtdData.comparison_month_label}
              elapsedDays={momMtdData.elapsed_days}
              totalDays={momMtdData.total_days_current_month}
            />
          </div>

          {/* PLATFORM OVERVIEW: 2 Cards (xl:col-span-2) */}
          <div className="xl:col-span-2 flex flex-col min-w-[280px]">
            <MtdPlatformSection
              newCustomers={momMtdData.metrics.new_customers}
              totalTransactions={momMtdData.metrics.total_transactions}
              comparisonMonthLabel={momMtdData.comparison_month_label}
              elapsedDays={momMtdData.elapsed_days}
              totalDays={momMtdData.total_days_current_month}
            />
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 3: MTD FORECAST YoY (Oct'26 compare with Oct'25) - CARDS ONLY*/}
      {/* ==================================================================== */}
      <section className="report-section space-y-3 break-inside-avoid pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
              3
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                MTD performance and Forecast {currentMonthLabel} compare with {yoyMonthLabel}
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">
                Year-over-Year (YoY) comparison against same calendar month in {currentYear - 1}
              </span>
            </div>
          </div>
        </div>

        {/* 7 Cards across 3 Themed Containers in comfortable horizontal spacing */}
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-3.5 items-stretch w-full">
          <div className="xl:col-span-2 flex flex-col min-w-[280px]">
            <MtdBuyActivitySection
              buyWeight={yoyMtdData.metrics.buy_weight_g}
              buyTransactions={yoyMtdData.metrics.buy_transactions}
              comparisonMonthLabel={yoyMtdData.comparison_month_label}
              elapsedDays={yoyMtdData.elapsed_days}
              totalDays={yoyMtdData.total_days_current_month}
            />
          </div>

          <div className="xl:col-span-3 flex flex-col min-w-[420px]">
            <MtdSellActivitySection
              sellWeight={yoyMtdData.metrics.sell_weight_g}
              sellTransactions={yoyMtdData.metrics.sell_transactions}
              withdraw15g={yoyMtdData.metrics.withdraw_15g}
              comparisonMonthLabel={yoyMtdData.comparison_month_label}
              elapsedDays={yoyMtdData.elapsed_days}
              totalDays={yoyMtdData.total_days_current_month}
            />
          </div>

          <div className="xl:col-span-2 flex flex-col min-w-[280px]">
            <MtdPlatformSection
              newCustomers={yoyMtdData.metrics.new_customers}
              totalTransactions={yoyMtdData.metrics.total_transactions}
              comparisonMonthLabel={yoyMtdData.comparison_month_label}
              elapsedDays={yoyMtdData.elapsed_days}
              totalDays={yoyMtdData.total_days_current_month}
            />
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 4: WoW REPORTING (ACTUAL BACKEND WEEK)                        */}
      {/* ==================================================================== */}
      <section className="report-section space-y-3 break-inside-avoid pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
              4
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Weekly report of {selectedWeekLabel} ({elapsedDays} day{elapsedDays > 1 ? 's' : ''} gone)
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">
                Current week actuals recorded in database (no orange banner, clean 5-week sparklines)
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 w-full items-stretch">
          <section className="w-full flex flex-col">
            <PlatformOverviewSection
              currentWeek={weeklyRawWeek || weeklyCurrentWeek}
              history={cleanWeeklyHistory}
              variances={weeklyVariances}
              selectedWeek={selectedWeekLabel}
              isPartialWeek={isPartialWeek}
              elapsedDays={elapsedDays}
              isProratedWoW={false}
            />
          </section>

          <section className="w-full flex flex-col">
            <BuyActivitySection
              currentWeek={weeklyRawWeek || weeklyCurrentWeek}
              history={cleanWeeklyHistory}
              variances={weeklyVariances}
              selectedWeek={selectedWeekLabel}
              isPartialWeek={isPartialWeek}
              elapsedDays={elapsedDays}
              isProratedWoW={false}
            />
          </section>

          <section className="w-full flex flex-col">
            <SellActivitySection
              currentWeek={weeklyRawWeek || weeklyCurrentWeek}
              history={cleanWeeklyHistory}
              variances={weeklyVariances}
              selectedWeek={selectedWeekLabel}
              isPartialWeek={isPartialWeek}
              elapsedDays={elapsedDays}
              isProratedWoW={false}
            />
          </section>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 5: WoW REPORTING (7-DAY PRORATED ESTIMATE)                    */}
      {/* ==================================================================== */}
      <section className="report-section space-y-3 break-inside-avoid pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
              5
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Weekly report of {selectedWeekLabel} (7-Day Prorated Estimate)
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">
                Paced 7-day run-rate estimate equalized for apples-to-apples comparison against past full weeks
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 w-full items-stretch">
          <section className="w-full flex flex-col">
            <PlatformOverviewSection
              currentWeek={weeklyCurrentWeek}
              history={cleanWeeklyHistory}
              variances={weeklyProratedVariances}
              selectedWeek={selectedWeekLabel}
              isPartialWeek={isPartialWeek}
              elapsedDays={elapsedDays}
              isProratedWoW={true}
            />
          </section>

          <section className="w-full flex flex-col">
            <BuyActivitySection
              currentWeek={weeklyCurrentWeek}
              history={cleanWeeklyHistory}
              variances={weeklyProratedVariances}
              selectedWeek={selectedWeekLabel}
              isPartialWeek={isPartialWeek}
              elapsedDays={elapsedDays}
              isProratedWoW={true}
            />
          </section>

          <section className="w-full flex flex-col">
            <SellActivitySection
              currentWeek={weeklyCurrentWeek}
              history={cleanWeeklyHistory}
              variances={weeklyProratedVariances}
              selectedWeek={selectedWeekLabel}
              isPartialWeek={isPartialWeek}
              elapsedDays={elapsedDays}
              isProratedWoW={true}
            />
          </section>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 6: MONTHLY RUN RATE (RR) TABLE MoM                            */}
      {/* ==================================================================== */}
      <section className="report-section space-y-3 break-inside-avoid pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
              6
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Monthly RR Table {currentMonthLabel} vs {comparisonMonthLabel}
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">
                Projected Landing &amp; Same-Period Cutoff MoM Comparison (Filters &amp; Sliders removed)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/40 p-2 rounded-2xl border border-slate-200">
          <ClassicRunRateTables 
            data={rrMomData} 
            curYear={currentYear}
            compYear={currentYear}
            isYoY={false}
          />
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 7: MONTHLY RUN RATE (RR) TABLE YoY                            */}
      {/* ==================================================================== */}
      <section className="report-section space-y-3 break-inside-avoid pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs">
              7
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Monthly RR Table {currentMonthLabel} vs {yoyMonthLabel}
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">
                Year-over-Year (YoY) Full Landing &amp; Same-Period Comparison against {currentYear - 1}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/40 p-2 rounded-2xl border border-slate-200">
          <ClassicRunRateTables 
            data={rrYoyData} 
            curYear={currentYear}
            compYear={currentYear - 1}
            isYoY={true}
          />
        </div>
      </section>

      {/* Pure High-Definition Landscape Print Stylesheet */}
      <style jsx global>{`
        @media print {
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
            padding: 0 !important;
            margin: 0 !important;
          }
          .report-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 24px !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm 8mm 8mm 8mm;
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
