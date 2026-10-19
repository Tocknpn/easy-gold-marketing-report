import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { computeCampaignAnalytics, calculateDateDiffDays, computeBackwardDates } from '@/lib/campaign/campaignEngine';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const config: CampaignSetupConfig = await req.json();

    if (!config || !config.campaign_date_start || !config.campaign_date_end) {
      return NextResponse.json({ error: 'Invalid campaign configuration' }, { status: 400 });
    }

    const headerUrl = req.headers.get('x-supabase-url');
    const headerKey = req.headers.get('x-supabase-key');
    const supabaseUrl = headerUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = headerKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // If no valid Supabase credentials, return local calculations
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseKey) {
      const localResult = computeCampaignAnalytics(config);
      return NextResponse.json({
        ...localResult,
        dataSource: 'computed_cache',
        notice: 'Using calibrated local baseline (Connect Supabase in Audit Modal for live DB queries)',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get MAX(created_at) from monthly_data
    let maxDbDateStr = config.auto_sync_max_date ? '2026-10-18' : (config.data_update_on || '2026-10-18');
    try {
      const { data: maxDateRow, error: maxDateErr } = await supabase.rpc('get_max_monthly_data_date');
      if (!maxDateErr && maxDateRow) {
        maxDbDateStr = String(maxDateRow).split('T')[0];
      }
    } catch {
      // Direct fast fallback using summary table
      try {
        const { data: latestSummary } = await supabase
          .from('summary_weekly_metrics')
          .select('end_date')
          .order('end_date', { ascending: false })
          .limit(1);

        if (latestSummary && latestSummary.length > 0 && latestSummary[0].end_date) {
          maxDbDateStr = '2026-10-18';
        }
      } catch (e) {
        console.warn('Could not query max date, using default date:', e);
      }
    }

    const asOfDate = config.auto_sync_max_date ? (maxDbDateStr || '2026-10-18') : (config.data_update_on || '2026-10-18');

    // 2. Timeline calculations
    const totalDays = calculateDateDiffDays(config.campaign_date_start, config.campaign_date_end);
    const isUpcoming = new Date(asOfDate).getTime() < new Date(config.campaign_date_start).getTime();
    const isEnded = new Date(asOfDate).getTime() >= new Date(config.campaign_date_end).getTime();
    const elapsedDays = isEnded 
      ? totalDays 
      : isUpcoming ? 0 : Math.min(totalDays, calculateDateDiffDays(config.campaign_date_start, asOfDate));

    // 3. Reverse Backward Dates (supports full planned horizon for upcoming campaigns)
    const backwardWindow = computeBackwardDates(config.campaign_date_start, elapsedDays, totalDays);

    // 4. Run Live Campaign Aggregation Query directly in parallel for blazing speed
    const rawBank = config.bank || (config.condition_type === 'bank' ? config.condition_label : 'all');
    const effectiveBank = (!rawBank || String(rawBank).toLowerCase() === 'all') ? 'all' : String(rawBank);
    const txType = config.tx_type || (config as any).transaction_type || 'BUY_GOLD';

    // Support multiple banks
    const banks = effectiveBank !== 'all' 
      ? effectiveBank.split(',').map((b: string) => b.trim()).filter(Boolean)
      : [];
    const bankSql = banks.length === 1 
      ? `\n  AND bank ILIKE '%${banks[0]}%'` 
      : banks.length > 1 
      ? `\n  AND (${banks.map((b: string) => `bank ILIKE '%${b}%'`).join(' OR ')})` 
      : '';

    // Support multiple condition rules or zero conditions
    const rules = Array.isArray(config.conditions)
      ? config.conditions
      : (config.condition_operator !== 'all' && Number(config.condition_value) > 0 && !config.condition_label?.toLowerCase().includes('no condition'))
        ? [{
            id: 'cond_default',
            metric: ((config.condition_type || '').toLowerCase().includes('weight') || (config.condition_label || '').toLowerCase().includes('g')) ? ('weight' as const) : ('amount' as const),
            operator: config.condition_operator || '>=',
            value: Number(config.condition_value) || 0,
            max_value: config.condition_max_value ? Number(config.condition_max_value) : undefined,
          }]
        : [];

    let condSql = '';
    for (const r of rules) {
      const col = r.metric === 'weight' ? 'gold_weight' : 'total_amount';
      const val = Number(r.value) || 0;
      if (r.operator === 'between') {
        const maxV = r.max_value !== undefined ? Number(r.max_value) : val;
        condSql += `\n  AND ${col} >= ${val} AND ${col} <= ${maxV}`;
      } else if (r.operator === '<=') {
        condSql += `\n  AND ${col} <= ${val}`;
      } else if (r.operator === '==') {
        condSql += `\n  AND ${col} = ${val}`;
      } else {
        condSql += `\n  AND ${col} >= ${val}`;
      }
    }

    const sqlScript = `-- ============================================================================
-- CAMPAIGN INTELLIGENCE: ${config.campaign_name || 'Campaign Target'}
-- Rule: ${config.condition_label || (rules.length === 0 ? 'No Condition (All Trans)' : 'Custom Filter')} | Bank: ${effectiveBank.toUpperCase()}
-- ============================================================================

-- 1. Actual MTD Performance (${config.campaign_date_start} to ${asOfDate})
SELECT 
    COUNT(*) AS ec_actual_mtd,
    COUNT(DISTINCT phone) AS unique_customers_mtd,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS mtd_buy_weight_g,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS mtd_buy_value_mil_lak
FROM public.monthly_data
WHERE created_at >= '${config.campaign_date_start}'
  AND created_at <= '${asOfDate} 23:59:59'
  AND status = 'ສໍາເລັດ'
  AND transaction_type = '${txType}'${bankSql}${condSql};

-- 2. Equal Backward Benchmark Baseline (${backwardWindow.start} to ${backwardWindow.end}, ${elapsedDays || totalDays} days)
SELECT 
    COUNT(*) AS buy_trans_backward,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS buy_weight_g_backward,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS buy_value_lak_backward
FROM public.monthly_data
WHERE created_at >= '${backwardWindow.start}'
  AND created_at <= '${backwardWindow.end} 23:59:59'
  AND status = 'ສໍາເລັດ'
  AND transaction_type = '${txType}'${bankSql}${condSql};`;

    let liveAgg: any = null;

    // Use RPC only for 0 conditions (op='all') or single condition
    if (rules.length <= 1) {
      try {
        const singleRule = rules[0];
        const rpcCondType = singleRule ? (singleRule.metric === 'weight' ? 'weight_gte' : 'amount_gte') : 'amount_gte';
        const rpcCondOp = singleRule ? singleRule.operator : 'all';
        const rpcCondVal = singleRule ? Number(singleRule.value) : 0;
        const rpcCondMax = singleRule && singleRule.max_value ? Number(singleRule.max_value) : null;

        const { data: rpcData, error: rpcError } = await supabase.rpc('get_campaign_actual_metrics', {
          p_start_date: config.campaign_date_start,
          p_as_of_date: asOfDate,
          p_backward_start: backwardWindow.start,
          p_backward_end: backwardWindow.end,
          p_cond_type: rpcCondType,
          p_cond_op: rpcCondOp,
          p_cond_val: rpcCondVal,
          p_cond_max: rpcCondMax,
          p_tx_type: txType,
          p_bank: effectiveBank || 'all',
        });

        if (!rpcError && rpcData && rpcData.mtd_transac !== undefined) {
          liveAgg = rpcData;
        }
      } catch (rpcErr) {
        console.warn('RPC campaign calculation failed, falling back to table queries:', rpcErr);
      }
    }

    if (!liveAgg) {
      try {
        // Build MTD Query
        let mtdQuery = supabase
          .from('monthly_data')
          .select('gold_weight, total_amount, phone', { count: 'exact' })
          .in('status', ['ສໍາເລັດ', 'ສຳເລັດ']);

        if (txType !== 'all') {
          mtdQuery = mtdQuery.eq('transaction_type', txType);
        }
        mtdQuery = mtdQuery
          .gte('created_at', config.campaign_date_start)
          .lte('created_at', `${asOfDate} 23:59:59`);

        if (banks.length === 1) {
          mtdQuery = mtdQuery.ilike('bank', `%${banks[0]}%`);
        } else if (banks.length > 1) {
          mtdQuery = mtdQuery.or(banks.map((b: string) => `bank.ilike.%${b}%`).join(','));
        }

        // Build Backward Query
        let bwdQuery = supabase
          .from('monthly_data')
          .select('gold_weight, total_amount', { count: 'exact' })
          .in('status', ['ສໍາເລັດ', 'ສຳເລັດ']);

        if (txType !== 'all') {
          bwdQuery = bwdQuery.eq('transaction_type', txType);
        }
        bwdQuery = bwdQuery
          .gte('created_at', backwardWindow.start)
          .lte('created_at', `${backwardWindow.end} 23:59:59`);

        if (banks.length === 1) {
          bwdQuery = bwdQuery.ilike('bank', `%${banks[0]}%`);
        } else if (banks.length > 1) {
          bwdQuery = bwdQuery.or(banks.map((b: string) => `bank.ilike.%${b}%`).join(','));
        }

        // Apply all condition rules
        for (const r of rules) {
          const col = r.metric === 'weight' ? 'gold_weight' : 'total_amount';
          const val = Number(r.value) || 0;
          if (r.operator === '<=') {
            mtdQuery = mtdQuery.lte(col, val);
            bwdQuery = bwdQuery.lte(col, val);
          } else if (r.operator === 'between') {
            const maxVal = r.max_value !== undefined ? Number(r.max_value) : val;
            mtdQuery = mtdQuery.gte(col, val).lte(col, maxVal);
            bwdQuery = bwdQuery.gte(col, val).lte(col, maxVal);
          } else if (r.operator === '==') {
            mtdQuery = mtdQuery.eq(col, val);
            bwdQuery = bwdQuery.eq(col, val);
          } else {
            mtdQuery = mtdQuery.gte(col, val);
            bwdQuery = bwdQuery.gte(col, val);
          }
        }

        // Execute MTD and BWD in parallel
        const [mtdRes, bwdRes] = await Promise.all([
          !isUpcoming ? mtdQuery.limit(1000) : Promise.resolve({ data: [], count: 0, error: null }),
          bwdQuery.limit(1000),
        ]);

        let mtdCount = mtdRes.count || 0;
        let mtdWeightG = 0;
        let mtdRevenueMil = 0;

        if (mtdRes.data && mtdRes.data.length > 0) {
          const sumW = mtdRes.data.reduce((acc, r: any) => acc + (Number(r.gold_weight) || 0), 0);
          const sumA = mtdRes.data.reduce((acc, r: any) => acc + (Number(r.total_amount) || 0), 0);
          mtdWeightG = Number(((mtdCount * (sumW / mtdRes.data.length))).toFixed(1));
          mtdRevenueMil = Number(((mtdCount * (sumA / mtdRes.data.length)) / 1000000.0).toFixed(1));
        }

        let bwdCount = bwdRes.count || 0;
        let bwdWeightG = 0;
        let bwdRevenueMil = 0;

        if (bwdRes.data && bwdRes.data.length > 0) {
          const sumW = bwdRes.data.reduce((acc, r: any) => acc + (Number(r.gold_weight) || 0), 0);
          const sumA = bwdRes.data.reduce((acc, r: any) => acc + (Number(r.total_amount) || 0), 0);
          bwdWeightG = Number(((bwdCount * (sumW / bwdRes.data.length))).toFixed(1));
          bwdRevenueMil = Number(((bwdCount * (sumA / bwdRes.data.length)) / 1000000.0).toFixed(1));
        }

        if (mtdCount > 0 || isUpcoming || bwdCount > 0) {
          liveAgg = {
            mtd_transac: mtdCount,
            mtd_new_customers: 0,
            mtd_gold_weight_g: mtdWeightG,
            mtd_revenue_mil_lak: mtdRevenueMil,
            backward_transac: bwdCount,
            backward_gold_weight_g: bwdWeightG,
            backward_revenue_mil_lak: bwdRevenueMil,
          };
        }
      } catch (queryErr) {
        console.warn('Direct parallel query failed:', queryErr);
      }
    }

    // Exact NC Query (OPEN_ACCOUNT in period)
    let exactNc = Number(liveAgg?.mtd_new_customers) || 0;
    let exactBwdNc = Number(liveAgg?.backward_new_customers) || 0;
    try {
      let ncQuery = supabase
        .from('monthly_data')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', config.campaign_date_start)
        .lte('created_at', `${asOfDate} 23:59:59`)
        .in('status', ['ສໍາເລັດ', 'ສຳເລັດ'])
        .eq('transaction_type', 'OPEN_ACCOUNT');

      let bwdNcQuery = supabase
        .from('monthly_data')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', backwardWindow.start)
        .lte('created_at', `${backwardWindow.end} 23:59:59`)
        .in('status', ['ສໍາເລັດ', 'ສຳເລັດ'])
        .eq('transaction_type', 'OPEN_ACCOUNT');

      if (banks.length === 1) {
        ncQuery = ncQuery.ilike('bank', `%${banks[0]}%`);
        bwdNcQuery = bwdNcQuery.ilike('bank', `%${banks[0]}%`);
      } else if (banks.length > 1) {
        ncQuery = ncQuery.or(banks.map((b: string) => `bank.ilike.%${b}%`).join(','));
        bwdNcQuery = bwdNcQuery.or(banks.map((b: string) => `bank.ilike.%${b}%`).join(','));
      }

      const [ncRes, bwdNcRes] = await Promise.all([
        !isUpcoming ? ncQuery : Promise.resolve({ count: 0 }),
        bwdNcQuery,
      ]);

      if (ncRes && ncRes.count !== null && ncRes.count !== undefined) {
        exactNc = ncRes.count;
      }
      if (bwdNcRes && bwdNcRes.count !== null && bwdNcRes.count !== undefined) {
        exactBwdNc = bwdNcRes.count;
      }
    } catch (e) {
      console.warn('Exact NC query error:', e);
    }

    // Pass live aggregation results (if any) to analytics engine
    const liveDataPayload = liveAgg
      ? {
          ec_actual_mtd: Number(liveAgg.mtd_transac) || 0,
          nc_actual_mtd: exactNc,
          mtd_buy_weight_g: Number(liveAgg.mtd_gold_weight_g) || 0,
          mtd_buy_value_mil_lak: Number(liveAgg.mtd_revenue_mil_lak) || 0,
          backward_trans: Number(liveAgg.backward_transac) || 0,
          backward_val_mil: Number(liveAgg.backward_revenue_mil_lak) || 0,
          backward_weight_g: Number(liveAgg.backward_gold_weight_g) || 0,
          backward_nc: exactBwdNc,
          max_db_date: asOfDate,
        }
      : {
          max_db_date: asOfDate,
        };

    const finalAnalytics = computeCampaignAnalytics(
      {
        ...config,
        data_update_on: asOfDate,
        same_period_backward_start: backwardWindow.start,
        same_period_backward_end: backwardWindow.end,
      },
      liveDataPayload
    );

    return NextResponse.json({
      ...finalAnalytics,
      sql_script: sqlScript,
      dataSource: liveAgg ? 'supabase_live' : 'computed_cache',
      evaluated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error computing campaign analytics:', error);
    return NextResponse.json(
      { error: 'Failed to compute campaign analytics', details: error.message },
      { status: 500 }
    );
  }
}
