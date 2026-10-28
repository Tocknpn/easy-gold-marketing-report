'use client';

import React from 'react';
import { RunRateComparisonPayload } from '@/lib/types/target.types';

interface ClassicRunRateTablesProps {
  data: RunRateComparisonPayload;
  curYear?: number;
  compYear?: number;
  isYoY?: boolean;
  compact?: boolean;
}

export function ClassicRunRateTables({ data, curYear = 2026, compYear = 2026, isYoY = false, compact = false }: ClassicRunRateTablesProps) {
  const {
    current_month_label,
    comparison_month_label,
    days_elapsed,
    total_days_in_month,
    time_gone_pct,
    rows,
    table1_avg_mom,
    table2_avg_mom,
  } = data;

  const cellPad = compact ? 'py-1 px-2.5' : 'py-2 px-3';
  const numCellPad = compact ? 'py-1 px-2' : 'py-2 px-2';
  const thPad = compact ? 'py-1 px-2.5' : 'py-2.5 px-3';
  const thNumPad = compact ? 'py-1 px-2' : 'py-2.5 px-2';
  const headerBarPad = compact ? 'py-1.5 px-3' : 'p-3 px-4';

  // Format cell value
  const formatCell = (val: number | undefined, format?: 'number' | 'decimal' | 'lak') => {
    if (val === undefined || val === null) return '-';
    return val.toLocaleString();
  };

  // Modern institutional financial variance badge styling with comma formatting for Diff
  const renderVarianceCell = (val: number, isPercent = false) => {
    const isPositive = val > 0;
    const isNegative = val < 0;

    let badgeClass = 'bg-slate-50 text-slate-600 border border-slate-200';
    if (isPositive) {
      badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    } else if (isNegative) {
      badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200/80';
    }

    const formatted = isPercent
      ? (isPositive ? `+${val}%` : `${val}%`)
      : (isPositive ? `+${val.toLocaleString()}` : val.toLocaleString());

    return (
      <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[11px] tabular-nums ${badgeClass}`}>
        {formatted}
      </span>
    );
  };

  // Row background color per section (light bright green for Buy, light bright red for Sell)
  const getRowStyle = (section?: string, id?: string) => {
    if (section === 'buy') {
      return 'bg-emerald-50/40 hover:bg-emerald-100/50 border-l-[3px] border-l-emerald-500';
    }
    if (section === 'sell') {
      return 'bg-rose-50/40 hover:bg-rose-100/50 border-l-[3px] border-l-rose-500';
    }
    if (id === 'total_transactions') {
      return 'bg-slate-100/70 hover:bg-slate-200/60 font-black border-l-[3px] border-l-slate-400';
    }
    return 'bg-white hover:bg-slate-50 border-l-[3px] border-l-transparent';
  };

  return (
    <div className="w-full space-y-6">
      {/* Dual Table Container: Responsive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        
        {/* ==================================================================== */}
        {/* TABLE 1: MONTHLY RUN RATE (Full Month Compare)                        */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Header Bar */}
          <div className={`bg-[#0b192c] text-white ${headerBarPad} flex items-center justify-between border-b border-slate-800`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d4a017]"></span>
                <h3 className="text-sm font-black tracking-wide uppercase text-white">Monthly Run Rate</h3>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Current MTD Run-Rate projected landing vs {comparison_month_label}&apos;{String(compYear).slice(-2)} Full Month
              </p>
            </div>

            {/* Time Elapsed Slices */}
            <div className="flex items-center divide-x divide-slate-700 bg-slate-900/90 rounded-xl px-2.5 py-1 border border-slate-700 text-center">
              <div className="px-1.5">
                <span className="block text-[9px] uppercase font-bold text-slate-400">Days</span>
                <span className="font-mono font-black text-xs text-white">{days_elapsed}</span>
              </div>
              <div className="px-1.5">
                <span className="block text-[9px] uppercase font-bold text-slate-400">Total</span>
                <span className="font-mono font-black text-xs text-white">{total_days_in_month}</span>
              </div>
              <div className="px-1.5">
                <span className="block text-[9px] uppercase font-bold text-[#d4a017]">Time Gone</span>
                <span className="font-mono font-black text-xs text-[#d4a017]">{time_gone_pct}%</span>
              </div>
            </div>
          </div>

          {/* Table 1 Data Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse select-text">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <th className={`${thPad} border-r border-slate-200 min-w-[140px]`}>Metric</th>
                  <th className={`${thNumPad} border-r border-slate-200 text-right`}>
                    {compYear}<br />
                    <span className="text-slate-900 font-black">{comparison_month_label} (Full)</span>
                  </th>
                  <th className={`${thNumPad} border-r border-slate-200 text-right bg-blue-50/40`}>
                    {curYear}<br />
                    <span className="text-[#0c4ca3] font-black">{current_month_label} (MTD)</span>
                  </th>
                  <th className={`${thNumPad} border-r border-slate-200 text-right bg-amber-50/40 font-black text-slate-900`}>
                    RR<br />
                    <span className="text-amber-800 font-medium text-[9px]">Proj.</span>
                  </th>
                  <th className={`${thNumPad} border-r border-slate-200 text-right`}>Diff.</th>
                  <th className={`${thNumPad} text-right`}>{isYoY ? 'YoY' : 'MoM'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr 
                    key={`t1-${row.id}`} 
                    className={`transition-colors ${getRowStyle(row.section, row.id)}`}
                  >
                    <td className={`${cellPad} border-r border-slate-200 text-slate-900 ${
                      row.indent ? 'pl-5 text-slate-700' : 'font-extrabold'
                    }`}>
                      {row.label}
                    </td>
                    <td className={`${numCellPad} border-r border-slate-200 text-right font-mono font-medium text-slate-700 tabular-nums`}>
                      {formatCell(row.comp_full_month, row.format)}
                    </td>
                    <td className={`${numCellPad} border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-blue-50/20 tabular-nums`}>
                      {formatCell(row.cur_mtd, row.format)}
                    </td>
                    <td className={`${numCellPad} border-r border-slate-200 text-right font-mono font-black text-slate-900 bg-amber-50/30 tabular-nums`}>
                      {formatCell(row.rr_projected, row.format)}
                    </td>
                    <td className={`${numCellPad} border-r border-slate-200 text-right`}>
                      {renderVarianceCell(row.diff_full, false)}
                    </td>
                    <td className={`${numCellPad} text-right`}>
                      {renderVarianceCell(row.mom_full_pct, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-bold text-slate-900 text-xs">
                <tr>
                  <td colSpan={5} className={`${cellPad} border-r border-slate-200 text-right uppercase tracking-wider text-[11px] text-slate-700`}>
                    Avg. %MoM
                  </td>
                  <td className={`${numCellPad} text-right`}>
                    {renderVarianceCell(table1_avg_mom, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* TABLE 2: MONTHLY RUN RATE (Same Period Compare - 1 to N Days)         */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Header Bar */}
          <div className={`bg-[#0b192c] text-white ${headerBarPad} flex items-center justify-between border-b border-slate-800`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <h3 className="text-sm font-black tracking-wide uppercase text-white">Monthly Run Rate</h3>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                (Same Period Compare) — Day 1 to {days_elapsed} pace comparison
              </p>
            </div>

            {/* Time Elapsed Slices */}
            <div className="flex items-center divide-x divide-slate-700 bg-slate-900/90 rounded-xl px-2.5 py-1 border border-slate-700 text-center">
              <div className="px-1.5">
                <span className="block text-[9px] uppercase font-bold text-slate-400">Days</span>
                <span className="font-mono font-black text-xs text-white">{days_elapsed}</span>
              </div>
              <div className="px-1.5">
                <span className="block text-[9px] uppercase font-bold text-slate-400">Total</span>
                <span className="font-mono font-black text-xs text-white">{total_days_in_month}</span>
              </div>
              <div className="px-1.5">
                <span className="block text-[9px] uppercase font-bold text-[#d4a017]">Time Gone</span>
                <span className="font-mono font-black text-xs text-[#d4a017]">{time_gone_pct}%</span>
              </div>
            </div>
          </div>

          {/* Table 2 Data Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse select-text">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <th className={`${thPad} border-r border-slate-200 min-w-[140px]`}>Metric</th>
                  <th className={`${thNumPad} border-r border-slate-200 text-right`}>
                    {compYear}<br />
                    <span className="text-slate-900 font-black">{comparison_month_label} (1-{days_elapsed})</span>
                  </th>
                  <th className={`${thNumPad} border-r border-slate-200 text-right bg-blue-50/40`}>
                    {curYear}<br />
                    <span className="text-[#0c4ca3] font-black">{current_month_label} (1-{days_elapsed})</span>
                  </th>
                  <th className={`${thNumPad} border-r border-slate-200 text-right`}>Diff</th>
                  <th className={`${thNumPad} text-right`}>%Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr 
                    key={`t2-${row.id}`} 
                    className={`transition-colors ${getRowStyle(row.section, row.id)}`}
                  >
                    <td className={`${cellPad} border-r border-slate-200 text-slate-900 ${
                      row.indent ? 'pl-5 text-slate-700' : 'font-extrabold'
                    }`}>
                      {row.label}
                    </td>
                    <td className={`${numCellPad} border-r border-slate-200 text-right font-mono font-medium text-slate-700 tabular-nums`}>
                      {formatCell(row.comp_same_period, row.format)}
                    </td>
                    <td className={`${numCellPad} border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-blue-50/20 tabular-nums`}>
                      {formatCell(row.cur_same_period, row.format)}
                    </td>
                    <td className={`${numCellPad} border-r border-slate-200 text-right`}>
                      {renderVarianceCell(row.diff_same, false)}
                    </td>
                    <td className={`${numCellPad} text-right`}>
                      {renderVarianceCell(row.mom_same_pct, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-bold text-slate-900 text-xs">
                <tr>
                  <td colSpan={4} className={`${cellPad} border-r border-slate-200 text-right uppercase tracking-wider text-[11px] text-slate-700`}>
                    Avg. %MoM
                  </td>
                  <td className={`${numCellPad} text-right`}>
                    {renderVarianceCell(table2_avg_mom, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
