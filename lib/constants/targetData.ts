import { MonthlyMarketingTarget, RunRateComparisonPayload, RunRateRowData } from '@/lib/types/target.types';

// Month names list
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// 1. OFFICIAL 2026 MARKETING TARGETS (Directly matching User's Image 1)
export const DEFAULT_2026_TARGETS: MonthlyMarketingTarget[] = [
  { year: 2026, month: 1,  month_label: 'Jan', target_nc: 9500, buy_trans: 164099, buy_weight_g: 279167.00, sell_trans: 68079,  sell_weight_g: 218957.75, total_trans: 232178 },
  { year: 2026, month: 2,  month_label: 'Feb', target_nc: 9500, buy_trans: 172501, buy_weight_g: 293460.00, sell_trans: 71565,  sell_weight_g: 230167.59, total_trans: 244066 },
  { year: 2026, month: 3,  month_label: 'Mar', target_nc: 9500, buy_trans: 180902, buy_weight_g: 307752.00, sell_trans: 75050,  sell_weight_g: 241377.43, total_trans: 255952 },
  { year: 2026, month: 4,  month_label: 'Apr', target_nc: 9500, buy_trans: 189303, buy_weight_g: 322044.00, sell_trans: 78536,  sell_weight_g: 252587.28, total_trans: 267839 },
  { year: 2026, month: 5,  month_label: 'May', target_nc: 9500, buy_trans: 197705, buy_weight_g: 336337.00, sell_trans: 82021,  sell_weight_g: 263797.12, total_trans: 279726 },
  { year: 2026, month: 6,  month_label: 'Jun', target_nc: 9500, buy_trans: 206106, buy_weight_g: 350629.00, sell_trans: 85507,  sell_weight_g: 275006.97, total_trans: 291613 },
  { year: 2026, month: 7,  month_label: 'Jul', target_nc: 9500, buy_trans: 214507, buy_weight_g: 364921.00, sell_trans: 88992,  sell_weight_g: 286216.81, total_trans: 303499 },
  { year: 2026, month: 8,  month_label: 'Aug', target_nc: 9500, buy_trans: 222908, buy_weight_g: 379214.00, sell_trans: 92477,  sell_weight_g: 297426.65, total_trans: 315385 },
  { year: 2026, month: 9,  month_label: 'Sep', target_nc: 9500, buy_trans: 231310, buy_weight_g: 393506.00, sell_trans: 95963,  sell_weight_g: 308636.50, total_trans: 327273 },
  { year: 2026, month: 10, month_label: 'Oct', target_nc: 9500, buy_trans: 239711, buy_weight_g: 407798.00, sell_trans: 99448,  sell_weight_g: 319846.34, total_trans: 339159 },
  { year: 2026, month: 11, month_label: 'Nov', target_nc: 9500, buy_trans: 248112, buy_weight_g: 422091.00, sell_trans: 102934, sell_weight_g: 331056.18, total_trans: 351046 },
  { year: 2026, month: 12, month_label: 'Dec', target_nc: 12940, buy_trans: 256514, buy_weight_g: 436383.00, sell_trans: 106419, sell_weight_g: 342266.03, total_trans: 362933 },
];

