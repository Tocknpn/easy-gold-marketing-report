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
    let maxDbDateStr = config.data_update_on;
    try {
      const { data: maxDateRow, error: maxDateErr } = await supabase.rpc('get_max_monthly_data_date');
      if (!maxDateErr && maxDateRow) {
        maxDbDateStr = String(maxDateRow).split('T')[0];
      }
    } catch {
      // Fallback: direct query
      try {
        const { data: latestRows } = await supabase
          .from('monthly_data')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestRows && latestRows.length > 0 && latestRows[0].created_at) {
          const raw = String(latestRows[0].created_at);
          // If in DD/MM/YYYY format
          if (raw.includes('/')) {
            const parts = raw.split(',')[0].trim().split('/');
            if (parts.length === 3) {
              maxDbDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            maxDbDateStr = raw.split('T')[0].split(' ')[0];
          }
        }
      } catch (e) {
        console.warn('Could not query max date, using configured date:', e);
      }
    }

    const asOfDate = config.auto_sync_max_date ? maxDbDateStr : config.data_update_on;

    // 2. Timeline calculations
    const totalDays = calculateDateDiffDays(config.campaign_date_start, config.campaign_date_end);
    const isEnded = new Date(asOfDate).getTime() >= new Date(config.campaign_date_end).getTime();
    const elapsedDays = isEnded 
      ? totalDays 
      : Math.min(totalDays, calculateDateDiffDays(config.campaign_date_start, asOfDate));

    // 3. Reverse Backward Dates
    const backwardWindow = computeBackwardDates(config.campaign_date_start, elapsedDays);

    // 4. Run Live Campaign Aggregation Query via RPC if available, or query directly
    let liveAgg: any = null;
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_campaign_actual_metrics', {
        p_start_date: config.campaign_date_start,
        p_as_of_date: asOfDate,
        p_backward_start: backwardWindow.start,
        p_backward_end: backwardWindow.end,
        p_cond_type: config.condition_type,
        p_cond_op: config.condition_operator,
        p_cond_val: config.condition_value,
        p_cond_max: config.condition_max_value || null,
        p_tx_type: config.tx_type || 'BUY_GOLD',
      });

      if (!rpcErr && rpcData) {
        liveAgg = rpcData;
      }
    } catch {
      // RPC not yet created in Supabase
    }

    // Pass live aggregation results (if any) to analytics engine
    const liveDataPayload = liveAgg
      ? {
          ec_actual_mtd: Number(liveAgg.mtd_transac) || 0,
          nc_actual_mtd: Number(liveAgg.mtd_new_customers) || 0,
          mtd_buy_weight_g: Number(liveAgg.mtd_gold_weight_g) || 0,
          mtd_buy_value_mil_lak: Number(liveAgg.mtd_revenue_mil_lak) || 0,
          backward_trans: Number(liveAgg.backward_transac) || 0,
          backward_val_mil: Number(liveAgg.backward_revenue_mil_lak) || 0,
          backward_weight_g: Number(liveAgg.backward_gold_weight_g) || 0,
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
