import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ExecutiveDashboardData } from '@/lib/types/dashboard.types';

export const runtime = 'edge';

import { DEFAULT_WEEKLY_FALLBACK_DATA } from '@/lib/constants/weeklyData';

export async function GET(request: Request) {
  let responseData = DEFAULT_WEEKLY_FALLBACK_DATA;
  const url = new URL(request.url);
  const isRefresh = url.searchParams.get('refresh') === 'true';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.rpc('get_executive_weekly_dashboard', { p_limit: 52 });

      if (!error && data && data.current_week) {
        // Enrich weekly rows with real buy_value_mil_lak and sell_value_mil_lak from summary_daily_metrics
        try {
          const { data: dailyMetrics } = await supabase
            .from('summary_daily_metrics')
            .select('date_id, buy_value_mil_lak, sell_value_mil_lak');

          if (dailyMetrics && Array.isArray(dailyMetrics)) {
            const enrichWeek = (w: any) => {
              if (!w || !w.start_date || !w.end_date) return;
              const days = dailyMetrics.filter((d: any) => d.date_id >= w.start_date && d.date_id <= w.end_date);
              if (days.length > 0) {
                const sumBuy = days.reduce((acc: number, d: any) => acc + (Number(d.buy_value_mil_lak) || 0), 0);
                const sumSell = days.reduce((acc: number, d: any) => acc + (Number(d.sell_value_mil_lak) || 0), 0);
                w.buy_value_mil_lak = Math.round(sumBuy * 10) / 10;
                w.sell_value_mil_lak = Math.round(sumSell * 10) / 10;
              }
            };

            enrichWeek(data.current_week);
            if (data.previous_week) enrichWeek(data.previous_week);
            if (Array.isArray(data.history)) {
              data.history.forEach(enrichWeek);
            }

            // Recalculate variances for financial values
            if (data.current_week && data.previous_week && data.variances) {
              const prevBuy = data.previous_week.buy_value_mil_lak;
              const curBuy = data.current_week.buy_value_mil_lak;
              if (prevBuy && prevBuy > 0 && curBuy !== undefined) {
                data.variances.buy_value_mil_lak = Math.round(((curBuy - prevBuy) / prevBuy) * 100);
              }
              const prevSell = data.previous_week.sell_value_mil_lak;
              const curSell = data.current_week.sell_value_mil_lak;
              if (prevSell && prevSell > 0 && curSell !== undefined) {
                data.variances.sell_value_mil_lak = Math.round(((curSell - prevSell) / prevSell) * 100);
              }
            }
          }
        } catch (enrichErr) {
          console.warn('Could not enrich weekly metrics with financial values:', enrichErr);
        }

        responseData = data;
      }
    }
  } catch (err) {
    console.error('Error invoking Supabase RPC:', err);
  }

  // Edge Caching for Cloudflare & Next.js
  const cacheHeaders = isRefresh
    ? {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
      }
    : {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        'CDN-Cache-Control': 'max-age=300',
        'Cloudflare-CDN-Cache-Control': 'max-age=300',
      };

  return NextResponse.json(responseData, {
    status: 200,
    headers: cacheHeaders,
  });
}