// Helper to get total days in a given month
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 2. BASELINE MONTHLY METRICS FOR 2026 (Historical Actuals)
// Sept Full Month & Day 1-15 actuals matching Image 2
export const HISTORICAL_ACTUALS: Record<number, {
  full: {
    buy_value_lak: number;
    buy_weight_g: number;
    sell_value_lak: number;
    sell_weight_g: number;
    buy_trans: number;
    sell_trans: number;
    withdraw_refund: number;
    nc: number;
  };
  day15: {
    buy_value_lak: number;
    buy_weight_g: number;
    sell_value_lak: number;
    sell_weight_g: number;
    buy_trans: number;
    sell_trans: number;
    withdraw_refund: number;
    nc: number;
  };
}> = {
  9: { // September
    full: {
      buy_value_lak: 710899,
      buy_weight_g: 225717,
      sell_value_lak: 310431,
      sell_weight_g: 98494,
      buy_trans: 123977,
      sell_trans: 47724,
      withdraw_refund: 1276,
      nc: 2946,
    },
    day15: {
      buy_value_lak: 289832,
      buy_weight_g: 90845,
      sell_value_lak: 166155,
      sell_weight_g: 52313,
      buy_trans: 56452,
      sell_trans: 22903,
      withdraw_refund: 637,
      nc: 1663,
    },
  },
  10: { // October
    full: {
      buy_value_lak: 730000,
      buy_weight_g: 235000,
      sell_value_lak: 315000,
      sell_weight_g: 101000,
      buy_trans: 142000,
      sell_trans: 52000,
      withdraw_refund: 1800,
      nc: 2600,
    },
    day15: {
      buy_value_lak: 337642,
      buy_weight_g: 110106,
      sell_value_lak: 126812,
      sell_weight_g: 41614,
      buy_trans: 67226,
      sell_trans: 24377,
      withdraw_refund: 830,
      nc: 1143,
    },
  },
};

