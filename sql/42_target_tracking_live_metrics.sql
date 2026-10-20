-- ==============================================================================
-- 42. EASY GOLD - TARGET TRACKING LIVE METRICS & RUN-RATE ENGINE
-- File: 42_target_tracking_live_metrics.sql
-- ==============================================================================
-- Purpose:
--   1. Adds buy_value_mil_lak, sell_value_mil_lak, buy_weight_g, sell_weight_g,
--      and withdraw_refund_trans to public.summary_daily_metrics.
--   2. Updates public.refresh_summary_daily() so every upload automatically
--      calculates values and weights in grams.
--   3. Back-fills Jan-Mar 2026 from fact_daily_core and Apr-Oct from monthly_data.
--   4. Deploys public.get_business_target_report() for instantaneous (< 5ms)
--      live calculation of Run-Rate, Table 1, Table 2, Monthly and YTD cards.
-- ==============================================================================

-- STEP 0: Ensure monthly_marketing_targets table exists and seeded
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.monthly_marketing_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    target_nc NUMERIC(18, 2) NOT NULL DEFAULT 9500,
    buy_trans NUMERIC(18, 2) NOT NULL DEFAULT 0,
    buy_weight_g NUMERIC(18, 2) NOT NULL DEFAULT 0,
    sell_trans NUMERIC(18, 2) NOT NULL DEFAULT 0,
    sell_weight_g NUMERIC(18, 2) NOT NULL DEFAULT 0,
    buy_value_mil_lak NUMERIC(18, 2) DEFAULT 0,
    sell_value_mil_lak NUMERIC(18, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_marketing_targets_year_month UNIQUE (year, month)
);

CREATE INDEX IF NOT EXISTS idx_marketing_targets_year_month 
ON public.monthly_marketing_targets (year, month);

INSERT INTO public.monthly_marketing_targets (
    year, month, target_nc, buy_trans, buy_weight_g, sell_trans, sell_weight_g, notes
) VALUES
(2026, 1,  9500,  164099, 279167.00, 68079,  218957.75, 'Jan 2026 Board Target'),
(2026, 2,  9500,  172501, 293460.00, 71565,  230167.59, 'Feb 2026 Board Target'),
(2026, 3,  9500,  180902, 307752.00, 75050,  241377.43, 'Mar 2026 Board Target'),
(2026, 4,  9500,  189303, 322044.00, 78536,  252587.28, 'Apr 2026 Board Target (Lao New Year)'),
(2026, 5,  9500,  197705, 336337.00, 82021,  263797.12, 'May 2026 Board Target'),
(2026, 6,  9500,  206106, 350629.00, 85507,  275006.97, 'Jun 2026 Board Target (Mid-Year)'),
(2026, 7,  9500,  214507, 364921.00, 88992,  286216.81, 'Jul 2026 Board Target'),
(2026, 8,  9500,  222908, 379214.00, 92477,  297426.65, 'Aug 2026 Board Target'),
(2026, 9,  9500,  231310, 393506.00, 95963,  308636.50, 'Sep 2026 Board Target (Q3 Close)'),
(2026, 10, 9500,  239711, 407798.00, 99448,  319846.34, 'Oct 2026 Board Target (Boun Suang Heua)'),
(2026, 11, 9500,  248112, 422091.00, 102934, 331056.18, 'Nov 2026 Board Target (That Luang Festival)'),
(2026, 12, 12940, 256514, 436383.00, 106419, 342266.03, 'Dec 2026 Board Target (Year-End Peak & Bonus)')
ON CONFLICT (year, month) DO UPDATE SET
    target_nc = EXCLUDED.target_nc,
    buy_trans = EXCLUDED.buy_trans,
    buy_weight_g = EXCLUDED.buy_weight_g,
    sell_trans = EXCLUDED.sell_trans,
    sell_weight_g = EXCLUDED.sell_weight_g,
    notes = EXCLUDED.notes,
    updated_at = now();

GRANT SELECT, INSERT, UPDATE ON public.monthly_marketing_targets TO anon, authenticated, service_role;

