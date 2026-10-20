// ============================================================================
// Power Pivot Studio - shared types + field / measure catalogs
// Dimension & measure ids MUST match sql/15_power_pivot_engine.sql
// ============================================================================

export type DimensionGroup = 'Time' | 'Customer' | 'Location & Channel' | 'Transaction' | 'Bands';

export interface DimensionDef {
  id: string;
  label: string;
  group: DimensionGroup;
  hint: string;
}

export const DIMENSIONS: DimensionDef[] = [
  { id: 'date', label: 'Date (Day)', group: 'Time', hint: 'YYYY-MM-DD' },
  { id: 'day_mon', label: 'Day (18-Oct)', group: 'Time', hint: 'DD-Mon (e.g. 18-Oct)' },
  { id: 'week', label: 'Week (ISO)', group: 'Time', hint: '2026-W41' },
  { id: 'month', label: 'Month', group: 'Time', hint: '2026-10' },
  { id: 'weekday', label: 'Day of Week', group: 'Time', hint: '1-Mon .. 7-Sun' },
  { id: 'hour', label: 'Hour of Day', group: 'Time', hint: '00 .. 23' },
  { id: 'phone', label: 'Phone', group: 'Customer', hint: 'Customer ID' },
  { id: 'customer_name', label: 'Customer Name', group: 'Customer', hint: 'Name' },
  { id: 'phone_customer', label: 'Phone & Customer', group: 'Customer', hint: '020xxxx - Name' },
  { id: 'bank', label: 'Banking Gateway', group: 'Location & Channel', hint: 'BCEL, LDB, JDB ...' },
  { id: 'branch', label: 'Branch', group: 'Location & Channel', hint: 'Vientiane, Pakse ...' },
  { id: 'transaction_type', label: 'Transaction Type', group: 'Transaction', hint: 'BUY_GOLD, SALE_GOLD ...' },
  { id: 'status', label: 'Status', group: 'Transaction', hint: 'ສໍາເລັດ / ປະຕິເສດ' },
  { id: 'amount_band', label: 'Amount Band (LAK)', group: 'Bands', hint: '<100K ... >=5M' },
  { id: 'weight_band', label: 'Weight Band (g)', group: 'Bands', hint: '<1g ... >=15g' },
];

export type MeasureFormat = 'int' | 'dec1' | 'dec2' | 'dec4' | 'pct' | 'datetime';
export type MeasureGroup = 'Transactions' | 'Users' | 'Revenue (mil LAK)' | 'Gold Weight' | 'Ticket & Ratios' | 'Raw Sums' | 'Custom';

export interface MeasureDef {
  id: string;
  label: string;
  /** DAX-style formula shown in "Manage Measures" (mirrors your Excel Power Pivot) */
  dax: string;
  format: MeasureFormat;
  group: MeasureGroup;
  isCustom?: boolean;
}

