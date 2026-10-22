-- ============================================================================
-- EASY GOLD - MTD & FORECAST: REAL DAILY SUMMARY + RPC
-- File: 36_mtd_daily_summary_and_rpc.sql
--
-- WHY: the MTD Forecast page was showing hard-coded demo numbers because
-- get_mtd_forecast_report() was never deployed. This script:
--   1. Creates summary_daily_metrics (1 row per day, ~300 rows total).
--   2. Back-fills Jan-Mar 2026 from fact_daily_core and Apr+ from monthly_data.
--   3. Deploys get_mtd_forecast_report() reading that table (instant).
--      It also re-aggregates the newest few days from monthly_data on every
--      call, so a fresh upload shows up with no extra step.
--
-- METRIC DEFINITIONS (verified against the manual Google Slide, Oct 1-18 2026:
--   Buy Tx 73,841 | NC 1,302 | Total Tx 105,433 | Buy Wt 7,696):
--   * Transactions = ALL rows by transaction_type (no status filter).
--   * Weights      = SUM(gold_weight) / 15  (1 baht = 15 g).
--   * Withdraw     = SUM(gold_weight) of WITHDRAW_GOLD + MARKETHUB_WITHDRAW / 15.
--   * New Customer = COUNT of OPEN_ACCOUNT rows.
--   * Total Tx     = COUNT of every row.
--
-- HOW TO RUN (Supabase SQL Editor):
--   Run PART 1, PART 2, PART 3 (one SELECT at a time), PART 4, then PART 5.
-- ============================================================================


-- ============================================================================
-- PART 1: TABLE + HELPERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.summary_daily_metrics (
    date_id            DATE PRIMARY KEY,
    buy_weight_15g     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    buy_transactions   INT            NOT NULL DEFAULT 0,
    sell_weight_15g    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    sell_transactions  INT            NOT NULL DEFAULT 0,
    withdraw_15g       NUMERIC(14, 2) NOT NULL DEFAULT 0,
    new_customers      INT            NOT NULL DEFAULT 0,
    total_transactions INT            NOT NULL DEFAULT 0,
    source             TEXT           NOT NULL DEFAULT 'monthly_data',
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now()
);

ALTER TABLE public.summary_daily_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for all" ON public.summary_daily_metrics;
CREATE POLICY "Allow select for all" ON public.summary_daily_metrics FOR SELECT USING (true);
GRANT SELECT ON public.summary_daily_metrics TO anon, authenticated, service_role;

-- Working days = Mon-Sat (Sunday excluded), same rule as the original design.
CREATE OR REPLACE FUNCTION public.count_working_days(
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_sundays_only BOOLEAN DEFAULT true
)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_days INT;
BEGIN
    IF p_start_date > p_end_date THEN
        RETURN 0;
    END IF;

    IF p_exclude_sundays_only THEN
        SELECT COUNT(*) INTO v_days
        FROM generate_series(p_start_date, p_end_date, interval '1 day') AS d
        WHERE EXTRACT(DOW FROM d) != 0;
    ELSE
        SELECT COUNT(*) INTO v_days
        FROM generate_series(p_start_date, p_end_date, interval '1 day') AS d
        WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);
    END IF;

    RETURN COALESCE(v_days, 1);
END;
$$;

-- Re-aggregates one date range of monthly_data into summary_daily_metrics.
-- Dates are written as literals so the existing created_at index is used.
CREATE OR REPLACE FUNCTION public.refresh_summary_daily(p_start DATE, p_end DATE)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
    v_rows INT;
BEGIN
    EXECUTE format($q$
        INSERT INTO public.summary_daily_metrics AS s (
            date_id, buy_weight_15g, buy_transactions, sell_weight_15g, sell_transactions,
            withdraw_15g, new_customers, total_transactions, source, updated_at
        )
        SELECT
            left(created_at::text, 10)::date AS d,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) / 15.0, 2),
            COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD'),
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) / 15.0, 2),
            COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD'),
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')), 0) / 15.0, 2),
            COUNT(*) FILTER (WHERE transaction_type = 'OPEN_ACCOUNT'),
            COUNT(*),
            'monthly_data',
            now()
        FROM public.monthly_data
        WHERE created_at >= %L AND created_at < %L
        GROUP BY 1
        ON CONFLICT (date_id) DO UPDATE SET
            buy_weight_15g     = EXCLUDED.buy_weight_15g,
            buy_transactions   = EXCLUDED.buy_transactions,
            sell_weight_15g    = EXCLUDED.sell_weight_15g,
            sell_transactions  = EXCLUDED.sell_transactions,
            withdraw_15g       = EXCLUDED.withdraw_15g,
            new_customers      = EXCLUDED.new_customers,
            total_transactions = EXCLUDED.total_transactions,
            source             = 'monthly_data',
            updated_at         = now()
    $q$, p_start::text, (p_end + 1)::text);

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$;


