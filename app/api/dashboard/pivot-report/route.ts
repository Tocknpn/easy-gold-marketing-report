import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PivotReportPayload, PivotRowDimension, PivotSlicerState, PivotMetricId } from '@/lib/types/pivotReport.types';
import { computePivotReport } from '@/lib/pivot/pivotEngine';
import { DEFAULT_PIVOT_SLICERS } from '@/lib/storage/profileStorage';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const dimension = (searchParams.get('dimension') || 'bank') as PivotRowDimension;
  const month = searchParams.get('month') || 'all';
  const tx_type = searchParams.get('tx_type') || 'BUY_GOLD';
  const is_500k_up = (searchParams.get('is_500k_up') || 'all') as any;
  const is_2g_up = (searchParams.get('is_2g_up') || 'all') as any;
  const is_3_75g_up = (searchParams.get('is_3_75g_up') || 'all') as any;
  const is_15g_up = (searchParams.get('is_15g_up') || 'all') as any;
  const status = searchParams.get('status') || 'all';

  const slicers: PivotSlicerState = {
    ...DEFAULT_PIVOT_SLICERS,
    month,
    tx_type,
    is_500k_up,
    is_2g_up,
    is_3_75g_up,
    is_15g_up,
    status,
  };

  const activeMetrics: PivotMetricId[] = [
    'total_buy_transac',
    'total_unique_user',
    'revenue_buy_mil_lak',
    'gold_weight_buy_g',
    'gold_buy_size_g',
    'total_nc',
  ];

  let payload: PivotReportPayload = computePivotReport(dimension, slicers, activeMetrics);

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.rpc('get_pivot_studio_report', {
        p_dimension: dimension,
        p_tx_type: tx_type,
        p_month: month,
        p_is_500k_up: is_500k_up,
        p_is_2g_up: is_2g_up,
        p_is_3_75g_up: is_3_75g_up,
        p_is_15g_up: is_15g_up,
        p_status: status,
      });

      if (!error && data && data.rows && data.rows.length > 0) {
        payload = {
          dimension,
          slicers,
          activeMetricIds: activeMetrics,
          rows: data.rows.map((r: any) => ({
            key: r.label,
            label: r.label,
            metrics: {
              total_buy_transac: r.total_buy_transac || 0,
              total_unique_user: r.total_unique_user || 0,
              revenue_buy_mil_lak: r.revenue_buy_mil_lak || 0,
              revenue_buy_lak: Math.round((r.revenue_buy_mil_lak || 0) * 1000000),
              gold_weight_buy_g: r.gold_weight_buy_g || 0,
              gold_buy_size_g: r.gold_buy_size_g || 0,
              total_nc: r.total_nc || 0,
              sum_gold_weight: r.gold_weight_buy_g || 0,
              sum_amount_lak: Math.round((r.revenue_buy_mil_lak || 0) * 1000000),
            },
          })),
          totals: data.totals || payload.totals,
          totalRowCount: data.rows.length,
        };
      }
    }
  } catch (err) {
    console.warn('Falling back to local pivot calculation:', err);
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
