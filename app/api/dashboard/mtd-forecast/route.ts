import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MtdReportPayload } from '@/lib/types/mtd.types';

export const runtime = 'edge';

// Mockup seed matching exactly the screenshot provided by user
const DEFAULT_MTD_PAYLOAD: MtdReportPayload = {
  as_of_date: '2026-10-11',
  display_as_of_date: '11/10/2026',
  current_month_label: "Oct'26",
  current_month_year: 2026,
  current_month_num: 10,
  comparison_month_label: "Sep'26",
  comparison_month_year: 2026,
  comparison_month_num: 9,
  elapsed_days: 11,
  total_days_current_month: 31,
  elapsed_working_days: 8,
  total_working_days_current_month: 22,
  calculation_mode: 'calendar_days',
  metrics: {
    buy_weight_g: {
      id: 'buy_weight_g',
      label: 'Buy Weight (g)',
      icon_name: 'shopping-bag',
      current_mtd: 5091,
      comp_mtd: 4457,
      mtd_variance_percent: 14,
      est_month_end: 14348,
      full_comp_month: 15048,
      forecast_variance_percent: -5,
    },
    buy_transactions: {
      id: 'buy_transactions',
      label: 'Buy Transaction',
      icon_name: 'shopping-cart',
      current_mtd: 47948,
      comp_mtd: 40443,
      mtd_variance_percent: 19,
      est_month_end: 135126,
      full_comp_month: 123977,
      forecast_variance_percent: 9,
    },
    sell_weight_g: {
      id: 'sell_weight_g',
      label: 'Sell Weight (g)',
      icon_name: 'tag',
      current_mtd: 1937,
      comp_mtd: 2847,
      mtd_variance_percent: -32,
      est_month_end: 5458,
      full_comp_month: 6566,
      forecast_variance_percent: -17,
    },
    sell_transactions: {
      id: 'sell_transactions',
      label: 'Sell Transaction',
      icon_name: 'scale',
      current_mtd: 17234,
      comp_mtd: 17016,
      mtd_variance_percent: 1,
      est_month_end: 48569,
      full_comp_month: 47724,
      forecast_variance_percent: 2,
    },
    withdraw_15g: {
      id: 'withdraw_15g',
      label: 'Withdraw (15g)',
      icon_name: 'layers',
      current_mtd: 1140,
      comp_mtd: 1187,
      mtd_variance_percent: -4,
      est_month_end: 3212,
      full_comp_month: 3582,
      forecast_variance_percent: -10,
    },
    new_customers: {
      id: 'new_customers',
      label: 'New Customer',
      icon_name: 'user-plus',
      current_mtd: 833,
      comp_mtd: 1255,
      mtd_variance_percent: -34,
      est_month_end: 2348,
      full_comp_month: 2946,
      forecast_variance_percent: -20,
    },
    total_transactions: {
      id: 'total_transactions',
      label: 'Total Transaction',
      icon_name: 'arrow-left-right',
      current_mtd: 66652,
      comp_mtd: 59196,
      mtd_variance_percent: 13,
      est_month_end: 187837,
      full_comp_month: 175923,
      forecast_variance_percent: 7,
    },
  },
  available_months: [
    { label: "Oct'26", year: 2026, month: 10 },
    { label: "Sep'26", year: 2026, month: 9 },
    { label: "Aug'26", year: 2026, month: 8 },
    { label: "Jul'26", year: 2026, month: 7 },
    { label: "Jun'26", year: 2026, month: 6 },
    { label: "May'26", year: 2026, month: 5 },
    { label: "Apr'26", year: 2026, month: 4 },
  ],
};

export async function GET(request: NextRequest) {
  let responseData: MtdReportPayload = DEFAULT_MTD_PAYLOAD;

  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('as_of_date') || '2026-10-11';
    const compMonthParam = searchParams.get('comp_month'); // e.g. '9'
    const compYearParam = searchParams.get('comp_year'); // e.g. '2026'
    const mode = searchParams.get('mode') || 'calendar_days'; // 'calendar_days' | 'working_days'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.rpc('get_mtd_forecast_report', {
        p_as_of_date: asOfDate,
        p_comp_year: compYearParam ? parseInt(compYearParam, 10) : 2026,
        p_comp_month: compMonthParam ? parseInt(compMonthParam, 10) : 9,
        p_mode: mode,
      });

      if (!error && data && data.metrics) {
        responseData = data;
      }
    } else {
      // Allow dynamic day adjustment in mock mode when user changes cutoff date or comparison mode
      if (asOfDate !== '2026-10-11' || mode === 'working_days') {
        const parts = asOfDate.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[2], 10);
          const totalDays = 31;
          const ratio = totalDays / Math.max(1, day);

          const updatedMetrics = { ...DEFAULT_MTD_PAYLOAD.metrics };
          Object.keys(updatedMetrics).forEach((key) => {
            const mKey = key as keyof typeof updatedMetrics;
            const item = { ...updatedMetrics[mKey] };
            // Scale according to day ratio
            const currentMtd = Math.round((DEFAULT_MTD_PAYLOAD.metrics[mKey].current_mtd / 11) * day);
            const compMtd = Math.round((DEFAULT_MTD_PAYLOAD.metrics[mKey].comp_mtd / 11) * day);
            const mtdVar = compMtd > 0 ? Math.round(((currentMtd - compMtd) / compMtd) * 100) : 0;
            const estLanding = Math.round(currentMtd * ratio);
            const fullComp = DEFAULT_MTD_PAYLOAD.metrics[mKey].full_comp_month;
            const estVar = fullComp > 0 ? Math.round(((estLanding - fullComp) / fullComp) * 100) : 0;

            updatedMetrics[mKey] = {
              ...item,
              current_mtd: currentMtd,
              comp_mtd: compMtd,
              mtd_variance_percent: mtdVar,
              est_month_end: estLanding,
              forecast_variance_percent: estVar,
            };
          });

          responseData = {
            ...DEFAULT_MTD_PAYLOAD,
            as_of_date: asOfDate,
            display_as_of_date: `${parts[2]}/${parts[1]}/${parts[0]}`,
            elapsed_days: day,
            calculation_mode: mode as any,
            metrics: updatedMetrics,
          };
        }
      }
    }
  } catch (err) {
    console.error('Error fetching MTD forecast data:', err);
  }

  return NextResponse.json(responseData, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      'CDN-Cache-Control': 'max-age=120',
      'Cloudflare-CDN-Cache-Control': 'max-age=120',
    },
  });
}
