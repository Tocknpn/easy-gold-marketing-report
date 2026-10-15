export type CampaignConditionType = 'amount_gte' | 'weight_gte' | 'weight_between' | 'amount_between' | 'tx_type' | 'custom';
export type CampaignOperator = '>=' | '<=' | 'between' | '==' | 'all';
export type CampaignStatus = 'active' | 'completed' | 'upcoming' | 'draft';

export interface CampaignSetupConfig {
  id: string;
  user_id?: string;
  campaign_name: string;
  description?: string;
  image_url?: string;                 // Profile pic or campaign logo/banner (URL or base64 data)
  category_tag?: string;              // 'Volume Driver' | 'Sprint Promo' | 'VIP Retention' | 'Acquisition'

  // Timeline
  campaign_date_start: string;        // YYYY-MM-DD
  campaign_date_end: string;          // YYYY-MM-DD
  data_update_on: string;             // YYYY-MM-DD (As-of date, defaults to DB MAX date)
  auto_sync_max_date?: boolean;       // If true, automatically uses MAX(created_at) from Supabase
  same_period_backward_start: string; // YYYY-MM-DD (Reverse calculated)
  same_period_backward_end: string;   // YYYY-MM-DD (Reverse calculated)

  // Conditions & Thresholds
  condition_type: CampaignConditionType;
  condition_operator: CampaignOperator;
  condition_value: number;            // Min threshold (e.g. 500000 LAK or 2.0g)
  condition_max_value?: number;       // For 'between' operators (e.g. 5.0g or 2,000,000 LAK)
  condition_label: string;            // 'Buy trans >= 500k', 'Weight 2.0g - 5.0g'
  tx_type: string;                    // 'BUY_GOLD', 'SALE_GOLD', 'all'
  status?: CampaignStatus;

  // Multiple Targets Configuration
  target_types: ('ec' | 'nc' | 'revenue' | 'weight')[];
  ec_target: number;                  // Existing/Total Transactions Target (e.g. 307500 or 12800)
  nc_target: number;                  // New Customers Target (e.g. 17220 or 2500)
  revenue_target_mil?: number;        // Revenue Target in Million LAK
  gold_weight_target_g?: number;      // Gold Weight Target in Grams
  baseline_daily_rr?: number;         // e.g. 79.0 (Avg Normal RR per Day baseline)
}

export interface CampaignTargetAchievementPayload {
  elapsed_days: number;
  total_days: number;
  remaining_days: number;
  pct_time_gone: number;              // e.g. 42%
  condition_label: string;
  is_ended: boolean;
  is_upcoming: boolean;
  status: CampaignStatus;
  
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
  
  // Revenue Target
  revenue_target_mil?: number;
  mtd_buy_value_mil_lak: number;
  rr_buy_value_mil_lak: number;
  revenue_pct_hit_mtd?: number;
  revenue_pct_hit_rr?: number;

  // Gold Weight Target
  gold_weight_target_g?: number;
  mtd_buy_weight_g: number;
  rr_buy_weight_g: number;
  weight_pct_hit_mtd?: number;
  weight_pct_hit_rr?: number;

  // Ticket Size
  mtd_ticket_size_g: number;
  rr_ticket_size_g: number;
  
  // Daily Averages & Pacing
  avg_buy_trans_target_per_day: number;
  act_buy_trans_per_day: number;
  required_daily_trans_remaining: number;
  daily_compare_pct: number;          // e.g. -5%
}

export interface CampaignBackwardComparisonPayload {
  backward_days: number;
  mtd_days: number;
  backward_start: string;
  backward_end: string;
  
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
  
  // Baseline Normal RR comparison
  baseline_normal_rr_per_day?: number;
  avg_campaign_daily_actual?: number;
  baseline_pct_compare?: number;      // e.g. +981%
}

export interface CampaignAnalyticsPayload {
  config: CampaignSetupConfig;
  targetAchievement: CampaignTargetAchievementPayload;
  backwardComparison: CampaignBackwardComparisonPayload;
  dataSource?: 'supabase_live' | 'computed_cache';
  evaluated_at?: string;
}
