import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { computeCampaignAnalytics, calculateDateDiffDays, computeBackwardDates } from '@/lib/campaign/campaignEngine';
import { buildCampaignSql, buildCampaignRpcParams, resolveCampaignRules, campaignBankList, campaignTxType } from '@/lib/campaign/campaignSql';

export const runtime = 'edge';

// GET: Triggers automated daily 3:00 AM batch sync across all campaigns
export async function GET(req: NextRequest) {
  try {
    const headerUrl = req.headers.get('x-supabase-url');
    const headerKey = req.headers.get('x-supabase-key');
    const supabaseUrl = headerUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = headerKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const campaignId = req.nextUrl.searchParams.get('campaign_id') || null;

    const { data, error } = await supabase.rpc('sync_active_campaigns_daily', {
      p_target_campaign_id: campaignId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      batch_result: data,
      executed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    // 1. Get MAX(created_at) from monthly_data (skip if client already provided verified date)
    const clientProvidedDate = req.headers.get('x-latest-db-date') || config.data_update_on;
    let maxDbDateStr = clientProvidedDate || '2026-10-21';
    const shouldLookupDate = !clientProvidedDate || clientProvidedDate === '2026-10-21';

    if (shouldLookupDate) {
      try {
        const { data: maxDateRow, error: maxDateErr } = await supabase.rpc('get_max_monthly_data_date');
        if (!maxDateErr && maxDateRow) {
          maxDbDateStr = String(maxDateRow).split('T')[0];
        }
      } catch {
        // Direct fast fallback using summary table
        try {
          const { data: latestDaily } = await supabase
            .from('summary_daily_metrics')
            .select('date_id')
            .order('date_id', { ascending: false })
            .limit(1);

          if (latestDaily && latestDaily.length > 0 && latestDaily[0].date_id) {
            maxDbDateStr = latestDaily[0].date_id;
          }
        } catch (e) {
          console.warn('Could not query max date, using fallback:', e);
        }
      }
    }

    const asOfDate = config.data_update_on || (config.auto_sync_max_date !== false ? (maxDbDateStr || '2026-10-21') : (maxDbDateStr || '2026-10-21'));

    // 2. Timeline calculations
    const totalDays = calculateDateDiffDays(config.campaign_date_start, config.campaign_date_end);
    const isUpcoming = new Date(asOfDate).getTime() < new Date(config.campaign_date_start).getTime();
    const isEnded = new Date(asOfDate).getTime() >= new Date(config.campaign_date_end).getTime();
    const elapsedDays = isEnded 
      ? totalDays 
      : isUpcoming ? 0 : Math.min(totalDays, calculateDateDiffDays(config.campaign_date_start, asOfDate));

    // Effective cutoff date for MTD actuals calculation (capped at campaign period end date)
    const effectiveCutoffDate = isEnded ? config.campaign_date_end : (isUpcoming ? config.campaign_date_start : asOfDate);

    // 3. Reverse Backward Dates (supports full planned horizon for upcoming campaigns)
    const backwardWindow = computeBackwardDates(config.campaign_date_start, elapsedDays, totalDays);

    // 4. Shared query helpers (same as the worker): SQL script + RPC params follow the campaign's targets and NC mode
    const txType = campaignTxType(config);
    const banks = campaignBankList(config);
    const rules = resolveCampaignRules(config);
    const campaignWindow = {
      start: config.campaign_date_start,
      cutoff: effectiveCutoffDate,
      backStart: backwardWindow.start,
      backEnd: backwardWindow.end,
      backDays: elapsedDays || totalDays,
    };
    const sqlScript = buildCampaignSql(config, campaignWindow);

    let liveAgg: any = null;

    // Use RPC only for 0 conditions (op='all') or single condition
    if (rules.length <= 1) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_campaign_actual_metrics',
          buildCampaignRpcParams(config, campaignWindow)
        );

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
          .lte('created_at', `${effectiveCutoffDate} 23:59:59`);

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
            mtd_unique_users: mtdRes.data ? new Set(mtdRes.data.map((r: any) => r.phone)).size : 0,
            mtd_new_customers: 0,
            mtd_gold_weight_g: mtdWeightG,
            mtd_revenue_mil_lak: mtdRevenueMil,
            backward_transac: bwdCount,
            backward_unique_users: 0,
            backward_gold_weight_g: bwdWeightG,
            backward_revenue_mil_lak: bwdRevenueMil,
          };
        }
      } catch (queryErr) {
        console.warn('Direct parallel query failed:', queryErr);
      }
    }

    // NC comes only from the RPC, so it always matches the nightly batch definition
    const exactNc = Number(liveAgg?.mtd_new_customers) || 0;
    const exactBwdNc = Number(liveAgg?.backward_new_customers) || 0;

    // Pass live aggregation results (if any) to analytics engine
    const liveDataPayload = liveAgg
      ? {
          ec_actual_mtd: Number(liveAgg.mtd_transac) || 0,
          unique_users_actual_mtd: Number(liveAgg.mtd_unique_users) || 0,
          nc_actual_mtd: exactNc,
          mtd_buy_weight_g: Number(liveAgg.mtd_gold_weight_g) || 0,
          mtd_buy_value_mil_lak: Number(liveAgg.mtd_revenue_mil_lak) || 0,
          nc_mtd_buy_trans: Number(liveAgg.mtd_nc_buy_trans) || 0,
          nc_mtd_buy_value_mil_lak: Number(liveAgg.mtd_nc_buy_value_mil_lak) || 0,
          nc_mtd_buy_weight_g: Number(liveAgg.mtd_nc_buy_weight_g) || 0,
          nc_backward_buy_value_mil_lak: Number(liveAgg.backward_nc_buy_value_mil_lak) || 0,
          nc_backward_buy_weight_g: Number(liveAgg.backward_nc_buy_weight_g) || 0,
          backward_trans: Number(liveAgg.backward_transac) || 0,
          backward_unique_users: Number(liveAgg.backward_unique_users) || 0,
          backward_val_mil: Number(liveAgg.backward_revenue_mil_lak) || 0,
          backward_weight_g: Number(liveAgg.backward_gold_weight_g) || 0,
          backward_nc: exactBwdNc,
          max_db_date: maxDbDateStr,
        }
      : {
          max_db_date: maxDbDateStr,
        };

    const finalAnalytics = computeCampaignAnalytics(
      {
        ...config,
        data_update_on: effectiveCutoffDate,
        same_period_backward_start: backwardWindow.start,
        same_period_backward_end: backwardWindow.end,
      },
      liveDataPayload
    );

    return NextResponse.json({
      ...finalAnalytics,
      live_metrics: liveAgg ? { ...liveDataPayload, sql_script: sqlScript } : null,
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
