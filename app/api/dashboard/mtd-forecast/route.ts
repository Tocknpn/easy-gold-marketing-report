import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * MTD & Forecast report.
 * All numbers come from the get_mtd_forecast_report RPC (see sql/36_mtd_daily_summary_and_rpc.sql),
 * which reads real data. There is intentionally NO demo fallback: if the RPC is missing or fails
 * the client gets an explicit error instead of fake numbers.
 *
 * Query params (all optional):
 *   as_of_date  YYYY-MM-DD  cutoff date (default: latest day with data)
 *   comp_year / comp_month  comparison month (default: month before as_of_date)
 *   mode        calendar_days | working_days
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asOfDate = searchParams.get('as_of_date') || null;
  const compYear = searchParams.get('comp_year');
  const compMonth = searchParams.get('comp_month');
  const mode = searchParams.get('mode') === 'working_days' ? 'working_days' : 'calendar_days';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    return NextResponse.json({ error: 'Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL missing).' }, { status: 503 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc('get_mtd_forecast_report', {
      p_as_of_date: asOfDate,
      p_comp_year: compYear ? parseInt(compYear, 10) : null,
      p_comp_month: compMonth ? parseInt(compMonth, 10) : null,
      p_mode: mode,
    });

    if (error) {
      console.error('MTD RPC error:', error);
      return NextResponse.json(
        { error: `MTD RPC failed: ${error.message}. Run sql/36_mtd_daily_summary_and_rpc.sql in Supabase.` },
        { status: 502 }
      );
    }
    if (!data || data.error || !data.metrics) {
      return NextResponse.json({ error: data?.error || 'MTD RPC returned no data.' }, { status: 502 });
    }

    // Extra forecast methods (sql/65_mtd_hybrid_forecast.sql), merged into each metric.
    // Optional: if a function is not deployed yet, its options stay disabled on the page.
    if (data.as_of_date) {
      const [hybridRes, etsRes] = await Promise.all([
        supabase.rpc('mtd_hybrid_forecast', { p_as_of: data.as_of_date }),
        supabase.rpc('mtd_ets_forecast', { p_as_of: data.as_of_date }),
      ]);
      if (hybridRes.error) console.warn('MTD hybrid forecast unavailable:', hybridRes.error.message);
      if (etsRes.error) console.warn('MTD ETS forecast unavailable:', etsRes.error.message);
      const hybrid = (!hybridRes.error && hybridRes.data && typeof hybridRes.data === 'object'
        ? hybridRes.data : {}) as Record<string, any>;
      const ets = (!etsRes.error && etsRes.data && typeof etsRes.data === 'object'
        ? etsRes.data : {}) as Record<string, any>;
      const num = (v: unknown) => (v != null && Number.isFinite(Number(v)) ? Number(v) : undefined);

      for (const key of Object.keys(data.metrics)) {
        const h = hybrid[key];
        const e = ets[key];
        data.metrics[key] = {
          ...data.metrics[key],
          ...(h ? { est_month_end_hybrid: num(h.est_month_end_hybrid), est_month_end_ma28: num(h.est_month_end_ma28), hybrid: h } : {}),
          ...(e ? { est_month_end_ets: num(e.est_month_end_ets), ets: e } : {}),
        };
      }
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('Error fetching MTD forecast data:', err);
    return NextResponse.json({ error: err?.message || 'Unexpected MTD error.' }, { status: 500 });
  }
}
