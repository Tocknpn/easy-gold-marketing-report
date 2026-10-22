export interface MonthlyMarketingTarget {
  id?: string;
  year: number;
  month: number;
  month_label: string; // 'Jan', 'Feb', ...
  target_nc: number;
  buy_trans: number;
  buy_weight_g: number;
  sell_trans: number;
  sell_weight_g: number;
  buy_value_mil_lak?: number;
  sell_value_mil_lak?: number;
  total_trans?: number;
  notes?: string;
}

export interface RunRateRowData {
  id: string;
  label: string;
  indent?: boolean;
  section?: 'buy' | 'sell' | 'neutral';
  unit?: string;
  format?: 'number' | 'decimal' | 'lak';
  
  // Table 1: Full Month Compare
  comp_full_month: number;
  cur_mtd: number;
  rr_projected: number;
  diff_full: number;
  mom_full_pct: number;
  target_val?: number;
  vs_target_pct?: number; // RR / Target %

  // Table 2: Same Period Compare
  comp_same_period: number;
  cur_same_period: number;
  diff_same: number;
  mom_same_pct: number;
  vs_target_same_pct?: number; // MTD / Target %
}

export interface RunRateComparisonPayload {
  as_of_date: string; // '2026-10-15'
  display_as_of_date: string; // '15/10/2026'
  current_year: number;
  current_month: number; // 1-12
  current_month_label: string; // 'Oct'
  comparison_year: number;
  comparison_month: number; // 1-12
  comparison_month_label: string; // 'Sep'
  
  days_elapsed: number; // 15
  total_days_in_month: number; // 31
  time_gone_pct: number; // 48
  run_rate_multiplier: number; // 31 / 15 = 2.0667

  // Summary footer averages
  table1_avg_mom: number;
  table2_avg_mom: number;

  rows: RunRateRowData[];

  // Visual tracking cards for Image 3
  monthly_tracking: {
    days_gone: number;
    days_gone_pct: number;
    metrics: Array<{
      id: string;
      label: string;
      current_pct: number; // e.g. 19%
      est_target_hit_pct: number; // e.g. 53%
      target: number;
      actual: number;
      status: 'below' | 'near' | 'ahead';
    }>;
    counts: {
      below: number;
      near: number;
      ahead: number;
    };
  };

  ytd_tracking: {
    year: number;
    days_gone: number;
    days_gone_pct: number; // e.g. 78%
    metrics: Array<{
      id: string;
      label: string;
      current_pct: number; // e.g. 102%
      est_year_end_pct: number; // e.g. 131%
      ytd_target: number;
      ytd_actual: number;
      status: 'below' | 'near' | 'ahead';
    }>;
    counts: {
      below: number;
      near: number;
      ahead: number;
    };
  };
}