export const BUILTIN_MEASURES: MeasureDef[] = [
  // Transactions
  { id: 'total_transaction', label: 'Total transaction', group: 'Transactions', format: 'int', dax: 'CALCULATE(COUNT([Source.Name]))' },
  { id: 'total_buy_transac', label: 'Total Buy Transac', group: 'Transactions', format: 'int', dax: 'CALCULATE(COUNT([Source.Name]), \'Raw Data\'[type]="BUY_GOLD")' },
  { id: 'total_sell_transac', label: 'Total Sell Transac', group: 'Transactions', format: 'int', dax: 'CALCULATE(COUNT([Source.Name]), \'Raw Data\'[type]="SALE_GOLD")' },
  { id: 'withdraw_trans', label: 'Withdraw Trans', group: 'Transactions', format: 'int', dax: 'CALCULATE(COUNT([Source.Name]), \'Raw Data\'[type]="WITHDRAW_GOLD")' },
  { id: 'new_register', label: 'New Register', group: 'Transactions', format: 'int', dax: 'CALCULATE(COUNT([Source.Name]), \'Raw Data\'[type]="OPEN_ACCOUNT")' },
  { id: 'min_datetime', label: 'Min Datetime', group: 'Transactions', format: 'datetime', dax: 'MIN(\'Raw Data\'[created_at])' },
  { id: 'max_datetime', label: 'Max Datetime', group: 'Transactions', format: 'datetime', dax: 'MAX(\'Raw Data\'[created_at])' },
  // Users
  { id: 'total_unique_user', label: 'Total unique user', group: 'Users', format: 'int', dax: 'CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone]), FILTER(\'Raw Data\'[phone]<>BLANK()))' },
  { id: 'user_buy', label: 'User Buy', group: 'Users', format: 'int', dax: 'CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone]), \'Raw Data\'[type]="BUY_GOLD")' },
  { id: 'user_sell', label: 'User Sell', group: 'Users', format: 'int', dax: 'CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone]), \'Raw Data\'[type]="SALE_GOLD")' },
  { id: 'user_withdraw', label: 'User Withdraw Gold', group: 'Users', format: 'int', dax: 'CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone]), \'Raw Data\'[type]="WITHDRAW_GOLD")' },
  { id: 'freq_per_user_all', label: 'Freq per user all', group: 'Users', format: 'dec2', dax: 'DIVIDE([Total transaction], CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone])), 0)' },
  { id: 'freq_per_user_buy', label: 'Freq per User Buy', group: 'Users', format: 'dec2', dax: 'DIVIDE([Total Buy Transac], [User Buy], 0)' },
  { id: 'freq_per_user_sell', label: 'Freq per User Sell', group: 'Users', format: 'dec2', dax: 'DIVIDE([Total Sell Transac], [User Sell], 0)' },
  // Revenue
  { id: 'revenue_buy_mil', label: 'Revenue Buy (mil lak)', group: 'Revenue (mil LAK)', format: 'dec2', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type]="BUY_GOLD") / 1000000' },
  { id: 'revenue_sell_mil', label: 'Revenue Sell (mil LAK)', group: 'Revenue (mil LAK)', format: 'dec2', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type]="SALE_GOLD") / 1000000' },
  { id: 'withdraw_value_mil', label: 'Withdraw Value (mil LAK)', group: 'Revenue (mil LAK)', format: 'dec2', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type]="WITHDRAW_GOLD") / 1000000' },
  { id: 'abs_value_mil', label: 'ABS (Buy - Sell, mil)', group: 'Revenue (mil LAK)', format: 'dec2', dax: '([Revenue Buy (mil lak)] - [Revenue Sell (mil LAK)])' },
  // Gold weight
  { id: 'gold_weight_buy_g', label: 'Gold Weigh Buy (g)', group: 'Gold Weight', format: 'dec2', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="BUY_GOLD")' },
  { id: 'gold_weight_sell_g', label: 'Gold Weigh Sell (g)', group: 'Gold Weight', format: 'dec2', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="SALE_GOLD")' },
  { id: 'gold_weight_buy_15g', label: 'Gold Weigh Buy (15g)', group: 'Gold Weight', format: 'dec2', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="BUY_GOLD") / 15' },
  { id: 'gold_weight_sell_15g', label: 'Gold Weigh Sell (15g)', group: 'Gold Weight', format: 'dec2', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="SALE_GOLD") / 15' },
  { id: 'withdraw_gold_15g', label: 'Withdraw gold (15g)', group: 'Gold Weight', format: 'dec2', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="WITHDRAW_GOLD") / 15' },
  // Ticket & Ratios
  { id: 'gold_buy_size_g', label: 'Gold Buy Size (g)', group: 'Ticket & Ratios', format: 'dec2', dax: 'DIVIDE([Gold Weigh Buy (g)], [Total Buy Transac], 0)' },
  { id: 'gold_sell_size_g', label: 'Gold Sell Size (g)', group: 'Ticket & Ratios', format: 'dec2', dax: 'DIVIDE([Gold Weigh Sell (g)], [Total Sell Transac], 0)' },
  { id: 'avg_sell_size', label: 'Avg. Sell size (mil)', group: 'Ticket & Ratios', format: 'dec4', dax: '[Revenue Sell (mil LAK)] / [Total Sell Transac]' },
  { id: 'net_flow_trans', label: '%Net Flow (trans)', group: 'Ticket & Ratios', format: 'pct', dax: '[Total Buy Transac] / [Total transaction]' },
  { id: 'net_flow_value', label: '%Net Flow (value)', group: 'Ticket & Ratios', format: 'pct', dax: 'DIVIDE([Revenue Buy (mil lak)], ([Revenue Buy (mil lak)] + [Revenue Sell (mil LAK)]), 0)' },
  // Raw sums
  { id: 'sum_gold_weight', label: 'Sum of gold weight (g)', group: 'Raw Sums', format: 'dec2', dax: 'SUM(\'Raw Data\'[weight])' },
  { id: 'sum_amount_lak', label: 'Sum of amount (LAK)', group: 'Raw Sums', format: 'int', dax: 'SUM(\'Raw Data\'[amount])' },
  { id: 'avg_gold_weight', label: 'Avg gold weight (g)', group: 'Raw Sums', format: 'dec2', dax: 'AVERAGE(\'Raw Data\'[weight])' },
  { id: 'avg_amount_lak', label: 'Avg amount (LAK)', group: 'Raw Sums', format: 'int', dax: 'AVERAGE(\'Raw Data\'[amount])' },
];

