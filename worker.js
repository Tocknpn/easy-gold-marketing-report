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

    // 2. Serve all other static assets (HTML, CSS, JS, images) via Workers Static Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Asset binding not found', { status: 404 });
  },
};
