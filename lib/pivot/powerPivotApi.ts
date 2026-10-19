import { createClient, getSupabaseConfig } from '@/lib/supabase/client';
import {
  PowerPivotConfig,
  PowerPivotResult,
  PowerPivotMeta,
  getAllMeasures,
  formatMeasureValue,
  DIMENSIONS,
} from '@/lib/types/powerPivot.types';

const META_CACHE_KEY = 'easy_gold_power_pivot_meta_v2';
const META_TTL_MS = 15 * 60 * 1000;

export function isSupabaseConnected(): boolean {
  const { url } = getSupabaseConfig();
  return !!url && !url.includes('placeholder');
}

/** Convert UI config -> RPC payload understood by public.get_power_pivot */
export function buildRpcConfig(
  config: PowerPivotConfig,
  page: number,
  exportAll = false
): Record<string, unknown> {
  const customIds = new Set(config.customMeasures.map((c) => c.id));

  const customs: Record<string, unknown> = {};
  config.customMeasures.forEach((c) => {
    if (c.type === 'ratio') {
      customs[c.id] = { type: 'ratio', num: c.num, den: c.den, multiplier: c.multiplier ?? 1 };
    } else {
      customs[c.id] = {
        type: 'calc',
        agg: c.agg,
        field: c.field,
        divisor: c.divisor ?? 1,
        filters: (c.filters || [])
          .filter((f) => f.enabled)
          .map((f) => ({ field: f.field, op: f.op, value: f.value, value2: f.value2, values: f.values })),
      };
    }
  });

  const usableValues = config.values.filter(Boolean);
  const sortBy =
    config.sortBy === 'label' || usableValues.includes(config.sortBy) ? config.sortBy : usableValues[0];

  return {
    rows: config.rows,
    columns: config.columns.slice(0, 1),
    values: usableValues,
    custom_measures: customIds.size ? customs : {},
    filters: config.filters
      .filter((f) => f.enabled)
      .map((f) => ({
        scope: f.scope,
        field: f.field,
        op: f.op,
        value: f.value,
        value2: f.value2,
        values: f.values,
      })),
    sort_by: sortBy,
    sort_dir: config.sortDir,
    page,
    page_size: config.pageSize,
    export: exportAll,
  };
}

export async function runPowerPivot(
  config: PowerPivotConfig,
  page = 1,
  exportAll = false
): Promise<PowerPivotResult> {
  if (!isSupabaseConnected()) {
    throw new Error(
      'Supabase is not connected. Open "Audit & Sync Check" and enter your Project URL + anon key, then run sql/15_power_pivot_engine.sql.'
    );
  }
  if (!config.values.length) {
    throw new Error('Add at least one measure to VALUES before calculating.');
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_power_pivot', {
    p_config: buildRpcConfig(config, page, exportAll),
  });

  if (error) {
    const hint = /function .*get_power_pivot/i.test(error.message)
      ? ' (Run sql/15_power_pivot_engine.sql in Supabase SQL Editor first.)'
      : '';
    throw new Error(error.message + hint);
  }
  return data as PowerPivotResult;
}

export function readCachedMeta(): PowerPivotMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(META_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; meta: PowerPivotMeta };
    if (Date.now() - parsed.at > META_TTL_MS) return null;
    return parsed.meta;
  } catch {
    return null;
  }
}

export async function fetchPowerPivotMeta(force = false): Promise<PowerPivotMeta | null> {
  if (!force) {
    const cached = readCachedMeta();
    if (cached) return cached;
  }
  if (!isSupabaseConnected()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_power_pivot_meta');
  if (error || !data) return null;
  const meta = data as PowerPivotMeta;
  try {
    localStorage.setItem(META_CACHE_KEY, JSON.stringify({ at: Date.now(), meta }));
  } catch {
    /* ignore quota errors */
  }
  return meta;
}

// ----------------------------------------------------------------------------
// Result helpers (cross-tab indexing + CSV export)
// ----------------------------------------------------------------------------
export function rowKeyOf(rec: Record<string, any>, dimCount: number): string {
  const parts: string[] = [];
  for (let i = 1; i <= dimCount; i++) parts.push(String(rec[`r${i}`] ?? ''));
  return JSON.stringify(parts);
}

export function indexCells(result: PowerPivotResult): Map<string, Map<string, Record<string, any>>> {
  const dimCount = Math.max(1, result.rows_dims.length);
  const idx = new Map<string, Map<string, Record<string, any>>>();
  for (const cell of result.cells || []) {
    const k = rowKeyOf(cell, dimCount);
    if (!idx.has(k)) idx.set(k, new Map());
    idx.get(k)!.set(String(cell.c1 ?? ''), cell);
  }
  return idx;
}

export function resultToCsv(result: PowerPivotResult, config: PowerPivotConfig): string {
  const measures = getAllMeasures(config.customMeasures);
  const mDefs = result.values.map((id) => measures.find((m) => m.id === id));
  const dimLabels = result.rows_dims.length
    ? result.rows_dims.map((d) => DIMENSIONS.find((x) => x.id === d)?.label || d)
    : ['Total'];
  const dimCount = Math.max(1, result.rows_dims.length);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const num = (v: unknown, i: number) => (v === null || v === undefined ? '' : String(mDefs[i] ? Number(v) : v));

  const header: string[] = [...dimLabels];
  const hasCols = !!result.column_dim && result.columns.length > 0;
  if (hasCols) {
    result.columns.forEach((c) =>
      mDefs.forEach((m, i) => header.push(`${c} | ${m?.label || result.values[i]}`))
    );
  }
  mDefs.forEach((m, i) => header.push(hasCols ? `Grand Total | ${m?.label || result.values[i]}` : m?.label || result.values[i]));

  const lines = [header.map(esc).join(',')];
  const idx = indexCells(result);

  for (const row of result.rows) {
    const out: string[] = [];
    for (let d = 1; d <= dimCount; d++) out.push(esc(row[`r${d}`]));
    if (hasCols) {
      const cellMap = idx.get(rowKeyOf(row, dimCount));
      result.columns.forEach((c) =>
        mDefs.forEach((_m, i) => out.push(esc(num(cellMap?.get(c)?.[`m${i + 1}`], i))))
      );
    }
    mDefs.forEach((_m, i) => out.push(esc(num(row[`m${i + 1}`], i))));
    lines.push(out.join(','));
  }

  if (result.grand) {
    const out: string[] = ['GRAND TOTAL'];
    for (let d = 2; d <= dimCount; d++) out.push('');
    if (hasCols) {
      result.columns.forEach((c) => {
        const ct = (result.col_totals || []).find((x) => String(x.c1) === c);
        mDefs.forEach((_m, i) => out.push(esc(num(ct?.[`m${i + 1}`], i))));
      });
    }
    mDefs.forEach((_m, i) => out.push(esc(num(result.grand?.[`m${i + 1}`], i))));
    lines.push(out.join(','));
  }
  return '\ufeff' + lines.join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { formatMeasureValue };
