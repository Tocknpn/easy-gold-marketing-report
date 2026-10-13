// ============================================================================
// Cloudflare Worker for Easy Gold Marketing Report
// Handles API Edge Caching + Supabase RPC + Worker Static Assets
// ============================================================================

const DEFAULT_FALLBACK_DATA = {
  current_week: {
    year_week: '2026-W41',
    week_label: 'W41',
    week_number: 41,
    year: 2026,
    start_date: '2026-10-06',
    end_date: '2026-10-12',
    all_transactions: 40663,
    active_users: 17895,
    new_registers: 514,
    withdraw_gold_grams: 667,
    buy_weight_15g: 2851,
    buy_transactions: 28475,
    buy_ticket_size_g: 1.5,
    sell_weight_15g: 1263,
    sell_transactions: 11310,
    sell_ticket_size_g: 1.7,
  },
  previous_week: {
    year_week: '2026-W40',
    week_label: 'W40',
    week_number: 40,
    year: 2026,
    start_date: '2026-09-29',
    end_date: '2026-10-05',
    all_transactions: 59840,
    active_users: 24051,
    new_registers: 682,
    withdraw_gold_grams: 817,
    buy_weight_15g: 7031,
    buy_transactions: 47745,
    buy_ticket_size_g: 2.2,
    sell_weight_15g: 1259,
    sell_transactions: 11007,
    sell_ticket_size_g: 1.7,
  },
  history: [
    {
      year_week: '2026-W37',
      week_label: 'W37',
      week_number: 37,
      year: 2026,
      start_date: '2026-09-08',
      end_date: '2026-09-14',
      all_transactions: 35252,
      active_users: 14735,
      new_registers: 663,
      withdraw_gold_grams: 788,
      buy_weight_15g: 2529,
      buy_transactions: 23901,
      buy_ticket_size_g: 1.6,
      sell_weight_15g: 1412,
      sell_transactions: 10387,
      sell_ticket_size_g: 2.0,
    },
    {
      year_week: '2026-W38',
      week_label: 'W38',
      week_number: 38,
      year: 2026,
      start_date: '2026-09-15',
      end_date: '2026-09-21',
      all_transactions: 38473,
      active_users: 15847,
      new_registers: 689,
      withdraw_gold_grams: 917,
      buy_weight_15g: 2917,
      buy_transactions: 25586,
      buy_ticket_size_g: 1.7,
      sell_weight_15g: 1727,
      sell_transactions: 11932,
      sell_ticket_size_g: 2.2,
    },
    {
      year_week: '2026-W39',
      week_label: 'W39',
      week_number: 39,
      year: 2026,
      start_date: '2026-09-22',
      end_date: '2026-09-28',
      all_transactions: 36911,
      active_users: 15127,
      new_registers: 536,
      withdraw_gold_grams: 954,
      buy_weight_15g: 2610,
      buy_transactions: 24932,
      buy_ticket_size_g: 1.6,
      sell_weight_15g: 1199,
      sell_transactions: 11148,
      sell_ticket_size_g: 1.6,
    },
    {
      year_week: '2026-W40',
      week_label: 'W40',
      week_number: 40,
      year: 2026,
      start_date: '2026-09-29',
      end_date: '2026-10-05',
      all_transactions: 59840,
      active_users: 24051,
      new_registers: 682,
      withdraw_gold_grams: 817,
      buy_weight_15g: 7031,
      buy_transactions: 47745,
      buy_ticket_size_g: 2.2,
      sell_weight_15g: 1259,
      sell_transactions: 11007,
      sell_ticket_size_g: 1.7,
    },
    {
      year_week: '2026-W41',
      week_label: 'W41',
      week_number: 41,
      year: 2026,
      start_date: '2026-10-06',
      end_date: '2026-10-12',
      all_transactions: 40663,
      active_users: 17895,
      new_registers: 514,
      withdraw_gold_grams: 667,
      buy_weight_15g: 2851,
      buy_transactions: 28475,
      buy_ticket_size_g: 1.5,
      sell_weight_15g: 1263,
      sell_transactions: 11310,
      sell_ticket_size_g: 1.7,
    },
  ],
  variances: {
    all_transactions: -32,
    active_users: -26,
    new_registers: -25,
    withdraw_gold_grams: -18,
    buy_weight_15g: -59,
    buy_transactions: -40,
    buy_ticket_size_g: -32,
    sell_weight_15g: 0,
    sell_transactions: 3,
    sell_ticket_size_g: 0,
  },
  cached_at: new Date().toISOString(),
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. API Route: /api/dashboard/summary
    if (url.pathname === '/api/dashboard/summary') {
      const cacheUrl = new URL(request.url);
      const cacheKey = new Request(cacheUrl.toString(), request);
      const cache = caches.default;

      // Check Edge Cache first (sub-5ms response)
      let cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      let payload = DEFAULT_FALLBACK_DATA;

      // Query Supabase RPC if configured
      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
        try {
          const rpcUrl = `${supabaseUrl}/rest/v1/rpc/get_executive_weekly_dashboard`;
          const res = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ p_limit: 52 }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.current_week) {
              payload = data;
            }
          }
        } catch (err) {
          console.error('Worker Supabase fetch error:', err);
        }
      }

      const response = new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
        },
      });

      // Cache at Cloudflare Edge for 5 minutes
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    // 2. API Route: /api/dashboard/mtd-forecast
    if (url.pathname === '/api/dashboard/mtd-forecast') {
      const cacheUrl = new URL(request.url);
      const cacheKey = new Request(cacheUrl.toString(), request);
      const cache = caches.default;

      let cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      let payload = {
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
          { label: "Sep'26", year: 2026, month: 9 },
          { label: "Aug'26", year: 2026, month: 8 },
          { label: "Jul'26", year: 2026, month: 7 },
        ],
      };

      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
        try {
          const rpcUrl = `${supabaseUrl}/rest/v1/rpc/get_mtd_forecast_report`;
          const asOfDate = url.searchParams.get('as_of_date') || '2026-10-11';
          const mode = url.searchParams.get('mode') || 'calendar_days';
          const compMonth = parseInt(url.searchParams.get('comp_month') || '9', 10);
          const compYear = parseInt(url.searchParams.get('comp_year') || '2026', 10);

          const res = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              p_as_of_date: asOfDate,
              p_comp_year: compYear,
              p_comp_month: compMonth,
              p_mode: mode,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.metrics) {
              payload = data;
            }
          }
        } catch (err) {
          console.error('Worker Supabase MTD fetch error:', err);
        }
      }

      const response = new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=600',
        },
      });

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    // 3. Serve all other static assets (HTML, CSS, JS, images) via Workers Static Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Asset binding not found', { status: 404 });
  },
};
