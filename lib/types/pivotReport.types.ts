export type PivotRowDimension = 
  | 'date'
  | 'customer'
  | 'bank'
  | 'branch'
  | 'transaction_type'
  | 'month';

export interface PivotSlicerState {
  month: string;              // 'all' | "Apr'26" | "May'26" | ...
  tx_type: string;            // 'all' | 'BUY_GOLD' | 'SALE_GOLD' | ...
  is_500k_up: 'all' | 'yes' | 'no';
  is_2g_up: 'all' | 'yes' | 'no';
  is_3_75g_up: 'all' | 'yes' | 'no';
  is_15g_up: 'all' | 'yes' | 'no';
  status: string;             // 'all' | 'ສໍາເລັດ' | 'ປະຕິເສດ'
  day_num: string;            // 'all' | '1' | '2' | ... | 'weekday' | 'weekend'
  bank: string;               // 'all' | 'BCEL' | 'LDB' | 'JDB' | ...
}

export type PivotMetricId = 
  | 'total_buy_transac'
  | 'total_unique_user'
  | 'revenue_buy_mil_lak'
  | 'revenue_buy_lak'
  | 'gold_weight_buy_g'
  | 'gold_buy_size_g'
  | 'total_nc'
  | 'sum_gold_weight'
  | 'sum_amount_lak';

export interface PivotMetricDefinition {
  id: PivotMetricId;
  label: string;
  shortLabel: string;
  category: 'buy' | 'general' | 'volume' | 'users';
  unit: 'count' | 'users' | 'mil_lak' | 'lak' | 'grams' | 'ticket_g';
  decimals: number;
}

export interface PivotRowData {
  key: string;
  label: string;
  subLabel?: string;
  phone?: string;
  metrics: Record<PivotMetricId, number>;
  childCount?: number;
}

export interface PivotReportPayload {
  dimension: PivotRowDimension;
  slicers: PivotSlicerState;
  activeMetricIds: PivotMetricId[];
  rows: PivotRowData[];
  totals: Record<PivotMetricId, number>;
  totalRowCount: number;
}

export interface SavedReportingProfile {
  id: string;
  user_id?: string;
  profile_name: string;
  description?: string;
  row_dimension: PivotRowDimension;
  selected_metrics: PivotMetricId[];
  slicers: PivotSlicerState;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}