// ----------------------------------------------------------------------------
// Filters (Power BI CALCULATETABLE / FILTER style)
// ----------------------------------------------------------------------------
export type FilterKind = 'num' | 'date' | 'txt';
export type FilterOp =
  | '>=' | '<=' | '>' | '<' | '=' | '<>' | 'between' | 'not_between'
  | 'in' | 'not_in' | 'contains' | 'not_contains' | 'starts_with';

export interface FilterFieldDef {
  id: string;
  label: string;
  kind: FilterKind;
  /** key in meta payload that contains pick-list options */
  optionsKey?: 'banks' | 'branches' | 'transaction_types' | 'statuses' | 'months';
}

export const FILTER_FIELDS: FilterFieldDef[] = [
  { id: 'month', label: 'Month (YYYY-MM)', kind: 'txt', optionsKey: 'months' },
  { id: 'date', label: 'Transaction Date', kind: 'date' },
  { id: 'total_amount', label: 'Purchase Amount (LAK)', kind: 'num' },
  { id: 'gold_weight', label: 'Gold Weight (g)', kind: 'num' },
  { id: 'bank', label: 'Banking Gateway', kind: 'txt', optionsKey: 'banks' },
  { id: 'branch', label: 'Branch', kind: 'txt', optionsKey: 'branches' },
  { id: 'transaction_type', label: 'Transaction Type', kind: 'txt', optionsKey: 'transaction_types' },
  { id: 'status', label: 'Status', kind: 'txt', optionsKey: 'statuses' },
  { id: 'phone', label: 'Phone', kind: 'txt' },
  { id: 'customer_name', label: 'Customer Name', kind: 'txt' },
];

export const OPS_BY_KIND: Record<FilterKind, { id: FilterOp; label: string }[]> = {
  num: [
    { id: '>=', label: '>= (at least)' },
    { id: '<=', label: '<= (at most)' },
    { id: '>', label: '> (greater than)' },
    { id: '<', label: '< (less than)' },
    { id: '=', label: '= (equals)' },
    { id: '<>', label: '<> (not equal)' },
    { id: 'between', label: 'BETWEEN A and B' },
    { id: 'not_between', label: 'NOT BETWEEN A and B' },
  ],
  date: [
    { id: 'between', label: 'FROM date TO date' },
    { id: '>=', label: 'On/After date' },
    { id: '<=', label: 'On/Before date' },
    { id: '=', label: 'Exactly date' },
    { id: 'not_between', label: 'NOT between dates' },
  ],
  txt: [
    { id: 'in', label: 'IN (pick values)' },
    { id: 'not_in', label: 'NOT IN (exclude)' },
    { id: '=', label: '= (equals)' },
    { id: '<>', label: '<> (not equal)' },
    { id: 'contains', label: 'contains' },
    { id: 'not_contains', label: 'does not contain' },
    { id: 'starts_with', label: 'starts with' },
  ],
};

export const MEASURE_FILTER_OPS: { id: FilterOp; label: string }[] = OPS_BY_KIND.num;

export interface PowerPivotFilter {
  id: string;
  /** row = filter raw transactions (CALCULATETABLE);  measure = filter result rows by aggregated value (HAVING) */
  scope: 'row' | 'measure';
  field: string;
  op: FilterOp;
  value?: string;
  value2?: string;
  values?: string[];
  enabled: boolean;
}

// ----------------------------------------------------------------------------
// Custom measures (user-defined CALCULATE / DIVIDE)
// ----------------------------------------------------------------------------
export type CustomAgg = 'sum' | 'count' | 'distinct_count' | 'avg' | 'min' | 'max';
export type CustomField = 'gold_weight' | 'total_amount' | 'phone' | 'rows';

