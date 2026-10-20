'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  MonthlyMarketingTarget, 
  RunRateComparisonPayload 
} from '@/lib/types/target.types';
import { 
  DEFAULT_2026_TARGETS, 
  MONTH_NAMES, 
  LATEST_DATA_DATE,
  calculateRunRateComparison, 
  getDaysInMonth,
  DailyMetricRow
} from '@/lib/constants/targetData';
import { createClient } from '@/lib/supabase/client';
import { ClassicRunRateTables } from './ClassicRunRateTables';
import { VisualTargetTrackingCockpit } from './VisualTargetTrackingCockpit';
import { Table2, Download, Target as TargetIcon, TrendingUp, CheckCircle2, RefreshCw } from 'lucide-react';

// Dynamic day cap calculation
const getDayCap = (month: number, latestCapMonth: number = 10, latestCapDay: number = 19, year: number = 2026) =>
  month === latestCapMonth ? latestCapDay : getDaysInMonth(year, month);

const selectClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'text-[10px] font-black uppercase text-slate-500 tracking-wider';

interface CutoffSliderProps {
  month: number;
  day: number;
  onChange: (day: number) => void;
  timeGonePct: number;
  latestCapDay: number;
  latestCapMonth: number;
  year: number;
}

function CutoffSlider({ month, day, onChange, timeGonePct, latestCapDay, latestCapMonth, year }: CutoffSliderProps) {
  const cap = getDayCap(month, latestCapMonth, latestCapDay, year);
  const total = getDaysInMonth(year, month);
  const isCurrent = month === latestCapMonth;
  const quick = [11, 15, 19].filter((d) => d < cap);

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

  // ---- Live Supabase Data State ----
  const [dailyRows, setDailyRows] = useState<DailyMetricRow[] | undefined>(undefined);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);

  // Dynamic calendar bounds discovered from Supabase
  const [currentYear, setCurrentYear] = useState<number>(LATEST_DATA_DATE.year);
  const [latestMonth, setLatestMonth] = useState<number>(LATEST_DATA_DATE.month);
  const [latestDay, setLatestDay] = useState<number>(LATEST_DATA_DATE.day);

  // ---- Section 1: Target Tracking filters (default = current month, latest day) ----
  const [tgtMonth, setTgtMonth] = useState<number>(LATEST_DATA_DATE.month);
  const [tgtDay, setTgtDay] = useState<number>(LATEST_DATA_DATE.day);

  // ---- Section 2: Run Rate filters ----
  const [rrMonth, setRrMonth] = useState<number>(LATEST_DATA_DATE.month);
  const [rrCompMonth, setRrCompMonth] = useState<number>(Math.max(1, LATEST_DATA_DATE.month - 1));
  const [rrDay, setRrDay] = useState<number>(LATEST_DATA_DATE.day);

  // Months selectable as "current" (dynamically updates when new months like Nov arrive)
  const selectableMonths = useMemo(() => {
    const maxSelectable = Math.min(12, Math.max(latestMonth, 10));
    return MONTH_NAMES.map((name, idx) => ({ name, value: idx + 1 })).filter(
      (m) => m.value <= maxSelectable
    );
  }, [latestMonth]);

  // Dynamically sync true daily summary rows from Supabase
  const fetchLiveData = async () => {
    setIsLoadingLive(true);
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from('summary_daily_metrics')
        .select('*')
        .order('date_id', { ascending: true });

      if (!error && rows && rows.length > 0) {
        setDailyRows(rows as DailyMetricRow[]);
        setIsLiveConnected(true);

        const lastRow = rows[rows.length - 1];
        if (lastRow?.date_id) {
          const parts = String(lastRow.date_id).split('-');
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            setCurrentYear(y);
            setLatestMonth(m);
            setLatestDay(d);
            setTgtMonth(m);
            setTgtDay(d);
            setRrMonth(m);
            setRrCompMonth(Math.max(1, m - 1));
            setRrDay(d);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch live Supabase summary_daily_metrics:', e);
    } finally {
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  const tgtData: RunRateComparisonPayload = useMemo(
    () => calculateRunRateComparison(currentYear, tgtMonth, currentYear, Math.max(1, tgtMonth - 1), tgtDay, targets, dailyRows),
    [currentYear, tgtMonth, tgtDay, targets, dailyRows]
  );

  const rrData: RunRateComparisonPayload = useMemo(
    () => calculateRunRateComparison(currentYear, rrMonth, currentYear, rrCompMonth, rrDay, targets, dailyRows),
    [currentYear, rrMonth, rrCompMonth, rrDay, targets, dailyRows]
  );

  // Past month at full cutoff = final achievement, so no estimate is shown.
  const showEst = !(tgtMonth < latestMonth && tgtDay === getDayCap(tgtMonth, latestMonth, latestDay, currentYear));

  const handleTgtMonth = (m: number) => {
    setTgtMonth(m);
    setTgtDay(getDayCap(m, latestMonth, latestDay, currentYear));
  };

  const handleRrMonth = (m: number) => {
    setRrMonth(m);
    setRrDay(getDayCap(m, latestMonth, latestDay, currentYear));
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
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Business Target
            </h1>
            {isLiveConnected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Supabase Connected ({dailyRows?.length || 0} days)
              </span>
            ) : isLoadingLive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Connecting to Supabase...
              </span>
            ) : null}
          </div>
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
                {selectableMonths.map((m) => (
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
              latestCapDay={latestDay}
              latestCapMonth={latestMonth}
              year={currentYear}
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
                {selectableMonths.map((m) => (
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
              latestCapDay={latestDay}
              latestCapMonth={latestMonth}
              year={currentYear}
            />
          </div>
        </div>

        <ClassicRunRateTables data={rrData} />
      </section>
    </div>
  );
}
