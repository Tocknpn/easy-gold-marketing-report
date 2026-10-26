'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import {
  DEFAULT_2026_TARGETS,
  calculateRunRateComparison,
} from '@/lib/constants/targetData';
import { MonthlyMarketingTarget, RunRateComparisonPayload } from '@/lib/types/target.types';
import { useLiveDailyMetrics } from '@/lib/hooks/useLiveDailyMetrics';
import {
  DailyMetricKey,
  addDays,
  buildCompare,
  buildSeries,
  fmtInt,
  formatLongDate,
  toDailyMap,
} from '@/lib/utils/dailyPerformance';
import { BRAND, GOLD, TrendChart } from './TrendChart';
import { ChangeChip, ComparePanel, DOWN, HeroNumber, UP } from './ComparePanel';

const IDLE_RESET_MS = 10 * 60 * 1000; // go back to the latest day if someone leaves an old day selected
const TEAL = '#0891b2';

/* ------------------------------------------------------------------ */
/* small layout helpers                                                */
/* ------------------------------------------------------------------ */
function Panel({
  no,
  title,
  hint,
  children,
}: {
  no: number;
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-[0_2px_14px_rgba(12,83,172,0.10)] border border-white/80 flex flex-col min-h-0 min-w-0 overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-[1em] pt-[0.7em] pb-[0.45em] border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-[1.7em] h-[1.7em] rounded-lg text-white text-[0.85em] font-black flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #2f7be0)` }}
          >
            {no}
          </span>
          <h2 className="text-[1.15em] font-black tracking-tight text-slate-900 truncate">{title}</h2>
        </div>
        {hint && <div className="text-[0.85em] font-bold text-slate-500 whitespace-nowrap">{hint}</div>}
      </header>
      <div className="flex-1 min-h-0 p-[0.8em]">{children}</div>
    </section>
  );
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

/* ------------------------------------------------------------------ */
/* Block 3: target hit                                                 */
/* ------------------------------------------------------------------ */
function TargetHitTable({ data }: { data: RunRateComparisonPayload }) {
  const mt = data.monthly_tracking;
  const ytd = data.ytd_tracking;
  const names: Record<string, string> = {
    nc: 'New Register',
    buy_tx: 'Buy Transactions',
    buy_wt: 'Buy Weight (g)',
    sell_tx: 'Sell Transactions',
    sell_wt: 'Sell Weight (g)',
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="grid grid-cols-[1.5fr_1.15fr_1.6fr_0.85fr_0.95fr] gap-x-[0.6em] px-1 pb-[0.4em] text-[0.8em] font-bold uppercase tracking-wide text-slate-400 shrink-0">
        <span>Metric</span>
        <span className="text-right">This month</span>
        <span>Hit so far</span>
        <span className="text-center">Month-end est.</span>
        <span className="text-center">Year to date</span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-between">
        {mt.metrics.map((m) => {
          const y = ytd.metrics.find((q) => q.id === m.id);
          const c = hitColor(m.est_target_hit_pct);
          const yc = y ? hitColor(y.est_year_end_pct) : '#64748b';
          return (
            <div
              key={m.id}
              className="grid grid-cols-[1.5fr_1.15fr_1.6fr_0.85fr_0.95fr] gap-x-[0.6em] items-center rounded-xl px-1 py-[0.35em] odd:bg-slate-50"
            >
              <div className="font-black text-slate-800 text-[1em] leading-tight">{names[m.id] ?? m.label}</div>

              <div className="text-right tabular-nums leading-tight">
                <div className="font-black text-slate-900">{fmtInt(m.actual)}</div>
                <div className="text-[0.8em] font-semibold text-slate-500">of {fmtInt(m.target)}</div>
              </div>

              <div className="relative h-[1.5em] rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-[0.5em] transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(12, m.current_pct))}%`,
                    background: `linear-gradient(90deg, ${c}cc, ${c})`,
                  }}
                >
                  <span className="text-white text-[0.8em] font-black tabular-nums">{m.current_pct}%</span>
                </div>
                {/* where the month "should" be today */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-slate-700/70"
                  style={{ left: `${Math.min(100, mt.days_gone_pct)}%` }}
                  title={`${mt.days_gone_pct}% of the month has passed`}
                />
              </div>

              <div className="text-center leading-tight">
                <div className="font-black tabular-nums text-[1.15em]" style={{ color: c }}>
                  {m.est_target_hit_pct}%
                </div>
                <div className="text-[0.75em] font-bold" style={{ color: c }}>
                  {hitLabel(m.est_target_hit_pct)}
                </div>
              </div>

              <div className="text-center leading-tight">
                <div className="font-black tabular-nums text-[1.15em]" style={{ color: yc }}>
                  {y ? `${y.current_pct}%` : '–'}
                </div>
                <div className="text-[0.75em] font-semibold text-slate-500 tabular-nums">
                  {y ? `Year-end est. ${y.est_year_end_pct}%` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-[0.4em] text-[0.8em] font-semibold text-slate-500 shrink-0">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-[2px] h-3 bg-slate-700/70" /> Line = how much of the month has passed ({mt.days_gone_pct}%)
        </span>
        <span className="inline-flex items-center gap-3 font-bold">
          <span style={{ color: UP }}>● 100%+ On track</span>
          <span style={{ color: BRAND }}>● 90–99% Close</span>
          <span style={{ color: DOWN }}>● under 90% Behind</span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block 4: MTD vs previous month                                      */
/* ------------------------------------------------------------------ */
function MtdVsLastMonth({ data }: { data: RunRateComparisonPayload }) {
  const cmp = data.comparison_month_label;
  const cur = data.current_month_label;

  const tiles = [
    { id: 'buy_weight_g', label: 'Buy Weight (Baht)', div: 15 },
    { id: 'buy_transactions', label: 'Buy Transactions', div: 1 },
    { id: 'sell_weight_g', label: 'Sell Weight (Baht)', div: 15 },
    { id: 'sell_transactions', label: 'Sell Transactions', div: 1 },
    { id: 'new_customer', label: 'New Register', div: 1 },
    { id: 'withdraw_refund', label: 'Withdraw + Refund', div: 1 },
    { id: 'total_transactions', label: 'Total Transactions', div: 1 },
  ]
    .map((t) => {
      const r = data.rows.find((q) => q.id === t.id);
      return r ? { ...t, r } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const avgSame = tiles.length
    ? tiles.reduce((s, t) => s + t.r.mom_same_pct, 0) / tiles.length
    : 0;
  const avgFull = tiles.length
    ? tiles.reduce((s, t) => s + t.r.mom_full_pct, 0) / tiles.length
    : 0;

  const roundSame = Math.round(avgSame);
  const roundFull = Math.round(avgFull);
  const colorSame = roundSame >= 0 ? UP : DOWN;
  const colorFull = roundFull >= 0 ? UP : DOWN;

  return (
    <div className="h-full grid grid-cols-4 grid-rows-2 gap-[0.6em] min-h-0">
      {tiles.map((t) => {
        const up = t.r.mom_same_pct > 0;
        const down = t.r.mom_same_pct < 0;
        const accent = up ? UP : down ? DOWN : '#94a3b8';
        const fullPct = t.r.mom_full_pct;
        return (
          <div
            key={t.id}
            className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-[0.8em] py-[0.55em] flex flex-col justify-between min-h-0 overflow-hidden"
          >
            <span className="absolute left-0 top-0 bottom-0 w-[0.3em]" style={{ background: accent }} />
            <div className="text-[0.85em] font-black text-slate-600 leading-tight">{t.label}</div>
            <div>
              <div className="font-black leading-none tabular-nums text-slate-900" style={{ fontSize: '2em' }}>
                {fmtInt(t.r.cur_mtd / t.div)}
              </div>
              <div className="flex items-center gap-1.5 mt-[0.25em] flex-wrap">
                <ChangeChip pct={t.r.mom_same_pct} size="sm" />
                <span className="text-[0.75em] font-semibold text-slate-500">
                  vs {cmp} same days ({fmtInt(t.r.comp_same_period / t.div)})
                </span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-[0.3em] flex items-center justify-between gap-1 text-[0.8em]">
              <div className="leading-tight">
                <div className="font-semibold text-slate-500">Expected {cur} total</div>
                <div className="font-black text-slate-800 tabular-nums">{fmtInt(t.r.rr_projected / t.div)}</div>
              </div>
              <div className="text-right leading-tight">
                <div className="font-semibold text-slate-500">vs full {cmp}</div>
                <div className="font-black tabular-nums" style={{ color: fullPct >= 0 ? UP : DOWN }}>
                  {fullPct >= 0 ? '▲ +' : '▼ '}
                  {fullPct}%
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* overall summary tile - white card with conditional green/red dual metric */}
      <div className="relative rounded-xl border border-slate-200 bg-white shadow-2xs px-[0.8em] py-[0.55em] flex flex-col justify-between min-h-0 overflow-hidden">
        <span
          className="absolute left-0 top-0 bottom-0 w-[0.3em]"
          style={{ background: roundSame >= 0 ? UP : DOWN }}
        />
        <div className="flex items-center justify-between text-[0.82em] font-black uppercase tracking-wide text-slate-600">
          <span>Overall Performance</span>
          <span className="text-[0.8em] font-bold text-slate-400 lowercase">{cur} vs {cmp}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 my-auto">
          {/* Left: Same days */}
          <div className="text-center min-w-0">
            <div className="font-black leading-none tabular-nums" style={{ fontSize: '1.75em', color: colorSame }}>
              {roundSame >= 0 ? '▲ +' : '▼ '}
              {roundSame}%
            </div>
            <div className="text-[0.72em] font-bold text-slate-600 mt-1 leading-tight truncate">
              Same {data.days_elapsed} days
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-[1.5px] bg-slate-200 mx-0.5" />

          {/* Right: Est. month-end vs full month */}
          <div className="text-center min-w-0">
            <div className="font-black leading-none tabular-nums" style={{ fontSize: '1.75em', color: colorFull }}>
              {roundFull >= 0 ? '▲ +' : '▼ '}
              {roundFull}%
            </div>
            <div className="text-[0.72em] font-bold text-slate-600 mt-1 leading-tight truncate">
              Est. vs full {cmp}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-[0.25em] text-[0.72em] text-center font-bold text-slate-400">
          Average of the 7 measures
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main screen                                                         */
/* ------------------------------------------------------------------ */
export function DailyPerformanceView({ onBack }: { onBack: () => void }) {
  const { rows, status, updatedAt, reload } = useLiveDailyMetrics();
  const [picked, setPicked] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // targets: same source as the Business Target report
  const targets: MonthlyMarketingTarget[] = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('easy_gold_2026_targets');
        if (saved) return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return DEFAULT_2026_TARGETS;
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Wall screen safety: an old day left selected goes back to the latest day.
  useEffect(() => {
    if (!picked) return;
    const t = setTimeout(() => setPicked(null), IDLE_RESET_MS);
    return () => clearTimeout(t);
  }, [picked]);

  const map = useMemo(() => toDailyMap(rows), [rows]);
  const firstDate = rows.length ? String(rows[0].date_id).slice(0, 10) : null;
  const latestDate = rows.length ? String(rows[rows.length - 1].date_id).slice(0, 10) : null;
  const selected = picked && map.has(picked) ? picked : latestDate;
  const isLatest = selected === latestDate;

  const series = useMemo(() => {
    if (!selected) return null;
    const keys: DailyMetricKey[] = ['new_customers', 'buy_transactions', 'sell_transactions'];
    const [nc, buy, sell] = keys.map((k) => ({
      points: buildSeries(map, selected, k, 30),
      cmp: buildCompare(map, selected, k),
    }));
    return { nc, buy, sell };
  }, [map, selected]);

  const runRate = useMemo(() => {
    if (!selected) return null;
    const [y, m, d] = selected.split('-').map(Number);
    const compYear = m === 1 ? y - 1 : y;
    const compMonth = m === 1 ? 12 : m - 1;
    return calculateRunRateComparison(y, m, compYear, compMonth, d, targets, rows);
  }, [selected, targets, rows]);

  const step = (n: number) => {
    if (!selected || !firstDate || !latestDate) return;
    let next = addDays(selected, n);
    // skip days without data
    let guard = 0;
    while (!map.has(next) && guard < 14) {
      next = addDays(next, n > 0 ? 1 : -1);
      guard++;
    }
    if (!map.has(next) || next < firstDate || next > latestDate) return;
    setPicked(next === latestDate ? null : next);
  };

  const statusText =
    status === 'live' ? 'Live' : status === 'polling' ? 'Auto-refresh' : status === 'loading' ? 'Loading…' : 'Connection problem';
  const statusColor = status === 'live' || status === 'polling' ? '#34d399' : status === 'loading' ? '#fbbf24' : '#f87171';

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col select-none text-slate-900"
      style={{
        fontSize: 'clamp(9px, min(0.8vw, 1.45vh), 21px)',
        background: 'linear-gradient(160deg, #dfe9f8 0%, #eef3fb 45%, #e3edf9 100%)',
      }}
    >
      {/* ---------- slim top bar: the only chrome on this screen ---------- */}
      <div
        className="flex items-center justify-between gap-4 px-[1em] py-[0.55em] text-white shrink-0"
        style={{ background: `linear-gradient(90deg, #0a3f87 0%, ${BRAND} 55%, #2f7be0 100%)` }}
      >
        <div className="flex items-center gap-[0.9em] min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors px-[0.8em] py-[0.35em] font-bold cursor-pointer"
            title="Back to other reports"
          >
            <ArrowLeft className="w-[1.2em] h-[1.2em]" />
            <span>Back</span>
          </button>
          <h1 className="text-[1.5em] font-black tracking-tight whitespace-nowrap">
            Daily Performance <span style={{ color: GOLD }}>MKT</span>
          </h1>
        </div>

        {/* day picker */}
        <div className="flex items-center gap-[0.5em]">
          <button
            onClick={() => step(-1)}
            className="rounded-lg bg-white/15 hover:bg-white/25 p-[0.35em] cursor-pointer disabled:opacity-30"
            disabled={!selected || !firstDate || selected <= firstDate}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-[1.3em] h-[1.3em]" />
          </button>
          <div className="text-center leading-tight min-w-[14em]">
            <div className="text-[1.25em] font-black">{selected ? formatLongDate(selected) : '–'}</div>
            <div className="text-[0.8em] font-semibold text-white/80">{isLatest ? 'Latest day' : 'Viewing an earlier day'}</div>
          </div>
          <button
            onClick={() => step(1)}
            className="rounded-lg bg-white/15 hover:bg-white/25 p-[0.35em] cursor-pointer disabled:opacity-30"
            disabled={!selected || !latestDate || selected >= latestDate}
            aria-label="Next day"
          >
            <ChevronRight className="w-[1.3em] h-[1.3em]" />
          </button>
          <input
            type="date"
            value={selected ?? ''}
            min={firstDate ?? undefined}
            max={latestDate ?? undefined}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (map.has(v)) setPicked(v === latestDate ? null : v);
            }}
            className="rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold px-[0.6em] py-[0.3em] [color-scheme:dark] cursor-pointer"
            aria-label="Pick a day"
          />
          <button
            onClick={() => setPicked(null)}
            disabled={isLatest}
            className="rounded-lg px-[0.8em] py-[0.35em] font-black cursor-pointer disabled:opacity-40"
            style={{ background: GOLD, color: '#1b2a41' }}
          >
            Latest
          </button>
        </div>

        <div className="flex items-center gap-[0.9em] text-right shrink-0">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: statusColor }} />
            <span>{statusText}</span>
          </div>
          <div className="text-[1.6em] font-black tabular-nums leading-none">
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={() => reload()}
            className="rounded-lg bg-white/15 hover:bg-white/25 p-[0.4em] cursor-pointer"
            title="Refresh now"
            aria-label="Refresh now"
          >
            <RefreshCw className="w-[1.1em] h-[1.1em]" />
          </button>
        </div>
      </div>

      {/* ---------- 4 blocks, one screen, no scrolling ---------- */}
      {!series || !runRate || !selected ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 font-bold text-[1.4em]">
          {status === 'error' ? 'Cannot load data. Retrying automatically…' : 'Loading latest performance…'}
        </div>
      ) : (
        <main className="flex-1 min-h-0 grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] grid-rows-[minmax(0,1.12fr)_minmax(0,0.88fr)] gap-[0.7em] p-[0.7em]">
          {/* 1. New register */}
          <Panel no={1} title="New Register" hint="Last 30 days">
            <div className="h-full flex flex-col justify-between min-h-0">
              {/* Top row: Left Hero Card, Right Compare table */}
              <div className="grid grid-cols-[auto_1fr] gap-3 items-stretch shrink-0 pb-1.5">
                <div className="rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 via-white to-slate-50/40 p-[0.65em] shadow-2xs flex flex-col justify-center min-w-[10.5em]">
                  <HeroNumber
                    title="New Register"
                    value={series.nc.cmp.latest}
                    yesterdayPct={series.nc.cmp.rows[0].pct}
                    accent={TEAL}
                    stacked
                    large
                  />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <ComparePanel rows={series.nc.cmp.rows} />
                </div>
              </div>
              {/* Bottom: full-width daily trend chart */}
              <div className="flex-1 min-h-0 pt-1">
                <TrendChart series={[{ name: 'New Register', color: TEAL, points: series.nc.points, area: true }]} />
              </div>
            </div>
          </Panel>

          {/* 2. Buy & Sell */}
          <Panel no={2} title="Buy & Sell Transactions" hint="Last 30 days">
            <div className="h-full grid grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] gap-[0.8em] min-h-0">
              <div className="flex flex-col justify-between min-h-0 gap-[0.55em]">
                {/* Buy section card container */}
                <div className="rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-[0.55em] space-y-[0.35em] shadow-2xs">
                  <div className="px-0.5">
                    <HeroNumber
                      title="Buy"
                      value={series.buy.cmp.latest}
                      yesterdayPct={series.buy.cmp.rows[0].pct}
                      accent={BRAND}
                    />
                  </div>
                  <ComparePanel rows={series.buy.cmp.rows} />
                </div>

                {/* Sell section card container */}
                <div className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-[0.55em] space-y-[0.35em] shadow-2xs">
                  <div className="px-0.5">
                    <HeroNumber
                      title="Sell"
                      value={series.sell.cmp.latest}
                      yesterdayPct={series.sell.cmp.rows[0].pct}
                      accent={GOLD}
                    />
                  </div>
                  <ComparePanel rows={series.sell.cmp.rows} />
                </div>
              </div>
              <div className="min-h-0">
                <TrendChart
                  legend
                  series={[
                    { name: 'Buy', color: BRAND, points: series.buy.points, area: true },
                    { name: 'Sell', color: GOLD, points: series.sell.points },
                  ]}
                />
              </div>
            </div>
          </Panel>

          {/* 3. Target hit */}
          <Panel
            no={3}
            title={`Target Hit · ${runRate.current_month_label} & Year to Date`}
            hint={`Day ${runRate.days_elapsed}/${runRate.total_days_in_month}`}
          >
            <TargetHitTable data={runRate} />
          </Panel>

          {/* 4. MTD vs previous month */}
          <Panel
            no={4}
            title={`${runRate.current_month_label} So Far vs ${runRate.comparison_month_label}`}
            hint={`Same ${runRate.days_elapsed} days compared`}
          >
            <MtdVsLastMonth data={runRate} />
          </Panel>
        </main>
      )}
    </div>
  );
}
