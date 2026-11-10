-- ==============================================================================
-- 65_mtd_hybrid_forecast.sql
-- Hybrid Trend forecast for the MTD Forecast page. Run this file once in the SQL Editor.
-- It only creates a read-only function; it changes no data.
--
-- For each of the 7 metrics, every remaining day of the month is forecast as:
--     Daily = Fresh Base x Day-of-Week Index x Payday Factor (day 25 to month end only)
-- and the month-end estimate = MTD actual + the sum of those daily forecasts.
--
--   1. Payday Factor : last 2 complete months before the as-of month,
--                      avg day 25..EOM / avg day 1..24          (capped 0.5 - 3.0)
--                      = 1.0 if either month has fewer than 5 payday days with data.
--   2. DOW Index     : last 60 days up to the as-of date, payday days divided by the
--                      payday factor first; avg of that weekday / overall avg (capped 0.2 - 3.0)
--   3. Fresh Base    : 14-day EMA (alpha = 2/15, seeded with the oldest day) of the last
--                      14 days, each divided by its DOW index and payday factor.
--
-- Only data up to the as-of date is used (no look-ahead), so past dates can be checked.
-- Fewer than 28 days of data in the 60-day window -> falls back to linear (fallback = true).
-- Public holidays are not adjusted.
-- Data source: summary_daily_metrics (kept forever, survives the raw-data rollover).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.mtd_hybrid_forecast(p_as_of DATE)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH params AS (
    SELECT
        p_as_of                                                          AS as_of,
        date_trunc('month', p_as_of)::date                               AS m_start,
        (date_trunc('month', p_as_of) + INTERVAL '1 month - 1 day')::date AS m_end,
        (date_trunc('month', p_as_of) - INTERVAL '2 month')::date        AS pd_start,
        (date_trunc('month', p_as_of) - INTERVAL '1 day')::date          AS pd_end,
        2.0 / 15.0                                                       AS alpha
),
metric_keys(k) AS (
    VALUES ('buy_weight_g'), ('buy_transactions'), ('sell_weight_g'), ('sell_transactions'),
           ('withdraw_15g'), ('new_customers'), ('total_transactions')
),
-- One row per (day, metric) that has saved data, from the earliest day any step needs.
raw AS (
    SELECT s.date_id AS dt, mk.k,
           (CASE mk.k
                WHEN 'buy_weight_g'       THEN s.buy_weight_15g
                WHEN 'buy_transactions'   THEN s.buy_transactions
                WHEN 'sell_weight_g'      THEN s.sell_weight_15g
                WHEN 'sell_transactions'  THEN s.sell_transactions
                WHEN 'withdraw_15g'       THEN s.withdraw_15g
                WHEN 'new_customers'      THEN s.new_customers
                WHEN 'total_transactions' THEN s.total_transactions
            END)::numeric AS v,
           EXTRACT(DAY FROM s.date_id) >= 25 AS is_payday
    FROM params p
    JOIN public.summary_daily_metrics s
      ON s.date_id BETWEEN LEAST(p.as_of - 59, p.pd_start) AND p.as_of
    CROSS JOIN metric_keys mk
),
-- Step 1: payday factor from the last 2 complete months.
pd_months AS (
    SELECT r.k, date_trunc('month', r.dt) AS m, COUNT(*) FILTER (WHERE r.is_payday) AS pd_days
    FROM raw r, params p
    WHERE r.dt BETWEEN p.pd_start AND p.pd_end
    GROUP BY r.k, date_trunc('month', r.dt)
),
pd AS (
    SELECT mk.k,
           CASE
               WHEN (SELECT COUNT(*) FROM pd_months pm WHERE pm.k = mk.k AND pm.pd_days >= 5) < 2 THEN 1.0
               WHEN COALESCE(a.norm_avg, 0) <= 0 OR a.pd_avg IS NULL THEN 1.0
               ELSE LEAST(3.0, GREATEST(0.5, a.pd_avg / a.norm_avg))
           END AS pf
    FROM metric_keys mk
    LEFT JOIN LATERAL (
        SELECT AVG(r.v) FILTER (WHERE r.is_payday)     AS pd_avg,
               AVG(r.v) FILTER (WHERE NOT r.is_payday) AS norm_avg
        FROM raw r, params p
        WHERE r.k = mk.k AND r.dt BETWEEN p.pd_start AND p.pd_end
    ) a ON true
),
-- Last 60 days with the payday effect removed.
win60 AS (
    SELECT r.k, r.dt, EXTRACT(DOW FROM r.dt)::int AS dow, r.is_payday,
           r.v / CASE WHEN r.is_payday THEN pd.pf ELSE 1.0 END AS adj1
    FROM raw r
    JOIN pd ON pd.k = r.k
    CROSS JOIN params p
    WHERE r.dt > p.as_of - 60
),
hist AS (
    SELECT mk.k, COUNT(w.dt) AS days, AVG(w.adj1) AS overall_avg
    FROM metric_keys mk LEFT JOIN win60 w ON w.k = mk.k
    GROUP BY mk.k
),
-- Step 2: day-of-week index (0 = Sunday .. 6 = Saturday), missing weekday -> 1.0.
dow_idx AS (
    SELECT mk.k, d.dow,
           CASE
               WHEN COALESCE(h.overall_avg, 0) <= 0 OR a.dow_avg IS NULL THEN 1.0
               ELSE LEAST(3.0, GREATEST(0.2, a.dow_avg / h.overall_avg))
           END AS idx
    FROM metric_keys mk
    CROSS JOIN generate_series(0, 6) AS d(dow)
    JOIN hist h ON h.k = mk.k
    LEFT JOIN LATERAL (
        SELECT AVG(w.adj1) AS dow_avg FROM win60 w WHERE w.k = mk.k AND w.dow = d.dow
    ) a ON true
),
-- Step 3: fresh base = EMA of the last 14 days with both effects removed.
-- Closed form of EMA_t = a*x_t + (1-a)*EMA_(t-1), seeded with EMA_1 = x_1.
last14 AS (
    SELECT w.k, w.adj1 / di.idx AS adj2,
           ROW_NUMBER() OVER (PARTITION BY w.k ORDER BY w.dt) AS rn,
           COUNT(*)     OVER (PARTITION BY w.k)               AS n
    FROM win60 w
    JOIN dow_idx di ON di.k = w.k AND di.dow = w.dow
    CROSS JOIN params p
    WHERE w.dt > p.as_of - 14
),
base AS (
    SELECT mk.k,
           COALESCE(SUM(l.adj2 * CASE WHEN l.rn = 1 THEN power(1 - p.alpha, l.n - 1)
                                      ELSE p.alpha * power(1 - p.alpha, l.n - l.rn) END), 0) AS base
    FROM metric_keys mk
    CROSS JOIN params p
    LEFT JOIN last14 l ON l.k = mk.k
    GROUP BY mk.k
),
-- Step 4: rebuild each remaining day of the month.
remaining AS (
    SELECT mk.k,
           COUNT(f.d)                                                        AS days_left,
           COALESCE(SUM(b.base * di.idx * CASE WHEN EXTRACT(DAY FROM f.d) >= 25 THEN pd.pf ELSE 1.0 END), 0) AS fc
    FROM metric_keys mk
    CROSS JOIN params p
    JOIN base b ON b.k = mk.k
    JOIN pd ON pd.k = mk.k
    LEFT JOIN LATERAL (
        SELECT g::date AS d FROM generate_series(p.as_of + 1, p.m_end, INTERVAL '1 day') AS g
    ) f ON true
    LEFT JOIN dow_idx di ON di.k = mk.k AND di.dow = EXTRACT(DOW FROM f.d)::int
    GROUP BY mk.k
),
mtd AS (
    SELECT mk.k, COALESCE(SUM(r.v), 0) AS cur
    FROM metric_keys mk
    CROSS JOIN params p
    LEFT JOIN raw r ON r.k = mk.k AND r.dt BETWEEN p.m_start AND p.as_of
    GROUP BY mk.k
)
SELECT jsonb_object_agg(mk.k, jsonb_build_object(
    'est_month_end_hybrid', CASE
        WHEN h.days < 28 THEN ROUND(m.cur * (EXTRACT(DAY FROM p.m_end) / GREATEST(1, EXTRACT(DAY FROM p.as_of))))
        ELSE ROUND(m.cur + rm.fc) END,
    'base_per_day',       ROUND(b.base, 2),
    'payday_factor',      ROUND(pd.pf, 3),
    'dow_min',            (SELECT ROUND(MIN(idx), 3) FROM dow_idx di WHERE di.k = mk.k),
    'dow_max',            (SELECT ROUND(MAX(idx), 3) FROM dow_idx di WHERE di.k = mk.k),
    'remaining_forecast', ROUND(rm.fc),
    'remaining_days',     rm.days_left,
    'history_days',       h.days,
    'fallback',           h.days < 28
))
FROM metric_keys mk
CROSS JOIN params p
JOIN hist h ON h.k = mk.k
JOIN pd ON pd.k = mk.k
JOIN base b ON b.k = mk.k
JOIN remaining rm ON rm.k = mk.k
JOIN mtd m ON m.k = mk.k;
$$;