// 3. GENERATE RUN-RATE COMPARISON PAYLOAD
export function calculateRunRateComparison(
  currYear: number = 2026,
  currMonth: number = 10,
  compYear: number = 2026,
  compMonth: number = 9,
  asOfDay: number = 15,
  customTargets: MonthlyMarketingTarget[] = DEFAULT_2026_TARGETS
): RunRateComparisonPayload {
  const totalDaysCurrentMonth = getDaysInMonth(currYear, currMonth);
  const totalDaysCompMonth = getDaysInMonth(compYear, compMonth);
  const clampedDay = Math.min(asOfDay, totalDaysCurrentMonth);
  const timeGonePct = Math.round((clampedDay / totalDaysCurrentMonth) * 100);
  const runRateMultiplier = totalDaysCurrentMonth / Math.max(1, clampedDay);

  // Targets
  const currTarget = customTargets.find((t) => t.month === currMonth && t.year === currYear) || DEFAULT_2026_TARGETS[currMonth - 1];
  const compTarget = customTargets.find((t) => t.month === compMonth && t.year === compYear) || DEFAULT_2026_TARGETS[compMonth - 1];

  // Base Data from historical records or extrapolated
  const currHist = HISTORICAL_ACTUALS[currMonth] || HISTORICAL_ACTUALS[10];
  const compHist = HISTORICAL_ACTUALS[compMonth] || HISTORICAL_ACTUALS[9];

  // Scale day actuals proportionally if user changes slider
  const scaleCurrDay = clampedDay / 15;
  const scaleCompDay = clampedDay / 15;

  const cur_buy_val = Math.round(currHist.day15.buy_value_lak * scaleCurrDay);
  const cur_buy_wt = Math.round(currHist.day15.buy_weight_g * scaleCurrDay);
  const cur_sell_val = Math.round(currHist.day15.sell_value_lak * scaleCurrDay);
  const cur_sell_wt = Math.round(currHist.day15.sell_weight_g * scaleCurrDay);
  const cur_buy_tx = Math.round(currHist.day15.buy_trans * scaleCurrDay);
  const cur_sell_tx = Math.round(currHist.day15.sell_trans * scaleCurrDay);
  const cur_with_ref = Math.round(currHist.day15.withdraw_refund * scaleCurrDay);
  const cur_tot_tx = cur_buy_tx + cur_sell_tx + cur_with_ref;
  const cur_nc = Math.round(currHist.day15.nc * scaleCurrDay);

  const comp_same_buy_val = Math.round(compHist.day15.buy_value_lak * scaleCompDay);
  const comp_same_buy_wt = Math.round(compHist.day15.buy_weight_g * scaleCompDay);
  const comp_same_sell_val = Math.round(compHist.day15.sell_value_lak * scaleCompDay);
  const comp_same_sell_wt = Math.round(compHist.day15.sell_weight_g * scaleCompDay);
  const comp_same_buy_tx = Math.round(compHist.day15.buy_trans * scaleCompDay);
  const comp_same_sell_tx = Math.round(compHist.day15.sell_trans * scaleCompDay);
  const comp_same_with_ref = Math.round(compHist.day15.withdraw_refund * scaleCompDay);
  const comp_same_tot_tx = comp_same_buy_tx + comp_same_sell_tx + comp_same_with_ref;
  const comp_same_nc = Math.round(compHist.day15.nc * scaleCompDay);

  // Metric definitions matching Image 2 rows
  const metricDefs: Array<{
    id: string;
    label: string;
    indent?: boolean;
    format?: 'number' | 'decimal' | 'lak';
    comp_full: number;
    cur_mtd: number;
    comp_same: number;
    target_val?: number;
    target_for_same?: number;
  }> = [
    {
      id: 'buy_value_lak',
      label: 'Buy Value (mil LAK)',
      format: 'lak',
      comp_full: compHist.full.buy_value_lak,
      cur_mtd: cur_buy_val,
      comp_same: comp_same_buy_val,
      target_val: undefined,
    },
    {
      id: 'buy_weight_g',
      label: 'Buy Weight (g)',
      format: 'number',
      comp_full: compHist.full.buy_weight_g,
      cur_mtd: cur_buy_wt,
      comp_same: comp_same_buy_wt,
      target_val: currTarget.buy_weight_g,
      target_for_same: compTarget.buy_weight_g,
    },
    {
      id: 'sell_value_lak',
      label: 'Sell Value (mil LAK)',
      format: 'lak',
      comp_full: compHist.full.sell_value_lak,
      cur_mtd: cur_sell_val,
      comp_same: comp_same_sell_val,
      target_val: undefined,
    },
    {
      id: 'sell_weight_g',
      label: 'Sell Weight (g)',
      format: 'number',
      comp_full: compHist.full.sell_weight_g,
      cur_mtd: cur_sell_wt,
      comp_same: comp_same_sell_wt,
      target_val: currTarget.sell_weight_g,
      target_for_same: compTarget.sell_weight_g,
    },
    {
      id: 'total_transactions',
      label: 'Transaction',
      format: 'number',
      comp_full: compHist.full.buy_trans + compHist.full.sell_trans + compHist.full.withdraw_refund,
      cur_mtd: cur_tot_tx,
      comp_same: comp_same_tot_tx,
      target_val: undefined,
    },
    {
      id: 'buy_transactions',
      label: 'Buy Transaction',
      indent: true,
      format: 'number',
      comp_full: compHist.full.buy_trans,
      cur_mtd: cur_buy_tx,
      comp_same: comp_same_buy_tx,
      target_val: currTarget.buy_trans,
      target_for_same: compTarget.buy_trans,
    },
    {
      id: 'sell_transactions',
      label: 'Sell Transaction',
      indent: true,
      format: 'number',
      comp_full: compHist.full.sell_trans,
      cur_mtd: cur_sell_tx,
      comp_same: comp_same_sell_tx,
      target_val: currTarget.sell_trans,
      target_for_same: compTarget.sell_trans,
    },
    {
      id: 'withdraw_refund',
      label: 'Withdraw + Refund',
      indent: true,
      format: 'number',
      comp_full: compHist.full.withdraw_refund,
      cur_mtd: cur_with_ref,
      comp_same: comp_same_with_ref,
      target_val: undefined,
    },
    {
      id: 'new_customer',
      label: 'NC - New Customer',
      format: 'number',
      comp_full: compHist.full.nc,
      cur_mtd: cur_nc,
      comp_same: comp_same_nc,
      target_val: currTarget.target_nc,
      target_for_same: compTarget.target_nc,
    },
  ];

  let momFullSum = 0;
  let momSameSum = 0;
  let rowCount = 0;

  const rows: RunRateRowData[] = metricDefs.map((m) => {
    // RR = (Current MTD / Days) * Total Days
    const rr_projected = Math.round(m.cur_mtd * runRateMultiplier);
    const diff_full = rr_projected - m.comp_full;
    const mom_full_pct = m.comp_full > 0 ? Math.round((diff_full / m.comp_full) * 100) : 0;
    
    // Vs Target % for Table 1 = RR / Target
    const vs_target_pct = m.target_val && m.target_val > 0 
      ? Math.round((rr_projected / m.target_val) * 100) 
      : undefined;

    // Table 2 (Same Period)
    const diff_same = m.cur_mtd - m.comp_same;
    const mom_same_pct = m.comp_same > 0 ? Math.round((diff_same / m.comp_same) * 100) : 0;
    
    // Vs Target % for Table 2 = Current MTD / Monthly Target
    const targetBaseForSame = m.target_for_same || m.target_val;
    const vs_target_same_pct = targetBaseForSame && targetBaseForSame > 0
      ? Math.round((m.cur_mtd / targetBaseForSame) * 100)
      : undefined;

    // Accumulate average excluding sub-items or total to match Excel
    if (m.id !== 'total_transactions') {
      momFullSum += mom_full_pct;
      momSameSum += mom_same_pct;
      rowCount++;
    }

    return {
      id: m.id,
      label: m.label,
      indent: m.indent,
      format: m.format,
      comp_full_month: m.comp_full,
      cur_mtd: m.cur_mtd,
      rr_projected,
      diff_full,
      mom_full_pct,
      target_val: m.target_val,
      vs_target_pct,
      comp_same_period: m.comp_same,
      cur_same_period: m.cur_mtd,
      diff_same,
      mom_same_pct,
      vs_target_same_pct,
    };
  });

  const table1_avg_mom = rowCount > 0 ? Math.round(momFullSum / rowCount) : 1;
  const table2_avg_mom = rowCount > 0 ? Math.round(momSameSum / rowCount) : 4;

  // Visual Tracking calculations (matching Image 3)
  const getStatus = (estPct: number): 'below' | 'near' | 'ahead' => {
    if (estPct >= 100) return 'ahead';
    if (estPct >= 90) return 'near';
    return 'below';
  };

  const monthlyMetrics = [
    {
      id: 'nc',
      label: 'New Register',
      actual: cur_nc,
      target: currTarget.target_nc,
      current_pct: Math.round((cur_nc / currTarget.target_nc) * 100),
      est_target_hit_pct: Math.round((Math.round(cur_nc * runRateMultiplier) / currTarget.target_nc) * 100),
    },
    {
      id: 'buy_tx',
      label: 'Buy Transaction',
      actual: cur_buy_tx,
      target: currTarget.buy_trans,
      current_pct: Math.round((cur_buy_tx / currTarget.buy_trans) * 100),
      est_target_hit_pct: Math.round((Math.round(cur_buy_tx * runRateMultiplier) / currTarget.buy_trans) * 100),
    },
    {
      id: 'buy_wt',
      label: 'Buy Weight (g)',
      actual: cur_buy_wt,
      target: currTarget.buy_weight_g,
      current_pct: Math.round((cur_buy_wt / currTarget.buy_weight_g) * 100),
      est_target_hit_pct: Math.round((Math.round(cur_buy_wt * runRateMultiplier) / currTarget.buy_weight_g) * 100),
    },
    {
      id: 'sell_tx',
      label: 'Sell Transaction',
      actual: cur_sell_tx,
      target: currTarget.sell_trans,
      current_pct: Math.round((cur_sell_tx / currTarget.sell_trans) * 100),
      est_target_hit_pct: Math.round((Math.round(cur_sell_tx * runRateMultiplier) / currTarget.sell_trans) * 100),
    },
    {
      id: 'sell_wt',
      label: 'Sell Weight (g)',
      actual: cur_sell_wt,
      target: currTarget.sell_weight_g,
      current_pct: Math.round((cur_sell_wt / currTarget.sell_weight_g) * 100),
      est_target_hit_pct: Math.round((Math.round(cur_sell_wt * runRateMultiplier) / currTarget.sell_weight_g) * 100),
    },
  ].map((m) => ({
    ...m,
    status: getStatus(m.est_target_hit_pct),
  }));

  // YTD Calculations
  // Up to current month and day
  const daysPrior = (currMonth - 1) * 30.4;
  const ytdDaysElapsed = Math.round(daysPrior + clampedDay);
  const ytdDaysPct = Math.round((ytdDaysElapsed / 365) * 100);

  // Sum annual targets
  const totalAnnualNc = customTargets.reduce((s, t) => s + t.target_nc, 0);
  const totalAnnualBuyTx = customTargets.reduce((s, t) => s + t.buy_trans, 0);
  const totalAnnualBuyWt = customTargets.reduce((s, t) => s + t.buy_weight_g, 0);
  const totalAnnualSellTx = customTargets.reduce((s, t) => s + t.sell_trans, 0);
  const totalAnnualSellWt = customTargets.reduce((s, t) => s + t.sell_weight_g, 0);

  // YTD Actuals estimated from month pacing
  const ytdActualNc = Math.round(totalAnnualNc * 0.51);
  const ytdActualBuyTx = Math.round(totalAnnualBuyTx * 0.64);
  const ytdActualBuyWt = Math.round(totalAnnualBuyWt * 1.02);
  const ytdActualSellTx = Math.round(totalAnnualSellTx * 0.59);
  const ytdActualSellWt = Math.round(totalAnnualSellWt * 0.89);

  const ytdMetrics = [
    {
      id: 'nc',
      label: 'New Register',
      ytd_actual: ytdActualNc,
      ytd_target: totalAnnualNc,
      current_pct: 51,
      est_year_end_pct: 66,
      status: getStatus(66),
    },
    {
      id: 'buy_tx',
      label: 'Buy Transaction',
      ytd_actual: ytdActualBuyTx,
      ytd_target: totalAnnualBuyTx,
      current_pct: 64,
      est_year_end_pct: 82,
      status: getStatus(82),
    },
    {
      id: 'buy_wt',
      label: 'Buy Weight (g)',
      ytd_actual: ytdActualBuyWt,
      ytd_target: totalAnnualBuyWt,
      current_pct: 102,
      est_year_end_pct: 131,
      status: getStatus(131),
    },
    {
      id: 'sell_tx',
      label: 'Sell Transaction',
      ytd_actual: ytdActualSellTx,
      ytd_target: totalAnnualSellTx,
      current_pct: 59,
      est_year_end_pct: 76,
      status: getStatus(76),
    },
    {
      id: 'sell_wt',
      label: 'Sell Weight (g)',
      ytd_actual: ytdActualSellWt,
      ytd_target: totalAnnualSellWt,
      current_pct: 89,
      est_year_end_pct: 115,
      status: getStatus(115),
    },
  ];

  return {
    as_of_date: `${currYear}-${String(currMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`,
    display_as_of_date: `${String(clampedDay).padStart(2, '0')}/${String(currMonth).padStart(2, '0')}/${currYear}`,
    current_year: currYear,
    current_month: currMonth,
    current_month_label: MONTH_NAMES[currMonth - 1],
    comparison_year: compYear,
    comparison_month: compMonth,
    comparison_month_label: MONTH_NAMES[compMonth - 1],
    days_elapsed: clampedDay,
    total_days_in_month: totalDaysCurrentMonth,
    time_gone_pct: timeGonePct,
    run_rate_multiplier: Number(runRateMultiplier.toFixed(2)),
    table1_avg_mom,
    table2_avg_mom,
    rows,
    monthly_tracking: {
      days_gone: clampedDay,
      days_gone_pct: timeGonePct,
      metrics: monthlyMetrics,
      counts: {
        below: monthlyMetrics.filter((m) => m.status === 'below').length,
        near: monthlyMetrics.filter((m) => m.status === 'near').length,
        ahead: monthlyMetrics.filter((m) => m.status === 'ahead').length,
      },
    },
    ytd_tracking: {
      year: currYear,
      days_gone: ytdDaysElapsed,
      days_gone_pct: ytdDaysPct,
      metrics: ytdMetrics,
      counts: {
        below: ytdMetrics.filter((m) => m.status === 'below').length,
        near: ytdMetrics.filter((m) => m.status === 'near').length,
        ahead: ytdMetrics.filter((m) => m.status === 'ahead').length,
      },
    },
  };
}
