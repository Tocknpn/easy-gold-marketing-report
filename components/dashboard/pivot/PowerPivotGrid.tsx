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
  Table,
  Maximize2,
  Type,
  BarChart3,
  Hash,
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
  const [layoutMode, setLayoutMode] = useState<'sql' | 'fill'>('sql');
  const [textSize, setTextSize] = useState<'normal' | 'large'>('large');
  const [showRowNumbers, setShowRowNumbers] = useState<boolean>(true);
  const [showDataBars, setShowDataBars] = useState<boolean>(false);

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
      config.sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
    ) : null;

  const isLarge = textSize === 'large';
  const isSql = layoutMode === 'sql';

  const cellPadding = isLarge ? 'px-5 py-3' : 'px-3.5 py-2';
  const headPadding = isLarge ? 'px-5 py-3 text-xs sm:text-[13px]' : 'px-3.5 py-2 text-[11px]';
  const labelFont = isLarge ? 'text-sm sm:text-base font-bold font-mono' : 'text-xs sm:text-sm font-semibold font-mono';
  const valueFont = isLarge ? 'text-sm sm:text-base font-extrabold font-mono' : 'text-xs sm:text-sm font-bold font-mono';

  const th = `${headPadding} font-black uppercase tracking-wider border-r border-slate-300/80 whitespace-nowrap select-none`;
  const colWidthClass = isSql ? 'min-w-[160px] max-w-[320px]' : '';

  const renderMeasureHeads = (keyPrefix: string) =>
    mDefs.map((m, i) => (
      <th
        key={`${keyPrefix}-${i}`}
        onClick={() => onSort(result.values[i])}
        className={`${th} text-right cursor-pointer hover:bg-[#9cc4e0]/70 select-none ${colWidthClass}`}
        title={`Sort by ${m?.label || result.values[i]}`}
      >
        <span className="inline-flex items-center gap-1.5 justify-end">
          {m?.label || result.values[i]} {sortIcon(result.values[i])}
        </span>
      </th>
    ));

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
      {/* Status & SQL Tools Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-900 text-slate-200 text-xs border-b border-slate-800">
        <div className="flex items-center gap-3 flex-wrap font-mono">
          <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
            Rows {from.toLocaleString()} - {to.toLocaleString()} of {result.total_rows.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-amber-300 font-medium">
            <Clock className="w-3.5 h-3.5" /> {Number(result.elapsed_ms).toLocaleString()} ms
          </span>
          <span className="text-slate-400 font-sans">
            {dimLabels.join(' > ')}
            {hasCols ? `  x  ${colDimLabel}` : ''}
          </span>
        </div>

        {/* View mode & Display Enhancements */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* SQL Compact vs Full Width Toggle */}
          <button
            onClick={() => setLayoutMode(layoutMode === 'sql' ? 'fill' : 'sql')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              layoutMode === 'sql'
                ? 'bg-[#0c4ca3] text-white border-blue-400 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle between SQL compact auto-columns and full screen width"
          >
            {layoutMode === 'sql' ? (
              <>
                <Table className="w-3.5 h-3.5 text-blue-300" /> SQL View (Compact)
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> Fit Screen (Wide)
              </>
            )}
          </button>

          {/* Text Size / Weight Enhancer */}
          <button
            onClick={() => setTextSize(textSize === 'large' ? 'normal' : 'large')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              textSize === 'large'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="Toggle larger font size & weight"
          >
            <Type className="w-3.5 h-3.5" /> {textSize === 'large' ? 'Large & Bold (A+)' : 'Standard (A)'}
          </button>

          {/* Row Numbers Toggle */}
          <button
            onClick={() => setShowRowNumbers(!showRowNumbers)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all border ${
              showRowNumbers
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="Toggle row index numbers"
          >
            <Hash className="w-3.5 h-3.5" /> Row #
          </button>

          {/* Data Bars Toggle */}
          <button
            onClick={() => setShowDataBars(!showDataBars)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all border ${
              showDataBars
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="Toggle visual data bars on measure columns"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Bars {showDataBars ? 'ON' : 'OFF'}
          </button>

          {/* Show Generated SQL */}
          <button
            onClick={() => setShowSql(!showSql)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 hover:text-amber-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <FileCode2 className="w-3.5 h-3.5" /> {showSql ? 'Hide SQL' : 'Show generated SQL'}
          </button>
        </div>
      </div>
      {showSql && (
        <pre className="text-[11px] font-mono text-emerald-300 bg-slate-950 p-3.5 overflow-x-auto max-h-52 whitespace-pre-wrap break-all border-b border-slate-800">
          {result.sql_trace}
        </pre>
      )}

      {/* Grid Container */}
      <div className={`overflow-auto max-h-[65vh] transition-opacity ${loading ? 'opacity-50' : ''} ${isSql ? 'bg-slate-100/60 p-2' : 'bg-white'}`}>
        <table className={`${isSql ? 'w-auto min-w-[500px] bg-white shadow-xs rounded-xl overflow-hidden' : 'w-full bg-white'} border-collapse`}>
          <thead className="sticky top-0 z-20 bg-[#b9d7ea] text-slate-900 shadow-xs">
            {hasCols && (
              <tr className="border-b border-slate-300">
                {showRowNumbers && (
                  <th className="w-12 px-2 py-2.5 text-center text-[11px] font-black uppercase text-slate-500 bg-[#9ec4dc] border-r border-slate-300">
                    #
                  </th>
                )}
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
              {showRowNumbers && (
                <th className="w-12 px-2 py-3 text-center text-xs font-black uppercase text-slate-600 bg-[#a9cde4] border-r border-slate-300 select-none">
                  #
                </th>
              )}
              {dimLabels.map((l, i) => (
                <th
                  key={l}
                  onClick={() => onSort('label')}
                  className={`${th} ${colWidthClass} text-left cursor-pointer hover:bg-[#9cc4e0]/70 ${
                    i === 0 ? 'sticky left-0 z-30 bg-[#b9d7ea]' : ''
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {l} {sortIcon('label')}
                  </span>
                </th>
              ))}
              {hasCols && result.columns.map((c) => renderMeasureHeads(`c-${c}`))}
              {renderMeasureHeads('tot')}
            </tr>
          </thead>

          <tbody className="font-mono divide-y divide-slate-200">
            {result.rows.length === 0 && (
              <tr>
                <td
                  colSpan={(showRowNumbers ? 1 : 0) + dimCount + mDefs.length * (hasCols ? result.columns.length + 1 : 1)}
                  className="text-center py-12 text-slate-400 font-sans text-sm font-medium"
                >
                  No rows match these filters.
                </td>
              </tr>
            )}
            {result.rows.map((row, ri) => {
              const key = rowKeyOf(row, dimCount);
              const cellMap = cellIndex.get(key);
              return (
                <tr key={key + ri} className="hover:bg-blue-50/50 odd:bg-white even:bg-slate-50/50 transition-colors">
                  {showRowNumbers && (
                    <td className="w-12 px-2 py-2.5 text-center font-mono text-xs font-bold text-slate-400 bg-slate-50/70 border-r border-slate-200 select-none">
                      {from + ri}
                    </td>
                  )}
                  {Array.from({ length: dimCount }, (_, d) => (
                    <td
                      key={d}
                      className={`${cellPadding} ${colWidthClass} ${labelFont} text-slate-900 border-r border-slate-200 whitespace-nowrap ${
                        d === 0 ? 'sticky left-0 z-10 bg-inherit' : ''
                      }`}
                    >
                      {String(row[`r${d + 1}`])}
                    </td>
                  ))}
                  {hasCols &&
                    result.columns.map((c) =>
                      mDefs.map((_m, i) => (
                        <td
                          key={`${c}-${i}`}
                          className={`${cellPadding} ${colWidthClass} ${valueFont} text-right text-slate-800 border-r border-slate-100 tabular-nums whitespace-nowrap`}
                        >
                          {fmt(cellMap?.get(c)?.[`m${i + 1}`], i)}
                        </td>
                      ))
                    )}
                  {mDefs.map((_m, i) => {
                    const val = Number(row[`m${i + 1}`]) || 0;
                    const pct = showDataBars && i === 0 && maxFirst > 0 ? Math.min(100, (Math.abs(val) / maxFirst) * 100) : 0;
                    return (
                      <td
                        key={`t-${i}`}
                        className={`${cellPadding} ${colWidthClass} ${valueFont} text-right text-slate-950 border-r border-slate-200 tabular-nums whitespace-nowrap relative`}
                        style={
                          pct
                            ? { background: `linear-gradient(90deg, rgba(12,76,163,0.12) ${pct}%, transparent ${pct}%)` }
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
            <tfoot className="sticky bottom-0 z-20 bg-[#fef3c7] backdrop-blur-sm border-t-2 border-slate-400 font-mono shadow-md">
              <tr>
                {showRowNumbers && (
                  <td className="w-12 px-2 py-3.5 text-center font-mono text-xs font-black text-amber-900 bg-[#fde68a] border-r border-slate-300 select-none">
                    Σ
                  </td>
                )}
                <td
                  colSpan={dimCount}
                  className={`${cellPadding} font-sans font-black text-slate-950 sticky left-0 bg-[#fde68a] uppercase tracking-wide ${
                    isLarge ? 'text-sm sm:text-base' : 'text-xs'
                  }`}
                >
                  GRAND TOTAL ({result.total_rows.toLocaleString()} rows)
                </td>
                {hasCols &&
                  result.columns.map((c) =>
                    mDefs.map((_m, i) => (
                      <td
                        key={`gt-${c}-${i}`}
                        className={`${cellPadding} text-right font-black text-slate-950 tabular-nums ${
                          isLarge ? 'text-sm sm:text-base' : 'text-xs'
                        }`}
                      >
                        {fmt(colTotalMap.get(c)?.[`m${i + 1}`], i)}
                      </td>
                    ))
                  )}
                {mDefs.map((_m, i) => (
                  <td
                    key={`gtt-${i}`}
                    className={`${cellPadding} text-right font-black text-slate-950 tabular-nums ${
                      isLarge ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
                    }`}
                  >
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
