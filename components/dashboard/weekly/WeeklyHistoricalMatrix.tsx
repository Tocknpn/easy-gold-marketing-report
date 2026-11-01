'use client';

import React from 'react';
import { WeeklyMetricRow } from '@/lib/types/dashboard.types';
import { Table2, ChevronDown, ChevronUp } from 'lucide-react';

interface WeeklyHistoricalMatrixProps {
  history: WeeklyMetricRow[];
  selectedWeek: string;
  onSelectWeek: (weekLabel: string) => void;
  isProrated?: boolean;
}

interface MetricRowDef {
  key: string;
  label: string;
  getValue: (w: WeeklyMetricRow) => number;
  isNA?: (w: WeeklyMetricRow) => boolean;
  format: 'int' | 'decimal';
  signPrefix?: boolean;
}

interface MetricSectionDef {
  key: string;
  title: string;
  colorClass: string;
  rows: MetricRowDef[];
}

const isValueNA = (v: number | undefined) => !((v ?? 0) > 0);

const MATRIX_SECTIONS: MetricSectionDef[] = [
  {
    key: 'platform',
    title: 'Platform Overview',
    colorClass: 'bg-[#0b192c]',
    rows: [
      { key: 'all_transactions', label: 'All Transaction', getValue: (w) => w.all_transactions, format: 'int' },
      { key: 'active_users', label: 'User Participate', getValue: (w) => w.active_users, format: 'int' },
      { key: 'new_registers', label: 'New Register', getValue: (w) => w.new_registers, format: 'int', signPrefix: true },
      { key: 'withdraw_gold_grams', label: 'Gold Withdraw (g)', getValue: (w) => Number(w.withdraw_gold_grams), format: 'decimal' },
    ],
  },
  {
    key: 'buy',
    title: 'Buy Activity',
    colorClass: 'bg-[#059669]',
    rows: [
      { key: 'buy_weight_15g', label: 'Gold Weight (15g)', getValue: (w) => Number(w.buy_weight_15g), format: 'decimal' },
      { key: 'buy_transactions', label: 'Transaction', getValue: (w) => w.buy_transactions, format: 'int' },
      {
        key: 'buy_value_mil_lak',
        label: 'Value (mil LAK)',
        getValue: (w) => w.buy_value_mil_lak ?? 0,
        isNA: (w) => isValueNA(w.buy_value_mil_lak),
        format: 'int',
      },
      { key: 'buy_ticket_size_g', label: 'Ticket Size (g)', getValue: (w) => Number(w.buy_ticket_size_g), format: 'decimal' },
    ],
  },
  {
    key: 'sell',
    title: 'Sell Activity',
    colorClass: 'bg-[#4338ca]',
    rows: [
      { key: 'sell_weight_15g', label: 'Gold Weight (15g)', getValue: (w) => Number(w.sell_weight_15g), format: 'decimal' },
      { key: 'sell_transactions', label: 'Transaction', getValue: (w) => w.sell_transactions, format: 'int' },
      {
        key: 'sell_value_mil_lak',
        label: 'Value (mil LAK)',
        getValue: (w) => w.sell_value_mil_lak ?? 0,
        isNA: (w) => isValueNA(w.sell_value_mil_lak),
        format: 'int',
      },
      { key: 'sell_ticket_size_g', label: 'Ticket Size (g)', getValue: (w) => Number(w.sell_ticket_size_g), format: 'decimal' },
    ],
  },
];

function formatValue(value: number, format: 'int' | 'decimal', signPrefix?: boolean): string {
  const formatted = format === 'decimal'
    ? value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : Math.round(value).toLocaleString();
  return signPrefix && value >= 0 ? `+${formatted}` : formatted;
}

