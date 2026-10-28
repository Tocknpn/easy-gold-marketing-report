// ============================================================================
// Power Pivot Studio - shared types + field / measure catalogs + conflict engine
// Dimension & measure ids MUST match sql/49_custom_pivot_topn_datetime_validation.sql
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
  { id: 'datetime', label: 'Date & Time (HH:mm)', group: 'Time', hint: 'YYYY-MM-DD HH:mm' },
  { id: 'day_mon', label: 'Day (18-Oct)', group: 'Time', hint: 'DD-Mon (e.g. 18-Oct)' },
  { id: 'week', label: 'Week (ISO)', group: 'Time', hint: '2026-W41' },
  { id: 'month', label: 'Month', group: 'Time', hint: '2026-10' },
  { id: 'weekday', label: 'Day of Week', group: 'Time', hint: '1-Mon .. 7-Sun' },
  { id: 'hour', label: 'Hour of Day', group: 'Time', hint: '00 .. 23' },
  { id: 'phone', label: 'Phone', group: 'Customer', hint: 'Customer Phone Number' },
  { id: 'customer_name', label: 'Customer Name', group: 'Customer', hint: 'Customer Full Name' },
  { id: 'phone_customer', label: 'Phone & Customer', group: 'Customer', hint: '020xxxx - Name' },
  { id: 'bank', label: 'Banking Gateway', group: 'Location & Channel', hint: 'BCEL, LDB, JDB ...' },
  { id: 'branch', label: 'Branch', group: 'Location & Channel', hint: 'Vientiane, Pakse, Digital App ...' },
  { id: 'transaction_type', label: 'Transaction Type', group: 'Transaction', hint: 'BUY_GOLD, SALE_GOLD, WITHDRAW_GOLD ...' },
  { id: 'status', label: 'Status', group: 'Transaction', hint: 'ສໍາເລັດ / ປະຕິເສດ' },
  { id: 'amount_band', label: 'Amount Band (LAK)', group: 'Bands', hint: '<100K ... >=5M' },
  { id: 'weight_band', label: 'Weight Band (g)', group: 'Bands', hint: '<1g ... >=15g' },
];

export type MeasureFormat = 'int' | 'dec1' | 'dec2' | 'dec4' | 'pct' | 'datetime';
export type MeasureGroup =
  | 'Transactions'
  | 'Users'
  | 'Revenue (mil LAK)'
  | 'Gold Weight'
  | 'Ticket & Ratios'
  | 'Raw Sums'
  | 'Custom';

export interface MeasureDef {
  id: string;
  label: string;
  /** DAX-style formula shown in "Manage Measures" (mirrors your Excel Power Pivot) */
  dax: string;
  format: MeasureFormat;
  group: MeasureGroup;
  isCustom?: boolean;
  /** Which transaction_type this measure inherently filters on, if any */
  txScope?: 'BUY' | 'SELL' | 'WITHDRAW' | 'OPEN' | 'BUY_SELL' | 'ALL';
}