GRANT EXECUTE ON FUNCTION public.mtd_hybrid_forecast(DATE) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------------------
-- Quick test: one JSON object, 7 metric keys.
-- ------------------------------------------------------------------------------
SELECT public.mtd_hybrid_forecast((SELECT MAX(date_id) FROM public.summary_daily_metrics));

-- ------------------------------------------------------------------------------
-- Accuracy check (read-only): forecast as of the 10th and 20th of the last 2 complete
-- months vs the actual month total. Lower abs error % = better.
-- ------------------------------------------------------------------------------
WITH cut AS (
    SELECT (m::date + (dd - 1)) AS as_of, m::date AS m_start,
           (m::date + INTERVAL '1 month - 1 day')::date AS m_end
    FROM generate_series(
             date_trunc('month', (SELECT MAX(date_id) FROM public.summary_daily_metrics)) - INTERVAL '2 month',
             date_trunc('month', (SELECT MAX(date_id) FROM public.summary_daily_metrics)) - INTERVAL '1 month',
             INTERVAL '1 month') AS m,
         unnest(ARRAY[10, 20]) AS dd
),
fc AS (
    SELECT c.*, e.key AS metric, (e.value->>'est_month_end_hybrid')::numeric AS hybrid
    FROM cut c, jsonb_each(public.mtd_hybrid_forecast(c.as_of)) e
),
act AS (
    SELECT c.as_of,
           public.mtd_sum_window(c.m_start, c.as_of) AS mtd,
           public.mtd_sum_window(c.m_start, c.m_end) AS full_m
    FROM cut c
)
SELECT f.as_of, f.metric,
       (a.full_m->>f.metric)::numeric                                              AS actual,
       ROUND((a.mtd->>f.metric)::numeric * EXTRACT(DAY FROM f.m_end) / EXTRACT(DAY FROM f.as_of)) AS linear,
       f.hybrid,
       ROUND(ABS((a.mtd->>f.metric)::numeric * EXTRACT(DAY FROM f.m_end) / EXTRACT(DAY FROM f.as_of)
                 - (a.full_m->>f.metric)::numeric) / NULLIF((a.full_m->>f.metric)::numeric, 0) * 100, 1) AS linear_err_pct,
       ROUND(ABS(f.hybrid - (a.full_m->>f.metric)::numeric) / NULLIF((a.full_m->>f.metric)::numeric, 0) * 100, 1) AS hybrid_err_pct
FROM fc f JOIN act a ON a.as_of = f.as_of
ORDER BY f.as_of, f.metric;
