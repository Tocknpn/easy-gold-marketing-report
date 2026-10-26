'use client';

import React, { useMemo } from 'react';
import { DailyMetricRow } from '@/lib/constants/targetData';
import { RunRateComparisonPayload } from '@/lib/types/target.types';
import {
  buildCompare,
  buildSeries,
  fmtInt,
  fmtPct,
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
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums whitespace-nowrap"
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
      // 24/10/2026 -> 2026-10-24
      const parts = resolvedDate.split('/');
      if (parts.length === 3) {
        resolvedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    // Fallback if not found
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
    { id: 'withdraw_15g', label: 'Withdraw (15g)', div: 1 },
    { id: 'total_transactions', label: 'Total Transactions', div: 1 },
  ]
    .map((t) => {
      const r = runRate.rows.find((q) => q.id === t.id);
      return r ? { ...t, r } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const mtdAverage = mtdTiles.length
    ? mtdTiles.reduce((s, t) => s + t.r.mom_same_pct, 0) / mtdTiles.length
    : 0;

  return (
    <div className="w-full h-full grid grid-cols-[1.05fr_1.35fr] grid-rows-[1.08fr_0.92fr] gap-3.5 select-text">
      {/* ==================================================================== */}
      {/* 1. NEW REGISTER PANEL                                                */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#0c53ac] text-white text-[11px] font-black flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-black text-slate-900">New Register</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Last 30 days</span>
        </div>

        {/* Hero + Compare Table */}
        <div className="grid grid-cols-[auto_1fr] gap-3 items-center py-2 border-b border-slate-100">
          {/* Hero */}
          <div className="flex flex-col pr-2 border-r border-slate-100">
            <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase text-slate-500">
              <span className="w-2 h-2 rounded-full" style={{ background: TEAL }} />
              <span>New Register</span>
            </div>
            <div className="font-black text-[30px] leading-tight text-slate-900 tabular-nums my-0.5">
              {fmtInt(series.nc.cmp.latest)}
            </div>
            <div className="flex items-center gap-1">
              <ChangeBadge pct={series.nc.cmp.rows[0]?.pct ?? null} />
              <span className="text-[9px] font-semibold text-slate-500">vs yesterday</span>
            </div>
          </div>

          {/* Compact Compare Rows */}
          <div className="text-[10px] space-y-1">
            <div className="grid grid-cols-[1.4fr_1fr_1.1fr] gap-1 text-[8.5px] font-black uppercase text-slate-400 border-b border-slate-100 pb-0.5">
              <span>Compare with</span>
              <span className="text-right">Value</span>
              <span className="text-right">Change</span>
            </div>
            {series.nc.cmp.rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1fr_1.1fr] gap-1 items-center font-bold text-slate-700">
                <span className="text-slate-500">{r.label}</span>
                <span className="text-right tabular-nums text-slate-900">{fmtInt(r.ref)}</span>
                <div className="text-right">
                  <ChangeBadge pct={r.pct} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 30-Day Spark Area Chart */}
        <div className="h-28 w-full pt-1.5">
          <TrendChart series={[{ name: 'New Register', color: TEAL, points: series.nc.points, area: true }]} />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BUY & SELL TRANSACTIONS PANEL                                     */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#0c53ac] text-white text-[11px] font-black flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-black text-slate-900">Buy &amp; Sell Transactions</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Last 30 days</span>
        </div>

        {/* Grid: Left metrics / Right chart */}
        <div className="grid grid-cols-[1.1fr_1.3fr] gap-3 flex-1 min-h-0 pt-2 items-center">
          {/* Left Stats: Buy + Sell stacked */}
          <div className="flex flex-col justify-between h-full space-y-2">
            {/* Buy Row */}
            <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-200/60">
              <div className="flex items-baseline justify-between mb-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ background: BRAND }} />
                  <span>Buy</span>
                </div>
                <ChangeBadge pct={series.buy.cmp.rows[0]?.pct ?? null} />
              </div>
              <div className="text-[24px] font-black leading-none text-slate-900 tabular-nums">
                {fmtInt(series.buy.cmp.latest)}
              </div>
              <div className="text-[8.5px] font-semibold text-slate-500 mt-1 flex justify-between">
                <span>Avg 7d: {fmtInt(series.buy.cmp.rows[2]?.ref ?? 0)}</span>
                <span>Avg 21d: {fmtInt(series.buy.cmp.rows[4]?.ref ?? 0)}</span>
              </div>
            </div>

            {/* Sell Row */}
            <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-200/60">
              <div className="flex items-baseline justify-between mb-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
                  <span>Sell</span>
                </div>
                <ChangeBadge pct={series.sell.cmp.rows[0]?.pct ?? null} />
              </div>
              <div className="text-[24px] font-black leading-none text-slate-900 tabular-nums">
                {fmtInt(series.sell.cmp.latest)}
              </div>
              <div className="text-[8.5px] font-semibold text-slate-500 mt-1 flex justify-between">
                <span>Avg 7d: {fmtInt(series.sell.cmp.rows[2]?.ref ?? 0)}</span>
                <span>Avg 21d: {fmtInt(series.sell.cmp.rows[4]?.ref ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Right Dual-Line Chart */}
          <div className="h-full w-full min-h-[140px]">
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#0c53ac] text-white text-[11px] font-black flex items-center justify-center">
              3
            </span>
            <h3 className="text-sm font-black text-slate-900">
              Target Hit · {curLabel} &amp; Year to Date
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            Day {runRate.days_elapsed}/{runRate.total_days_in_month}
          </span>
        </div>

        {/* Compact Target Tracking Table */}
        <div className="flex-1 min-h-0 flex flex-col justify-between py-1">
          <div className="grid grid-cols-[1.6fr_1.2fr_1.6fr_1fr_1fr] gap-x-2 pb-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Metric</span>
            <span className="text-right">This Month</span>
            <span>Hit So Far</span>
            <span className="text-center">Month-End Est</span>
            <span className="text-center">YTD Hit</span>
          </div>

          <div className="space-y-1.5">
            {mt.metrics.map((m) => {
              const y = ytd.metrics.find((q) => q.id === m.id);
              const c = hitColor(m.est_target_hit_pct);
              const yc = y ? hitColor(y.est_year_end_pct) : '#64748b';
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1.6fr_1.2fr_1.6fr_1fr_1fr] gap-x-2 items-center rounded-lg px-1.5 py-1 odd:bg-slate-50 text-[10.5px]"
                >
                  <div className="font-bold text-slate-800 truncate">
                    {targetMetricNames[m.id] ?? m.label}
                  </div>

                  <div className="text-right tabular-nums leading-tight">
                    <span className="font-black text-slate-900">{fmtInt(m.actual)}</span>
                    <span className="text-[8.5px] text-slate-400 block">/ {fmtInt(m.target)}</span>
                  </div>

                  {/* Progress Bar with Benchmark */}
                  <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-1.5 text-[8.5px] font-black text-white"
                      style={{
                        width: `${Math.min(100, Math.max(22, m.current_pct))}%`,
                        background: c,
                      }}
                    >
                      {m.current_pct}%
                    </div>
                    <div
                      className="absolute top-0 bottom-0 w-[1.5px] bg-slate-700/80"
                      style={{ left: `${Math.min(100, mt.days_gone_pct)}%` }}
                    />
                  </div>

                  <div className="text-center leading-tight font-black" style={{ color: c }}>
                    {m.est_target_hit_pct}%
                    <span className="text-[8px] block font-bold">{hitLabel(m.est_target_hit_pct)}</span>
                  </div>

                  <div className="text-center leading-tight font-black" style={{ color: yc }}>
                    {y ? `${y.current_pct}%` : '–'}
                    <span className="text-[8px] block text-slate-400 font-semibold">
                      {y ? `Est ${y.est_year_end_pct}%` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Legend */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[8.5px] text-slate-400 font-medium">
            <span>Line = month passed ({mt.days_gone_pct}%)</span>
            <span className="space-x-2 font-bold">
              <span style={{ color: UP }}>● 100%+ On track</span>
              <span style={{ color: BRAND }}>● 90–99% Close</span>
              <span style={{ color: DOWN }}>● &lt;90% Behind</span>
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. MTD SO FAR VS PREVIOUS MONTH PANEL                                */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#0c53ac] text-white text-[11px] font-black flex items-center justify-center">
              4
            </span>
            <h3 className="text-sm font-black text-slate-900">
              {curLabel} So Far vs {cmpLabel}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            Same {runRate.days_elapsed} days compared
          </span>
        </div>

        {/* 7 Metric Tiles + 1 Overall Tile */}
        <div className="grid grid-cols-4 grid-rows-2 gap-1.5 flex-1 min-h-0 pt-1.5">
          {mtdTiles.map((t) => {
            const up = t.r.mom_same_pct > 0;
            const down = t.r.mom_same_pct < 0;
            const accent = up ? UP : down ? DOWN : '#94a3b8';
            return (
              <div
                key={t.id}
                className="relative rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-1.5 flex flex-col justify-between overflow-hidden"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
                <div className="text-[9px] font-black text-slate-600 truncate pl-1">
                  {t.label}
                </div>
                <div className="pl-1">
                  <div className="font-black text-[15px] leading-tight text-slate-900 tabular-nums">
                    {fmtInt(t.r.cur_mtd / t.div)}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ChangeBadge pct={t.r.mom_same_pct} />
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-0.5 text-[8px] flex items-center justify-between pl-1 text-slate-400">
                  <span>Exp: {fmtInt(t.r.rr_projected / t.div)}</span>
                  <span className="font-bold" style={{ color: t.r.mom_full_pct >= 0 ? UP : DOWN }}>
                    {t.r.mom_full_pct >= 0 ? '+' : ''}{t.r.mom_full_pct}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* Overall Tile */}
          <div
            className="rounded-xl p-2 flex flex-col justify-between text-white shadow-xs"
            style={{ background: `linear-gradient(135deg, #0a3f87, ${BRAND} 55%, #2f7be0)` }}
          >
            <div className="text-[9px] font-black uppercase tracking-wider text-white/80">
              OVERALL
            </div>
            <div>
              <div className="font-black text-[22px] leading-tight tabular-nums">
                {mtdAverage > 0 ? '▲ +' : mtdAverage < 0 ? '▼ ' : ''}
                {Math.round(mtdAverage)}%
              </div>
              <div className="text-[8px] font-bold text-white/85">
                {curLabel} vs {cmpLabel}
              </div>
            </div>
            <div className="text-[7.5px] font-medium text-white/70">
              Avg of 7 measures
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