export const BUILTIN_MEASURES: MeasureDef[] = [
  // Transactions
  { id: 'total_transaction', label: 'Total transaction', group: 'Transactions', format: 'int', txScope: 'ALL', dax: 'CALCULATE(COUNT([Source.Name]))' },
  { id: 'total_buy_transac', label: 'Total Buy Transac', group: 'Transactions', format: 'int', txScope: 'BUY', dax: 'CALCULATE(COUNT([Source.Name]), \'Raw Data\'[type]="BUY_GOLD")' },
  { id: 'total_sell_transac', label: 'Total Sell Transac', group: 'Transactions', format: 'int', txScope: 'SELL', dax: 'CALCULATE(COUNT([Source.Name]), \'Raw Data\'[type]="SALE_GOLD")' },
  { id: 'withdraw_trans', label: 'Withdraw Trans', group: 'Transactions', format: 'int', txScope: 'WITHDRAW', dax: 'CALCULATE(COUNT([Source.Name]), \'Raw Data\'[type] IN {"WITHDRAW_GOLD","MARKETHUB_WITHDRAW"})' },
  { id: 'new_register', label: 'New Register', group: 'Transactions', format: 'int', txScope: 'OPEN', dax: 'CALCULATE(COUNT([Source.Name]), \'Raw Data\'[type]="OPEN_ACCOUNT")' },
  { id: 'min_datetime', label: 'Min Datetime', group: 'Transactions', format: 'datetime', txScope: 'ALL', dax: 'MIN(\'Raw Data\'[created_at])' },
  { id: 'max_datetime', label: 'Max Datetime', group: 'Transactions', format: 'datetime', txScope: 'ALL', dax: 'MAX(\'Raw Data\'[created_at])' },
  // Users
  { id: 'total_unique_user', label: 'Total unique user', group: 'Users', format: 'int', txScope: 'ALL', dax: 'CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone]), FILTER(\'Raw Data\'[phone]<>BLANK()))' },
  { id: 'user_buy', label: 'User Buy', group: 'Users', format: 'int', txScope: 'BUY', dax: 'CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone]), \'Raw Data\'[type]="BUY_GOLD")' },
  { id: 'user_sell', label: 'User Sell', group: 'Users', format: 'int', txScope: 'SELL', dax: 'CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone]), \'Raw Data\'[type]="SALE_GOLD")' },
  { id: 'user_withdraw', label: 'User Withdraw Gold', group: 'Users', format: 'int', txScope: 'WITHDRAW', dax: 'CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone]), \'Raw Data\'[type] IN {"WITHDRAW_GOLD","MARKETHUB_WITHDRAW"})' },
  { id: 'freq_per_user_all', label: 'Freq per user all', group: 'Users', format: 'dec2', txScope: 'ALL', dax: 'DIVIDE([Total transaction], CALCULATE(DISTINCTCOUNT(\'Raw Data\'[phone])), 0)' },
  { id: 'freq_per_user_buy', label: 'Freq per User Buy', group: 'Users', format: 'dec2', txScope: 'BUY', dax: 'DIVIDE([Total Buy Transac], [User Buy], 0)' },
  { id: 'freq_per_user_sell', label: 'Freq per User Sell', group: 'Users', format: 'dec2', txScope: 'SELL', dax: 'DIVIDE([Total Sell Transac], [User Sell], 0)' },
  // Revenue
  { id: 'revenue_buy_mil', label: 'Revenue Buy (mil lak)', group: 'Revenue (mil LAK)', format: 'dec2', txScope: 'BUY', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type]="BUY_GOLD") / 1000000' },
  { id: 'revenue_buy_lak', label: 'Total Buy Value (LAK)', group: 'Revenue (mil LAK)', format: 'int', txScope: 'BUY', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type]="BUY_GOLD")' },
  { id: 'revenue_sell_mil', label: 'Revenue Sell (mil LAK)', group: 'Revenue (mil LAK)', format: 'dec2', txScope: 'SELL', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type]="SALE_GOLD") / 1000000' },
  { id: 'revenue_sell_lak', label: 'Total Sell Value (LAK)', group: 'Revenue (mil LAK)', format: 'int', txScope: 'SELL', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type]="SALE_GOLD")' },
  { id: 'withdraw_value_mil', label: 'Withdraw Value (mil LAK)', group: 'Revenue (mil LAK)', format: 'dec2', txScope: 'WITHDRAW', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type] IN {"WITHDRAW_GOLD","MARKETHUB_WITHDRAW"}) / 1000000' },
  { id: 'withdraw_value_lak', label: 'Total Withdraw Value (LAK)', group: 'Revenue (mil LAK)', format: 'int', txScope: 'WITHDRAW', dax: 'CALCULATE(SUM(\'Raw Data\'[amount]), \'Raw Data\'[type] IN {"WITHDRAW_GOLD","MARKETHUB_WITHDRAW"})' },
  { id: 'abs_value_mil', label: 'ABS (Buy - Sell, mil)', group: 'Revenue (mil LAK)', format: 'dec2', txScope: 'BUY_SELL', dax: '([Revenue Buy (mil lak)] - [Revenue Sell (mil LAK)])' },
  // Gold weight
  { id: 'gold_weight_buy_g', label: 'Gold Weigh Buy (g)', group: 'Gold Weight', format: 'dec2', txScope: 'BUY', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="BUY_GOLD")' },
  { id: 'gold_weight_sell_g', label: 'Gold Weigh Sell (g)', group: 'Gold Weight', format: 'dec2', txScope: 'SELL', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="SALE_GOLD")' },
  { id: 'withdraw_gold_g', label: 'Total Withdraw Weight (g)', group: 'Gold Weight', format: 'dec2', txScope: 'WITHDRAW', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type] IN {"WITHDRAW_GOLD","MARKETHUB_WITHDRAW"})' },
  { id: 'gold_weight_buy_15g', label: 'Gold Weigh Buy (15g)', group: 'Gold Weight', format: 'dec2', txScope: 'BUY', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="BUY_GOLD") / 15' },
  { id: 'gold_weight_sell_15g', label: 'Gold Weigh Sell (15g)', group: 'Gold Weight', format: 'dec2', txScope: 'SELL', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type]="SALE_GOLD") / 15' },
  { id: 'withdraw_gold_15g', label: 'Withdraw gold (15g)', group: 'Gold Weight', format: 'dec2', txScope: 'WITHDRAW', dax: 'CALCULATE(SUM(\'Raw Data\'[weight]), \'Raw Data\'[type] IN {"WITHDRAW_GOLD","MARKETHUB_WITHDRAW"}) / 15' },
  // Ticket & Ratios
  { id: 'gold_buy_size_g', label: 'Gold Buy Size (g)', group: 'Ticket & Ratios', format: 'dec2', txScope: 'BUY', dax: 'DIVIDE([Gold Weigh Buy (g)], [Total Buy Transac], 0)' },
  { id: 'gold_sell_size_g', label: 'Gold Sell Size (g)', group: 'Ticket & Ratios', format: 'dec2', txScope: 'SELL', dax: 'DIVIDE([Gold Weigh Sell (g)], [Total Sell Transac], 0)' },
  { id: 'avg_sell_size', label: 'Avg. Sell size (mil)', group: 'Ticket & Ratios', format: 'dec4', txScope: 'SELL', dax: '[Revenue Sell (mil LAK)] / [Total Sell Transac]' },
  { id: 'net_flow_trans', label: '%Net Flow (trans)', group: 'Ticket & Ratios', format: 'pct', txScope: 'BUY_SELL', dax: '[Total Buy Transac] / [Total transaction]' },
  { id: 'net_flow_value', label: '%Net Flow (value)', group: 'Ticket & Ratios', format: 'pct', txScope: 'BUY_SELL', dax: 'DIVIDE([Revenue Buy (mil lak)], ([Revenue Buy (mil lak)] + [Revenue Sell (mil LAK)]), 0)' },
  // Raw sums
  { id: 'sum_gold_weight', label: 'Sum of gold weight (g)', group: 'Raw Sums', format: 'dec2', txScope: 'ALL', dax: 'SUM(\'Raw Data\'[weight])' },
  { id: 'sum_amount_lak', label: 'Sum of amount (LAK)', group: 'Raw Sums', format: 'int', txScope: 'ALL', dax: 'SUM(\'Raw Data\'[amount])' },
  { id: 'avg_gold_weight', label: 'Avg gold weight (g)', group: 'Raw Sums', format: 'dec2', txScope: 'ALL', dax: 'AVERAGE(\'Raw Data\'[weight])' },
  { id: 'avg_amount_lak', label: 'Avg amount (LAK)', group: 'Raw Sums', format: 'int', txScope: 'ALL', dax: 'AVERAGE(\'Raw Data\'[amount])' },
];

