// ============================================================================
// Campaign query helpers shared by the Cloudflare worker (worker.js), the Next
// API route and the client fallback, so all three count the same thing.
// No path aliases here: worker.js imports this file directly through wrangler.
// ============================================================================

export interface CampaignRule {
  metric: 'amount' | 'weight';
  operator: string;
  value: number;
  max_value?: number;
}

export interface CampaignWindow {
  start: string;      // campaign start (YYYY-MM-DD)
  cutoff: string;     // effective MTD cutoff (YYYY-MM-DD)
  backStart: string;  // backward window start
  backEnd: string;    // backward window end
  backDays: number;   // backward window length in days
}

const DONE_STATUSES = "'ສໍາເລັດ', 'ສຳເລັດ'";

// A computed result exists when either buy transactions or NC came back (an NC-only
// campaign can legitimately have buy numbers that the UI does not use).
export function hasCampaignResult(d: any): boolean {
  return Number(d?.ec_actual_mtd) > 0 || Number(d?.nc_actual_mtd) > 0;
}

// Rules the campaign filters buy transactions by. Empty = No Condition (All Trans).
export function resolveCampaignRules(config: any): CampaignRule[] {
  if (Array.isArray(config?.conditions)) {
    return config.conditions.map((r: any) => ({
      metric: r.metric === 'weight' ? 'weight' : 'amount',
      operator: r.operator || '>=',
      value: Number(r.value) || 0,
      max_value: r.max_value !== undefined && r.max_value !== null && r.max_value !== '' ? Number(r.max_value) : undefined,
    }));
  }
  const label = String(config?.condition_label || '').toLowerCase();
  if (config?.condition_operator !== 'all' && Number(config?.condition_value) > 0 && !label.includes('no condition')) {
    const isWeight = String(config?.condition_type || '').toLowerCase().includes('weight') || label.includes('g');
    return [{
      metric: isWeight ? 'weight' : 'amount',
      operator: config.condition_operator || '>=',
      value: Number(config.condition_value) || 0,
      max_value: config.condition_max_value ? Number(config.condition_max_value) : undefined,
    }];
  }
  return [];
}

export function campaignBank(config: any): string {
  const raw = config?.bank || (config?.condition_type === 'bank' ? config?.condition_label : 'all');
  return !raw || String(raw).toLowerCase() === 'all' ? 'all' : String(raw);
}

export function campaignBankList(config: any): string[] {
  const bank = campaignBank(config);
  return bank === 'all' ? [] : bank.split(',').map((b) => b.trim()).filter(Boolean);
}

export function campaignTxType(config: any): string {
  return config?.tx_type || config?.transaction_type || 'BUY_GOLD';
}

export function campaignTargetTypes(config: any): string[] {
  return Array.isArray(config?.target_types) && config.target_types.length > 0 ? config.target_types : ['ec', 'nc'];
}

export function campaignHasNcTarget(config: any): boolean {
  return campaignTargetTypes(config).includes('nc');
}

// Buy-transaction sections are shown unless NC is the only target.
export function campaignHasBuyTarget(config: any): boolean {
  return campaignTargetTypes(config).some((t) => t !== 'nc');
}

export function campaignNcMode(config: any): 'all_registers' | 'first_purchase_tier' {
  return config?.nc_qualification_mode === 'first_purchase_tier' ? 'first_purchase_tier' : 'all_registers';
}

export function campaignUniqueUsersMode(config: any, rules: CampaignRule[]): string {
  return config?.unique_users_filter_mode || (rules.length === 0 ? 'time_only' : 'condition_tier');
}

// Custom NC first-purchase rule, only when configured to override the main rule.
export function campaignNcOverrideRules(config: any): CampaignRule[] {
  const useMain = config?.nc_first_purchase_use_main_condition ?? true;
  if (campaignNcMode(config) === 'first_purchase_tier' && !useMain && Array.isArray(config?.nc_conditions) && config.nc_conditions.length > 0) {
    return resolveCampaignRules({ conditions: config.nc_conditions });
  }
  return [];
}

