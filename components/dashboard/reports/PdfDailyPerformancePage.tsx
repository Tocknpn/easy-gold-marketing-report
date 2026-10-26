'use client';

import React, { useMemo } from 'react';
import { DailyMetricRow } from '@/lib/constants/targetData';
import { RunRateComparisonPayload } from '@/lib/types/target.types';
import {
  buildCompare,
  buildSeries,
  fmtInt,
  fmtPct,
  fmtSigned,
  toDailyMap,
} from '@/lib/utils/dailyPerformance';
import { TrendChart, BRAND, GOLD } from '@/components/dashboard/daily/TrendChart';

const UP = '#059669';
const DOWN = '#dc2626';
const TEAL = '#0891b2';

interface PdfDailyPerformancePageProps {
  dailyRows: DailyMetricRow[];
  runRate: RunRateComparisonPayload;
  asOfDate: string;
}

function hitColor(pct: number) {
  if (pct >= 100) return UP;
  if (pct >= 90) return BRAND;
  return DOWN;
}

function hitLabel(pct: number) {
  if (pct >= 100) return 'On track';
  if (pct >= 90) return 'Close';
  return 'Behind';
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-400 font-bold">–</span>;
  const up = pct > 0.05;
  const down = pct < -0.05;
  const color = up ? UP : down ? DOWN : '#64748b';
  const bg = up ? '#ecfdf5' : down ? '#fef2f2' : '#f1f5f9';
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-black tabular-nums whitespace-nowrap shadow-2xs"
      style={{ color, background: bg }}
    >
      <span>{up ? '▲' : down ? '▼' : '•'}</span>
      {fmtPct(pct)}
    </span>
  );
}

