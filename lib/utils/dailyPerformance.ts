import { DailyMetricRow } from '@/lib/constants/targetData';

export type DailyMetricKey = 'new_customers' | 'buy_transactions' | 'sell_transactions';

export type DailyMap = Map<string, DailyMetricRow>;

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  value: number | null;
}

export interface CompareRow {
  label: string;
  /** Reference value (yesterday value, or average of the previous N days). */
  ref: number | null;
  /** latest - ref */
  gap: number | null;
  /** (latest - ref) / ref * 100 */
  pct: number | null;
}

export const COMPARE_WINDOWS = [3, 7, 14, 21] as const;

export function toDailyMap(rows: DailyMetricRow[]): DailyMap {
  const map: DailyMap = new Map();
  for (const r of rows) {
    if (r?.date_id) map.set(String(r.date_id).slice(0, 10), r);
  }
  return map;
}

/** Add n calendar days to a YYYY-MM-DD string (timezone safe). */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function valueOn(map: DailyMap, date: string, key: DailyMetricKey): number | null {
  const row = map.get(date);
  if (!row) return null;
  const v = Number(row[key]);
  return Number.isFinite(v) ? v : null;
}

/** Last `days` calendar days ending on asOf (inclusive). Missing days have value null. */
export function buildSeries(map: DailyMap, asOf: string, key: DailyMetricKey, days = 30): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(asOf, -i);
    out.push({ date, value: valueOn(map, date, key) });
  }
  return out;
}

function average(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function toCompare(label: string, latest: number | null, ref: number | null): CompareRow {
  if (latest === null || ref === null) return { label, ref, gap: null, pct: null };
  return {
    label,
    ref,
    gap: latest - ref,
    pct: ref !== 0 ? ((latest - ref) / ref) * 100 : null,
  };
}

/**
 * Compare the latest day with yesterday and with the average of the previous
 * 3, 7, 14 and 21 days. The averages never include the latest day itself.
 */
export function buildCompare(map: DailyMap, asOf: string, key: DailyMetricKey) {
  const latest = valueOn(map, asOf, key);
  const rows: CompareRow[] = [toCompare('Yesterday', latest, valueOn(map, addDays(asOf, -1), key))];

  for (const n of COMPARE_WINDOWS) {
    const vals: Array<number | null> = [];
    for (let i = 1; i <= n; i++) vals.push(valueOn(map, addDays(asOf, -i), key));
    rows.push(toCompare(`Avg last ${n} days`, latest, average(vals)));
  }

  return { latest, rows };
}

export const fmtInt = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(n) ? '–' : Math.round(n).toLocaleString('en-US');

export const fmtSigned = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  const r = Math.round(n);
  return `${r > 0 ? '+' : ''}${r.toLocaleString('en-US')}`;
};

export const fmtPct = (n: number | null | undefined, digits = 1): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  const v = Number(n.toFixed(digits));
  return `${v > 0 ? '+' : ''}${v}%`;
};

export function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}
