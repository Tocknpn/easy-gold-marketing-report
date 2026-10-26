'use client';

import React from 'react';
import { CompareRow, fmtInt, fmtPct, fmtSigned } from '@/lib/utils/dailyPerformance';

export const UP = '#059669';
export const DOWN = '#dc2626';

/** Green ▲ / red ▼ chip. Colour is always paired with arrow and sign. */
export function ChangeChip({ pct, size = 'md' }: { pct: number | null; size?: 'sm' | 'md' }) {
  if (pct === null) return <span className="text-slate-400 font-bold">–</span>;
  const up = pct > 0.05;
  const down = pct < -0.05;
  const color = up ? UP : down ? DOWN : '#64748b';
  const bg = up ? '#ecfdf5' : down ? '#fef2f2' : '#f1f5f9';
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-black tabular-nums whitespace-nowrap ${
        size === 'md' ? 'px-2 py-0.5 text-[0.95em]' : 'px-1.5 py-px text-[0.85em]'
      }`}
      style={{ color, background: bg }}
    >
      <span aria-hidden>{up ? '▲' : down ? '▼' : '•'}</span>
      {fmtPct(pct)}
    </span>
  );
}

interface HeroProps {
  title: string;
  value: number | null;
  yesterdayPct: number | null;
  accent: string;
  dateLabel?: string;
  /** Bigger number for blocks that have spare room */
  large?: boolean;
  stacked?: boolean;
}

/** Big "latest day" number with a plain-language comparison to yesterday. */
export function HeroNumber({ title, value, yesterdayPct, accent, dateLabel, large = false, stacked = false }: HeroProps) {
  if (stacked) {
    return (
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 text-[0.85em] font-black uppercase tracking-wide text-slate-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />
          <span>{title}</span>
        </div>
        <div className="font-black leading-none tabular-nums text-slate-900 my-1" style={{ fontSize: large ? '3.8em' : '2.6em' }}>
          {fmtInt(value)}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ChangeChip pct={yesterdayPct} size="md" />
          <span className="text-[0.8em] font-semibold text-slate-500">vs yesterday</span>
        </div>
        {dateLabel && <div className="text-[0.75em] font-semibold text-slate-400 mt-0.5">{dateLabel}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-1.5 text-[0.85em] font-black uppercase tracking-wide text-slate-500">
        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />
        <span>{title}</span>
      </div>
      <div className="flex items-baseline gap-2.5 flex-wrap my-0.5">
        <div className="font-black leading-none tabular-nums text-slate-900" style={{ fontSize: large ? '4.2em' : '2.4em' }}>
          {fmtInt(value)}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ChangeChip pct={yesterdayPct} size="sm" />
          <span className="text-[0.75em] font-semibold text-slate-500 whitespace-nowrap">vs yesterday</span>
        </div>
      </div>
      {dateLabel && <div className="text-[0.75em] font-semibold text-slate-400 mt-0.5">{dateLabel}</div>}
    </div>
  );
}

/** Yesterday + average of previous 3/7/14/21 days: value, % change, gap. */
export function ComparePanel({ rows, roomy = false }: { rows: CompareRow[]; roomy?: boolean }) {
  const pad = roomy ? 'py-[0.45em]' : 'py-[0.22em]';
  return (
    <div className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
      <table className="w-full text-[0.85em] tabular-nums border-collapse">
        <thead>
          <tr className="text-[0.78em] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
            <th className="text-left font-bold py-1 px-2">Compare with</th>
            <th className="text-right font-bold py-1 px-2">Number</th>
            <th className="text-right font-bold py-1 px-2">Change</th>
            <th className="text-right font-bold py-1 px-2">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => {
            const gapColor = r.gap === null ? '#64748b' : r.gap > 0 ? UP : r.gap < 0 ? DOWN : '#64748b';
            return (
              <tr key={r.label} className={i % 2 === 0 ? 'bg-slate-50/60 hover:bg-slate-50' : 'bg-white hover:bg-slate-50'}>
                <td className={`${pad} px-2 font-bold text-slate-700 whitespace-nowrap`}>{r.label}</td>
                <td className={`${pad} px-2 text-right font-semibold text-slate-800`}>{fmtInt(r.ref)}</td>
                <td className={`${pad} px-2 text-right`}>
                  <ChangeChip pct={r.pct} size="sm" />
                </td>
                <td className={`${pad} px-2 text-right font-black`} style={{ color: gapColor }}>
                  {fmtSigned(r.gap)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