export function PdfDailyPerformancePage({
  dailyRows,
  runRate,
  asOfDate,
}: PdfDailyPerformancePageProps) {
  // Compute daily map and 30-day series ending on asOfDate
  const { series, asOfStr } = useMemo(() => {
    const map = toDailyMap(dailyRows);
    let resolvedDate = asOfDate;
    if (resolvedDate && resolvedDate.includes('/')) {
      const parts = resolvedDate.split('/');
      if (parts.length === 3) {
        resolvedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (!map.has(resolvedDate) && dailyRows.length > 0) {
      resolvedDate = String(dailyRows[dailyRows.length - 1].date_id).slice(0, 10);
    }

    const ncPoints = buildSeries(map, resolvedDate, 'new_customers', 30);
    const buyPoints = buildSeries(map, resolvedDate, 'buy_transactions', 30);
    const sellPoints = buildSeries(map, resolvedDate, 'sell_transactions', 30);

    return {
      asOfStr: resolvedDate,
      series: {
        nc: {
          points: ncPoints,
          cmp: buildCompare(map, resolvedDate, 'new_customers'),
        },
        buy: {
          points: buyPoints,
          cmp: buildCompare(map, resolvedDate, 'buy_transactions'),
        },
        sell: {
          points: sellPoints,
          cmp: buildCompare(map, resolvedDate, 'sell_transactions'),
        },
      },
    };
  }, [dailyRows, asOfDate]);

  // Data for Block 3 (Target Hit)
  const mt = runRate.monthly_tracking;
  const ytd = runRate.ytd_tracking;

  const targetMetricNames: Record<string, string> = {
    nc: 'New Register',
    buy_tx: 'Buy Transactions',
    buy_wt: 'Buy Weight (g)',
    sell_tx: 'Sell Transactions',
    sell_wt: 'Sell Weight (g)',
  };

  // Data for Block 4 (MTD So Far vs Previous Month)
  const cmpLabel = runRate.comparison_month_label;
  const curLabel = runRate.current_month_label;

  const mtdTiles = [
    { id: 'buy_weight_g', label: 'Buy Weight (Baht)', div: 15 },
    { id: 'buy_transactions', label: 'Buy Transactions', div: 1 },
    { id: 'sell_weight_g', label: 'Sell Weight (Baht)', div: 15 },
    { id: 'sell_transactions', label: 'Sell Transactions', div: 1 },
    { id: 'new_customer', label: 'New Register', div: 1 },
    { id: 'withdraw_15g', label: 'Withdraw + Refund', div: 1 },
    { id: 'total_transactions', label: 'Total Transactions', div: 1 },
  ]
    .map((t) => {
      const r = runRate.rows.find((q) => q.id === t.id);
      return r ? { ...t, r } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const mtdAverageSame = mtdTiles.length
    ? mtdTiles.reduce((s, t) => s + t.r.mom_same_pct, 0) / mtdTiles.length
    : 0;
  const mtdAverageFull = mtdTiles.length
    ? mtdTiles.reduce((s, t) => s + t.r.mom_full_pct, 0) / mtdTiles.length
    : 0;

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-4 select-text">
      {/* ==================================================================== */}
      {/* 1. NEW REGISTER PANEL                                                */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#0c53ac] text-white text-xs font-black flex items-center justify-center">
              1
            </span>
            <h3 className="text-base font-black text-slate-900">New Register</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Last 30 days</span>
        </div>

        {/* Hero + Compare Table with GAP */}
        <div className="grid grid-cols-[160px_1fr] gap-4 items-center py-2 border-b border-slate-100 flex-1">
          {/* Hero */}
          <div className="flex flex-col pr-3 border-r border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: TEAL }} />
              <span>New Register</span>
            </div>
            <div className="font-black text-[38px] leading-tight text-slate-900 tabular-nums my-1">
              {fmtInt(series.nc.cmp.latest)}
            </div>
            <div className="flex items-center gap-1.5">
              <ChangeBadge pct={series.nc.cmp.rows[0]?.pct ?? null} />
              <span className="text-xs font-semibold text-slate-500">vs yesterday</span>
            </div>
          </div>

          {/* Full Compare Table with GAP */}
          <div className="text-xs">
            <div className="grid grid-cols-[1.5fr_1fr_1.1fr_1fr] gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 mb-1">
              <span>Compare with</span>
              <span className="text-right">Number</span>
              <span className="text-right">Change</span>
              <span className="text-right">Gap</span>
            </div>
            <div className="space-y-1">
              {series.nc.cmp.rows.map((r, i) => {
                const gapColor = r.gap === null ? '#64748b' : r.gap > 0 ? UP : r.gap < 0 ? DOWN : '#64748b';
                return (
                  <div key={i} className="grid grid-cols-[1.5fr_1fr_1.1fr_1fr] gap-2 items-center font-bold text-slate-700 py-0.5">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="text-right tabular-nums text-slate-900">{fmtInt(r.ref)}</span>
                    <div className="text-right">
                      <ChangeBadge pct={r.pct} />
                    </div>
                    <span className="text-right tabular-nums font-black" style={{ color: gapColor }}>
                      {fmtSigned(r.gap)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 30-Day Trend Chart */}
        <div className="h-28 w-full pt-2">
          <TrendChart series={[{ name: 'New Register', color: TEAL, points: series.nc.points, area: true }]} />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BUY & SELL TRANSACTIONS PANEL                                     */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#0c53ac] text-white text-xs font-black flex items-center justify-center">
              2
            </span>
            <h3 className="text-base font-black text-slate-900">Buy &amp; Sell Transactions</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Last 30 days</span>
        </div>

        {/* Grid: Left metrics / Right chart */}
        <div className="grid grid-cols-[1.1fr_1.1fr] gap-4 flex-1 min-h-0 pt-2 items-center">
          {/* Left Stats: Buy + Sell stacked with GAP */}
          <div className="flex flex-col justify-between h-full space-y-2.5">
            {/* Buy Row */}
            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND }} />
                  <span>Buy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[26px] font-black leading-none text-slate-900 tabular-nums">
                    {fmtInt(series.buy.cmp.latest)}
                  </span>
                  <ChangeBadge pct={series.buy.cmp.rows[0]?.pct ?? null} />
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-500 flex justify-between pt-1 border-t border-slate-200/50">
                <span>Avg 7d: <strong className="text-slate-800">{fmtInt(series.buy.cmp.rows[2]?.ref ?? 0)}</strong> ({fmtSigned(series.buy.cmp.rows[2]?.gap ?? 0)})</span>
                <span>Avg 21d: <strong className="text-slate-800">{fmtInt(series.buy.cmp.rows[4]?.ref ?? 0)}</strong></span>
              </div>
            </div>

            {/* Sell Row */}
            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />
                  <span>Sell</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[26px] font-black leading-none text-slate-900 tabular-nums">
                    {fmtInt(series.sell.cmp.latest)}
                  </span>
                  <ChangeBadge pct={series.sell.cmp.rows[0]?.pct ?? null} />
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-500 flex justify-between pt-1 border-t border-slate-200/50">
                <span>Avg 7d: <strong className="text-slate-800">{fmtInt(series.sell.cmp.rows[2]?.ref ?? 0)}</strong> ({fmtSigned(series.sell.cmp.rows[2]?.gap ?? 0)})</span>
                <span>Avg 21d: <strong className="text-slate-800">{fmtInt(series.sell.cmp.rows[4]?.ref ?? 0)}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Dual-Line Chart */}
          <div className="h-full w-full min-h-[140px] pt-1">
            <TrendChart
              legend
              series={[
                { name: 'Buy', color: BRAND, points: series.buy.points, area: true },
                { name: 'Sell', color: GOLD, points: series.sell.points },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TARGET HIT PANEL                                                  */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#0c53ac] text-white text-xs font-black flex items-center justify-center">
              3
            </span>
            <h3 className="text-base font-black text-slate-900">
              Target Hit • {curLabel} &amp; Year to Date
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Day {runRate.days_elapsed}/{runRate.total_days_in_month}
          </span>
        </div>

        {/* Target Tracking Table */}
        <div className="flex-1 min-h-0 flex flex-col justify-between py-1.5">
          <div className="grid grid-cols-[1.5fr_1.1fr_1.6fr_0.9fr_1fr] gap-x-3 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Metric</span>
            <span className="text-right">This Month</span>
            <span>Hit So Far</span>
            <span className="text-center">Month-End Est.</span>
            <span className="text-center">Year to Date</span>
          </div>

          <div className="space-y-1.5">
            {mt.metrics.map((m) => {
              const y = ytd.metrics.find((q) => q.id === m.id);
              const c = hitColor(m.est_target_hit_pct);
              const yc = y ? hitColor(y.est_year_end_pct) : '#64748b';
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1.5fr_1.1fr_1.6fr_0.9fr_1fr] gap-x-3 items-center rounded-lg px-2 py-1 odd:bg-slate-50/80 text-xs"
                >
                  <div className="font-bold text-slate-800 truncate text-[13px]">
                    {targetMetricNames[m.id] ?? m.label}
                  </div>

                  <div className="text-right tabular-nums leading-tight">
                    <span className="font-black text-slate-900 text-[13px]">{fmtInt(m.actual)}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">of {fmtInt(m.target)}</span>
                  </div>

                  {/* Progress Bar with Benchmark */}
                  <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden shadow-2xs">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-1.5 text-[10px] font-black text-white"
                      style={{
                        width: `${Math.min(100, Math.max(18, m.current_pct))}%`,
                        background: c,
                      }}
                    >
                      {m.current_pct}%
                    </div>
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-slate-800 z-10"
                      style={{ left: `${Math.min(100, mt.days_gone_pct)}%` }}
                    />
                  </div>

                  <div className="text-center leading-tight">
                    <span className="font-black text-[13px] block" style={{ color: c }}>
                      {m.est_target_hit_pct}%
                    </span>
                    <span className="text-[9.5px] font-bold block" style={{ color: c }}>
                      {hitLabel(m.est_target_hit_pct)}
                    </span>
                  </div>

                  <div className="text-center leading-tight">
                    <span className="font-black text-[13px] block" style={{ color: yc }}>
                      {y ? `${y.current_pct}%` : '–'}
                    </span>
                    <span className="text-[9.5px] block text-slate-500 font-semibold">
                      {y ? `Year-end est ${y.est_year_end_pct}%` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Legend */}
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium">
            <span>| Line = how much of the month has passed ({mt.days_gone_pct}%)</span>
            <span className="space-x-3 font-bold">
              <span style={{ color: UP }}>• 100%+ On Track</span>
              <span style={{ color: BRAND }}>• 90-99% Close</span>
              <span style={{ color: DOWN }}>• under 90% Behind</span>
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. MTD SO FAR VS PREVIOUS MONTH PANEL                                */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#0c53ac] text-white text-xs font-black flex items-center justify-center">
              4
            </span>
            <h3 className="text-base font-black text-slate-900">
              {curLabel} So Far vs {cmpLabel}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Same {runRate.days_elapsed} days compared
          </span>
        </div>

        {/* 7 Metric Tiles + 1 Overall Tile matching 4 top / 4 bottom layout */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 flex-1 min-h-0 pt-1.5">
          {mtdTiles.map((t) => {
            const up = t.r.mom_same_pct > 0;
            const down = t.r.mom_same_pct < 0;
            const accent = up ? UP : down ? DOWN : '#94a3b8';
            return (
              <div
                key={t.id}
                className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-2 flex flex-col justify-between overflow-hidden shadow-2xs"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
                <div className="text-[11px] font-black text-slate-700 truncate pl-1">
                  {t.label}
                </div>
                <div className="pl-1 my-0.5">
                  <div className="font-black text-[18px] leading-tight text-slate-900 tabular-nums">
                    {fmtInt(t.r.cur_mtd / t.div)}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ChangeBadge pct={t.r.mom_same_pct} />
                    <span className="text-[9.5px] font-medium text-slate-400 truncate">
                      vs {cmpLabel} ({fmtInt(t.r.comp_same_period / t.div)})
                    </span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-1 text-[9.5px] flex items-center justify-between pl-1 text-slate-500">
                  <span>Expected {curLabel} total <strong className="text-slate-800">{fmtInt(t.r.rr_projected / t.div)}</strong></span>
                  <span className="font-black" style={{ color: t.r.mom_full_pct >= 0 ? UP : DOWN }}>
                    vs full {cmpLabel} {t.r.mom_full_pct >= 0 ? '▲ +' : '▼ '}{t.r.mom_full_pct}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* Overall Tile matching PowerPoint slide 2 */}
          <div
            className="rounded-xl p-2.5 flex flex-col justify-between text-white shadow-xs"
            style={{ background: `linear-gradient(135deg, #0a3f87, ${BRAND} 55%, #2f7be0)` }}
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-white/90">
              OVERALL PERFORMANCE
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <div>
                  <div className="font-black text-[22px] leading-tight tabular-nums">
                    {mtdAverageSame > 0 ? '▲ +' : mtdAverageSame < 0 ? '▼ ' : ''}
                    {Math.round(mtdAverageSame)}%
                  </div>
                  <div className="text-[9px] font-bold text-white/90">
                    Same {runRate.days_elapsed} days
                  </div>
                </div>
                <div>
                  <div className="font-black text-[22px] leading-tight tabular-nums">
                    {mtdAverageFull > 0 ? '▲ +' : mtdAverageFull < 0 ? '▼ ' : ''}
                    {Math.round(mtdAverageFull)}%
                  </div>
                  <div className="text-[9px] font-bold text-white/90">
                    Est. vs full {cmpLabel}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[9px] font-medium text-white/80">
              Average of the 7 measures
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
