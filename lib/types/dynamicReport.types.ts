export interface DynamicFilterState {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  quickPreset: string; // 'today' | 'yesterday' | 'last7d' | 'last30d' | 'this_month' | 'last_month' | 'q3' | 'q4' | 'custom'
  selectedBanks: string[]; // empty means all
  selectedBranches: string[]; // empty means all
  selectedTxTypes: string[]; // empty means all
  minWeight: number | null;
  maxWeight: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  startHour: number | null; // 0-23
  endHour: number | null; // 0-23
  selectedHours: number[]; // 0-23 multi-selection (empty array means all 24h)
  status: string; // 'all' | 'ສໍາເລັດ' (Completed) | 'ປະຕິເສດ' (Failed)
  customerSegment?: string; // 'all' | 'vip_15g' | 'medium_2_15g' | 'micro_2g'
  dayOfWeek?: string; // 'all' | 'weekdays' | 'weekends' (legacy)
  selectedDaysOfWeek: string[]; // ['mon', 'tue', ...] multi-selection (empty array means all 7 days)
  searchKeyword?: string;
}

export interface DaxMeasuresPayload {
  // Overall Platform & Engagement
  total_transaction: number;
  total_unique_user: number;
  freq_per_user_all: number;
  new_register: number;
  total_amount_lak: number;
  total_gold_weight_g: number;

  // Buy Performance
  total_buy_transac: number;
  user_buy: number;
  freq_per_user_buy: number;
  gold_weight_buy_g: number;
  gold_weight_buy_15g: number;
  revenue_buy_lak: number;
  revenue_buy_mil_lak: number;
  abs_buy_ticket_lak: number;
  gold_buy_size_g: number;

  // Sell Performance
  total_sell_transac: number;
  user_sell: number;
  freq_per_user_sell: number;
  gold_weight_sell_g: number;
  gold_weight_sell_15g: number;
  revenue_sell_lak: number;
  revenue_sell_mil_lak: number;
  avg_sell_size_lak: number;
  gold_sell_size_g: number;

  // Withdraw Performance
  withdraw_trans: number;
  user_withdraw_gold: number;
  withdraw_gold_g: number;
  withdraw_gold_15g: number;
  withdraw_value_lak: number;
  withdraw_value_mil_lak: number;
  withdraw_ticket_size_g: number;
  withdraw_ticket_size_lak: number;

  // Pricing & Net Flow
  net_flow_trans_pct: number;
  net_flow_value_pct: number;
  net_gold_weight_g: number;
  open_price: number;
  close_price: number;
  price_change: number;

  // Statistical Metrics
  avg_value_lak: number;
  min_value_lak: number;
  max_value_lak: number;
  median_value_lak: number;
  avg_weight_g: number;
  min_weight_g: number;
  max_weight_g: number;
  median_weight_g: number;
}

export interface HourlyMetric {
  hour: number;
  hour_label: string;
  total_tx: number;
  buy_tx: number;
  sell_tx: number;
  buy_weight_g: number;
  sell_weight_g: number;
  total_amount_lak: number;
}

export interface BankMetric {
  bank_name: string;
  total_tx: number;
  total_weight_g: number;
  total_amount_lak: number;
  share_pct: number;
  buy_tx?: number;
  sell_tx?: number;
  buy_amount_lak?: number;
  sell_amount_lak?: number;
  buy_share_pct?: number;
  sell_share_pct?: number;
}

export interface BranchMetric {
  branch_name: string;
  total_tx: number;
  total_weight_g: number;
  total_amount_lak: number;
  withdraw_tx: number;
}

export interface WeightBracketMetric {
  weight_bracket: string;
  count: number;
  total_weight_g: number;
  total_amount_lak: number;
}

export interface DayOfWeekMetric {
  day_code: string;
  day_label: string;
  day_full: string;
  total_tx: number;
  buy_tx: number;
  sell_tx: number;
  buy_weight_g: number;
  sell_weight_g: number;
  total_amount_lak: number;
}

export interface TrendPoint {
  label: string;
  subLabel?: string;
  tx_date?: string;
  buy_val: number;
  sell_val: number;
  total_val: number;
  buy_tx: number;
  sell_tx: number;
  total_tx: number;
  buy_weight_g: number;
  sell_weight_g: number;
  net_weight_g: number;
  nc: number;
}

export interface DynamicReportPayload {
  meta: {
    start_date: string;
    end_date: string;
    generated_at: string;
  };
  dax_measures: DaxMeasuresPayload;
  hourly: HourlyMetric[];
  banks: BankMetric[];
  branches: BranchMetric[];
  weight_brackets: WeightBracketMetric[];
  day_of_week?: DayOfWeekMetric[];
  timeline_trend?: TrendPoint[];
}

export interface DaxMeasureRow {
  name: string;
  category: 'Engagement' | 'Buy' | 'Sell' | 'Withdraw' | 'Price & Flow' | 'Statistics';
  daxFormula: string;
  value: string;
  description: string;
}
