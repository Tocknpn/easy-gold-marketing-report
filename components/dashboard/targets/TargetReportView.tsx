'use client';

import React, { useState, useMemo } from 'react';
import { 
  MonthlyMarketingTarget, 
  RunRateComparisonPayload 
} from '@/lib/types/target.types';
import { 
  DEFAULT_2026_TARGETS, 
  MONTH_NAMES, 
  LATEST_DATA_DATE,
  calculateRunRateComparison, 
  getDaysInMonth 
} from '@/lib/constants/targetData';
import { ClassicRunRateTables } from './ClassicRunRateTables';
import { VisualTargetTrackingCockpit } from './VisualTargetTrackingCockpit';
import { Table2, Download, Target as TargetIcon, TrendingUp } from 'lucide-react';

const CURRENT_YEAR = LATEST_DATA_DATE.year;
const CURRENT_MONTH = LATEST_DATA_DATE.month;

// Months selectable as "current" (cannot go beyond the latest data month)
const SELECTABLE_MONTHS = MONTH_NAMES.map((name, idx) => ({ name, value: idx + 1 })).filter(
  (m) => m.value <= CURRENT_MONTH
);

// Highest day that can be selected for a month.
// Current month: capped at the latest data date. Past months: whole month.
const getDayCap = (month: number) =>
  month === CURRENT_MONTH ? LATEST_DATA_DATE.day : getDaysInMonth(CURRENT_YEAR, month);

const selectClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'text-[10px] font-black uppercase text-slate-500 tracking-wider';

interface CutoffSliderProps {
  month: number;
  day: number;
  onChange: (day: number) => void;
  timeGonePct: number;
}