// Parameters for the 14-argument get_campaign_actual_metrics RPC.
export function buildCampaignRpcParams(config: any, w: CampaignWindow) {
  const rules = resolveCampaignRules(config);
  const first = rules[0];
  const ncOverride = campaignNcOverrideRules(config);
  return {
    p_start_date: w.start,
    p_as_of_date: w.cutoff,
    p_backward_start: w.backStart,
    p_backward_end: w.backEnd,
    p_cond_type: first?.metric === 'weight' ? 'weight_gte' : 'amount_gte',
    p_cond_op: first ? first.operator : 'all',
    p_cond_val: first ? Number(first.value) : 0,
    p_cond_max: first && first.max_value !== undefined ? Number(first.max_value) : null,
    p_tx_type: campaignTxType(config),
    p_bank: campaignBank(config),
    p_conditions: rules.length > 0 ? rules : null,
    p_unique_users_mode: campaignUniqueUsersMode(config, rules),
    p_nc_mode: campaignNcMode(config),
    p_nc_conditions: ncOverride.length > 0 ? ncOverride : null,
  };
}

function bankSql(banks: string[], alias: string): string {
  const col = alias ? `${alias}.bank` : 'bank';
  if (banks.length === 1) return `\n  AND ${col} ILIKE '%${banks[0]}%'`;
  if (banks.length > 1) return `\n  AND (${banks.map((b) => `${col} ILIKE '%${b}%'`).join(' OR ')})`;
  return '';
}

function ruleSql(rules: CampaignRule[], alias: string): string {
  const p = alias ? `${alias}.` : '';
  let sql = '';
  for (const r of rules) {
    const col = r.metric === 'weight' ? `${p}gold_weight` : `${p}total_amount`;
    const val = Number(r.value) || 0;
    if (r.operator === 'all') continue;
    if (r.operator === 'between') {
      sql += `\n  AND ${col} >= ${val} AND ${col} <= ${r.max_value !== undefined ? Number(r.max_value) : val}`;
    } else if (r.operator === '<=') {
      sql += `\n  AND ${col} <= ${val}`;
    } else if (r.operator === '==' || r.operator === '=') {
      sql += `\n  AND ${col} = ${val}`;
    } else if (val > 0) {
      sql += `\n  AND ${col} >= ${val}`;
    }
  }
  return sql;
}

// NC cohort for one window: count + everything the cohort bought in that window.
function ncSql(config: any, from: string, to: string, suffix: 'mtd' | 'backward'): string {
  const banks = campaignBankList(config);
  const mode = campaignNcMode(config);
  const toTs = `${to} 23:59:59`;

  let cohort: string;
  if (mode === 'first_purchase_tier') {
    const override = campaignNcOverrideRules(config);
    const tierRules = override.length > 0 ? override : resolveCampaignRules(config);
    cohort = `WITH registers AS (
  SELECT DISTINCT phone
  FROM public.monthly_data
  WHERE created_at >= '${from}'
    AND created_at <= '${toTs}'
    AND status IN (${DONE_STATUSES})
    AND transaction_type = 'OPEN_ACCOUNT'${bankSql(banks, '').replace(/\n  /g, '\n    ')}
),
first_buy AS (
  -- each new customer's first-ever completed buy
  SELECT DISTINCT ON (b.phone) b.phone, b.created_at AS first_buy_at, b.gold_weight, b.total_amount
  FROM public.monthly_data b
  JOIN registers r ON r.phone = b.phone
  WHERE b.transaction_type = 'BUY_GOLD'
    AND b.status IN (${DONE_STATUSES})
    AND b.created_at <= '${toTs}'${bankSql(banks, 'b').replace(/\n  /g, '\n    ')}
  ORDER BY b.phone, b.created_at ASC
),
nc_cohort AS (
  -- first buy falls in the window and meets the NC tier
  SELECT fb.phone
  FROM first_buy fb
  WHERE fb.first_buy_at >= '${from}'${ruleSql(tierRules, 'fb').replace(/\n  /g, '\n    ')}
)`;
  } else {
    cohort = `WITH nc_cohort AS (
  -- unique phones with a completed registration in the window
  SELECT DISTINCT phone
  FROM public.monthly_data
  WHERE created_at >= '${from}'
    AND created_at <= '${toTs}'
    AND status IN (${DONE_STATUSES})
    AND transaction_type = 'OPEN_ACCOUNT'${bankSql(banks, '').replace(/\n  /g, '\n    ')}
)`;
  }

  return `${cohort}
SELECT
    (SELECT COUNT(*) FROM nc_cohort) AS nc_${suffix},
    COUNT(b.phone) AS nc_buy_trans_${suffix},
    ROUND(COALESCE(SUM(b.gold_weight), 0)::numeric, 1) AS nc_buy_weight_g_${suffix},
    ROUND(COALESCE(SUM(b.total_amount), 0)::numeric / 1000000.0, 1) AS nc_buy_value_mil_lak_${suffix}
FROM public.monthly_data b
JOIN nc_cohort c ON c.phone = b.phone
WHERE b.created_at >= '${from}'
  AND b.created_at <= '${toTs}'
  AND b.status IN (${DONE_STATUSES})
  AND b.transaction_type = 'BUY_GOLD'${bankSql(banks, 'b')};`;
}

