import { createClient, getSupabaseConfig } from '@/lib/supabase/client';
import {
  PowerPivotConfig,
  PowerPivotResult,
  PowerPivotMeta,
  PowerPivotFilter,
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

/** Built-in measures that we also supply in custom_measures so un-upgraded DBs resolve them 100% accurately */
const COMPAT_CUSTOM_MEASURES: Record<string, unknown> = {
  withdraw_gold_g: {
    type: 'calc',
    agg: 'sum',
    field: 'gold_weight',
    divisor: 1,
    filters: [{ field: 'transaction_type', op: 'in', values: ['WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW'] }],
  },
  withdraw_gold_15g: {
    type: 'calc',
    agg: 'sum',
    field: 'gold_weight',
    divisor: 15,
    filters: [{ field: 'transaction_type', op: 'in', values: ['WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW'] }],
  },
  withdraw_trans: {
    type: 'calc',
    agg: 'count',
    field: 'rows',
    divisor: 1,
    filters: [{ field: 'transaction_type', op: 'in', values: ['WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW'] }],
  },
  user_withdraw: {
    type: 'calc',
    agg: 'distinct_count',
    field: 'phone',
    divisor: 1,
    filters: [{ field: 'transaction_type', op: 'in', values: ['WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW'] }],
  },
  withdraw_value_mil: {
    type: 'calc',
    agg: 'sum',
    field: 'total_amount',
    divisor: 1000000,
    filters: [{ field: 'transaction_type', op: 'in', values: ['WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW'] }],
  },
  withdraw_value_lak: {
    type: 'calc',
    agg: 'sum',
    field: 'total_amount',
    divisor: 1,
    filters: [{ field: 'transaction_type', op: 'in', values: ['WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW'] }],
  },
  revenue_buy_lak: {
    type: 'calc',
    agg: 'sum',
    field: 'total_amount',
    divisor: 1,
    filters: [{ field: 'transaction_type', op: '=', value: 'BUY_GOLD' }],
  },
  revenue_sell_lak: {
    type: 'calc',
    agg: 'sum',
    field: 'total_amount',
    divisor: 1,
    filters: [{ field: 'transaction_type', op: '=', value: 'SALE_GOLD' }],
  },
};

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return `${ym}-31`;
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(d).padStart(2, '0')}`;
}

/** Normalize filters for RPC: expand Lao Unicode status variants & empty checks */
function normalizeFiltersForRpc(filters: PowerPivotFilter[], compatDateOnly = false): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const f of filters) {
    if (!f.enabled) continue;
    if (f.op !== 'in' && f.op !== 'not_in' && (!f.value || String(f.value).trim() === '')) continue;
    if ((f.op === 'in' || f.op === 'not_in') && (!f.values || f.values.length === 0)) continue;

    // Expand 'status = ສໍາເລັດ' to include all 3 Lao Unicode completed variants in monthly_data
    if (
      f.scope === 'row' &&
      f.field === 'status' &&
      f.op === '=' &&
      (f.value === 'ສໍາເລັດ' || f.value === 'ສຳເລັດ')
    ) {
      out.push({
        scope: 'row',
        field: 'status',
        op: 'in',
        values: ['ສໍາເລັດ', 'ສຳເລັດ', 'ສຳເລັດ (AUTO)'],
      });
      continue;
    }

    // If compatDateOnly is requested (when SQL 49 is not yet installed), convert contiguous month filter to date BETWEEN
    if (compatDateOnly && f.scope === 'row' && f.field === 'month') {
      const months = (f.op === 'in' ? f.values || [] : f.value ? [f.value] : []).slice().sort();
      if (months.length >= 1) {
        out.push({
          scope: 'row',
          field: 'date',
          op: 'between',
          value: `${months[0]}-01`,
          value2: lastDayOfMonth(months[months.length - 1]),
        });
        continue;
      }
    }

    if (compatDateOnly && f.scope === 'row' && f.field === 'datetime') {
      out.push({
        scope: 'row',
        field: 'date',
        op: f.op,
        value: String(f.value || '').slice(0, 10),
        value2: String(f.value2 || f.value || '').slice(0, 10),
      });
      continue;
    }

    out.push({
      scope: f.scope,
      field: f.field,
      op: f.op,
      value: f.value,
      value2: f.value2,
      values: f.values,
    });
  }
  return out;
}

/** Convert UI config -> RPC payload understood by public.get_power_pivot */
export function buildRpcConfig(
  config: PowerPivotConfig,
  page: number,
  exportAll = false,
  compatMode = false
): Record<string, unknown> {
  const customs: Record<string, unknown> = { ...COMPAT_CUSTOM_MEASURES };

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
  const validSort =
    config.sortBy === 'label' ||
    ['r1', 'r2', 'r3'].includes(config.sortBy) ||
    config.rows.includes(config.sortBy) ||
    usableValues.includes(config.sortBy);
  const sortBy = validSort ? config.sortBy : usableValues[0] || 'label';

  const topN = config.topN && Number(config.topN) > 0 ? Number(config.topN) : null;
  const effectivePageSize =
    topN && topN <= 5000 && page === 1 && !exportAll
      ? topN
      : exportAll && topN
      ? topN
      : config.pageSize;

  return {
    rows: config.rows,
    columns: config.columns.slice(0, 1),
    values: usableValues,
    custom_measures: customs,
    filters: normalizeFiltersForRpc(config.filters, compatMode),
    sort_by: compatMode && config.rows.includes(sortBy) ? 'label' : sortBy,
    sort_dir: config.sortDir,
    page,
    page_size: effectivePageSize,
    top_n: topN,
    export: exportAll && !topN,
  };
}

/** Ensure Top N slicing, specific dimension sorting, and page_grand subtotal are always populated */
function postProcessPivotResult(
  res: PowerPivotResult,
  config: PowerPivotConfig
): PowerPivotResult {
  const topN = config.topN && Number(config.topN) > 0 ? Number(config.topN) : null;
  let rows = [...(res.rows || [])];

  // If user sorted by 2nd or 3rd row dimension (e.g. r2 / r3) and DB was on older SQL that only sorted by r1:
  const dimIdx = config.rows.indexOf(config.sortBy);
  if (dimIdx > 0 || ['r2', 'r3'].includes(config.sortBy)) {
    const rKey = dimIdx > 0 ? `r${dimIdx + 1}` : config.sortBy;
    const dir = config.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) =>
      String(a[rKey] ?? '').localeCompare(String(b[rKey] ?? ''), undefined, { numeric: true }) * dir
    );
  }

  if (topN && rows.length > topN) {
    rows = rows.slice(0, topN);
  }

  // Compute page_grand if not returned by SQL
  let pageGrand = res.page_grand;
  if (!pageGrand && rows.length > 0) {
    const pg: Record<string, any> = { g: true };
    const measures = getAllMeasures(config.customMeasures);
    res.values.forEach((vId, idx) => {
      const mKey = `m${idx + 1}`;
      const mDef = measures.find((m) => m.id === vId);
      if (mDef?.format === 'datetime') {
        const vals = rows.map((r) => String(r[mKey] ?? '')).filter((s) => s && s !== '(no date)');
        vals.sort();
        pg[mKey] = vId === 'min_datetime' ? vals[0] || '-' : vals[vals.length - 1] || '-';
      } else if (
        vId.startsWith('avg_') ||
        vId.includes('_size') ||
        vId.startsWith('freq_') ||
        vId.startsWith('net_flow_')
      ) {
        const nums = rows.map((r) => Number(r[mKey]) || 0);
        const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        pg[mKey] = Number(avg.toFixed(2));
      } else {
        const sum = rows.reduce((acc, r) => acc + (Number(r[mKey]) || 0), 0);
        pg[mKey] = Number(sum.toFixed(2));
      }
    });
    pageGrand = pg;
  }

  return {
    ...res,
    top_n: topN,
    unfiltered_groups: res.unfiltered_groups ?? res.total_rows,
    total_rows: topN ? Math.min(res.total_rows, topN) : res.total_rows,
    rows,
    page_grand: pageGrand,
  };
}

/** Direct PostgREST fallback when sub-day Datetime (HH:mm), Hour filter, or min/max_datetime is used before SQL 49 is applied */
async function runDirectPostgrestPivot(
  config: PowerPivotConfig,
  page: number,
  exportAll: boolean
): Promise<PowerPivotResult> {
  const t0 = Date.now();
  const supabase = createClient();

  let query = supabase
    .from('monthly_data')
    .select('created_at,phone,customer_name,bank,branch,transaction_type,status,gold_weight,total_amount');

  const rowFilters = config.filters.filter((f) => f.enabled && f.scope === 'row');

  for (const f of rowFilters) {
    const v1 = String(f.value ?? '').trim();
    const v2 = String(f.value2 ?? v1).trim();
    if (f.field === 'datetime') {
      const ts1 = v1.replace('T', ' ').length === 16 ? `${v1.replace('T', ' ')}:00` : v1.replace('T', ' ');
      const ts2 = v2.replace('T', ' ').length === 16 ? `${v2.replace('T', ' ')}:59` : v2.replace('T', ' ');
      if (f.op === 'between') query = query.gte('created_at', ts1).lte('created_at', ts2);
      else if (f.op === '>=') query = query.gte('created_at', ts1);
      else if (f.op === '<=') query = query.lte('created_at', ts1);
    } else if (f.field === 'date') {
      const ts1 = `${v1.slice(0, 10)} 00:00:00`;
      const ts2 = `${v2.slice(0, 10)} 23:59:59`;
      if (f.op === 'between') query = query.gte('created_at', ts1).lte('created_at', ts2);
      else if (f.op === '>=') query = query.gte('created_at', ts1);
      else if (f.op === '<=') query = query.lte('created_at', `${v1.slice(0, 10)} 23:59:59`);
      else if (f.op === '=') query = query.gte('created_at', ts1).lte('created_at', `${v1.slice(0, 10)} 23:59:59`);
    } else if (f.field === 'month') {
      const months = (f.op === 'in' ? f.values || [] : v1 ? [v1] : []).slice().sort();
      if (months.length === 1) {
        query = query.gte('created_at', `${months[0]}-01 00:00:00`).lte('created_at', `${lastDayOfMonth(months[0])} 23:59:59`);
      }
    } else if (f.field === 'status') {
      if (f.op === '=' && (v1 === 'ສໍາເລັດ' || v1 === 'ສຳເລັດ')) {
        query = query.in('status', ['ສໍາເລັດ', 'ສຳເລັດ', 'ສຳເລັດ (AUTO)']);
      } else if (f.op === '=' && v1) {
        query = query.eq('status', v1);
      } else if (f.op === 'in' && f.values?.length) {
        query = query.in('status', f.values);
      }
    } else if (['bank', 'transaction_type', 'phone', 'customer_name'].includes(f.field)) {
      if (f.op === '=' && v1) query = query.eq(f.field, v1);
      else if (f.op === 'in' && f.values?.length) query = query.in(f.field, f.values);
      else if (f.op === 'contains' && v1) query = query.ilike(f.field, `%${v1}%`);
      else if (f.op === 'starts_with' && v1) query = query.ilike(f.field, `${v1}%`);
    } else if (f.field === 'gold_weight' || f.field === 'total_amount') {
      const n1 = Number(v1);
      const n2 = Number(v2);
      if (f.op === '>=') query = query.gte(f.field, n1);
      else if (f.op === '<=') query = query.lte(f.field, n1);
      else if (f.op === '>') query = query.gt(f.field, n1);
      else if (f.op === '<') query = query.lt(f.field, n1);
      else if (f.op === '=') query = query.eq(f.field, n1);
      else if (f.op === 'between') query = query.gte(f.field, n1).lte(f.field, n2);
    }
  }

  // Fetch up to 50,000 matching transactions in parallel pages of 10,000
  const rawRows: any[] = [];
  const batchSize = 10000;
  for (let offset = 0; offset < 50000; offset += batchSize) {
    const { data, error } = await query.range(offset, offset + batchSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rawRows.push(...data);
    if (data.length < batchSize) break;
  }

  // Client-side filter for hour / non-contiguous months / complex ops
  const filtered = rawRows.filter((r) => {
    const ts = String(r.created_at || '');
    const hr = Number(ts.slice(11, 13)) || 0;
    const ym = ts.slice(0, 7);
    for (const f of rowFilters) {
      if (f.field === 'hour') {
        const n1 = Number(f.value);
        const n2 = Number(f.value2 ?? f.value);
        if (f.op === 'between' && (hr < n1 || hr > n2)) return false;
        if (f.op === '>=' && hr < n1) return false;
        if (f.op === '<=' && hr > n1) return false;
        if (f.op === '=' && hr !== n1) return false;
      }
      if (f.field === 'month' && f.op === 'in' && f.values && f.values.length > 1) {
        if (!f.values.includes(ym)) return false;
      }
    }
    return true;
  });

  const dimOf = (r: any, dimId: string): string => {
    const ts = String(r.created_at || '');
    switch (dimId) {
      case '__all': return 'Total';
      case 'date': return ts.slice(0, 10) || '(no date)';
      case 'datetime': return ts.slice(0, 16) || '(no date)';
      case 'month': return ts.slice(0, 7) || '(no date)';
      case 'hour': return ts.slice(11, 13) || '(no date)';
      case 'phone': return String(r.phone || '').trim() || '(blank)';
      case 'customer_name': return String(r.customer_name || '').trim() || '(blank)';
      case 'phone_customer':
        return `${String(r.phone || '').trim() || '(blank)'} - ${String(r.customer_name || '').trim() || '(blank)'}`;
      case 'bank': return String(r.bank || '').trim() || '(blank)';
      case 'branch': {
        const b = String(r.branch || '').trim();
        return !b || b === '-' ? 'Digital App / Online' : b;
      }
      case 'transaction_type': return String(r.transaction_type || '').trim() || '(blank)';
      case 'status': return String(r.status || '').trim() || '(blank)';
      default: return String(r[dimId] || '(blank)');
    }
  };

  const evalMeasure = (list: any[], mId: string): any => {
    const buy = list.filter((x) => x.transaction_type === 'BUY_GOLD');
    const sell = list.filter((x) => x.transaction_type === 'SALE_GOLD');
    const wd = list.filter(
      (x) =>
        x.transaction_type === 'WITHDRAW_GOLD' ||
        x.transaction_type === 'MARKETHUB_WITHDRAW' ||
        String(x.transaction_type || '').includes('WITHDRAW')
    );
    const open = list.filter(
      (x) => x.transaction_type === 'OPEN_ACCOUNT' || String(x.transaction_type || '').includes('REGISTER')
    );
    const sumW = (arr: any[]) => arr.reduce((s, x) => s + (Number(x.gold_weight) || 0), 0);
    const sumA = (arr: any[]) => arr.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
    const uniqP = (arr: any[]) =>
      new Set(arr.map((x) => String(x.phone || '').trim()).filter(Boolean)).size;

    switch (mId) {
      case 'total_transaction': return list.length;
      case 'total_buy_transac': return buy.length;
      case 'total_sell_transac': return sell.length;
      case 'withdraw_trans': return wd.length;
      case 'new_register': return open.length;
      case 'min_datetime': {
        const d = list.map((x) => String(x.created_at || '')).filter(Boolean).sort();
        return d[0] || '(no date)';
      }
      case 'max_datetime': {
        const d = list.map((x) => String(x.created_at || '')).filter(Boolean).sort();
        return d[d.length - 1] || '(no date)';
      }
      case 'total_unique_user': return uniqP(list);
      case 'user_buy': return uniqP(buy);
      case 'user_sell': return uniqP(sell);
      case 'user_withdraw': return uniqP(wd);
      case 'revenue_buy_mil': return Number((sumA(buy) / 1e6).toFixed(2));
      case 'revenue_buy_lak': return Math.round(sumA(buy));
      case 'revenue_sell_mil': return Number((sumA(sell) / 1e6).toFixed(2));
      case 'revenue_sell_lak': return Math.round(sumA(sell));
      case 'withdraw_value_mil': return Number((sumA(wd) / 1e6).toFixed(2));
      case 'withdraw_value_lak': return Math.round(sumA(wd));
      case 'abs_value_mil': return Number(((sumA(buy) - sumA(sell)) / 1e6).toFixed(2));
      case 'gold_weight_buy_g': return Number(sumW(buy).toFixed(2));
      case 'gold_weight_sell_g': return Number(sumW(sell).toFixed(2));
      case 'withdraw_gold_g': return Number(sumW(wd).toFixed(2));
      case 'gold_weight_buy_15g': return Number((sumW(buy) / 15).toFixed(2));
      case 'gold_weight_sell_15g': return Number((sumW(sell) / 15).toFixed(2));
      case 'withdraw_gold_15g': return Number((sumW(wd) / 15).toFixed(2));
      case 'gold_buy_size_g': return buy.length ? Number((sumW(buy) / buy.length).toFixed(2)) : 0;
      case 'gold_sell_size_g': return sell.length ? Number((sumW(sell) / sell.length).toFixed(2)) : 0;
      case 'avg_sell_size': return sell.length ? Number((sumA(sell) / 1e6 / sell.length).toFixed(4)) : 0;
      case 'net_flow_trans': return list.length ? Number(((100 * buy.length) / list.length).toFixed(1)) : 0;
      case 'net_flow_value': {
        const tot = sumA(buy) + sumA(sell);
        return tot > 0 ? Number(((100 * sumA(buy)) / tot).toFixed(1)) : 0;
      }
      case 'freq_per_user_all': {
        const u = uniqP(list);
        return u > 0 ? Number((list.length / u).toFixed(2)) : 0;
      }
      case 'freq_per_user_buy': {
        const u = uniqP(buy);
        return u > 0 ? Number((buy.length / u).toFixed(2)) : 0;
      }
      case 'freq_per_user_sell': {
        const u = uniqP(sell);
        return u > 0 ? Number((sell.length / u).toFixed(2)) : 0;
      }
      case 'sum_gold_weight': return Number(sumW(list).toFixed(2));
      case 'sum_amount_lak': return Math.round(sumA(list));
      case 'avg_gold_weight': return list.length ? Number((sumW(list) / list.length).toFixed(2)) : 0;
      case 'avg_amount_lak': return list.length ? Math.round(sumA(list) / list.length) : 0;
      default: return 0;
    }
  };

  const rowDims = config.rows.length ? config.rows.slice(0, 3) : ['__all'];
  const groups = new Map<string, { keys: string[]; list: any[] }>();
  for (const r of filtered) {
    const keys = rowDims.map((d) => dimOf(r, d));
    const gk = JSON.stringify(keys);
    let g = groups.get(gk);
    if (!g) {
      g = { keys, list: [] };
      groups.set(gk, g);
    }
    g.list.push(r);
  }

  let allRows: Record<string, any>[] = [];
  groups.forEach(({ keys, list }) => {
    const rec: Record<string, any> = {};
    keys.forEach((v, idx) => {
      rec[`r${idx + 1}`] = v;
    });
    config.values.forEach((vId, idx) => {
      rec[`m${idx + 1}`] = evalMeasure(list, vId);
    });
    allRows.push(rec);
  });

  // Sort
  const dir = config.sortDir === 'asc' ? 1 : -1;
  const dimIdx = rowDims.indexOf(config.sortBy);
  const mIdx = config.values.indexOf(config.sortBy);
  allRows.sort((a, b) => {
    if (config.sortBy === 'label' || dimIdx === 0) {
      return String(a.r1 ?? '').localeCompare(String(b.r1 ?? ''), undefined, { numeric: true }) * dir;
    }
    if (dimIdx > 0) {
      const k = `r${dimIdx + 1}`;
      return String(a[k] ?? '').localeCompare(String(b[k] ?? ''), undefined, { numeric: true }) * dir;
    }
    const k = `m${(mIdx >= 0 ? mIdx : 0) + 1}`;
    const av = a[k];
    const bv = b[k];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true }) * dir;
  });

  const unfilteredCount = allRows.length;
  const topN = config.topN && Number(config.topN) > 0 ? Number(config.topN) : null;
  if (topN) {
    allRows = allRows.slice(0, topN);
  }

  const pageSize = exportAll ? 100000 : topN && topN <= 5000 ? topN : config.pageSize;
  const offset = (page - 1) * pageSize;
  const pagedRows = allRows.slice(offset, offset + pageSize);

  const grand: Record<string, any> = { g: true };
  config.values.forEach((vId, idx) => {
    grand[`m${idx + 1}`] = evalMeasure(filtered, vId);
  });

  return postProcessPivotResult(
    {
      status: 'ok',
      rows_dims: config.rows,
      column_dim: config.columns[0] || null,
      values: config.values,
      page,
      page_size: pageSize,
      top_n: topN,
      total_rows: allRows.length,
      unfiltered_groups: unfilteredCount,
      columns: [],
      rows: pagedRows,
      cells: [],
      col_totals: [],
      grand,
      elapsed_ms: Date.now() - t0,
      sql_trace: '-- Executed via Direct Indexed PostgREST Engine (Run sql/49_custom_pivot_topn_datetime_validation.sql in Supabase SQL Editor for native SQL RPC execution)',
    },
    config
  );
}

const PIVOT_CACHE = new Map<string, { result: PowerPivotResult; at: number }>();
const PIVOT_CACHE_TTL = 3 * 60 * 1000; // 3 mins

export function clearPivotCache() {
  PIVOT_CACHE.clear();
}

export async function runPowerPivot(
  config: PowerPivotConfig,
  page = 1,
  exportAll = false,
  skipCache = false
): Promise<PowerPivotResult> {
  if (!isSupabaseConnected()) {
    throw new Error(
      'Supabase is not connected. Open "Audit & Sync Check" and enter your Project URL + anon key.'
    );
  }
  if (!config.values.length) {
    throw new Error('Add at least one measure to VALUES before calculating.');
  }

  const rpcPayload = buildRpcConfig(config, page, exportAll, false);
  const cacheKey = JSON.stringify({ rpcPayload, topN: config.topN, sortBy: config.sortBy });

  if (!skipCache && !exportAll) {
    const cached = PIVOT_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.at < PIVOT_CACHE_TTL) {
      return cached.result;
    }
  }

  const supabase = createClient();
  let { data, error } = await supabase.rpc('get_power_pivot', {
    p_config: rpcPayload,
  });

  // If the database hasn't had sql/49_custom_pivot_topn_datetime_validation.sql applied yet:
  if (error && /Unknown (filter field|row dimension|measure)/i.test(error.message)) {
    const needsSubDayOrNewDim =
      config.rows.includes('datetime') ||
      config.columns.includes('datetime') ||
      config.values.includes('min_datetime') ||
      config.values.includes('max_datetime') ||
      config.filters.some(
        (f) => f.enabled && (f.field === 'hour' || f.field === 'datetime')
      );

    if (!needsSubDayOrNewDim) {
      const compatPayload = buildRpcConfig(config, page, exportAll, true);
      const retry = await supabase.rpc('get_power_pivot', {
        p_config: compatPayload,
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      const fallbackRes = await runDirectPostgrestPivot(config, page, exportAll);
      if (!exportAll) {
        PIVOT_CACHE.set(cacheKey, { result: fallbackRes, at: Date.now() });
      }
      return fallbackRes;
    }
  }

  if (error) {
    throw new Error(error.message);
  }

  const res = postProcessPivotResult(data as PowerPivotResult, config);
  if (!exportAll) {
    PIVOT_CACHE.set(cacheKey, { result: res, at: Date.now() });
    if (PIVOT_CACHE.size > 50) {
      const oldestKey = PIVOT_CACHE.keys().next().value;
      if (oldestKey) PIVOT_CACHE.delete(oldestKey);
    }
  }
  return res;
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
// Result helpers (cross-tab indexing + CSV & Excel export)
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
  const valStr = (v: unknown, i: number) => {
    if (v === null || v === undefined) return '';
    if (mDefs[i]?.format === 'datetime') return String(v);
    return String(mDefs[i] ? Number(v) : v);
  };

  const header: string[] = ['#', ...dimLabels];
  const hasCols = !!result.column_dim && result.columns.length > 0;
  if (hasCols) {
    result.columns.forEach((c) =>
      mDefs.forEach((m, i) => header.push(`${c} | ${m?.label || result.values[i]}`))
    );
  }
  mDefs.forEach((m, i) =>
    header.push(hasCols ? `Grand Total | ${m?.label || result.values[i]}` : m?.label || result.values[i])
  );

  const lines = [header.map(esc).join(',')];
  const idx = indexCells(result);
  const startRank = (result.page - 1) * result.page_size + 1;

  result.rows.forEach((row, rIdx) => {
    const out: string[] = [String(startRank + rIdx)];
    for (let d = 1; d <= dimCount; d++) out.push(esc(row[`r${d}`]));
    if (hasCols) {
      const cellMap = idx.get(rowKeyOf(row, dimCount));
      result.columns.forEach((c) =>
        mDefs.forEach((_m, i) => out.push(esc(valStr(cellMap?.get(c)?.[`m${i + 1}`], i))))
      );
    }
    mDefs.forEach((_m, i) => out.push(esc(valStr(row[`m${i + 1}`], i))));
    lines.push(out.join(','));
  });

  if (result.page_grand && (result.top_n || result.total_rows > result.rows.length)) {
    const out: string[] = ['', result.top_n ? `TOP ${result.top_n} SUBTOTAL` : `SHOWING (${result.rows.length} ROWS) SUBTOTAL`];
    for (let d = 2; d <= dimCount; d++) out.push('');
    if (hasCols) {
      result.columns.forEach(() => {
        mDefs.forEach(() => out.push(''));
      });
    }
    mDefs.forEach((_m, i) => out.push(esc(valStr(result.page_grand?.[`m${i + 1}`], i))));
    lines.push(out.join(','));
  }

  if (result.grand) {
    const out: string[] = ['', 'FILTERED GRAND TOTAL'];
    for (let d = 2; d <= dimCount; d++) out.push('');
    if (hasCols) {
      result.columns.forEach((c) => {
        const ct = (result.col_totals || []).find((x) => String(x.c1) === c);
        mDefs.forEach((_m, i) => out.push(esc(valStr(ct?.[`m${i + 1}`], i))));
      });
    }
    mDefs.forEach((_m, i) => out.push(esc(valStr(result.grand?.[`m${i + 1}`], i))));
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

export function downloadExcel(filename: string, result: PowerPivotResult, config: PowerPivotConfig) {
  const measures = getAllMeasures(config.customMeasures);
  const mDefs = result.values.map((id) => measures.find((m) => m.id === id));
  const dimLabels = result.rows_dims.length
    ? result.rows_dims.map((d) => DIMENSIONS.find((x) => x.id === d)?.label || d)
    : ['Total'];
  const dimCount = Math.max(1, result.rows_dims.length);
  const hasCols = !!result.column_dim && result.columns.length > 0;
  const idx = indexCells(result);
  const startRank = (result.page - 1) * result.page_size + 1;

  const escHtml = (v: unknown) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const headers: string[] = ['#', ...dimLabels];
  if (hasCols) {
    result.columns.forEach((c) =>
      mDefs.forEach((m, i) => headers.push(`${c} | ${m?.label || result.values[i]}`))
    );
  }
  mDefs.forEach((m, i) =>
    headers.push(hasCols ? `Grand Total | ${m?.label || result.values[i]}` : m?.label || result.values[i])
  );

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;}th{background:#0c4ca3;color:#ffffff;font-weight:bold;border:1px solid #94a3b8;padding:6px 10px;}td{border:1px solid #cbd5e1;padding:5px 10px;}.num{mso-number-format:"\\#\\,\\#\\#0\\.00";text-align:right;}.int{mso-number-format:"\\#\\,\\#\\#0";text-align:right;}.txt{mso-number-format:"\\@";}.tot{background:#fef3c7;font-weight:bold;}</style></head><body><table><thead><tr>`;
  headers.forEach((h) => {
    html += `<th>${escHtml(h)}</th>`;
  });
  html += `</tr></thead><tbody>`;

  const fmtCell = (v: unknown, i: number, extraCls = '') => {
    if (v === null || v === undefined || v === '') return `<td class="${extraCls}"></td>`;
    const fmt = mDefs[i]?.format || 'dec2';
    if (fmt === 'datetime') return `<td class="txt ${extraCls}">${escHtml(v)}</td>`;
    const n = Number(v);
    if (Number.isNaN(n)) return `<td class="txt ${extraCls}">${escHtml(v)}</td>`;
    const cls = fmt === 'int' ? 'int' : 'num';
    return `<td class="${cls} ${extraCls}">${n}</td>`;
  };

  result.rows.forEach((row, rIdx) => {
    html += `<tr><td class="int">${startRank + rIdx}</td>`;
    for (let d = 1; d <= dimCount; d++) {
      html += `<td class="txt">${escHtml(row[`r${d}`])}</td>`;
    }
    if (hasCols) {
      const cellMap = idx.get(rowKeyOf(row, dimCount));
      result.columns.forEach((c) =>
        mDefs.forEach((_m, i) => {
          html += fmtCell(cellMap?.get(c)?.[`m${i + 1}`], i);
        })
      );
    }
    mDefs.forEach((_m, i) => {
      html += fmtCell(row[`m${i + 1}`], i);
    });
    html += `</tr>`;
  });

  if (result.page_grand && (result.top_n || result.total_rows > result.rows.length)) {
    const label = result.top_n
      ? `TOP ${result.top_n} SUBTOTAL (${result.rows.length} rows)`
      : `SHOWING PAGE SUBTOTAL (${result.rows.length} rows)`;
    html += `<tr class="tot"><td></td><td class="tot">${escHtml(label)}</td>`;
    for (let d = 2; d <= dimCount; d++) html += `<td class="tot"></td>`;
    if (hasCols) {
      result.columns.forEach(() =>
        mDefs.forEach(() => {
          html += `<td class="tot"></td>`;
        })
      );
    }
    mDefs.forEach((_m, i) => {
      html += fmtCell(result.page_grand?.[`m${i + 1}`], i, 'tot');
    });
    html += `</tr>`;
  }

  if (result.grand) {
    html += `<tr class="tot"><td>Σ</td><td class="tot">FILTERED GRAND TOTAL (${result.total_rows} rows)</td>`;
    for (let d = 2; d <= dimCount; d++) html += `<td class="tot"></td>`;
    if (hasCols) {
      result.columns.forEach((c) => {
        const ct = (result.col_totals || []).find((x) => String(x.c1) === c);
        mDefs.forEach((_m, i) => {
          html += fmtCell(ct?.[`m${i + 1}`], i, 'tot');
        });
      });
    }
    mDefs.forEach((_m, i) => {
      html += fmtCell(result.grand?.[`m${i + 1}`], i, 'tot');
    });
    html += `</tr>`;
  }

  html += `</tbody></table></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { formatMeasureValue };
