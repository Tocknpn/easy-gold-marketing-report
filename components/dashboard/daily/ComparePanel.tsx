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
      <div className="flex flex-col min-w-0 pr-3">
        <div className="flex items-center gap-1.5 text-[0.85em] font-black uppercase tracking-wide text-slate-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />
          <span>{title}</span>
        </div>
        <div className="font-black leading-none tabular-nums text-slate-900 my-1" style={{ fontSize: large ? '3.8em' : '2.7em' }}>
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
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[0.9em] font-black uppercase tracking-wide text-slate-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
          {title}
        </div>
        <div className="font-black leading-none tabular-nums text-slate-900" style={{ fontSize: large ? '4.6em' : '2.7em' }}>
          {fmtInt(value)}
        </div>
        {dateLabel && <div className="text-[0.8em] font-semibold text-slate-500 mt-0.5">{dateLabel}</div>}
      </div>
      <div className="text-right pb-1 shrink-0">
        <ChangeChip pct={yesterdayPct} />
        <div className="text-[0.8em] font-semibold text-slate-500 mt-0.5">vs yesterday</div>
      </div>
    </div>
  );
}

/** Yesterday + average of previous 3/7/14/21 days: value, % change, gap. */
export function ComparePanel({ rows, roomy = false }: { rows: CompareRow[]; roomy?: boolean }) {
  const pad = roomy ? 'py-[0.6em]' : 'py-[0.28em]';
  return (
    <table className="w-full text-[0.9em] tabular-nums border-separate border-spacing-0">
      <thead>
        <tr className="text-[0.85em] uppercase tracking-wide text-slate-400">
          <th className="text-left font-bold pb-1">Compare with</th>
          <th className="text-right font-bold pb-1">Number</th>
          <th className="text-right font-bold pb-1">Change</th>
          <th className="text-right font-bold pb-1">Gap</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const gapColor = r.gap === null ? '#64748b' : r.gap > 0 ? UP : r.gap < 0 ? DOWN : '#64748b';
          return (
            <tr key={r.label} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
              <td className={`${pad} pl-1.5 rounded-l-md font-bold text-slate-700 whitespace-nowrap`}>{r.label}</td>
              <td className={`${pad} text-right font-semibold text-slate-800`}>{fmtInt(r.ref)}</td>
              <td className={`${pad} text-right`}>
                <ChangeChip pct={r.pct} size="sm" />
              </td>
              <td className={`${pad} pr-1.5 rounded-r-md text-right font-black`} style={{ color: gapColor }}>
                {fmtSigned(r.gap)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
