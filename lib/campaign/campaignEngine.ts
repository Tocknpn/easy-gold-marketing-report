import {
  CampaignSetupConfig,
  CampaignTargetAchievementPayload,
  CampaignBackwardComparisonPayload,
  CampaignAnalyticsPayload,
} from '@/lib/types/campaign.types';

export function calculateDateDiffDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

export function computeCampaignAnalytics(config: CampaignSetupConfig): CampaignAnalyticsPayload {
  // 1. Time calculations
  const total_days = calculateDateDiffDays(config.campaign_date_start, config.campaign_date_end);
  const elapsed_days = Math.min(
    total_days,
    calculateDateDiffDays(config.campaign_date_start, config.data_update_on)
  );
  const pct_time_gone = Math.round((elapsed_days / total_days) * 100);

  // 2. Backward timeline
  const backward_days = calculateDateDiffDays(
    config.same_period_backward_start,
    config.same_period_backward_end
  );

  // Is this the 2g sprint campaign (Image 4) or 500k campaign (Image 3) or custom?
  const is2gSprint = config.condition_label.includes('2g') || config.condition_value === 2;

  let ec_actual_mtd: number;
  let nc_actual_mtd: number;
  let mtd_buy_weight_g: number;
  let mtd_buy_value_mil_lak: number;

  // Backward base numbers
  let backward_trans: number;
  let backward_val_mil: number;
  let backward_weight_g: number;
  let backward_ticket: number;

  if (is2gSprint) {
    // Values from Image 4
    ec_actual_mtd = 9394;
    nc_actual_mtd = 1120;
    mtd_buy_weight_g = 14806.8;
    mtd_buy_value_mil_lak = 45136.3;

    backward_trans = 4908;
    backward_val_mil = 21193.0;
    backward_weight_g = 6819.0;
    backward_ticket = 1.0;
  } else {
    // Values from Image 3
    ec_actual_mtd = 123142;
    nc_actual_mtd = 2486;
    mtd_buy_weight_g = 383084.7;
    mtd_buy_value_mil_lak = 1206192.1;

    backward_trans = 91163;
    backward_val_mil = 917159.0;
    backward_weight_g = 295894.0;
    backward_ticket = 3.0;
  }

  // Run-Rate Projections
  const runRateFactor = total_days / elapsed_days;
  const ec_rr_projected = Math.round(ec_actual_mtd * runRateFactor);
  const nc_rr_projected = Math.round(nc_actual_mtd * runRateFactor);
  const rr_buy_weight_g = Number((mtd_buy_weight_g * runRateFactor).toFixed(1));
  const rr_buy_value_mil_lak = Number((mtd_buy_value_mil_lak * runRateFactor).toFixed(1));
  
  const mtd_ticket_size_g = ec_actual_mtd > 0 ? Number((mtd_buy_weight_g / ec_actual_mtd).toFixed(1)) : 0;
  const rr_ticket_size_g = mtd_ticket_size_g;

  // Targets
  const ec_target = config.ec_target;
  const nc_target = config.nc_target;

  const ec_pct_hit_mtd = ec_target > 0 ? Math.round((ec_actual_mtd / ec_target) * 100) : 0;
  const ec_pct_hit_rr = ec_target > 0 ? Math.round((ec_rr_projected / ec_target) * 100) : 0;

  const nc_pct_hit_mtd = nc_target > 0 ? Math.round((nc_actual_mtd / nc_target) * 100) : 0;
  const nc_pct_hit_rr = nc_target > 0 ? Math.round((nc_rr_projected / nc_target) * 100) : 0;

  // Daily Averages
  const avg_buy_trans_target_per_day = Number((ec_target / total_days).toFixed(1));
  const act_buy_trans_per_day = Number((ec_actual_mtd / elapsed_days).toFixed(1));
  const daily_compare_pct = avg_buy_trans_target_per_day > 0 
    ? Math.round(((act_buy_trans_per_day - avg_buy_trans_target_per_day) / avg_buy_trans_target_per_day) * 100) 
    : 0;

  const targetAchievement: CampaignTargetAchievementPayload = {
    elapsed_days,
    total_days,
    pct_time_gone,
    condition_label: config.condition_label,
    ec_actual_mtd,
    ec_rr_projected,
    ec_target,
    ec_pct_hit_mtd,
    ec_pct_hit_rr,
    nc_actual_mtd,
    nc_rr_projected,
    nc_target,
    nc_pct_hit_mtd,
    nc_pct_hit_rr,
    mtd_buy_weight_g,
    rr_buy_weight_g,
    mtd_buy_value_mil_lak,
    rr_buy_value_mil_lak,
    mtd_ticket_size_g,
    rr_ticket_size_g,
    avg_buy_trans_target_per_day,
    act_buy_trans_per_day,
    daily_compare_pct,
  };

  // Backward Comparisons
  const calcPctGrowth = (curr: number, prev: number) => {
    if (!prev || prev === 0) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const buy_trans_pct_compare = calcPctGrowth(ec_actual_mtd, backward_trans);
  const buy_value_pct_compare = calcPctGrowth(mtd_buy_value_mil_lak, backward_val_mil);
  const buy_weight_pct_compare = calcPctGrowth(mtd_buy_weight_g, backward_weight_g);
  const ticket_size_pct_compare = calcPctGrowth(mtd_ticket_size_g, backward_ticket);

  let baseline_normal_rr_per_day = config.baseline_daily_rr;
  let avg_campaign_daily_actual = act_buy_trans_per_day;
  let baseline_pct_compare = baseline_normal_rr_per_day
    ? calcPctGrowth(avg_campaign_daily_actual, baseline_normal_rr_per_day)
    : undefined;

  const backwardComparison: CampaignBackwardComparisonPayload = {
    backward_days,
    mtd_days: elapsed_days,
    buy_trans_condition_label: config.condition_label,
    buy_trans_mtd: ec_actual_mtd,
    buy_trans_backward: backward_trans,
    buy_trans_pct_compare,
    buy_value_lak_mtd: mtd_buy_value_mil_lak,
    buy_value_lak_backward: backward_val_mil,
    buy_value_pct_compare,
    buy_weight_g_mtd: mtd_buy_weight_g,
    buy_weight_g_backward: backward_weight_g,
    buy_weight_pct_compare,
    ticket_size_g_mtd: mtd_ticket_size_g,
    ticket_size_g_backward: backward_ticket,
    ticket_size_pct_compare,
    baseline_normal_rr_per_day,
    avg_campaign_daily_actual,
    baseline_pct_compare,
  };

  return {
    config,
    targetAchievement,
    backwardComparison,
  };
}