// ----------------------------------------------------------------------------
// Top N Leaderboard Quick Presets (Requested 7 Metrics)
// ----------------------------------------------------------------------------
export interface TopNMetricOption {
  id: string;
  label: string;
  shortLabel: string;
  companionValues: string[];
}

export const TOP_N_METRICS: TopNMetricOption[] = [
  {
    id: 'gold_weight_buy_g',
    label: 'Total Buy Weight (g)',
    shortLabel: 'Total Buy Weight',
    companionValues: ['gold_weight_buy_g', 'total_buy_transac', 'revenue_buy_mil', 'gold_buy_size_g'],
  },
  {
    id: 'gold_weight_sell_g',
    label: 'Total Sell Weight (g)',
    shortLabel: 'Total Sell Weight',
    companionValues: ['gold_weight_sell_g', 'total_sell_transac', 'revenue_sell_mil', 'gold_sell_size_g'],
  },
  {
    id: 'revenue_buy_mil',
    label: 'Total Buy Value (mil LAK)',
    shortLabel: 'Total Buy Value',
    companionValues: ['revenue_buy_mil', 'revenue_buy_lak', 'gold_weight_buy_g', 'total_buy_transac'],
  },
  {
    id: 'withdraw_gold_g',
    label: 'Total Withdraw Weight (g)',
    shortLabel: 'Total Withdraw Weight',
    companionValues: ['withdraw_gold_g', 'withdraw_gold_15g', 'withdraw_trans', 'withdraw_value_mil'],
  },
  {
    id: 'total_buy_transac',
    label: 'Most Buy Transaction',
    shortLabel: 'Most Buy Tx',
    companionValues: ['total_buy_transac', 'gold_weight_buy_g', 'revenue_buy_mil', 'gold_buy_size_g'],
  },
  {
    id: 'total_sell_transac',
    label: 'Most Sell Transaction',
    shortLabel: 'Most Sell Tx',
    companionValues: ['total_sell_transac', 'gold_weight_sell_g', 'revenue_sell_mil', 'gold_sell_size_g'],
  },
  {
    id: 'withdraw_trans',
    label: 'Most Withdraw Transaction',
    shortLabel: 'Most Withdraw Tx',
    companionValues: ['withdraw_trans', 'withdraw_gold_g', 'withdraw_gold_15g', 'withdraw_value_mil'],
  },
];