export interface CustomMeasure {
  id: string;
  label: string;
  type: 'calc' | 'ratio';
  format: MeasureFormat;
  // calc
  agg?: CustomAgg;
  field?: CustomField;
  divisor?: number;
  filters?: PowerPivotFilter[];
  // ratio
  num?: string;
  den?: string;
  multiplier?: number;
}

// ----------------------------------------------------------------------------
// Pivot configuration & saved profile
// ----------------------------------------------------------------------------
export interface PowerPivotConfig {
  rows: string[];
  columns: string[];
  values: string[];
  filters: PowerPivotFilter[];
  customMeasures: CustomMeasure[];
  sortBy: string; // measure id or 'label'
  sortDir: 'asc' | 'desc';
  pageSize: number;
}

export interface PowerPivotProfile {
  id: string;
  name: string;
  description?: string;
  config: PowerPivotConfig;
  isFavorite: boolean;
  isPreset?: boolean;
  lastUsedAt?: string;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// RPC result
// ----------------------------------------------------------------------------
export interface PowerPivotResult {
  status: string;
  rows_dims: string[];
  column_dim: string | null;
  values: string[];
  page: number;
  page_size: number;
  total_rows: number;
  columns: string[];
  rows: Record<string, any>[];
  cells: Record<string, any>[];
  col_totals: Record<string, any>[];
  grand: Record<string, any> | null;
  elapsed_ms: number;
  sql_trace: string;
}

export interface PowerPivotMeta {
  total_rows: number;
  min_date: string | null;
  max_date: string | null;
  banks: string[];
  branches: string[];
  transaction_types: string[];
  statuses: string[];
  months?: string[];
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
export const DEFAULT_PAGE_SIZE = 500;
export const PAGE_SIZE_CHOICES = [100, 500, 1000, 2000, 5000];

export function newFilterId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function getFilterField(id: string): FilterFieldDef | undefined {
  return FILTER_FIELDS.find((f) => f.id === id);
}

export function getAllMeasures(custom: CustomMeasure[]): MeasureDef[] {
  const customDefs: MeasureDef[] = custom.map((c) => ({
    id: c.id,
    label: c.label,
    group: 'Custom',
    format: c.format,
    isCustom: true,
    dax:
      c.type === 'ratio'
        ? `DIVIDE([${c.num}], [${c.den}], 0)${c.multiplier && c.multiplier !== 1 ? ` * ${c.multiplier}` : ''}`
        : `CALCULATE(${(c.agg || 'sum').toUpperCase()}('${c.field}')${
            (c.filters || []).length ? ', ' + (c.filters || []).map(describeFilter).join(', ') : ''
          })${c.divisor && c.divisor !== 1 ? ` / ${c.divisor}` : ''}`,
  }));
  return [...BUILTIN_MEASURES, ...customDefs];
}

export function describeFilter(f: PowerPivotFilter): string {
  const field = getFilterField(f.field)?.label || f.field;
  if (f.op === 'between' || f.op === 'not_between') {
    return `${field} ${f.op === 'between' ? 'BETWEEN' : 'NOT BETWEEN'} ${f.value ?? '?'} AND ${f.value2 ?? '?'}`;
  }
  if (f.op === 'in' || f.op === 'not_in') {
    return `${field} ${f.op === 'in' ? 'IN' : 'NOT IN'} (${(f.values || []).join(', ') || '?'})`;
  }
  return `${field} ${f.op} ${f.value ?? '?'}`;
}

export function formatMeasureValue(v: unknown, fmt: MeasureFormat): string {
  if (v === null || v === undefined || v === '') return '-';
  if (fmt === 'datetime') return String(v);
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  const dec = fmt === 'int' ? 0 : fmt === 'dec1' ? 1 : fmt === 'dec4' ? 4 : 2;
  const s = n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return fmt === 'pct' ? `${n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : s;
}

export function createEmptyConfig(): PowerPivotConfig {
  return {
    rows: ['bank'],
    columns: [],
    values: ['total_buy_transac', 'total_unique_user', 'revenue_buy_mil', 'gold_weight_buy_g', 'gold_buy_size_g'],
    filters: [
      { id: newFilterId(), scope: 'row', field: 'transaction_type', op: '=', value: 'BUY_GOLD', enabled: true },
    ],
    customMeasures: [],
    sortBy: 'total_buy_transac',
    sortDir: 'desc',
    pageSize: DEFAULT_PAGE_SIZE,
  };
}
