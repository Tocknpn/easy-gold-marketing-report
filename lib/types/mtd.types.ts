export type MtdCalculationMode = 'calendar_days' | 'working_days';

export interface MtdMetricItem {
  id: string;
  label: string;
  unit?: string;
  is_decimal?: boolean;
  icon_name: 'shopping-bag' | 'shopping-cart' | 'tag' | 'scale' | 'layers' | 'user-plus' | 'arrow-left-right';
  current_mtd: number;
  comp_mtd: number; // Same elapsed days or working days in comparison month
  mtd_variance_percent: number;
  est_month_end: number;
  full_comp_month: number;
  forecast_variance_percent: number;
}

export interface MtdReportPayload {
  as_of_date: string; // ISO date '2026-10-11'
  display_as_of_date: string; // '11/10/2026'
  current_month_label: string; // "Oct'26"
  current_month_year: number; // 2026
  current_month_num: number; // 10
  comparison_month_label: string; // "Sep'26"
  comparison_month_year: number; // 2026
  comparison_month_num: number; // 9
  elapsed_days: number; // 11
  total_days_current_month: number; // 31
  elapsed_working_days: number; // e.g. 8
  total_working_days_current_month: number; // e.g. 22
  calculation_mode: MtdCalculationMode;
  metrics: {
    buy_weight_g: MtdMetricItem;
    buy_transactions: MtdMetricItem;
    sell_weight_g: MtdMetricItem;
    sell_transactions: MtdMetricItem;
    withdraw_15g: MtdMetricItem;
    new_customers: MtdMetricItem;
    total_transactions: MtdMetricItem;
  };
  available_months?: Array<{
    label: string;
    year: number;
    month: number;
  }>;
}