export const TOP_N_CHOICES = [5, 10, 20, 50, 100, 200, 500];

// ----------------------------------------------------------------------------
// Filters (Power BI CALCULATETABLE / FILTER style)
// ----------------------------------------------------------------------------
export type FilterKind = 'num' | 'date' | 'datetime' | 'txt';
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
  { id: 'datetime', label: 'Datetime (YYYY-MM-DD HH:mm)', kind: 'datetime' },
  { id: 'date', label: 'Transaction Date (YYYY-MM-DD)', kind: 'date' },
  { id: 'hour', label: 'Hour of Day (0-23)', kind: 'num' },
  { id: 'month', label: 'Month (YYYY-MM)', kind: 'txt', optionsKey: 'months' },
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
  datetime: [
    { id: 'between', label: 'FROM datetime TO datetime' },
    { id: '>=', label: 'On/After datetime' },
    { id: '<=', label: 'On/Before datetime' },
    { id: 'not_between', label: 'NOT between datetimes' },
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
  sortBy: string; // measure id, dimension id, 'r1'..'r3', or 'label'
  sortDir: 'asc' | 'desc';
  pageSize: number;
  topN?: number | null;
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
  top_n?: number | null;
  total_rows: number;
  unfiltered_groups?: number;
  columns: string[];
  rows: Record<string, any>[];
  cells: Record<string, any>[];
  col_totals: Record<string, any>[];
  page_grand?: Record<string, any> | null;
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
// Conflict & Validation Engine
// ----------------------------------------------------------------------------
export interface PivotConflict {
  id: string;
  severity: 'error' | 'warning';
  title: string;
  detail: string;
  filterIds: string[];
  autoFixLabel: string;
  applyFix: (cfg: PowerPivotConfig) => PowerPivotConfig;
}

export function validatePivotConfig(config: PowerPivotConfig): PivotConflict[] {
  const conflicts: PivotConflict[] = [];
  const enabledFilters = config.filters.filter((f) => f.enabled);
  const allMeasures = getAllMeasures(config.customMeasures);

  // 1. Check empty filter values
  const emptyFilters = enabledFilters.filter((f) => {
    if (f.op === 'in' || f.op === 'not_in') {
      return !f.values || f.values.length === 0;
    }
    if (f.op === 'between' || f.op === 'not_between') {
      return !f.value || String(f.value).trim() === '' || !f.value2 || String(f.value2).trim() === '';
    }
    return !f.value || String(f.value).trim() === '';
  });
  if (emptyFilters.length > 0) {
    conflicts.push({
      id: 'empty_filter_values',
      severity: 'warning',
      title: 'Incomplete Filter Criteria Detected',
      detail: `${emptyFilters.length} active filter(s) have empty value(s) (${emptyFilters.map((f) => getFilterField(f.field)?.label || f.field).join(', ')}). Empty filters will be ignored unless disabled or filled.`,
      filterIds: emptyFilters.map((f) => f.id),
      autoFixLabel: 'Disable incomplete filters',
      applyFix: (cfg) => ({
        ...cfg,
        filters: cfg.filters.map((f) =>
          emptyFilters.some((ef) => ef.id === f.id) ? { ...f, enabled: false } : f
        ),
      }),
    });
  }

  // 2. Check inverted BETWEEN ranges (From > To)
  enabledFilters.forEach((f) => {
    if ((f.op === 'between' || f.op === 'not_between') && f.value && f.value2) {
      const def = getFilterField(f.field);
      const isNum = f.scope === 'measure' || def?.kind === 'num';
      const inv = isNum
        ? Number(f.value) > Number(f.value2)
        : String(f.value).replace('T', ' ') > String(f.value2).replace('T', ' ');
      if (inv) {
        conflicts.push({
          id: `inverted_range_${f.id}`,
          severity: 'error',
          title: `Inverted Range on "${def?.label || f.field}"`,
          detail: `"From" value (${f.value}) is greater than "To" value (${f.value2}). SQL BETWEEN will return 0 rows.`,
          filterIds: [f.id],
          autoFixLabel: `Swap From (${f.value2}) and To (${f.value})`,
          applyFix: (cfg) => ({
            ...cfg,
            filters: cfg.filters.map((x) =>
              x.id === f.id ? { ...x, value: f.value2, value2: f.value } : x
            ),
          }),
        });
      }
    }
  });

  // 3. Check Transaction Type row filter vs Selected Measures collision
  // e.g. Row filter has transaction_type = BUY_GOLD, but user selected Sell or Withdraw measures
  const txTypeFilters = enabledFilters.filter((f) => f.scope === 'row' && f.field === 'transaction_type');
  if (txTypeFilters.length > 0) {
    const selectedMeasureDefs = config.values
      .map((id) => allMeasures.find((m) => m.id === id))
      .filter((m): m is MeasureDef => !!m);

    const neededScopes = new Set<string>();
    selectedMeasureDefs.forEach((m) => {
      if (m.txScope === 'BUY') neededScopes.add('BUY_GOLD');
      if (m.txScope === 'SELL') neededScopes.add('SALE_GOLD');
      if (m.txScope === 'WITHDRAW') {
        neededScopes.add('WITHDRAW_GOLD');
        neededScopes.add('MARKETHUB_WITHDRAW');
      }
      if (m.txScope === 'OPEN') neededScopes.add('OPEN_ACCOUNT');
      if (m.txScope === 'BUY_SELL') {
        neededScopes.add('BUY_GOLD');
        neededScopes.add('SALE_GOLD');
      }
    });

    txTypeFilters.forEach((tf) => {
      const allowedTypes =
        tf.op === '=' && tf.value
          ? [tf.value]
          : tf.op === 'in' && tf.values?.length
          ? tf.values
          : null;

      if (allowedTypes && neededScopes.size > 0) {
        const blockedMeasures = selectedMeasureDefs.filter((m) => {
          if (m.txScope === 'BUY' && !allowedTypes.includes('BUY_GOLD')) return true;
          if (m.txScope === 'SELL' && !allowedTypes.includes('SALE_GOLD')) return true;
          if (
            m.txScope === 'WITHDRAW' &&
            !allowedTypes.some((t) => t.includes('WITHDRAW'))
          )
            return true;
          if (m.txScope === 'OPEN' && !allowedTypes.includes('OPEN_ACCOUNT')) return true;
          if (
            m.txScope === 'BUY_SELL' &&
            (!allowedTypes.includes('BUY_GOLD') || !allowedTypes.includes('SALE_GOLD'))
          )
            return true;
          return false;
        });

        if (blockedMeasures.length > 0) {
          conflicts.push({
            id: `tx_type_vs_measure_${tf.id}`,
            severity: 'error',
            title: 'Row Filter Blocks Selected Metrics (Will Return 0)',
            detail: `Row Filter restricts Transaction Type to [${allowedTypes.join(', ')}], which forces [${blockedMeasures.map((m) => m.label).join(', ')}] to return 0. Each specific Buy/Sell/Withdraw measure already filters its own transaction type automatically.`,
            filterIds: [tf.id],
            autoFixLabel: 'Remove restrictive Transaction Type row filter',
            applyFix: (cfg) => ({
              ...cfg,
              filters: cfg.filters.filter((x) => x.id !== tf.id),
            }),
          });
        }
      }
    });
  }

  // 4. Check Month Filter vs Date / Datetime Filter collision
  const monthFilter = enabledFilters.find((f) => f.scope === 'row' && f.field === 'month');
  const dateFilters = enabledFilters.filter(
    (f) => f.scope === 'row' && (f.field === 'date' || f.field === 'datetime')
  );
  if (monthFilter && dateFilters.length > 0) {
    const selectedMonths =
      monthFilter.op === 'in'
        ? monthFilter.values || []
        : monthFilter.op === '=' && monthFilter.value
        ? [monthFilter.value]
        : [];
    if (selectedMonths.length > 0) {
      dateFilters.forEach((df) => {
        const d1Month = df.value ? String(df.value).slice(0, 7) : '';
        const d2Month = df.value2 ? String(df.value2).slice(0, 7) : d1Month;
        if (d1Month && /^\d{4}-\d{2}$/.test(d1Month)) {
          const overlaps = selectedMonths.some((m) => m >= d1Month && m <= (d2Month || d1Month));
          if (!overlaps) {
            conflicts.push({
              id: `month_vs_date_${df.id}`,
              severity: 'error',
              title: 'Month Slicer Conflicts with Date/Datetime Filter',
              detail: `Month filter is set to [${selectedMonths.join(', ')}], but ${df.field} filter is set to [${df.value}${df.value2 ? ' → ' + df.value2 : ''}]. Since both filters don't overlap, the query will return 0 rows.`,
              filterIds: [monthFilter.id, df.id],
              autoFixLabel: 'Clear Month slicer and use Date/Datetime filter',
              applyFix: (cfg) => ({
                ...cfg,
                filters: cfg.filters.filter((x) => x.id !== monthFilter.id),
              }),
            });
          }
        }
      });
    }
  }

  // 5. Check contradictory filters on the same field (e.g. two '=' with different values, or min > max)
  const rowFiltersByField = new Map<string, PowerPivotFilter[]>();
  enabledFilters
    .filter((f) => f.scope === 'row')
    .forEach((f) => {
      rowFiltersByField.set(f.field, [...(rowFiltersByField.get(f.field) || []), f]);
    });

  rowFiltersByField.forEach((list, field) => {
    if (list.length < 2) return;
    const label = getFilterField(field)?.label || field;
    const eqs = list.filter((f) => f.op === '=' && f.value);
    if (eqs.length >= 2) {
      const distinctVals = Array.from(new Set(eqs.map((f) => f.value)));
      if (distinctVals.length >= 2) {
        conflicts.push({
          id: `contradict_eq_${field}`,
          severity: 'error',
          title: `Contradictory "=" Filters on ${label}`,
          detail: `Multiple "${label} =" filters require a single transaction to equal [${distinctVals.join(' AND ')}] simultaneously, which is impossible.`,
          filterIds: eqs.map((f) => f.id),
          autoFixLabel: `Combine into "${label} IN (${distinctVals.join(', ')})"`,
          applyFix: (cfg) => {
            const firstId = eqs[0].id;
            const otherIds = new Set(eqs.slice(1).map((x) => x.id));
            return {
              ...cfg,
              filters: cfg.filters
                .filter((x) => !otherIds.has(x.id))
                .map((x) =>
                  x.id === firstId
                    ? { ...x, op: 'in', values: distinctVals as string[], value: distinctVals[0] }
                    : x
                ),
            };
          },
        });
      }
    }

    // Numeric / Date >= vs <= contradiction across separate filter rows
    const def = getFilterField(field);
    if (def?.kind === 'num' || def?.kind === 'date' || def?.kind === 'datetime') {
      const mins = list.filter((f) => (f.op === '>=' || f.op === '>') && f.value);
      const maxs = list.filter((f) => (f.op === '<=' || f.op === '<') && f.value);
      if (mins.length && maxs.length) {
        const minF = mins[0];
        const maxF = maxs[0];
        const isConflict =
          def.kind === 'num'
            ? Number(minF.value) > Number(maxF.value)
            : String(minF.value).replace('T', ' ') > String(maxF.value).replace('T', ' ');
        if (isConflict) {
          conflicts.push({
            id: `contradict_minmax_${field}`,
            severity: 'error',
            title: `Contradictory Range Filters on ${label}`,
            detail: `Filter "${label} ${minF.op} ${minF.value}" conflicts with "${label} ${maxF.op} ${maxF.value}" (minimum is greater than maximum).`,
            filterIds: [minF.id, maxF.id],
            autoFixLabel: `Swap ${minF.value} and ${maxF.value}`,
            applyFix: (cfg) => ({
              ...cfg,
              filters: cfg.filters.map((x) => {
                if (x.id === minF.id) return { ...x, value: maxF.value };
                if (x.id === maxF.id) return { ...x, value: minF.value };
                return x;
              }),
            }),
          });
        }
      }
    }
  });

  return conflicts;
}

export function applyAllConflictFixes(
  config: PowerPivotConfig,
  conflicts: PivotConflict[]
): PowerPivotConfig {
  return conflicts.reduce((acc, c) => c.applyFix(acc), config);
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
    txScope: 'ALL',
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
    return `${field} ${f.op === 'between' ? 'BETWEEN' : 'NOT BETWEEN'} ${String(f.value ?? '?').replace('T', ' ')} AND ${String(f.value2 ?? '?').replace('T', ' ')}`;
  }
  if (f.op === 'in' || f.op === 'not_in') {
    return `${field} ${f.op === 'in' ? 'IN' : 'NOT IN'} (${(f.values || []).join(', ') || '?'})`;
  }
  return `${field} ${f.op} ${String(f.value ?? '?').replace('T', ' ')}`;
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
      { id: newFilterId(), scope: 'row', field: 'status', op: '=', value: 'ສໍາເລັດ', enabled: true },
    ],
    customMeasures: [],
    sortBy: 'total_buy_transac',
    sortDir: 'desc',
    pageSize: DEFAULT_PAGE_SIZE,
    topN: null,
  };
}
