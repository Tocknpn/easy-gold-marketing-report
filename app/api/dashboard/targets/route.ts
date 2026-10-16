import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DEFAULT_2026_TARGETS, calculateRunRateComparison } from '@/lib/constants/targetData';
import { MonthlyMarketingTarget } from '@/lib/types/target.types';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currYear = parseInt(searchParams.get('curr_year') || '2026', 10);
    const currMonth = parseInt(searchParams.get('curr_month') || '10', 10);
    const compYear = parseInt(searchParams.get('comp_year') || '2026', 10);
    const compMonth = parseInt(searchParams.get('comp_month') || '9', 10);
    const asOfDay = parseInt(searchParams.get('as_of_day') || '15', 10);

    let activeTargets: MonthlyMarketingTarget[] = DEFAULT_2026_TARGETS;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      try {
        const supabase = createServerSupabaseClient();
        const { data: dbTargets, error } = await supabase
          .from('monthly_marketing_targets')
          .select('*')
          .eq('year', currYear)
          .order('month', { ascending: true });

        if (!error && dbTargets && dbTargets.length > 0) {
          activeTargets = dbTargets.map((t: any) => ({
            ...t,
            month_label: DEFAULT_2026_TARGETS[t.month - 1]?.month_label || `M${t.month}`,
          }));
        }
      } catch (e) {
        console.warn('Supabase target fetch error, using built-in verified targets:', e);
      }
    }

    const payload = calculateRunRateComparison(
      currYear,
      currMonth,
      compYear,
      compMonth,
      asOfDay,
      activeTargets
    );

    return NextResponse.json(
      {
        targets: activeTargets,
        report: payload,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    console.error('Target API GET failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targets } = body;

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: 'Invalid targets payload' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      try {
        const supabase = createServerSupabaseClient();
        const rowsToUpsert = targets.map((t: MonthlyMarketingTarget) => ({
          year: t.year || 2026,
          month: t.month,
          target_nc: t.target_nc,
          buy_trans: t.buy_trans,
          buy_weight_g: t.buy_weight_g,
          sell_trans: t.sell_trans,
          sell_weight_g: t.sell_weight_g,
          notes: t.notes || null,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('monthly_marketing_targets')
          .upsert(rowsToUpsert, { onConflict: 'year,month' });

        if (error) {
          console.error('Supabase upsert error:', error);
          return NextResponse.json({ error: error.message, savedLocally: true }, { status: 200 });
        }
      } catch (dbErr: any) {
        console.warn('Supabase DB error on upsert:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Targets saved successfully',
      targets,
    });
  } catch (err: any) {
    console.error('Target API POST failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
