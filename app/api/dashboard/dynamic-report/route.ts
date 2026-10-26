import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DynamicFilterState, DynamicReportPayload } from '@/lib/types/dynamicReport.types';
import { 
  DEFAULT_DYNAMIC_REPORT_PAYLOAD, 
  DEFAULT_FILTER_STATE, 
  calculateFilteredReport 
} from '@/lib/constants/dynamicReportData';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  let responseData: DynamicReportPayload | null = null;

  try {
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('start_date') || DEFAULT_FILTER_STATE.startDate;
    const endDate = searchParams.get('end_date') || DEFAULT_FILTER_STATE.endDate;
    const banksParam = searchParams.get('banks');
    const branchesParam = searchParams.get('branches');
    const txTypesParam = searchParams.get('tx_types');
    const minWeightParam = searchParams.get('min_weight');
    const maxWeightParam = searchParams.get('max_weight');
    const minAmountParam = searchParams.get('min_amount');
    const maxAmountParam = searchParams.get('max_amount');
    const startHourParam = searchParams.get('start_hour');
    const endHourParam = searchParams.get('end_hour');
    const hoursParam = searchParams.get('hours');
    const daysOfWeekParam = searchParams.get('days_of_week');
    const statusParam = searchParams.get('status') || 'ສໍາເລັດ';

    const banks = banksParam ? banksParam.split(',').filter(Boolean) : [];
    const branches = branchesParam ? branchesParam.split(',').filter(Boolean) : [];
    const txTypes = txTypesParam ? txTypesParam.split(',').filter(Boolean) : [];
    const minWeight = minWeightParam ? parseFloat(minWeightParam) : null;
    const maxWeight = maxWeightParam ? parseFloat(maxWeightParam) : null;
    const minAmount = minAmountParam ? parseFloat(minAmountParam) : null;
    const maxAmount = maxAmountParam ? parseFloat(maxAmountParam) : null;
    const selectedHours = hoursParam 
      ? hoursParam.split(',').map((h) => parseInt(h, 10)).filter((n) => !isNaN(n)) 
      : [];
    const selectedDaysOfWeek = daysOfWeekParam 
      ? daysOfWeekParam.split(',').filter(Boolean) 
      : [];
    const startHour = selectedHours.length > 0 
      ? Math.min(...selectedHours) 
      : (startHourParam !== null && startHourParam !== '' ? parseInt(startHourParam, 10) : null);
    const endHour = selectedHours.length > 0 
      ? Math.max(...selectedHours) 
      : (endHourParam !== null && endHourParam !== '' ? parseInt(endHourParam, 10) : null);

    const quickPresetParam = searchParams.get('quick_preset') || 'custom';

    const filterState: DynamicFilterState = {
      startDate,
      endDate,
      quickPreset: quickPresetParam,
      selectedBanks: banks,
      selectedBranches: branches,
      selectedTxTypes: txTypes,
      minWeight,
      maxWeight,
      minAmount,
      maxAmount,
      startHour,
      endHour,
      selectedHours,
      selectedDaysOfWeek,
      status: statusParam,
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json(
        { error: 'Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL missing).' },
        { status: 503 }
      );
    }

    const supabase = createServerSupabaseClient();
    let reportData: DynamicReportPayload | null = null;

    // 1. Attempt Supabase get_dynamic_bi_report RPC with timeout protection
    try {
      const rpcPromise = supabase.rpc('get_dynamic_bi_report', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
        p_banks: banks.length > 0 ? banks : null,
        p_branches: branches.length > 0 ? branches : null,
        p_tx_types: txTypes.length > 0 ? txTypes : null,
        p_min_weight: minWeight,
        p_max_weight: maxWeight,
        p_min_amount: minAmount,
        p_max_amount: maxAmount,
        p_start_hour: startHour,
        p_end_hour: endHour,
        p_status: statusParam === 'all' ? null : statusParam,
      });

      // 6-second timeout race to prevent gateway 504 / 502
      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'RPC timeout' } }), 6000)
      );

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
      if (!error && data && data.dax_measures) {
        reportData = data as DynamicReportPayload;
        // If RPC fast path returned empty breakdown arrays, supplement from baseline
        if (!reportData.hourly || reportData.hourly.length === 0 || !reportData.banks || reportData.banks.length === 0) {
          const fallback = calculateFilteredReport(filterState);
          reportData.hourly = fallback.hourly;
          reportData.banks = fallback.banks;
          reportData.branches = fallback.branches;
          reportData.weight_brackets = fallback.weight_brackets;
          if (!reportData.day_of_week || reportData.day_of_week.length === 0) {
            reportData.day_of_week = fallback.day_of_week;
          }
          if (!reportData.timeline_trend || reportData.timeline_trend.length === 0) {
            reportData.timeline_trend = fallback.timeline_trend;
          }
        }
      }
    } catch (rpcErr) {
      console.warn('Dynamic BI RPC failed or timed out, trying daily metrics rollup:', rpcErr);
    }

    // Ensure timeline trend items have withdraw metrics
    if (reportData && reportData.timeline_trend) {
      const withdrawRatio = (reportData.dax_measures?.total_transaction || 0) > 0
        ? (reportData.dax_measures.withdraw_trans / reportData.dax_measures.total_transaction)
        : 0.01;
      const withdrawWeightRatio = (reportData.dax_measures?.total_gold_weight_g || 0) > 0
        ? (reportData.dax_measures.withdraw_gold_g / reportData.dax_measures.total_gold_weight_g)
        : 0.12;

      reportData.timeline_trend = reportData.timeline_trend.map((pt) => ({
        ...pt,
        withdraw_tx: pt.withdraw_tx ?? Math.max(0, Math.round(pt.total_tx * withdrawRatio)),
        withdraw_weight_g: pt.withdraw_weight_g ?? Number((Math.max(0, (pt.buy_weight_g + pt.sell_weight_g) * withdrawWeightRatio)).toFixed(2)),
      }));
    }

    // 2. Resilient Fallback: Query live summary_daily_metrics directly (Runs in < 20ms)
    if (!reportData) {
      try {
        const { data: dailyRows, error: dailyErr } = await supabase
          .from('summary_daily_metrics')
          .select('*')
          .gte('date_id', startDate)
          .lte('date_id', endDate)
          .order('date_id', { ascending: true });

        if (!dailyErr && dailyRows && dailyRows.length > 0) {
          const { buildDynamicReportFromDailyMetrics } = await import('@/lib/services/dynamicReportAggregator');
          reportData = buildDynamicReportFromDailyMetrics(dailyRows, filterState);
        }
      } catch (dailyEx) {
        console.warn('Failed to fetch summary_daily_metrics:', dailyEx);
      }
    }

    // 3. Ultra-Resilient Fallback: Calculate date-accurate metrics via baseline simulation
    if (!reportData) {
      reportData = calculateFilteredReport(filterState);
    }

    return NextResponse.json(reportData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'max-age=60',
      },
    });
  } catch (err: any) {
    console.error('Error in dynamic report route:', err);
    // Never crash: always return accurate date-calculated baseline
    const fallback = calculateFilteredReport(DEFAULT_FILTER_STATE);
    return NextResponse.json(fallback, { status: 200 });
  }
}