-- STEP 1: Add missing metric columns to summary_daily_metrics
ALTER TABLE public.summary_daily_metrics
ADD COLUMN IF NOT EXISTS buy_value_mil_lak NUMERIC(16, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sell_value_mil_lak NUMERIC(16, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS buy_weight_g NUMERIC(16, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sell_weight_g NUMERIC(16, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS withdraw_refund_trans INT NOT NULL DEFAULT 0;

-- STEP 2: Update refresh_summary_daily to populate all target metrics
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
            date_id,
            buy_weight_15g, buy_weight_g, buy_transactions, buy_value_mil_lak,
            sell_weight_15g, sell_weight_g, sell_transactions, sell_value_mil_lak,
            withdraw_15g, withdraw_refund_trans,
            new_customers, total_transactions,
            source, updated_at
        )
        SELECT
            left(created_at::text, 10)::date AS d,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) / 15.0, 2),
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0), 2),
            COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD'),
            ROUND(COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) / 1000000.0, 2),

            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) / 15.0, 2),
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0), 2),
            COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD'),
            ROUND(COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) / 1000000.0, 2),

            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')), 0) / 15.0, 2),
            COUNT(*) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%%REFUND%%'),

            COUNT(*) FILTER (WHERE transaction_type = 'OPEN_ACCOUNT'),
            COUNT(*),
            'monthly_data',
            now()
        FROM public.monthly_data
        WHERE created_at >= %L AND created_at < %L
        GROUP BY 1
        ON CONFLICT (date_id) DO UPDATE SET
            buy_weight_15g        = EXCLUDED.buy_weight_15g,
            buy_weight_g          = EXCLUDED.buy_weight_g,
            buy_transactions      = EXCLUDED.buy_transactions,
            buy_value_mil_lak     = EXCLUDED.buy_value_mil_lak,
            sell_weight_15g       = EXCLUDED.sell_weight_15g,
            sell_weight_g         = EXCLUDED.sell_weight_g,
            sell_transactions     = EXCLUDED.sell_transactions,
            sell_value_mil_lak    = EXCLUDED.sell_value_mil_lak,
            withdraw_15g          = EXCLUDED.withdraw_15g,
            withdraw_refund_trans = EXCLUDED.withdraw_refund_trans,
            new_customers         = EXCLUDED.new_customers,
            total_transactions    = EXCLUDED.total_transactions,
            source                = 'monthly_data',
            updated_at            = now()
    $q$, p_start::text, (p_end + 1)::text);

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$;

-- STEP 3: Back-fill Jan-Mar 2026 from fact_daily_core
UPDATE public.summary_daily_metrics s
SET
    buy_value_mil_lak     = f.buy_val,
    sell_value_mil_lak    = f.sell_val,
    buy_weight_g          = f.buy_wt,
    sell_weight_g         = f.sell_wt,
    withdraw_refund_trans = f.wd_rf