// The "CAMPAIGN INTELLIGENCE" script shown in the deep-dive. Sections follow the
// campaign's targets: buy transactions when a buy-side target is set, NC when an NC
// target is set.
export function buildCampaignSql(config: any, w: CampaignWindow): string {
  const rules = resolveCampaignRules(config);
  const banks = campaignBankList(config);
  const bank = campaignBank(config);
  const txType = campaignTxType(config);
  const txSql = String(txType).toLowerCase() === 'all' ? '' : `\n  AND transaction_type = '${txType}'`;
  const showBuy = campaignHasBuyTarget(config);
  const showNc = campaignHasNcTarget(config);
  const ncMode = campaignNcMode(config);
  const ruleLabel = rules.length === 0 ? 'No Condition (All Trans)' : (config?.condition_label || 'Custom Filter');

  const sections: string[] = [];
  let n = 1;

  if (showBuy) {
    sections.push(`-- ${n++}. Buy Transactions: Actual MTD (${w.start} to ${w.cutoff})
SELECT
    COUNT(*) AS ec_actual_mtd,
    COUNT(DISTINCT phone) AS unique_customers_mtd,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS mtd_buy_weight_g,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS mtd_buy_value_mil_lak
FROM public.monthly_data
WHERE created_at >= '${w.start}'
  AND created_at <= '${w.cutoff} 23:59:59'
  AND status IN (${DONE_STATUSES})${txSql}${bankSql(banks, '')}${ruleSql(rules, '')};`);
  }

  if (showNc) {
    const ncLabel = ncMode === 'first_purchase_tier' ? 'first purchase in window, meeting the tier' : 'all registrations';
    sections.push(`-- ${n++}. New Customers (NC): Actual MTD (${w.start} to ${w.cutoff}), ${ncLabel}
--    plus everything those new customers bought in the same window
${ncSql(config, w.start, w.cutoff, 'mtd')}`);
  }

  if (showBuy) {
    sections.push(`-- ${n++}. Buy Transactions: Equal Backward Benchmark (${w.backStart} to ${w.backEnd}, ${w.backDays} days)
SELECT
    COUNT(*) AS buy_trans_backward,
    COUNT(DISTINCT phone) AS unique_users_backward,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS buy_weight_g_backward,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS buy_value_lak_backward
FROM public.monthly_data
WHERE created_at >= '${w.backStart}'
  AND created_at <= '${w.backEnd} 23:59:59'
  AND status IN (${DONE_STATUSES})${txSql}${bankSql(banks, '')}${ruleSql(rules, '')};`);
  }

  if (showNc) {
    sections.push(`-- ${n++}. New Customers (NC): Equal Backward Benchmark (${w.backStart} to ${w.backEnd}, ${w.backDays} days)
${ncSql(config, w.backStart, w.backEnd, 'backward')}`);
  }

  const targets = campaignTargetTypes(config).map((t) => t.toUpperCase()).join(' + ');
  return `-- ============================================================================
-- CAMPAIGN INTELLIGENCE: ${config?.campaign_name || 'Campaign Target'}
-- Targets: ${targets} | Rule: ${ruleLabel} | Bank: ${bank.toUpperCase()}
-- NC Mode: ${ncMode === 'first_purchase_tier' ? '1st Purchase >= Threshold' : 'All Registers'}
-- ============================================================================

${sections.join('\n\n')}`;
}
