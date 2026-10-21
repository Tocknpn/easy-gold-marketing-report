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
    const { data, error } = await supabase.rpc('get_dynamic_bi_report', {
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

    if (error) {
      console.error('Error generating dynamic report RPC:', error);
      return NextResponse.json(
        { error: `Dynamic BI RPC failed: ${error.message}` },
        { status: 502 }
      );
    }

    if (!data || !data.dax_measures) {
      return NextResponse.json(
        { error: 'Dynamic BI report returned no data for the selected filter criteria.' },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'max-age=60',
      },
    });
  } catch (err: any) {
    console.error('Error in dynamic report route:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error calculating dynamic report.' },
      { status: 500 }
    );
  }
}
