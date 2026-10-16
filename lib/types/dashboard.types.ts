export interface WeeklyMetricRow {
  year_week: string;        // e.g. '2026-W41'
  week_label: string;       // e.g. 'W41'
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  all_transactions: number;
  active_users: number;
  new_registers: number;
  withdraw_gold_grams: number;
  buy_weight_15g: number;
  buy_transactions: number;
  buy_ticket_size_g: number;
  buy_value_mil_lak?: number;
  sell_weight_15g: number;
  sell_transactions: number;
  sell_ticket_size_g: number;
  sell_value_mil_lak?: number;
}

export interface MetricVariances {
  all_transactions: number;
  active_users: number;
  new_registers: number;
  withdraw_gold_grams: number;
  buy_weight_15g: number;
  buy_transactions: number;
  buy_ticket_size_g: number;
  buy_value_mil_lak?: number;
  sell_weight_15g: number;
  sell_transactions: number;
  sell_ticket_size_g: number;
  sell_value_mil_lak?: number;
}

export interface ExecutiveDashboardData {
  current_week: WeeklyMetricRow;
  previous_week?: WeeklyMetricRow;
  history: WeeklyMetricRow[];
  variances: MetricVariances;
  cached_at: string;
}

export type ThemeSectionColor = 'blue' | 'green' | 'red';