function calcWoWPct(current: number, previous: number | null, currentNA: boolean, previousNA: boolean): number | null {
  if (previous === null || previousNA || currentNA || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function calcVsMA4Pct(selectedValue: number, ma4Value: number | null, selectedNA: boolean): number | null {
  if (selectedNA || ma4Value === null || !ma4Value) return null;
  return Math.round(((selectedValue - ma4Value) / ma4Value) * 100);
}

function trendColorClass(pct: number): string {
  return pct < 0 ? 'text-rose-600' : 'text-emerald-600';
}

export function WeeklyHistoricalMatrix({
  history,
  selectedWeek,
  onSelectWeek,
}: WeeklyHistoricalMatrixProps) {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

  // Display recent 8 weeks in chronological order (oldest to newest)
  const recentWeeks = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    const sorted = [...history].sort((a, b) => a.year_week.localeCompare(b.year_week));
    return sorted.slice(-8);
  }, [history]);

  // Calculate 4-Week Rolling Moving Average (MA4) for the active week, per metric key.
  // For rows that can be N/A (value_mil_lak), average only recorded weeks.
  const ma4Metrics = React.useMemo(() => {
    if (recentWeeks.length < 4) return null;
    const last4 = recentWeeks.slice(-4);
    const result: Record<string, number | null> = {};
    for (const section of MATRIX_SECTIONS) {
      for (const row of section.rows) {
        const samples = row.isNA
          ? last4.filter((w) => !row.isNA!(w)).map(row.getValue)
          : last4.map(row.getValue);
        result[row.key] = samples.length
          ? Math.round(samples.reduce((sum, v) => sum + v, 0) / samples.length)
          : null;
      }
    }
    return result;
  }, [recentWeeks]);

  const maxTx = Math.max(...recentWeeks.map((w) => w.all_transactions), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-blue-100 text-[#0c4ca3]">
            <Table2 className="w-5 h-5 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                8-Week Historical Performance Matrix &amp; Moving Average (MA4)
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0c4ca3] border border-blue-200">
                WoW Trajectory
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Multi-week comparison across volume, gold flow, user participation, and 4-week smoothed moving averages.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors self-start sm:self-auto"
          title={isExpanded ? 'Collapse Matrix' : 'Expand Matrix'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-tight">
                <th className="py-2.5 px-4 sticky left-0 bg-slate-100 z-10 min-w-[150px]">Metric / Dimension</th>
                {recentWeeks.map((w, idx) => {
                  const isCurrent = w.week_label === selectedWeek;
                  const isPartial = idx === recentWeeks.length - 1 && new Date(w.end_date) >= new Date();
                  return (
                    <th
                      key={w.week_label}
                      onClick={() => onSelectWeek(w.week_label)}
                      className={`py-2.5 px-3 text-center cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-[#0c4ca3] text-white font-black'
                          : 'hover:bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black">{w.week_label}</span>
                        <span className={`text-[9.5px] font-medium leading-none ${isCurrent ? 'text-blue-100' : 'text-slate-400'}`}>
                          {w.start_date.substring(5)} - {w.end_date.substring(5)}
                        </span>
                        {isPartial && (
                          <span className={`text-[8.5px] px-1 rounded mt-0.5 font-bold ${
                            isCurrent ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Partial
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {ma4Metrics && (
                  <th className="py-2.5 px-3 text-center bg-blue-50/80 text-[#0c4ca3] font-black border-l border-blue-200">
                    <div className="flex flex-col items-center">
                      <span>MA4 Baseline</span>
                      <span className="text-[9.5px] font-semibold text-blue-600">4-Wk Rolling Avg</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MATRIX_SECTIONS.map((section) => (
                <React.Fragment key={section.key}>
                  <tr>
                    <td
                      colSpan={1 + recentWeeks.length + (ma4Metrics ? 1 : 0)}
                      className={`py-1.5 px-4 sticky left-0 z-10 text-[11px] font-black uppercase tracking-wider text-white ${section.colorClass}`}
                    >
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/80 transition-colors font-medium">
                      <td className="py-2 px-4 sticky left-0 bg-white z-10 font-bold text-slate-900 min-w-[150px]">
                        {row.label}
                      </td>
                      {recentWeeks.map((w, idx) => {
                        const isSelected = w.week_label === selectedWeek;
                        const currentVal = row.getValue(w);
                        const currentNA = row.isNA?.(w) ?? false;
                        const isPeak = row.key === 'all_transactions' && currentVal === maxTx;
                        const prevW = idx > 0 ? recentWeeks[idx - 1] : null;
                        const prevVal = prevW ? row.getValue(prevW) : null;
                        const prevNA = prevW ? (row.isNA?.(prevW) ?? false) : true;
                        const wowPct = prevW ? calcWoWPct(currentVal, prevVal, currentNA, prevNA) : null;
                        const ma4Val = ma4Metrics ? ma4Metrics[row.key] : null;
                        const vsMa4Pct = isSelected ? calcVsMA4Pct(currentVal, ma4Val, currentNA) : null;

                        return (
                          <td
                            key={w.week_label}
                            className={`py-2 px-3 text-center align-top ${isSelected ? 'bg-blue-50/40' : ''}`}
                          >
                            <div className="text-[12px] font-extrabold text-slate-900">
                              {currentNA ? 'N/A' : formatValue(currentVal, row.format, row.signPrefix)}
                            </div>
                            <div className="h-[13px] flex items-center justify-center">
                              {wowPct !== null && (
                                <span className={`text-[10px] font-black ${trendColorClass(wowPct)}`}>
                                  {wowPct >= 0 ? '+' : ''}{wowPct}%
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <div className="h-[12px] flex items-center justify-center">
                                {vsMa4Pct !== null && (
                                  <span className={`text-[9px] font-bold ${trendColorClass(vsMa4Pct)}`}>
                                    {vsMa4Pct >= 0 ? '+' : ''}{vsMa4Pct}% vs MA4
                                  </span>
                                )}
                              </div>
                            )}
                            {isPeak && (
                              <span className="inline-block text-[8.5px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-black uppercase mt-0.5">
                                ATH Peak
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {ma4Metrics && (
                        <td className="py-2 px-3 text-center font-black text-[#0c4ca3] bg-blue-50/30 border-l border-blue-100 align-top">
                          {ma4Metrics[row.key] === null ? 'N/A' : formatValue(ma4Metrics[row.key] as number, row.format, row.signPrefix)}
                        </td>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
