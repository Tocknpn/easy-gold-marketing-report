import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ExecutiveDashboardData } from '@/lib/types/dashboard.types';

export const runtime = 'edge';

import { DEFAULT_WEEKLY_FALLBACK_DATA } from '@/lib/constants/weeklyData';

export async function GET() {
  let responseData = DEFAULT_WEEKLY_FALLBACK_DATA;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.rpc('get_executive_weekly_dashboard', { p_limit: 52 });

      if (!error && data && data.current_week) {
        responseData = data;
      }
    }
  } catch (err) {
    console.error('Error invoking Supabase RPC:', err);
  }

  // Edge Caching for Cloudflare & Next.js
  // s-maxage=300 (5 minutes edge cache), stale-while-revalidate=3600 (serve stale up to 1 hour while fetching update)
  return NextResponse.json(responseData, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=300',
    },
  });
}