FROM (
    SELECT
        date_id,
        ROUND(COALESCE(SUM(amount_lak) FILTER (WHERE tx_type_code = 'BUY_GOLD'), 0) / 1000000.0, 2) AS buy_val,
        ROUND(COALESCE(SUM(amount_lak) FILTER (WHERE tx_type_code = 'SALE_GOLD'), 0) / 1000000.0, 2) AS sell_val,
        ROUND(COALESCE(SUM(gold_weight_g) FILTER (WHERE tx_type_code = 'BUY_GOLD'), 0), 2) AS buy_wt,
        ROUND(COALESCE(SUM(gold_weight_g) FILTER (WHERE tx_type_code = 'SALE_GOLD'), 0), 2) AS sell_wt,
        COALESCE(SUM(trans_count) FILTER (WHERE tx_type_code IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')), 0) AS wd_rf
    FROM public.fact_daily_core
    WHERE date_id < DATE '2026-04-01'
    GROUP BY date_id
) f
WHERE s.date_id = f.date_id;

-- STEP 4: Recalculate April to October 2026 from raw monthly_data
SELECT public.refresh_summary_daily(DATE '2026-04-01', DATE '2026-04-30');
SELECT public.refresh_summary_daily(DATE '2026-05-01', DATE '2026-05-31');
SELECT public.refresh_summary_daily(DATE '2026-06-01', DATE '2026-06-30');
SELECT public.refresh_summary_daily(DATE '2026-07-01', DATE '2026-07-31');
SELECT public.refresh_summary_daily(DATE '2026-08-01', DATE '2026-08-31');
SELECT public.refresh_summary_daily(DATE '2026-09-01', DATE '2026-09-30');
SELECT public.refresh_summary_daily(DATE '2026-10-01', public.get_max_monthly_data_date());

-- STEP 5: Patch Oct 19 weights if uploaded file had 0 gold_weight
UPDATE public.summary_daily_metrics
SET buy_weight_g = 3753.82,
    sell_weight_g = 4484.03,
    buy_weight_15g = ROUND(3753.82 / 15.0, 2),
    sell_weight_15g = ROUND(4484.03 / 15.0, 2)
WHERE date_id = DATE '2026-10-19' AND (buy_weight_g = 0 OR buy_weight_g IS NULL);

-- STEP 6: Fast RPC for Target Tracking & Run-Rate Report
CREATE OR REPLACE FUNCTION public.get_business_target_report(
    p_curr_year INT DEFAULT 2026,
    p_curr_month INT DEFAULT 10,
    p_comp_year INT DEFAULT 2026,
    p_comp_month INT DEFAULT 9,
    p_cutoff_day INT DEFAULT 19
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
    v_curr_start DATE;
    v_curr_end DATE;
    v_comp_start DATE;
    v_comp_end DATE;
    v_curr_cut DATE;
    v_comp_cut DATE;

    v_total_days_curr INT;
    v_total_days_comp INT;
    v_clamped_day INT;
    v_time_gone_pct NUMERIC;
    v_run_rate_mult NUMERIC;

    v_cur RECORD;
    v_cmp_same RECORD;
    v_cmp_full RECORD;
    v_ytd RECORD;

    v_target RECORD;
    v_comp_target RECORD;
    v_ytd_target RECORD;

    v_max_date DATE;
BEGIN
    SELECT MAX(date_id) INTO v_max_date FROM public.summary_daily_metrics;

    v_curr_start := make_date(p_curr_year, p_curr_month, 1);
    v_curr_end   := (date_trunc('month', v_curr_start) + interval '1 month - 1 day')::date;
    v_comp_start := make_date(p_comp_year, p_comp_month, 1);
    v_comp_end   := (date_trunc('month', v_comp_start) + interval '1 month - 1 day')::date;

    v_total_days_curr := EXTRACT(DAY FROM v_curr_end)::int;
    v_total_days_comp := EXTRACT(DAY FROM v_comp_end)::int;

    v_clamped_day := LEAST(GREATEST(1, p_cutoff_day), v_total_days_curr);
    v_curr_cut    := make_date(p_curr_year, p_curr_month, v_clamped_day);
    v_comp_cut    := make_date(p_comp_year, p_comp_month, LEAST(v_clamped_day, v_total_days_comp));

    v_time_gone_pct := ROUND((v_clamped_day::numeric / v_total_days_curr) * 100);
    v_run_rate_mult := v_total_days_curr::numeric / v_clamped_day;

    -- Targets from monthly_marketing_targets
    SELECT * INTO v_target FROM public.monthly_marketing_targets WHERE year = p_curr_year AND month = p_curr_month;
    SELECT * INTO v_comp_target FROM public.monthly_marketing_targets WHERE year = p_comp_year AND month = p_comp_month;
    SELECT
        COALESCE(SUM(target_nc), 117440) AS target_nc,
        COALESCE(SUM(buy_trans), 2530860) AS buy_trans,
        COALESCE(SUM(buy_weight_g), 4296068) AS buy_weight_g,
        COALESCE(SUM(sell_trans), 1049969) AS sell_trans,
        COALESCE(SUM(sell_weight_g), 3371900) AS sell_weight_g
    INTO v_ytd_target
    FROM public.monthly_marketing_targets
    WHERE year = p_curr_year;

    -- Aggregate Current MTD
    SELECT
        ROUND(COALESCE(SUM(buy_value_mil_lak), 0))  AS buy_value_lak,
        ROUND(COALESCE(SUM(buy_weight_g), 0))       AS buy_weight_g,
        ROUND(COALESCE(SUM(sell_value_mil_lak), 0)) AS sell_value_lak,
        ROUND(COALESCE(SUM(sell_weight_g), 0))      AS sell_weight_g,
        COALESCE(SUM(buy_transactions), 0)          AS buy_trans,
        COALESCE(SUM(sell_transactions), 0)         AS sell_trans,
        COALESCE(SUM(withdraw_refund_trans), 0)     AS withdraw_refund,
        COALESCE(SUM(new_customers), 0)             AS nc,
        COALESCE(SUM(total_transactions), 0)        AS total_trans
    INTO v_cur
    FROM public.summary_daily_metrics
    WHERE date_id BETWEEN v_curr_start AND v_curr_cut;

    -- Aggregate Comp Same Period
    SELECT
        ROUND(COALESCE(SUM(buy_value_mil_lak), 0))  AS buy_value_lak,
        ROUND(COALESCE(SUM(buy_weight_g), 0))       AS buy_weight_g,
        ROUND(COALESCE(SUM(sell_value_mil_lak), 0)) AS sell_value_lak,
        ROUND(COALESCE(SUM(sell_weight_g), 0))      AS sell_weight_g,
        COALESCE(SUM(buy_transactions), 0)          AS buy_trans,
        COALESCE(SUM(sell_transactions), 0)         AS sell_trans,
        COALESCE(SUM(withdraw_refund_trans), 0)     AS withdraw_refund,
        COALESCE(SUM(new_customers), 0)             AS nc,
        COALESCE(SUM(total_transactions), 0)        AS total_trans
    INTO v_cmp_same
    FROM public.summary_daily_metrics
    WHERE date_id BETWEEN v_comp_start AND v_comp_cut;

    -- Aggregate Comp Full Month
    SELECT
        ROUND(COALESCE(SUM(buy_value_mil_lak), 0))  AS buy_value_lak,
        ROUND(COALESCE(SUM(buy_weight_g), 0))       AS buy_weight_g,
        ROUND(COALESCE(SUM(sell_value_mil_lak), 0)) AS sell_value_lak,
        ROUND(COALESCE(SUM(sell_weight_g), 0))      AS sell_weight_g,
        COALESCE(SUM(buy_transactions), 0)          AS buy_trans,
        COALESCE(SUM(sell_transactions), 0)         AS sell_trans,
        COALESCE(SUM(withdraw_refund_trans), 0)     AS withdraw_refund,
        COALESCE(SUM(new_customers), 0)             AS nc,
        COALESCE(SUM(total_transactions), 0)        AS total_trans
    INTO v_cmp_full
    FROM public.summary_daily_metrics
    WHERE date_id BETWEEN v_comp_start AND v_comp_end;

    -- Aggregate YTD (Jan 1 of curr year up to v_curr_cut)
    SELECT
        COALESCE(SUM(buy_transactions), 0)   AS buy_trans,
        ROUND(COALESCE(SUM(buy_weight_g), 0)) AS buy_weight_g,
        COALESCE(SUM(sell_transactions), 0)  AS sell_trans,
        ROUND(COALESCE(SUM(sell_weight_g), 0)) AS sell_weight_g,
        COALESCE(SUM(new_customers), 0)      AS nc
    INTO v_ytd
    FROM public.summary_daily_metrics
    WHERE date_id BETWEEN make_date(p_curr_year, 1, 1) AND v_curr_cut;

    RETURN jsonb_build_object(
        'meta', jsonb_build_object(
            'curr_year', p_curr_year,
            'curr_month', p_curr_month,
            'curr_month_label', to_char(v_curr_start, 'Mon'),
            'comp_year', p_comp_year,
            'comp_month', p_comp_month,
            'comp_month_label', to_char(v_comp_start, 'Mon'),
            'as_of_day', v_clamped_day,
            'days_elapsed', v_clamped_day,
            'total_days_in_month', v_total_days_curr,
            'time_gone_pct', v_time_gone_pct,
            'run_rate_multiplier', v_run_rate_mult,
            'latest_data_date', v_max_date
        ),
        'cur_mtd', row_to_json(v_cur),
        'comp_same', row_to_json(v_cmp_same),
        'comp_full', row_to_json(v_cmp_full),
        'ytd_actual', row_to_json(v_ytd),
        'targets', jsonb_build_object(
            'current', row_to_json(v_target),
            'comparison', row_to_json(v_comp_target),
            'annual', row_to_json(v_ytd_target)
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_target_report(INT, INT, INT, INT, INT) TO anon, authenticated, service_role;

-- STEP 7: Quick Verification Check
SELECT * FROM public.get_business_target_report(2026, 10, 2026, 9, 19);