function CutoffSlider({ month, day, onChange, timeGonePct }: CutoffSliderProps) {
  const cap = getDayCap(month);
  const total = getDaysInMonth(CURRENT_YEAR, month);
  const isCurrent = month === CURRENT_MONTH;
  const quick = [11, 15, 20].filter((d) => d < cap);

  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <div className="flex items-center justify-between">
        <label className={labelClass}>
          As-Of Cutoff Day (Elapsed: {day} / {total} days = {timeGonePct}%)
        </label>
        <div className="flex items-center gap-1 text-[10px] font-bold">
          {quick.map((d) => (
            <button
              key={d}
              onClick={() => onChange(d)}
              className={`px-1.5 py-0.5 rounded ${day === d ? 'bg-[#0c4ca3] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Day {d}
            </button>
          ))}
          <button
            onClick={() => onChange(cap)}
            className={`px-1.5 py-0.5 rounded ${day === cap ? 'bg-[#0c4ca3] text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {isCurrent ? `Latest (D${cap})` : 'Full Month'}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={cap}
          value={day}
          onChange={(e) => onChange(Math.min(cap, parseInt(e.target.value, 10)))}
          className="w-full accent-[#0c4ca3] cursor-pointer"
        />
        <span className="font-mono font-black text-xs text-[#0c4ca3] w-8 text-right shrink-0">
          D{day}
        </span>
      </div>
    </div>
  );
}

export function TargetReportView() {
  // Targets are read-only (seeded defaults, or previously saved values)
  const [targets] = useState<MonthlyMarketingTarget[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('easy_gold_2026_targets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return DEFAULT_2026_TARGETS;
  });

  // ---- Section 1: Target Tracking filters (default = current month, latest day) ----
  const [tgtMonth, setTgtMonth] = useState<number>(CURRENT_MONTH);
  const [tgtDay, setTgtDay] = useState<number>(getDayCap(CURRENT_MONTH));

  // ---- Section 2: Run Rate filters ----
  const [rrMonth, setRrMonth] = useState<number>(CURRENT_MONTH);
  const [rrCompMonth, setRrCompMonth] = useState<number>(CURRENT_MONTH - 1);
  const [rrDay, setRrDay] = useState<number>(getDayCap(CURRENT_MONTH));

  const tgtData: RunRateComparisonPayload = useMemo(
    () => calculateRunRateComparison(CURRENT_YEAR, tgtMonth, CURRENT_YEAR, Math.max(1, tgtMonth - 1), tgtDay, targets),
    [tgtMonth, tgtDay, targets]
  );

  const rrData: RunRateComparisonPayload = useMemo(
    () => calculateRunRateComparison(CURRENT_YEAR, rrMonth, CURRENT_YEAR, rrCompMonth, rrDay, targets),
    [rrMonth, rrCompMonth, rrDay, targets]
  );

  // Past month at full cutoff = final achievement, so no estimate is shown.
  const showEst = !(tgtMonth < CURRENT_MONTH && tgtDay === getDayCap(tgtMonth));

  const handleTgtMonth = (m: number) => {
    setTgtMonth(m);
    setTgtDay(getDayCap(m));
  };

  const handleRrMonth = (m: number) => {
    setRrMonth(m);
    setRrDay(getDayCap(m));
  };

  // Export RR table to CSV
  const handleExportCsv = () => {
    const csvRows = [
      ['Metric', `${rrData.comparison_month_label} Full`, `${rrData.current_month_label} MTD`, 'RR Proj', 'Diff', 'MoM %', 'Monthly Target', 'Vs Target %', `${rrData.comparison_month_label} Same Date`, 'Diff Same', '% Change Same', 'Vs Target Same %'],
      ...rrData.rows.map((r) => [
        `"${r.label}"`,
        r.comp_full_month,
        r.cur_mtd,
        r.rr_projected,
        r.diff_full,
        `${r.mom_full_pct}%`,
        r.target_val || '-',
        r.vs_target_pct ? `${r.vs_target_pct}%` : '-',
        r.comp_same_period,
        r.diff_same,
        `${r.mom_same_pct}%`,
        r.vs_target_same_pct ? `${r.vs_target_same_pct}%` : '-',
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `easy_gold_run_rate_${rrData.current_month_label}_vs_${rrData.comparison_month_label}_day${rrDay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* ==================================================================== */}
      {/* PAGE TITLE                                                           */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-300/80 shadow-xs p-3.5 sm:p-4 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c4ca3] to-blue-900 text-amber-400 flex items-center justify-center font-black shadow-xs">
          <Table2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            Business Target
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            Target tracking vs official 2026 targets, and monthly run-rate comparison.
          </p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: TARGET TRACKING                                           */}
      {/* ==================================================================== */}
      <section className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-300/80 shadow-xs p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <TargetIcon className="w-4 h-4 text-[#0c4ca3]" />
            <span>Target Tracking</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Month (2026)</label>
              <select
                value={tgtMonth}
                onChange={(e) => handleTgtMonth(parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {SELECTABLE_MONTHS.map((m) => (
                  <option key={`tgt-${m.name}`} value={m.value}>
                    {m.name} 2026
                  </option>
                ))}
              </select>
            </div>
            <CutoffSlider
              month={tgtMonth}
              day={tgtDay}
              onChange={setTgtDay}
              timeGonePct={tgtData.time_gone_pct}
            />
          </div>
        </div>

        <VisualTargetTrackingCockpit data={tgtData} showEst={showEst} />
      </section>

      {/* ==================================================================== */}
      {/* SECTION 2: RUN RATE                                                  */}
      {/* ==================================================================== */}
      <section className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-300/80 shadow-xs p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <TrendingUp className="w-4 h-4 text-[#0c4ca3]" />
              <span>Run Rate (RR)</span>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all"
              title="Export Run Rate Table to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Current Month (2026)</label>
              <select
                value={rrMonth}
                onChange={(e) => handleRrMonth(parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {SELECTABLE_MONTHS.map((m) => (
                  <option key={`rr-curr-${m.name}`} value={m.value}>
                    {m.name} 2026
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Comparison Month</label>
              <select
                value={rrCompMonth}
                onChange={(e) => setRrCompMonth(parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={`rr-comp-${name}`} value={idx + 1}>
                    {name} 2026
                  </option>
                ))}
              </select>
            </div>
            <CutoffSlider
              month={rrMonth}
              day={rrDay}
              onChange={setRrDay}
              timeGonePct={rrData.time_gone_pct}
            />
          </div>
        </div>

        <ClassicRunRateTables data={rrData} />
      </section>
    </div>
  );
}
