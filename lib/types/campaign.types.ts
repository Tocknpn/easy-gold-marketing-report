export type CampaignConditionType = 'amount_gte' | 'weight_gte' | 'tx_type';

export interface CampaignSetupConfig {
  id: string;
  user_id?: string;
  campaign_name: string;
  description?: string;
  // Dates
  same_period_backward_start: string; // YYYY-MM-DD
  same_period_backward_end: string;   // YYYY-MM-DD
  campaign_date_start: string;        // YYYY-MM-DD
  campaign_date_end: string;          // YYYY-MM-DD
  data_update_on: string;             // YYYY-MM-DD (As-of date)
  // Conditions
  condition_type: CampaignConditionType;
  condition_value: number;            // 500000 (LAK) or 2.0 (grams)
  condition_label: string;            // 'Buy trans >= 500k' or 'Buy trans >= 2g'
  tx_type: string;                    // 'BUY_GOLD'
  // Targets
  ec_target: number;                  // e.g. 307500 or 12800
  nc_target: number;                  // e.g. 17220 or 2500
  baseline_daily_rr?: number;         // e.g. 79.0 (Avg Normal RR of Q3 per Day)
  status?: 'active' | 'completed' | 'draft';
}

export interface CampaignTargetAchievementPayload {
  elapsed_days: number;
  total_days: number;
  pct_time_gone: number;              // e.g. 42%
  condition_label: string;
  
  // EC Target
  ec_actual_mtd: number;
  ec_rr_projected: number;
  ec_target: number;
  ec_pct_hit_mtd: number;             // e.g. 40%
  ec_pct_hit_rr: number;              // e.g. 95%
  
  // NC Target
  nc_actual_mtd: number;
  nc_rr_projected: number;
  nc_target: number;
  nc_pct_hit_mtd: number;             // e.g. 14%
  nc_pct_hit_rr: number;              // e.g. 34%
  
  // Additional Metrics
  mtd_buy_weight_g: number;
  rr_buy_weight_g: number;
  mtd_buy_value_mil_lak: number;
  rr_buy_value_mil_lak: number;
  mtd_ticket_size_g: number;
  rr_ticket_size_g: number;
  
  // Daily Averages
  avg_buy_trans_target_per_day: number;
  act_buy_trans_per_day: number;
  daily_compare_pct: number;          // e.g. -5%
}

export interface CampaignBackwardComparisonPayload {
  backward_days: number;
  mtd_days: number;
  
  // Buy Transaction
  buy_trans_condition_label: string;
  buy_trans_mtd: number;
  buy_trans_backward: number;
  buy_trans_pct_compare: number;      // e.g. +35%
  
  // Buy Value
  buy_value_lak_mtd: number;
  buy_value_lak_backward: number;
  buy_value_pct_compare: number;      // e.g. +32%
  
  // Buy Weight
  buy_weight_g_mtd: number;
  buy_weight_g_backward: number;
  buy_weight_pct_compare: number;     // e.g. +29%
  
  // Buy Ticket Size
  ticket_size_g_mtd: number;
  ticket_size_g_backward: number;
  ticket_size_pct_compare: number;    // e.g. -4%
  
  // Baseline Normal RR comparison (optional)
  baseline_normal_rr_per_day?: number;
  avg_campaign_daily_actual?: number;
  baseline_pct_compare?: number;      // e.g. +981%
}

export interface CampaignAnalyticsPayload {
  config: CampaignSetupConfig;
  targetAchievement: CampaignTargetAchievementPayload;
  backwardComparison: CampaignBackwardComparisonPayload;
}
