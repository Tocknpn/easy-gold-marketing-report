'use client';

import React from 'react';
import { RunRateComparisonPayload, RunRateRowData } from '@/lib/types/target.types';
import { Table2, ArrowUpRight, ArrowDownRight, Minus, HelpCircle } from 'lucide-react';

interface ClassicRunRateTablesProps {
  data: RunRateComparisonPayload;
}

export function ClassicRunRateTables({ data }: ClassicRunRateTablesProps) {
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

  // Format cell value
  const formatCell = (val: number | undefined, format?: 'number' | 'decimal' | 'lak') => {
    if (val === undefined || val === null) return '-';
    if (format === 'lak') {
      return val.toLocaleString();
    }
    return val.toLocaleString();
  };

  // Variance badge styling (matching soft Excel pastel colors in Image 2)
  const renderVarianceCell = (val: number, isPercent = false) => {
    const isPositive = val > 0;
    const isNegative = val < 0;
    const isZero = val === 0;

    let bgClass = 'bg-slate-50 text-slate-700';
    if (isPositive) {
      bgClass = 'bg-[#c6efce] text-[#006100]'; // Soft Excel pastel green
    } else if (isNegative) {
      bgClass = 'bg-[#ffc7ce] text-[#9c0006]'; // Soft Excel pastel red
    }

    return (
      <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${bgClass}`}>
        {isPositive ? `+${val}` : val}
        {isPercent ? '%' : ''}
      </span>
    );
  };

  // Target Achievement Badge (soft pastel red if behind pace, soft pastel green if ahead)
  const renderVsTargetCell = (pct: number | undefined, benchmarkPct: number) => {
    if (pct === undefined) return <span className="text-slate-400 font-mono">-</span>;

    const isAhead = pct >= benchmarkPct;
    const bgClass = isAhead
      ? 'bg-[#c6efce] text-[#006100]'
      : 'bg-[#ffc7ce] text-[#9c0006]';

    return (
      <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${bgClass}`}>
        {pct}%
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Dual Table Container: Responsive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* ==================================================================== */}
        {/* TABLE 1: MONTHLY RUN RATE (Full Month Compare + Monthly Target)       */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-300/90 shadow-sm overflow-hidden flex flex-col">
          {/* Header Bar matching Image 2 Blue Ribbon */}
          <div className="bg-[#0c4ca3] text-white p-3 px-4 flex items-center justify-between border-b border-blue-900">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h3 className="text-sm font-black tracking-wide uppercase">Monthly Run Rate</h3>
              </div>
              <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                Current MTD Run-Rate projected landing vs {comparison_month_label}&apos;26 Full Month &amp; Targets
              </p>
            </div>

            {/* Time Elapsed Slices */}
            <div className="flex items-center divide-x divide-blue-400/40 bg-blue-950/40 rounded-xl px-3 py-1 border border-blue-400/30 text-center">
              <div className="px-2">
                <span className="block text-[9px] uppercase font-bold text-blue-200">Days</span>
                <span className="font-mono font-black text-xs text-white">{days_elapsed}</span>
              </div>
              <div className="px-2">
                <span className="block text-[9px] uppercase font-bold text-blue-200">MoM Days</span>
                <span className="font-mono font-black text-xs text-white">{total_days_in_month}</span>
              </div>
              <div className="px-2">
                <span className="block text-[9px] uppercase font-bold text-amber-300">Time Gone</span>
                <span className="font-mono font-black text-xs text-amber-300">{time_gone_pct}%</span>
              </div>
            </div>
          </div>

          {/* Table 1 Data Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse select-text">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black text-[11px]">
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[170px]">Metric</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right bg-blue-50/50">
                    2026<br />
                    <span className="text-[#0c4ca3]">{comparison_month_label} (Full)</span>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right bg-blue-50/50">
                    2026<br />
                    <span className="text-[#0c4ca3]">{current_month_label} (MTD)</span>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right bg-amber-50/60 font-black text-slate-900">
                    RR<br />
                    <span className="text-amber-800 font-medium text-[9px]">Proj.</span>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right">Diff.</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right">MoM</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right bg-slate-50">Monthly Target</th>
                  <th className="py-2.5 px-2 text-right bg-slate-50">Vs Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr 
                    key={`t1-${row.id}`} 
                    className={`hover:bg-blue-50/30 transition-colors ${
                      row.id === 'total_transactions' ? 'bg-slate-50/80 font-black' : ''
                    }`}
                  >
                    <td className={`py-2 px-3 border-r border-slate-200 text-slate-900 ${
                      row.indent ? 'pl-6 italic text-slate-700' : 'font-bold'
                    }`}>
                      {row.label}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-medium text-slate-700">
                      {formatCell(row.comp_full_month, row.format)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-blue-50/20">
                      {formatCell(row.cur_mtd, row.format)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-black text-slate-900 bg-amber-50/30">
                      {formatCell(row.rr_projected, row.format)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right">
                      {renderVarianceCell(row.diff_full, false)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right">
                      {renderVarianceCell(row.mom_full_pct, true)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800 bg-slate-50/60">
                      {formatCell(row.target_val, row.format)}
                    </td>
                    <td className="py-2 px-2 text-right bg-slate-50/60">
                      {renderVsTargetCell(row.vs_target_pct, 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#c6efce]/40 border-t-2 border-slate-300 font-black text-slate-900 text-xs">
                <tr>
                  <td colSpan={5} className="py-2 px-3 border-r border-slate-300 text-right uppercase tracking-wider text-[11px]">
                    Avg. %MoM
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-right">
                    {renderVarianceCell(table1_avg_mom, true)}
                  </td>
                  <td colSpan={2} className="py-2 px-3 text-slate-500 font-normal italic text-[10px]">
                    Run-Rate projected achievement vs board targets
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* TABLE 2: MONTHLY RUN RATE (Same Period Compare - 1 to 15 Days)       */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-300/90 shadow-sm overflow-hidden flex flex-col">
          {/* Header Bar matching Image 2 Blue Ribbon */}
          <div className="bg-[#0c4ca3] text-white p-3 px-4 flex items-center justify-between border-b border-blue-900">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <h3 className="text-sm font-black tracking-wide uppercase">Monthly Run Rate</h3>
              </div>
              <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                (Same period compare) — Identical Day 1 to {days_elapsed} pace comparison &amp; Target Progress
              </p>
            </div>

            {/* Time Elapsed Slices */}
            <div className="flex items-center divide-x divide-blue-400/40 bg-blue-950/40 rounded-xl px-3 py-1 border border-blue-400/30 text-center">
              <div className="px-2">
                <span className="block text-[9px] uppercase font-bold text-blue-200">Days</span>
                <span className="font-mono font-black text-xs text-white">{days_elapsed}</span>
              </div>
              <div className="px-2">
                <span className="block text-[9px] uppercase font-bold text-blue-200">MoM Days</span>
                <span className="font-mono font-black text-xs text-white">{total_days_in_month}</span>
              </div>
              <div className="px-2">
                <span className="block text-[9px] uppercase font-bold text-amber-300">Time Gone</span>
                <span className="font-mono font-black text-xs text-amber-300">{time_gone_pct}%</span>
              </div>
            </div>
          </div>

          {/* Table 2 Data Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse select-text">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black text-[11px]">
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[170px]">Metric</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right bg-blue-50/50">
                    2026<br />
                    <span className="text-[#0c4ca3]">{comparison_month_label} (1-{days_elapsed})</span>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right bg-blue-50/50">
                    2026<br />
                    <span className="text-[#0c4ca3]">{current_month_label} (1-{days_elapsed})</span>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right">Diff</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right">%change</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-right bg-slate-50">Monthly Target</th>
                  <th className="py-2.5 px-2 text-right bg-slate-50">Vs Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr 
                    key={`t2-${row.id}`} 
                    className={`hover:bg-blue-50/30 transition-colors ${
                      row.id === 'total_transactions' ? 'bg-slate-50/80 font-black' : ''
                    }`}
                  >
                    <td className={`py-2 px-3 border-r border-slate-200 text-slate-900 ${
                      row.indent ? 'pl-6 italic text-slate-700' : 'font-bold'
                    }`}>
                      {row.label}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-medium text-slate-700">
                      {formatCell(row.comp_same_period, row.format)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-blue-50/20">
                      {formatCell(row.cur_same_period, row.format)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right">
                      {renderVarianceCell(row.diff_same, false)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right">
                      {renderVarianceCell(row.mom_same_pct, true)}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800 bg-slate-50/60">
                      {formatCell(row.target_val, row.format)}
                    </td>
                    <td className="py-2 px-2 text-right bg-slate-50/60">
                      {renderVsTargetCell(row.vs_target_same_pct, time_gone_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#c6efce]/40 border-t-2 border-slate-300 font-black text-slate-900 text-xs">
                <tr>
                  <td colSpan={4} className="py-2 px-3 border-r border-slate-300 text-right uppercase tracking-wider text-[11px]">
                    Avg. %MoM
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-right">
                    {renderVarianceCell(table2_avg_mom, true)}
                  </td>
                  <td colSpan={2} className="py-2 px-3 text-slate-500 font-normal italic text-[10px]">
                    Current MTD progress vs Month Elapsed ({time_gone_pct}%)
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
