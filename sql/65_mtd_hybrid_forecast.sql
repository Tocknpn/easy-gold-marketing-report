-- ==============================================================================
-- 65_mtd_hybrid_forecast.sql
-- Forecast methods for the MTD Forecast page. Run this file once in the SQL Editor.
-- It only creates read-only functions; it changes no data.
--   mtd_hybrid_forecast : Hybrid Trend and MA 28-day x Day-of-Week
--   mtd_ets_forecast    : Holt-Winters ETS (weekly season), plus the error size for the range
--
-- Hybrid Trend: for each of the 7 metrics, every remaining day of the month is forecast as:
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
-- MA 28-day x DOW: base = average of the last 28 days with DOW and payday effects removed;
--   remaining day = base x DOW index x payday factor (day 25+).
--
-- Only data up to the as-of date is used (no look-ahead), so past dates can be checked.
-- Fewer than 28 days of data in the 60-day window -> falls back to linear (fallback = true).
-- Public holidays are not adjusted. Spike days are not capped: a backtest showed capping
-- them made the forecasts slightly worse (the spikes are real volume and they come back).
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
-- MA 28-day x DOW: base = average of the last 28 days with both effects removed.
ma28 AS (
    SELECT mk.k,
           COALESCE((SELECT AVG(w.adj1 / di.idx)
                     FROM win60 w JOIN dow_idx di ON di.k = w.k AND di.dow = w.dow
                     WHERE w.k = mk.k AND w.dt > p.as_of - 28), 0) AS base
    FROM metric_keys mk CROSS JOIN params p
),
-- Step 4: rebuild each remaining day of the month (Hybrid base and MA28 base).
remaining AS (
    SELECT mk.k,
           COUNT(f.d) AS days_left,
           COALESCE(SUM(b.base * di.idx * CASE WHEN EXTRACT(DAY FROM f.d) >= 25 THEN pd.pf ELSE 1.0 END), 0) AS fc,
           COALESCE(SUM(m28.base * di.idx * CASE WHEN EXTRACT(DAY FROM f.d) >= 25 THEN pd.pf ELSE 1.0 END), 0) AS fc_ma28
    FROM metric_keys mk
    CROSS JOIN params p
    JOIN base b ON b.k = mk.k
    JOIN ma28 m28 ON m28.k = mk.k
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
    'current_mtd',        ROUND(m.cur, 2),
    'est_month_end_hybrid', CASE
        WHEN h.days < 28 THEN ROUND(m.cur * (EXTRACT(DAY FROM p.m_end) / GREATEST(1, EXTRACT(DAY FROM p.as_of))))
        ELSE ROUND(m.cur + rm.fc) END,
    'est_month_end_ma28', CASE
        WHEN h.days < 28 THEN ROUND(m.cur * (EXTRACT(DAY FROM p.m_end) / GREATEST(1, EXTRACT(DAY FROM p.as_of))))
        ELSE ROUND(m.cur + rm.fc_ma28) END,
    'base_per_day',       ROUND(b.base, 2),
    'ma28_base_per_day',  ROUND(m28.base, 2),
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
JOIN ma28 m28 ON m28.k = mk.k
JOIN remaining rm ON rm.k = mk.k
JOIN mtd m ON m.k = mk.k;
$$;

GRANT EXECUTE ON FUNCTION public.mtd_hybrid_forecast(DATE) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- Holt-Winters ETS (same family as Excel FORECAST.ETS with seasonality 7).
-- Damped additive trend (phi = 0.9) and multiplicative weekly season, fitted per metric
-- on up to 120 days ending at the as-of date. alpha/beta/gamma come from a 36-point grid
-- (lowest one-step squared error). resid_sigma = spread of the one-step errors over the
-- last 28 days; the page shows an 80% range of est +/- 1.28 x sigma x remaining days
-- (backtest: actual landed inside it about 85% of the time).
-- Fewer than 28 days of data -> linear (fallback = true).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mtd_ets_forecast(p_as_of DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    c_phi   CONSTANT float8 := 0.9;
    v_keys  TEXT[] := ARRAY['buy_weight_g', 'buy_transactions', 'sell_weight_g', 'sell_transactions',
                            'withdraw_15g', 'new_customers', 'total_transactions'];
    v_cols  TEXT[] := ARRAY['buy_weight_15g', 'buy_transactions', 'sell_weight_15g', 'sell_transactions',
                            'withdraw_15g', 'new_customers', 'total_transactions'];
    v_m_start DATE := date_trunc('month', p_as_of)::date;
    v_m_end   DATE := (date_trunc('month', p_as_of) + INTERVAL '1 month - 1 day')::date;
    v_out   JSONB := '{}'::jsonb;
    v_days  DATE[];
    v_vals  float8[];
    v_n     INT;
    v_cur   float8;
    v_l0 float8; v_t0 float8; v_s0 float8[];
    v_a float8; v_b float8; v_g float8;
    v_l float8; v_t float8; v_s float8[]; v_nl float8;
    v_y float8; v_wd INT; v_e float8; v_sse float8; v_res float8[];
    b_sse float8; b_a float8; b_b float8; b_g float8; b_l float8; b_t float8; b_s float8[]; b_res float8[];
    v_fc float8; v_damp float8; v_h INT; v_d DATE; v_sig float8; v_cnt INT; v_sum float8;
    i INT; j INT;
BEGIN
    FOR j IN 1 .. array_length(v_keys, 1) LOOP
        EXECUTE format(
            'SELECT array_agg(date_id ORDER BY date_id), array_agg(%I::float8 ORDER BY date_id)
             FROM public.summary_daily_metrics WHERE date_id BETWEEN $1 - 119 AND $1', v_cols[j])
        INTO v_days, v_vals USING p_as_of;
        EXECUTE format(
            'SELECT COALESCE(SUM(%I), 0)::float8 FROM public.summary_daily_metrics WHERE date_id BETWEEN $1 AND $2', v_cols[j])
        INTO v_cur USING v_m_start, p_as_of;
        v_n := COALESCE(cardinality(v_days), 0);

        IF v_n < 28 THEN
            v_out := v_out || jsonb_build_object(v_keys[j], jsonb_build_object(
                'current_mtd', ROUND(v_cur::numeric, 2),
                'est_month_end_ets', ROUND((v_cur * EXTRACT(DAY FROM v_m_end) / GREATEST(1, EXTRACT(DAY FROM p_as_of)))::numeric),
                'resid_sigma', NULL, 'remaining_days', v_m_end - p_as_of, 'history_days', v_n, 'fallback', true));
            CONTINUE;
        END IF;

        -- Start values from the first 14 days.
        v_l0 := 0;
        FOR i IN 1 .. 14 LOOP v_l0 := v_l0 + v_vals[i]; END LOOP;
        v_l0 := v_l0 / 14;
        v_t0 := 0;
        FOR i IN 8 .. 14 LOOP v_t0 := v_t0 + v_vals[i] - v_vals[i - 7]; END LOOP;
        v_t0 := v_t0 / 49;
        v_s0 := array_fill(1.0::float8, ARRAY[7]);
        FOR v_wd IN 0 .. 6 LOOP
            v_cnt := 0; v_sum := 0;
            FOR i IN 1 .. 14 LOOP
                IF EXTRACT(DOW FROM v_days[i])::int = v_wd THEN
                    v_cnt := v_cnt + 1; v_sum := v_sum + v_vals[i];
                END IF;
            END LOOP;
            IF v_cnt > 0 AND v_l0 > 0 THEN v_s0[v_wd + 1] := (v_sum / v_cnt) / v_l0; END IF;
        END LOOP;

        -- Grid search over the smoothing settings.
        b_sse := NULL;
        FOREACH v_a IN ARRAY ARRAY[0.1, 0.2, 0.3, 0.5]::float8[] LOOP
        FOREACH v_b IN ARRAY ARRAY[0, 0.05, 0.1]::float8[] LOOP
        FOREACH v_g IN ARRAY ARRAY[0.05, 0.1, 0.3]::float8[] LOOP
            v_l := v_l0; v_t := v_t0; v_s := v_s0; v_sse := 0; v_res := ARRAY[]::float8[];
            FOR i IN 15 .. v_n LOOP
                v_y := v_vals[i];
                v_wd := EXTRACT(DOW FROM v_days[i])::int + 1;
                v_e := v_y - (v_l + c_phi * v_t) * v_s[v_wd];
                v_sse := v_sse + v_e * v_e;
                v_res := v_res || v_e;
                v_nl := v_a * (CASE WHEN v_s[v_wd] > 0 THEN v_y / v_s[v_wd] ELSE v_y END)
                        + (1 - v_a) * (v_l + c_phi * v_t);
                v_t := v_b * (v_nl - v_l) + (1 - v_b) * c_phi * v_t;
                IF v_nl > 0 THEN
                    v_s[v_wd] := v_g * (v_y / v_nl) + (1 - v_g) * v_s[v_wd];
                END IF;
                v_l := v_nl;
            END LOOP;
            IF b_sse IS NULL OR v_sse < b_sse THEN
                b_sse := v_sse; b_a := v_a; b_b := v_b; b_g := v_g;
                b_l := v_l; b_t := v_t; b_s := v_s; b_res := v_res;
            END IF;
        END LOOP; END LOOP; END LOOP;

        -- Forecast each remaining day.
        v_fc := 0; v_damp := 0; v_h := 0; v_d := p_as_of + 1;
        WHILE v_d <= v_m_end LOOP
            v_h := v_h + 1;
            v_damp := v_damp + power(c_phi, v_h);
            v_fc := v_fc + GREATEST(0, (b_l + v_damp * b_t) * b_s[EXTRACT(DOW FROM v_d)::int + 1]);
            v_d := v_d + 1;
        END LOOP;

        SELECT stddev_pop(x) INTO v_sig
        FROM unnest(b_res[GREATEST(1, cardinality(b_res) - 27) : cardinality(b_res)]) AS x;

        v_out := v_out || jsonb_build_object(v_keys[j], jsonb_build_object(
            'current_mtd', ROUND(v_cur::numeric, 2),
            'est_month_end_ets', ROUND((v_cur + v_fc)::numeric),
            'alpha', b_a, 'beta', b_b, 'gamma', b_g,
            'resid_sigma', ROUND(COALESCE(v_sig, 0)::numeric, 2),
            'remaining_days', v_h,
            'history_days', v_n,
            'fallback', false));
    END LOOP;
    RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mtd_ets_forecast(DATE) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------------------
-- Quick test: each returns one JSON object with 7 metric keys.
-- ------------------------------------------------------------------------------
SELECT public.mtd_hybrid_forecast((SELECT MAX(date_id) FROM public.summary_daily_metrics));
SELECT public.mtd_ets_forecast((SELECT MAX(date_id) FROM public.summary_daily_metrics));

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
    SELECT c.*, e.key AS metric,
           (e.value->>'est_month_end_ma28')::numeric   AS ma28,
           (e.value->>'est_month_end_hybrid')::numeric AS hybrid,
           (public.mtd_ets_forecast(c.as_of)->e.key->>'est_month_end_ets')::numeric AS ets
    FROM cut c, jsonb_each(public.mtd_hybrid_forecast(c.as_of)) e
),
act AS (
    SELECT c.as_of,
           public.mtd_sum_window(c.m_start, c.as_of) AS mtd,
           public.mtd_sum_window(c.m_start, c.m_end) AS full_m
    FROM cut c
),
est AS (
    SELECT f.as_of, f.metric, (a.full_m->>f.metric)::numeric AS actual,
           ROUND((a.mtd->>f.metric)::numeric * EXTRACT(DAY FROM f.m_end) / EXTRACT(DAY FROM f.as_of)) AS linear,
           f.ma28, f.hybrid, f.ets
    FROM fc f JOIN act a ON a.as_of = f.as_of
)
SELECT as_of, metric, actual, linear, ma28, hybrid, ets,
       ROUND(ABS(linear - actual) / NULLIF(actual, 0) * 100, 1) AS linear_err_pct,
       ROUND(ABS(ma28   - actual) / NULLIF(actual, 0) * 100, 1) AS ma28_err_pct,
       ROUND(ABS(hybrid - actual) / NULLIF(actual, 0) * 100, 1) AS hybrid_err_pct,
       ROUND(ABS(ets    - actual) / NULLIF(actual, 0) * 100, 1) AS ets_err_pct
FROM est
ORDER BY as_of, metric;
