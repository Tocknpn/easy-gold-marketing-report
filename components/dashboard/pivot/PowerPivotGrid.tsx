'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  FileCode2,
  Clock,
} from 'lucide-react';
import {
  PowerPivotConfig,
  PowerPivotResult,
  DIMENSIONS,
  PAGE_SIZE_CHOICES,
  getAllMeasures,
  formatMeasureValue,
} from '@/lib/types/powerPivot.types';
import { indexCells, rowKeyOf } from '@/lib/pivot/powerPivotApi';

interface GridProps {
  result: PowerPivotResult;
  /** config that PRODUCED the result (not the one being edited) */
  config: PowerPivotConfig;
  loading: boolean;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onSort: (by: string) => void;
}

export function PowerPivotGrid({ result, config, loading, onPage, onPageSize, onSort }: GridProps) {
  const [showSql, setShowSql] = useState(false);
  const [customSize, setCustomSize] = useState('');
  const [jump, setJump] = useState('');

  const measures = useMemo(() => getAllMeasures(config.customMeasures), [config.customMeasures]);
  const mDefs = result.values.map((id) => measures.find((m) => m.id === id));
  const dimCount = Math.max(1, result.rows_dims.length);
  const dimLabels = result.rows_dims.length
    ? result.rows_dims.map((d) => DIMENSIONS.find((x) => x.id === d)?.label || d)
    : ['Total'];
  const hasCols = !!result.column_dim && result.columns.length > 0;
  const colDimLabel = DIMENSIONS.find((d) => d.id === result.column_dim)?.label || result.column_dim || '';

  const cellIndex = useMemo(() => indexCells(result), [result]);
  const colTotalMap = useMemo(() => {
    const m = new Map<string, Record<string, any>>();
    (result.col_totals || []).forEach((c) => m.set(String(c.c1 ?? ''), c));
    return m;
  }, [result]);

  // data-bar scale on the first value (row totals)
  const maxFirst = useMemo(
    () => Math.max(0, ...result.rows.map((r) => Math.abs(Number(r.m1) || 0))),
    [result]
  );

  const totalPages = Math.max(1, Math.ceil(result.total_rows / result.page_size));
  const from = result.total_rows === 0 ? 0 : (result.page - 1) * result.page_size + 1;
  const to = Math.min(result.total_rows, result.page * result.page_size);

  const fmt = (v: unknown, i: number) => formatMeasureValue(v, mDefs[i]?.format || 'dec2');

  const sortIcon = (by: string) =>
    config.sortBy === by ? (
      config.sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
    ) : null;

  const th = 'px-3 py-2 text-[11px] font-black uppercase tracking-wide border-r border-slate-300/70 whitespace-nowrap';

  const renderMeasureHeads = (keyPrefix: string) =>
    mDefs.map((m, i) => (
      <th
        key={`${keyPrefix}-${i}`}
        onClick={() => onSort(result.values[i])}
        className={`${th} text-right cursor-pointer hover:bg-[#9cc4e0]/60 select-none`}
        title={`Sort by ${m?.label || result.values[i]}`}
      >
        <span className="inline-flex items-center gap-1 justify-end">
          {m?.label || result.values[i]} {sortIcon(result.values[i])}
        </span>
      </th>
    ));

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
      {/* Status bar (SQL editor style) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900 text-slate-200 text-[11px]">
        <div className="flex items-center gap-3 flex-wrap font-mono">
          <span className="text-emerald-400 font-bold">
            Rows {from.toLocaleString()} - {to.toLocaleString()} of {result.total_rows.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <Clock className="w-3 h-3" /> {Number(result.elapsed_ms).toLocaleString()} ms
          </span>
          <span className="text-slate-400">
            {dimLabels.join(' > ')}
            {hasCols ? `  x  ${colDimLabel}` : ''}
          </span>
        </div>
        <button
          onClick={() => setShowSql(!showSql)}
          className="flex items-center gap-1 font-bold text-amber-300 hover:text-amber-200"
        >
          <FileCode2 className="w-3.5 h-3.5" /> {showSql ? 'Hide' : 'Show'} generated SQL
        </button>
      </div>
      {showSql && (
        <pre className="text-[10px] font-mono text-emerald-300 bg-slate-950 p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
          {result.sql_trace}
        </pre>
      )}

      {/* Grid */}
      <div className={`overflow-auto max-h-[60vh] transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-[#b9d7ea] text-slate-900">
            {hasCols && (
              <tr className="border-b border-slate-300">
                <th colSpan={dimCount} className={`${th} text-left bg-[#a9cde4]`}>
                  {colDimLabel} →
                </th>
                {result.columns.map((c) => (
                  <th key={c} colSpan={mDefs.length} className={`${th} text-center bg-[#a9cde4]`}>
                    {c}
                  </th>
                ))}
                <th colSpan={mDefs.length} className={`${th} text-center bg-[#e5a812]/70`}>
                  Grand Total
                </th>
              </tr>
            )}
            <tr className="border-b-2 border-slate-400">
              {dimLabels.map((l, i) => (
                <th
                  key={l}
                  onClick={() => onSort('label')}
                  className={`${th} text-left cursor-pointer hover:bg-[#9cc4e0]/60 ${i === 0 ? 'sticky left-0 z-30 bg-[#b9d7ea]' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {l} {sortIcon('label')}
                  </span>
                </th>
              ))}
              {hasCols && result.columns.map((c) => renderMeasureHeads(`c-${c}`))}
              {renderMeasureHeads('tot')}
            </tr>
          </thead>

          <tbody className="font-mono">
            {result.rows.length === 0 && (
              <tr>
                <td
                  colSpan={dimCount + mDefs.length * (hasCols ? result.columns.length + 1 : 1)}
                  className="text-center py-10 text-slate-400 font-sans"
                >
                  No rows match these filters.
                </td>
              </tr>
            )}
            {result.rows.map((row, ri) => {
              const key = rowKeyOf(row, dimCount);
              const cellMap = cellIndex.get(key);
              return (
                <tr key={key + ri} className="border-b border-slate-200 hover:bg-amber-50/50 odd:bg-white even:bg-slate-50/40">
                  {Array.from({ length: dimCount }, (_, d) => (
                    <td
                      key={d}
                      className={`px-3 py-1.5 font-sans font-semibold text-slate-800 border-r border-slate-200 whitespace-nowrap ${
                        d === 0 ? 'sticky left-0 z-10 bg-inherit' : ''
                      }`}
                    >
                      {String(row[`r${d + 1}`])}
                    </td>
                  ))}
                  {hasCols &&
                    result.columns.map((c) =>
                      mDefs.map((_m, i) => (
                        <td key={`${c}-${i}`} className="px-3 py-1.5 text-right text-slate-700 border-r border-slate-100">
                          {fmt(cellMap?.get(c)?.[`m${i + 1}`], i)}
                        </td>
                      ))
                    )}
                  {mDefs.map((_m, i) => {
                    const val = Number(row[`m${i + 1}`]) || 0;
                    const pct = i === 0 && maxFirst > 0 ? Math.min(100, (Math.abs(val) / maxFirst) * 100) : 0;
                    return (
                      <td
                        key={`t-${i}`}
                        className="px-3 py-1.5 text-right font-bold text-slate-900 border-r border-slate-200 relative"
                        style={
                          pct
                            ? { background: `linear-gradient(90deg, rgba(12,76,163,0.14) ${pct}%, transparent ${pct}%)` }
                            : undefined
                        }
                      >
                        {fmt(row[`m${i + 1}`], i)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          {result.grand && (
            <tfoot className="sticky bottom-0 z-20 bg-[#e5a812]/25 backdrop-blur-sm border-t-2 border-slate-500 font-mono">
              <tr>
                <td
                  colSpan={dimCount}
                  className="px-3 py-2 font-sans font-black text-slate-900 sticky left-0 bg-[#f6e3ae]"
                >
                  GRAND TOTAL ({result.total_rows.toLocaleString()} rows)
                </td>
                {hasCols &&
                  result.columns.map((c) =>
                    mDefs.map((_m, i) => (
                      <td key={`gt-${c}-${i}`} className="px-3 py-2 text-right font-black text-slate-900">
                        {fmt(colTotalMap.get(c)?.[`m${i + 1}`], i)}
                      </td>
                    ))
                  )}
                {mDefs.map((_m, i) => (
                  <td key={`gtt-${i}`} className="px-3 py-2 text-right font-black text-slate-900">
                    {fmt(result.grand?.[`m${i + 1}`], i)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination (SQL editor style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-600">Rows per page</span>
          <select
            value={PAGE_SIZE_CHOICES.includes(result.page_size) ? result.page_size : 'custom'}
            onChange={(e) => {
              if (e.target.value !== 'custom') onPageSize(Number(e.target.value));
            }}
            className="px-2 py-1 border border-slate-300 rounded-lg bg-white font-mono"
          >
            {PAGE_SIZE_CHOICES.map((n) => (
              <option key={n} value={n}>
                First {n.toLocaleString()}
              </option>
            ))}
            {!PAGE_SIZE_CHOICES.includes(result.page_size) && <option value="custom">{result.page_size}</option>}
          </select>
          <input
            type="number"
            min={1}
            max={5000}
            placeholder="custom"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && Number(customSize) > 0) onPageSize(Math.min(5000, Number(customSize)));
            }}
            className="w-20 px-2 py-1 border border-slate-300 rounded-lg font-mono"
          />
          <button
            onClick={() => Number(customSize) > 0 && onPageSize(Math.min(5000, Number(customSize)))}
            className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold"
          >
            Set
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button disabled={result.page <= 1 || loading} onClick={() => onPage(1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button disabled={result.page <= 1 || loading} onClick={() => onPage(result.page - 1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono font-bold text-slate-700">
            Page {result.page.toLocaleString()} / {totalPages.toLocaleString()}
          </span>
          <button disabled={result.page >= totalPages || loading} onClick={() => onPage(result.page + 1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button disabled={result.page >= totalPages || loading} onClick={() => onPage(totalPages)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
            <ChevronsRight className="w-4 h-4" />
          </button>
          <input
            type="number"
            min={1}
            max={totalPages}
            placeholder="go to"
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && Number(jump) >= 1) onPage(Math.min(totalPages, Number(jump)));
            }}
            className="w-16 ml-2 px-2 py-1 border border-slate-300 rounded-lg font-mono"
          />
        </div>
      </div>
    </div>
  );
}