-- ============================================================================
-- PART 2: BACK-FILL JAN-MAR 2026 (raw rows no longer exist, use fact_daily_core)
-- ============================================================================
INSERT INTO public.summary_daily_metrics (
    date_id, buy_weight_15g, buy_transactions, sell_weight_15g, sell_transactions,
    withdraw_15g, new_customers, total_transactions, source
)
SELECT
    date_id,
    ROUND(COALESCE(SUM(gold_weight_g) FILTER (WHERE tx_type_code = 'BUY_GOLD'), 0) / 15.0, 2),
    COALESCE(SUM(trans_count) FILTER (WHERE tx_type_code = 'BUY_GOLD'), 0),
    ROUND(COALESCE(SUM(gold_weight_g) FILTER (WHERE tx_type_code = 'SALE_GOLD'), 0) / 15.0, 2),
    COALESCE(SUM(trans_count) FILTER (WHERE tx_type_code = 'SALE_GOLD'), 0),
    ROUND(COALESCE(SUM(gold_weight_g) FILTER (WHERE tx_type_code IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')), 0) / 15.0, 2),
    COALESCE(SUM(trans_count) FILTER (WHERE tx_type_code = 'OPEN_ACCOUNT'), 0),
    COALESCE(SUM(trans_count), 0),
    'fact_daily_core'
FROM public.fact_daily_core
WHERE date_id < DATE '2026-04-01'
GROUP BY date_id
ON CONFLICT (date_id) DO NOTHING;


-- ============================================================================
-- PART 3: BACK-FILL APR-OCT 2026 FROM monthly_data
-- Run ONE line at a time (each takes a few seconds; avoids editor timeouts).
-- ============================================================================
SELECT public.refresh_summary_daily('2026-04-01', '2026-04-30');
SELECT public.refresh_summary_daily('2026-05-01', '2026-05-31');
SELECT public.refresh_summary_daily('2026-06-01', '2026-06-30');
SELECT public.refresh_summary_daily('2026-07-01', '2026-07-31');
SELECT public.refresh_summary_daily('2026-08-01', '2026-08-31');
SELECT public.refresh_summary_daily('2026-09-01', '2026-09-30');
SELECT public.refresh_summary_daily('2026-10-01', '2026-10-31');


-- ============================================================================
-- PART 4: RPC HELPERS + MAIN FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mtd_sum_window(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'buy_weight_g',       COALESCE(SUM(buy_weight_15g), 0),
        'buy_transactions',   COALESCE(SUM(buy_transactions), 0),
        'sell_weight_g',      COALESCE(SUM(sell_weight_15g), 0),
        'sell_transactions',  COALESCE(SUM(sell_transactions), 0),
        'withdraw_15g',       COALESCE(SUM(withdraw_15g), 0),
        'new_customers',      COALESCE(SUM(new_customers), 0),
        'total_transactions', COALESCE(SUM(total_transactions), 0)
    )
    FROM public.summary_daily_metrics
    WHERE date_id BETWEEN p_from AND p_to;
$$;

CREATE OR REPLACE FUNCTION public.mtd_metric(
    p_id TEXT, p_label TEXT, p_icon TEXT,
    p_cur NUMERIC, p_cmp NUMERIC, p_full NUMERIC, p_ratio NUMERIC
)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT jsonb_build_object(
        'id', p_id,
        'label', p_label,
        'icon_name', p_icon,
        'current_mtd', ROUND(p_cur),
        'comp_mtd', ROUND(p_cmp),
        'mtd_variance_percent', CASE WHEN p_cmp > 0 THEN ROUND((p_cur - p_cmp) / p_cmp * 100) ELSE 0 END,
        'est_month_end', ROUND(p_cur * p_ratio),
        'full_comp_month', ROUND(p_full),
        'forecast_variance_percent', CASE WHEN p_full > 0 THEN ROUND((ROUND(p_cur * p_ratio) - ROUND(p_full)) / ROUND(p_full) * 100) ELSE 0 END
    );
$$;

DROP FUNCTION IF EXISTS public.get_mtd_forecast_report(DATE, INT, INT, TEXT);

CREATE OR REPLACE FUNCTION public.get_mtd_forecast_report(
    p_as_of_date DATE DEFAULT NULL,   -- NULL = latest day with data
    p_comp_year  INT  DEFAULT NULL,   -- NULL = month before the as-of month
    p_comp_month INT  DEFAULT NULL,
    p_mode       TEXT DEFAULT 'calendar_days'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
    v_max_date DATE;
    v_as_of DATE;
    v_curr_start DATE;
    v_curr_end DATE;
    v_comp_start DATE;
    v_comp_end DATE;
    v_comp_cut DATE;
    v_elapsed INT;
    v_total_days INT;
    v_elapsed_wd INT;
    v_total_wd INT;
    v_ratio NUMERIC;
    v_cur JSONB;
    v_cmp JSONB;
    v_full JSONB;
    v_months JSONB;
BEGIN
    SELECT MAX(date_id) INTO v_max_date FROM public.summary_daily_metrics;
    IF v_max_date IS NULL THEN
        RETURN jsonb_build_object('error', 'summary_daily_metrics is empty. Run 36_mtd_daily_summary_and_rpc.sql PART 2 and PART 3 first.');
    END IF;

    -- Pick up fresh uploads: re-aggregate the newest days straight from monthly_data.
    IF p_as_of_date IS NULL THEN
        PERFORM public.refresh_summary_daily(v_max_date, v_max_date + 7);
    ELSIF p_as_of_date >= v_max_date THEN
        PERFORM public.refresh_summary_daily(GREATEST(v_max_date, p_as_of_date - 10), p_as_of_date);
    END IF;

    SELECT MAX(date_id) INTO v_max_date FROM public.summary_daily_metrics;
    v_as_of := LEAST(COALESCE(p_as_of_date, v_max_date), v_max_date);

    v_curr_start := date_trunc('month', v_as_of)::date;
    v_curr_end := (date_trunc('month', v_as_of) + interval '1 month - 1 day')::date;
    v_elapsed := EXTRACT(DAY FROM v_as_of)::int;
    v_total_days := EXTRACT(DAY FROM v_curr_end)::int;

    IF p_comp_year IS NULL OR p_comp_month IS NULL THEN
        v_comp_start := (v_curr_start - interval '1 month')::date;
    ELSE
        v_comp_start := make_date(p_comp_year, p_comp_month, 1);
    END IF;
    v_comp_end := (date_trunc('month', v_comp_start) + interval '1 month - 1 day')::date;

    v_elapsed_wd := public.count_working_days(v_curr_start, v_as_of);
    v_total_wd := public.count_working_days(v_curr_start, v_curr_end);

    IF p_mode = 'working_days' THEN
        v_ratio := v_total_wd::numeric / GREATEST(1, v_elapsed_wd);
        SELECT d::date INTO v_comp_cut
        FROM generate_series(v_comp_start, v_comp_end, interval '1 day') AS d
        WHERE public.count_working_days(v_comp_start, d::date) >= v_elapsed_wd
        ORDER BY d
        LIMIT 1;
        v_comp_cut := COALESCE(v_comp_cut, v_comp_end);
    ELSE
        v_ratio := v_total_days::numeric / GREATEST(1, v_elapsed);
        v_comp_cut := LEAST(v_comp_start + (v_elapsed - 1), v_comp_end);
    END IF;

    v_cur  := public.mtd_sum_window(v_curr_start, v_as_of);
    v_cmp  := public.mtd_sum_window(v_comp_start, v_comp_cut);
    v_full := public.mtd_sum_window(v_comp_start, v_comp_end);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'label', to_char(m, 'Mon''YY'),
               'year', EXTRACT(YEAR FROM m)::int,
               'month', EXTRACT(MONTH FROM m)::int
           ) ORDER BY m DESC), '[]'::jsonb)
    INTO v_months
    FROM (
        SELECT DISTINCT date_trunc('month', date_id)::date AS m
        FROM public.summary_daily_metrics
        WHERE date_trunc('month', date_id)::date <> v_curr_start
    ) s;

    RETURN jsonb_build_object(
        'as_of_date', v_as_of,
        'display_as_of_date', to_char(v_as_of, 'DD/MM/YYYY'),
        'latest_data_date', v_max_date,
        'current_month_label', to_char(v_curr_start, 'Mon''YY'),
        'current_month_year', EXTRACT(YEAR FROM v_curr_start)::int,
        'current_month_num', EXTRACT(MONTH FROM v_curr_start)::int,
        'comparison_month_label', to_char(v_comp_start, 'Mon''YY'),
        'comparison_month_year', EXTRACT(YEAR FROM v_comp_start)::int,
        'comparison_month_num', EXTRACT(MONTH FROM v_comp_start)::int,
        'comparison_cutoff_date', v_comp_cut,
        'elapsed_days', v_elapsed,
        'total_days_current_month', v_total_days,
        'elapsed_working_days', v_elapsed_wd,
        'total_working_days_current_month', v_total_wd,
        'calculation_mode', p_mode,
        'metrics', jsonb_build_object(
            'buy_weight_g',       public.mtd_metric('buy_weight_g', 'Buy Weight (baht)', 'shopping-bag',
                (v_cur->>'buy_weight_g')::numeric, (v_cmp->>'buy_weight_g')::numeric, (v_full->>'buy_weight_g')::numeric, v_ratio),
            'buy_transactions',   public.mtd_metric('buy_transactions', 'Buy Trx', 'shopping-cart',
                (v_cur->>'buy_transactions')::numeric, (v_cmp->>'buy_transactions')::numeric, (v_full->>'buy_transactions')::numeric, v_ratio),
            'sell_weight_g',      public.mtd_metric('sell_weight_g', 'Sell Weight (Baht)', 'tag',
                (v_cur->>'sell_weight_g')::numeric, (v_cmp->>'sell_weight_g')::numeric, (v_full->>'sell_weight_g')::numeric, v_ratio),
            'sell_transactions',  public.mtd_metric('sell_transactions', 'Sell Trx', 'scale',
                (v_cur->>'sell_transactions')::numeric, (v_cmp->>'sell_transactions')::numeric, (v_full->>'sell_transactions')::numeric, v_ratio),
            'withdraw_15g',       public.mtd_metric('withdraw_15g', 'Withdraw (15g)', 'layers',
                (v_cur->>'withdraw_15g')::numeric, (v_cmp->>'withdraw_15g')::numeric, (v_full->>'withdraw_15g')::numeric, v_ratio),
            'new_customers',      public.mtd_metric('new_customers', 'NC', 'user-plus',
                (v_cur->>'new_customers')::numeric, (v_cmp->>'new_customers')::numeric, (v_full->>'new_customers')::numeric, v_ratio),
            'total_transactions', public.mtd_metric('total_transactions', 'Total Trx', 'arrow-left-right',
                (v_cur->>'total_transactions')::numeric, (v_cmp->>'total_transactions')::numeric, (v_full->>'total_transactions')::numeric, v_ratio)
        ),
        'available_months', v_months
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mtd_forecast_report(DATE, INT, INT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_summary_daily(DATE, DATE) TO service_role;


-- ============================================================================
-- PART 5: VERIFY AGAINST YOUR MANUAL SLIDE (Oct 1-18, 2026)
-- Expect: buy_weight ~7,696 | buy_tx 73,841 | sell_tx ~29,299 |
--         withdraw ~1,709 | new_customers 1,302 | total_tx 105,433
-- ============================================================================
SELECT
    ROUND(SUM(buy_weight_15g))   AS buy_weight,
    SUM(buy_transactions)        AS buy_tx,
    ROUND(SUM(sell_weight_15g))  AS sell_weight,
    SUM(sell_transactions)       AS sell_tx,
    ROUND(SUM(withdraw_15g))     AS withdraw_15g,
    SUM(new_customers)           AS new_customers,
    SUM(total_transactions)      AS total_tx
FROM public.summary_daily_metrics
WHERE date_id BETWEEN '2026-10-01' AND '2026-10-18';

-- Full RPC test (Oct 18 vs Sep, calendar days):
SELECT public.get_mtd_forecast_report('2026-10-18', 2026, 9, 'calendar_days');
