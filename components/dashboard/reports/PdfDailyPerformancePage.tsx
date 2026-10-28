'use client';

import React, { useMemo } from 'react';
import { DailyMetricRow } from '@/lib/constants/targetData';
import { RunRateComparisonPayload } from '@/lib/types/target.types';
import {
  buildCompare,
  buildSeries,
  fmtInt,
  toDailyMap,
} from '@/lib/utils/dailyPerformance';
import { TrendChart, BRAND, GOLD } from '@/components/dashboard/daily/TrendChart';
import { ChangeChip, ComparePanel, DOWN, HeroNumber, UP } from '@/components/dashboard/daily/ComparePanel';

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

export function PdfDailyPerformancePage({
  dailyRows,
  runRate,
  asOfDate,
}: PdfDailyPerformancePageProps) {
  // Compute daily map and 30-day series ending on asOfDate
  const { series } = useMemo(() => {
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
    { id: 'withdraw_refund', label: 'Withdraw + Refund', div: 1 },
    { id: 'total_transactions', label: 'Total Transactions', div: 1 },
  ]
    .map((t) => {
      const r = runRate.rows.find((q) => q.id === t.id);
      return r ? { ...t, r } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const avgSame = mtdTiles.length
    ? mtdTiles.reduce((s, t) => s + t.r.mom_same_pct, 0) / mtdTiles.length
    : 0;
  const avgFull = mtdTiles.length
    ? mtdTiles.reduce((s, t) => s + t.r.mom_full_pct, 0) / mtdTiles.length
    : 0;

  const roundSame = Math.round(avgSame);
  const roundFull = Math.round(avgFull);
  const colorSame = roundSame >= 0 ? UP : DOWN;
  const colorFull = roundFull >= 0 ? UP : DOWN;

  return (
    <div className="w-full h-full grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] grid-rows-2 gap-3.5 select-text">
      {/* ==================================================================== */}
      {/* 1. NEW REGISTER PANEL                                                */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#0c53ac] text-white text-xs font-black flex items-center justify-center">
              1
            </span>
            <h3 className="text-base font-black text-slate-900">New Register</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Last 30 days</span>
        </div>

        {/* Hero + Full Compare Table with GAP */}
        <div className="grid grid-cols-[150px_1fr] gap-3 items-center py-2 border-b border-slate-100 shrink-0">
          <div className="pr-2 border-r border-slate-100">
            <HeroNumber
              title="New Register"
              value={series.nc.cmp.latest}
              yesterdayPct={series.nc.cmp.rows[0]?.pct ?? null}
              accent={TEAL}
              stacked
            />
          </div>
          <div className="min-w-0">
            <ComparePanel rows={series.nc.cmp.rows} />
          </div>
        </div>

        {/* 30-Day Trend Chart */}
        <div className="flex-1 min-h-[115px] w-full pt-1.5">
          <TrendChart series={[{ name: 'New Register', color: TEAL, points: series.nc.points, area: true }]} />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BUY & SELL TRANSACTIONS PANEL (FULL COMPARE TABLES + CHART)        */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#0c53ac] text-white text-xs font-black flex items-center justify-center">
              2
            </span>
            <h3 className="text-base font-black text-slate-900">Buy &amp; Sell Transactions</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Last 30 days</span>
        </div>

        {/* Grid: Left Full Buy & Sell Compare Tables / Right Dual-Line Chart */}
        <div className="grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-3.5 flex-1 min-h-0 pt-2">
          <div className="flex flex-col justify-between min-h-0 gap-2">
            {/* Buy Section Card Container */}
            <div className="rounded-xl border border-blue-200/80 bg-slate-50/40 p-2 space-y-1.5">
              <div className="flex items-baseline gap-2 px-1">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND }} />
                  <span>Buy</span>
                </div>
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  {fmtInt(series.buy.cmp.latest)}
                </span>
                <ChangeChip pct={series.buy.cmp.rows[0]?.pct ?? null} size="sm" />
                <span className="text-[11px] font-semibold text-slate-500">vs yesterday</span>
              </div>
              <ComparePanel rows={series.buy.cmp.rows} />
            </div>

            {/* Sell Section Card Container */}
            <div className="rounded-xl border border-amber-200/80 bg-slate-50/40 p-2 space-y-1.5">
              <div className="flex items-baseline gap-2 px-1">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />
                  <span>Sell</span>
                </div>
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  {fmtInt(series.sell.cmp.latest)}
                </span>
                <ChangeChip pct={series.sell.cmp.rows[0]?.pct ?? null} size="sm" />
                <span className="text-[11px] font-semibold text-slate-500">vs yesterday</span>
              </div>
              <ComparePanel rows={series.sell.cmp.rows} />
            </div>
          </div>

          {/* Right Dual-Line Chart */}
          <div className="h-full w-full min-h-[180px] pt-1">
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#0c53ac] text-white text-xs font-black flex items-center justify-center">
              3
            </span>
            <h3 className="text-base font-black text-slate-900">
              Target Hit · {curLabel} &amp; Year to Date
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Day {runRate.days_elapsed}/{runRate.total_days_in_month}
          </span>
        </div>

        {/* Target Tracking Table */}
        <div className="flex-1 min-h-0 flex flex-col justify-between py-1">
          <div className="grid grid-cols-[1.45fr_1.15fr_1.55fr_0.9fr_1fr] gap-x-2.5 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Metric</span>
            <span className="text-right">This Month</span>
            <span>Hit So Far</span>
            <span className="text-center">Month-End Est.</span>
            <span className="text-center">Year to Date</span>
          </div>

          <div className="flex-1 flex flex-col justify-around">
            {mt.metrics.map((m) => {
              const y = ytd.metrics.find((q) => q.id === m.id);
              const c = hitColor(m.est_target_hit_pct);
              const yc = y ? hitColor(y.est_year_end_pct) : '#64748b';
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1.45fr_1.15fr_1.55fr_0.9fr_1fr] gap-x-2.5 items-center rounded-lg px-1.5 py-1 odd:bg-slate-50/80 text-xs"
                >
                  <div className="font-black text-slate-800 text-[13px] leading-snug">
                    {targetMetricNames[m.id] ?? m.label}
                  </div>

                  <div className="text-right tabular-nums leading-snug">
                    <span className="font-black text-slate-900 text-[13px]">{fmtInt(m.actual)}</span>
                    <span className="text-[10.5px] text-slate-500 block font-semibold">of {fmtInt(m.target)}</span>
                  </div>

                  {/* Progress Bar with Benchmark */}
                  <div className="relative h-5 rounded-full bg-slate-100 overflow-hidden shadow-2xs">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2 text-[11px] font-black text-white"
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

                  <div className="text-center leading-snug">
                    <span className="font-black text-[14px] block tabular-nums" style={{ color: c }}>
                      {m.est_target_hit_pct}%
                    </span>
                    <span className="text-[10px] font-bold block" style={{ color: c }}>
                      {hitLabel(m.est_target_hit_pct)}
                    </span>
                  </div>

                  <div className="text-center leading-snug">
                    <span className="font-black text-[14px] block tabular-nums" style={{ color: yc }}>
                      {y ? `${y.current_pct}%` : '–'}
                    </span>
                    <span className="text-[10px] block text-slate-500 font-semibold tabular-nums">
                      {y ? `Year-end est. ${y.est_year_end_pct}%` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Legend */}
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10.5px] text-slate-500 font-semibold">
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
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

        {/* 7 Metric Tiles + 1 Overall Performance Tile matching PowerPoint */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2.5 flex-1 min-h-0 pt-2">
          {mtdTiles.map((t) => {
            const up = t.r.mom_same_pct > 0;
            const down = t.r.mom_same_pct < 0;
            const accent = up ? UP : down ? DOWN : '#94a3b8';
            const fullPct = t.r.mom_full_pct;
            return (
              <div
                key={t.id}
                className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 px-3 py-2 flex flex-col justify-between overflow-hidden shadow-2xs"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
                <div className="text-xs font-black text-slate-700 leading-snug">
                  {t.label}
                </div>
                <div className="my-0.5">
                  <div className="font-black text-[22px] leading-snug text-slate-900 tabular-nums">
                    {fmtInt(t.r.cur_mtd / t.div)}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <ChangeChip pct={t.r.mom_same_pct} size="sm" />
                    <span className="text-[10px] font-semibold text-slate-500">
                      vs {cmpLabel} same days ({fmtInt(t.r.comp_same_period / t.div)})
                    </span>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-1 text-[10px] flex items-center justify-between gap-1">
                  <div className="leading-snug">
                    <div className="font-semibold text-slate-500">Expected {curLabel} total</div>
                    <div className="font-black text-slate-900 tabular-nums">{fmtInt(t.r.rr_projected / t.div)}</div>
                  </div>
                  <div className="text-right leading-snug">
                    <div className="font-semibold text-slate-500">vs full {cmpLabel}</div>
                    <div className="font-black tabular-nums" style={{ color: fullPct >= 0 ? UP : DOWN }}>
                      {fullPct >= 0 ? '▲ +' : '▼ '}
                      {fullPct}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Overall Performance White Card matching PowerPoint Slide 2 */}
          <div className="relative rounded-xl border border-slate-200 bg-white shadow-2xs px-3 py-2 flex flex-col justify-between overflow-hidden">
            <span
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ background: roundSame >= 0 ? UP : DOWN }}
            />
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-slate-600">
              <span>Overall Performance</span>
              <span className="text-[10px] font-bold text-slate-400 lowercase">{curLabel} vs {cmpLabel}</span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 my-auto">
              <div className="text-center min-w-0">
                <div className="font-black text-[20px] leading-snug tabular-nums" style={{ color: colorSame }}>
                  {roundSame >= 0 ? '▲ +' : '▼ '}
                  {roundSame}%
                </div>
                <div className="text-[10px] font-bold text-slate-600 mt-0.5 leading-snug">
                  Same {runRate.days_elapsed} days
                </div>
              </div>

              <div className="h-8 w-[1.5px] bg-slate-200 mx-0.5" />

              <div className="text-center min-w-0">
                <div className="font-black text-[20px] leading-snug tabular-nums" style={{ color: colorFull }}>
                  {roundFull >= 0 ? '▲ +' : '▼ '}
                  {roundFull}%
                </div>
                <div className="text-[10px] font-bold text-slate-600 mt-0.5 leading-snug">
                  Est. vs full {cmpLabel}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-1 text-[10px] text-center font-bold text-slate-400">
              Average of the 7 measures
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
