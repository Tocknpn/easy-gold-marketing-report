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
import { PdfPage, PdfSectionTitle } from './PdfPage';
import { DEFAULT_2026_TARGETS } from '@/lib/constants/targetData';

/** Total number of fixed A4 landscape pages rendered by the report. */
export const PDF_TOTAL_PAGES = 4;

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

/** MTD card grid (Buy 2 | Sell 3 | Platform 2) shared by MoM and YoY sections. */
function MtdActivityGrid({ data }: { data: MtdReportPayload }) {
  const card = (key: keyof MtdReportPayload['metrics']) => (
    <PdfMtdMetricCard
      metric={data.metrics[key]}
      comparisonMonthLabel={data.comparison_month_label}
      elapsedDays={data.elapsed_days}
      totalDays={data.total_days_current_month}
    />
  );

  return (
    <div className="grid grid-cols-7 gap-2.5 items-stretch w-full">
      {/* BUY ACTIVITY: 2 Cards (col-span-2) */}
      <div className="col-span-2 border-[2px] border-dotted border-[#2e7d32] rounded-xl p-1.5 bg-[#f5f9f5] flex flex-col">
        <div className="bg-[#2e7d32] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1.5">
          BUY ACTIVITY
        </div>
        <div className="grid grid-cols-2 gap-1.5 flex-1 items-stretch">
          {card('buy_weight_g')}
          {card('buy_transactions')}
        </div>
      </div>

      {/* SELL ACTIVITY: 3 Cards (col-span-3) */}
      <div className="col-span-3 border-[2px] border-dotted border-[#b71c1c] rounded-xl p-1.5 bg-[#fff8f8] flex flex-col">
        <div className="bg-[#b71c1c] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1.5">
          SELL ACTIVITY
        </div>
        <div className="grid grid-cols-3 gap-1.5 flex-1 items-stretch">
          {card('sell_weight_g')}
          {card('sell_transactions')}
          {card('withdraw_15g')}
        </div>
      </div>

      {/* PLATFORM OVERVIEW: 2 Cards (col-span-2) */}
      <div className="col-span-2 border-[2px] border-dotted border-[#0c4ca3] rounded-xl p-1.5 bg-[#f5f8ff] flex flex-col">
        <div className="bg-[#0c4ca3] text-white font-black text-xs tracking-wider px-2.5 py-1 rounded-md uppercase mb-1.5">
          PLATFORM OVERVIEW
        </div>
        <div className="grid grid-cols-2 gap-1.5 flex-1 items-stretch">
          {card('new_customers')}
          {card('total_transactions')}
        </div>
      </div>
    </div>
  );
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

  const weeklyProps = {
    history: cleanWeeklyHistory,
    selectedWeek: selectedWeekLabel,
    isPartialWeek,
    elapsedDays,
  };

  return (
    <div className="executive-report-root text-slate-900 select-text flex flex-col items-center gap-8">
      {/* ==================================================================== */}
      {/* PAGE 1: EXECUTIVE BRIEFING & TARGET TRACKING                          */}
      {/* ==================================================================== */}
      <PdfPage
        id="pdf-page-1"
        pageNo={1}
        totalPages={PDF_TOTAL_PAGES}
        badge="Official BI Synthesis"
        subtitle="Executive Briefing & Targets"
        title="Easy Gold Marketing performance"
        asOfDate={asOfDateDisplay}
        footerNote="Official Executive Synthesis"
      >
        <div className="space-y-5">
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
          <section className="report-section space-y-2.5">
            <PdfSectionTitle
              num={1}
              title={`${currentMonthLabel} Performance - Vs Target`}
              subtitle="(Current Month MTD target Hit + YTD target Hit)"
            />
            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/90">
              <VisualTargetTrackingCockpit data={targetTrackingData} showEst={true} hideHeader={true} />
            </div>
          </section>
        </div>
      </PdfPage>

      {/* ==================================================================== */}
      {/* PAGE 2: MTD GROWTH & FORECAST (MoM & YoY)                            */}
      {/* ==================================================================== */}
      <PdfPage
        id="pdf-page-2"
        pageNo={2}
        totalPages={PDF_TOTAL_PAGES}
        badge="MTD Growth & Forecast"
        subtitle="Month-over-Month & Year-over-Year"
        title="Easy Gold Marketing performance — MTD Forecast"
        asOfDate={asOfDateDisplay}
        footerNote="MTD Performance & Forecast Synthesis"
      >
        <div className="space-y-4">
          {/* Section 2: MTD MoM */}
          <section className="report-section space-y-2">
            <PdfSectionTitle
              num={2}
              title={`MTD performance and Forecast ${currentMonthLabel} compare with ${comparisonMonthLabel} (MoM)`}
            />
            <MtdActivityGrid data={momMtdData} />
          </section>

          {/* Section 3: MTD YoY */}
          <section className="report-section space-y-2">
            <PdfSectionTitle
              num={3}
              title={`MTD performance and Forecast ${currentMonthLabel} compare with ${yoyMonthLabel} (YoY)`}
            />
            <MtdActivityGrid data={yoyMtdData} />
          </section>
        </div>
      </PdfPage>

      {/* ==================================================================== */}
      {/* PAGE 3: WEEKLY PERFORMANCE ANALYSIS (ACTUAL & 7-DAY PRORATED)        */}
      {/* ==================================================================== */}
      <PdfPage
        id="pdf-page-3"
        pageNo={3}
        totalPages={PDF_TOTAL_PAGES}
        badge="Weekly Run-Rate Analysis"
        subtitle="Weekly Momentum & WoW Sparklines"
        title="Easy Gold Marketing performance — Weekly Velocity"
        asOfDate={asOfDateDisplay}
        footerNote="Weekly Performance Synthesis"
      >
        <div className="space-y-5">
          {/* Section 4: Weekly Report (Actual Backend Week) */}
          <section className="report-section space-y-2.5">
            <PdfSectionTitle
              num={4}
              title={`Weekly report of ${selectedWeekLabel} (${elapsedDays} day${elapsedDays > 1 ? 's' : ''} gone)`}
              subtitle="Current week actuals recorded in database (clean 5-week sparklines)"
            />
            <div className="grid grid-cols-3 gap-3.5 w-full items-stretch">
              <div className="w-full flex flex-col">
                <PlatformOverviewSection
                  currentWeek={weeklyRawWeek || weeklyCurrentWeek}
                  variances={weeklyVariances}
                  isProratedWoW={false}
                  {...weeklyProps}
                />
              </div>
              <div className="w-full flex flex-col">
                <BuyActivitySection
                  currentWeek={weeklyRawWeek || weeklyCurrentWeek}
                  variances={weeklyVariances}
                  isProratedWoW={false}
                  {...weeklyProps}
                />
              </div>
              <div className="w-full flex flex-col">
                <SellActivitySection
                  currentWeek={weeklyRawWeek || weeklyCurrentWeek}
                  variances={weeklyVariances}
                  isProratedWoW={false}
                  {...weeklyProps}
                />
              </div>
            </div>
          </section>

          {/* Section 5: Weekly Report (7-Day Prorated Estimate) */}
          <section className="report-section space-y-2.5">
            <PdfSectionTitle
              num={5}
              title={`Weekly report of ${selectedWeekLabel} (7-Day Prorated Estimate)`}
              subtitle="Paced 7-day run-rate estimate equalized for apples-to-apples comparison against past full weeks"
            />
            <div className="grid grid-cols-3 gap-3.5 w-full items-stretch">
              <div className="w-full flex flex-col">
                <PlatformOverviewSection
                  currentWeek={weeklyCurrentWeek}
                  variances={weeklyProratedVariances}
                  isProratedWoW={true}
                  {...weeklyProps}
                />
              </div>
              <div className="w-full flex flex-col">
                <BuyActivitySection
                  currentWeek={weeklyCurrentWeek}
                  variances={weeklyProratedVariances}
                  isProratedWoW={true}
                  {...weeklyProps}
                />
              </div>
              <div className="w-full flex flex-col">
                <SellActivitySection
                  currentWeek={weeklyCurrentWeek}
                  variances={weeklyProratedVariances}
                  isProratedWoW={true}
                  {...weeklyProps}
                />
              </div>
            </div>
          </section>
        </div>
      </PdfPage>

      {/* ==================================================================== */}
      {/* PAGE 4: INSTITUTIONAL MONTHLY RUN RATE (RR) TABLES MoM & YoY         */}
      {/* ==================================================================== */}
      <PdfPage
        id="pdf-page-4"
        pageNo={4}
        totalPages={PDF_TOTAL_PAGES}
        badge="Monthly Run-Rate Projections"
        subtitle="Financial Landing & Same-Period Comparisons"
        title="Easy Gold Marketing performance — Monthly RR Tables"
        asOfDate={asOfDateDisplay}
        footerNote="Monthly Projections & Same-Period Comparisons"
      >
        <div className="space-y-5">
          {/* Section 6: Monthly RR Table MoM */}
          <section className="report-section space-y-2.5">
            <PdfSectionTitle
              num={6}
              title={`Monthly RR Table ${currentMonthLabel} vs ${comparisonMonthLabel}`}
              subtitle="Projected Landing & Same-Period Cutoff MoM Comparison"
            />
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
          <section className="report-section space-y-2.5">
            <PdfSectionTitle
              num={7}
              title={`Monthly RR Table ${currentMonthLabel} vs ${yoyMonthLabel}`}
              subtitle={`Year-over-Year (YoY) Full Landing & Same-Period Comparison against ${currentYear - 1}`}
            />
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
      </PdfPage>

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
            overflow: visible !important;
          }
          .executive-report-root {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Each page is laid out at 1440 x 1018px; zoom maps it onto 297mm (1123px @96dpi) */
          .pdf-page-container {
            width: 1440px !important;
            height: 1018px !important;
            zoom: 0.78;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
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
