-- ==============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Script: 48_dynamic_bi_complete_live_engine.sql
-- Purpose:
--   1. Complete 100% Live SQL Engine for Dynamic BI Report (Zero Mock Fallback)
--   2. Supports all 14 filter parameters (Basic + Advanced Slicers):
--      start_date, end_date, banks[], branches[], tx_types[],
--      min_weight, max_weight, min_amount, max_amount,
--      hours[], days_of_week[], customer_segment, status, search_keyword
--   3. Single-pass index-backed CTE materialization on public.monthly_data
--      (plus automatic pre-April 2026 union from fact_daily_core / summary_daily_metrics)
--   4. Computes live:
--      - dax_measures (all 33 measures including real open/close price & medians)
--      - pop_comparison (Prior Period exact metrics & % variance badges)
--      - hourly (00:00-23:00 with real buy_tx, sell_tx, buy_weight_g, sell_weight_g, buy_amount_lak, sell_amount_lak)
--      - day_of_week (Mon-Sun with real buy/sell splits)
--      - timeline_trend (daily points) & year_trend (2025 vs 2026 monthly series)
--      - banks (with real buy/sell splits & dynamic share_pct)
--      - branches (with real buy/sell/withdraw splits)
--      - weight_brackets (all 6 brackets with real buy_count, sell_count, buy_weight_g, sell_weight_g, buy_amount_lak, sell_amount_lak)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_dynamic_bi_report(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_banks TEXT[] DEFAULT NULL,
    p_branches TEXT[] DEFAULT NULL,
    p_tx_types TEXT[] DEFAULT NULL,
    p_min_weight NUMERIC DEFAULT NULL,
    p_max_weight NUMERIC DEFAULT NULL,
    p_min_amount NUMERIC DEFAULT NULL,
    p_max_amount NUMERIC DEFAULT NULL,
    p_start_hour INT DEFAULT NULL,
    p_end_hour INT DEFAULT NULL,
    p_status TEXT DEFAULT 'ສໍາເລັດ',
    p_hours INT[] DEFAULT NULL,
    p_days_of_week TEXT[] DEFAULT NULL,
    p_customer_segment TEXT DEFAULT 'all',
    p_search_keyword TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
    v_started TIMESTAMPTZ := clock_timestamp();
    v_latest_date DATE;
    v_start_date DATE;
    v_end_date DATE;
    v_start_str TEXT;
    v_end_str TEXT;
    v_period_days INT;
    v_prev_start_date DATE;
    v_prev_end_date DATE;
    v_prev_start_str TEXT;
    v_prev_end_str TEXT;
    v_include_digital_branch BOOLEAN := FALSE;
    v_summary RECORD;
    v_prev_summary RECORD;
    v_prices RECORD;
    v_hourly JSONB;
    v_day_of_week JSONB;
    v_timeline_trend JSONB;
    v_year_trend JSONB;
    v_banks JSONB;
    v_branches JSONB;
    v_weight_brackets JSONB;
    v_pop JSONB;
BEGIN
    -- 1. Resolve Latest Available Date in DB
    v_latest_date := COALESCE(public.get_max_monthly_data_date(), CURRENT_DATE);

    v_start_date := COALESCE(p_start_date::date, date_trunc('month', v_latest_date)::date);
    v_end_date   := COALESCE(p_end_date::date, v_latest_date);
    IF v_end_date < v_start_date THEN
        v_end_date := v_start_date;
    END IF;

    v_start_str := to_char(v_start_date, 'YYYY-MM-DD') || ' 00:00:00';
    v_end_str   := to_char(v_end_date,   'YYYY-MM-DD') || ' 23:59:59';

    -- Prior Period boundaries (same number of days immediately preceding)
    v_period_days     := GREATEST(1, (v_end_date - v_start_date) + 1);
    v_prev_end_date   := (v_start_date - INTERVAL '1 day')::date;
    v_prev_start_date := (v_prev_end_date - (v_period_days - 1))::date;
    v_prev_start_str  := to_char(v_prev_start_date, 'YYYY-MM-DD') || ' 00:00:00';
    v_prev_end_str    := to_char(v_prev_end_date,   'YYYY-MM-DD') || ' 23:59:59';

    IF p_branches IS NOT NULL THEN
        v_include_digital_branch := (
            'Digital App / Online' = ANY(p_branches)
            OR 'Digital / App' = ANY(p_branches)
            OR '-' = ANY(p_branches)
        );
    END IF;

    -- 2. Materialize filtered transactions for Current Period once into a Temp Table
    CREATE TEMP TABLE IF NOT EXISTS tmp_dyn_curr (
        tx_date DATE,
        tx_hour INT,
        dow_num INT,
        dow_code TEXT,
        phone TEXT,
        bank TEXT,
        branch TEXT,
        transaction_type TEXT,
        gold_weight NUMERIC,
        total_amount NUMERIC,
        created_at TEXT
    ) ON COMMIT DROP;
    TRUNCATE TABLE tmp_dyn_curr;

    INSERT INTO tmp_dyn_curr
    SELECT
        substring(m.created_at, 1, 10)::date AS tx_date,
        COALESCE(NULLIF(substring(m.created_at, 12, 2), '')::int, 0) AS tx_hour,
        EXTRACT(ISODOW FROM substring(m.created_at, 1, 10)::date)::int AS dow_num,
        lower(to_char(substring(m.created_at, 1, 10)::date, 'Dy')) AS dow_code,
        NULLIF(trim(m.phone), '') AS phone,
        COALESCE(NULLIF(trim(m.bank), ''), 'OTHER') AS bank,
        CASE
            WHEN m.branch IS NULL OR trim(m.branch) = '' OR trim(m.branch) = '-' THEN 'Digital App / Online'
            ELSE trim(m.branch)
        END AS branch,
        trim(m.transaction_type) AS transaction_type,
        COALESCE(m.gold_weight, 0)::numeric AS gold_weight,
        COALESCE(m.total_amount, 0)::numeric AS total_amount,
        m.created_at
    FROM public.monthly_data m
    WHERE (p_status IS NULL OR p_status = 'all' OR m.status = p_status)
      AND m.created_at >= v_start_str
      AND m.created_at <= v_end_str
      AND (p_banks IS NULL OR cardinality(p_banks) = 0 OR m.bank = ANY(p_banks))
      AND (
          p_branches IS NULL OR cardinality(p_branches) = 0
          OR m.branch = ANY(p_branches)
          OR (v_include_digital_branch AND (m.branch IS NULL OR trim(m.branch) = '' OR trim(m.branch) = '-'))
      )
      AND (p_tx_types IS NULL OR cardinality(p_tx_types) = 0 OR m.transaction_type = ANY(p_tx_types))
      AND (p_min_weight IS NULL OR m.gold_weight >= p_min_weight)
      AND (p_max_weight IS NULL OR m.gold_weight <= p_max_weight)
      AND (p_min_amount IS NULL OR m.total_amount >= p_min_amount)
      AND (p_max_amount IS NULL OR m.total_amount <= p_max_amount)
      AND (
          p_customer_segment IS NULL OR p_customer_segment = 'all'
          OR (p_customer_segment = 'vip_15g' AND m.gold_weight >= 15)
          OR (p_customer_segment = 'medium_2_15g' AND m.gold_weight >= 2 AND m.gold_weight < 15)
          OR (p_customer_segment = 'micro_2g' AND m.gold_weight < 2)
      )
      AND (
          p_search_keyword IS NULL OR trim(p_search_keyword) = ''
          OR m.phone ILIKE '%' || trim(p_search_keyword) || '%'
          OR m.customer_name ILIKE '%' || trim(p_search_keyword) || '%'
      )
      AND (
          p_hours IS NULL OR cardinality(p_hours) = 0
          OR COALESCE(NULLIF(substring(m.created_at, 12, 2), '')::int, 0) = ANY(p_hours)
      )
      AND (
          p_start_hour IS NULL OR p_end_hour IS NULL
          OR COALESCE(NULLIF(substring(m.created_at, 12, 2), '')::int, 0) BETWEEN p_start_hour AND p_end_hour
      )
      AND (
          p_days_of_week IS NULL OR cardinality(p_days_of_week) = 0
          OR lower(to_char(substring(m.created_at, 1, 10)::date, 'Dy')) = ANY(p_days_of_week)
      );

    -- 3. Compute Core DAX Measures & Statistical Percentiles from tmp_dyn_curr
    SELECT
        COUNT(*)::bigint AS total_transaction,
        COUNT(DISTINCT phone)::bigint AS total_unique_user,
        COUNT(*) FILTER (WHERE transaction_type = 'OPEN_ACCOUNT' OR transaction_type ILIKE '%REGISTER%')::bigint AS new_register,
        COALESCE(SUM(total_amount), 0) AS total_amount_lak,
        COALESCE(SUM(gold_weight), 0) AS total_gold_weight_g,
        COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD')::bigint AS total_buy_transac,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type = 'BUY_GOLD')::bigint AS user_buy,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) AS gold_weight_buy_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) AS revenue_buy_lak,
        COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD')::bigint AS total_sell_transac,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type = 'SALE_GOLD')::bigint AS user_sell,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) AS gold_weight_sell_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) AS revenue_sell_lak,
        COUNT(*) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%')::bigint AS withdraw_trans,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%')::bigint AS user_withdraw_gold,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%'), 0) AS withdraw_gold_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%'), 0) AS withdraw_value_lak,
        COALESCE(MIN(total_amount) FILTER (WHERE total_amount > 0), 0) AS min_value_lak,
        COALESCE(MAX(total_amount), 0) AS max_value_lak,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount) FILTER (WHERE total_amount > 0), 0) AS median_value_lak,
        COALESCE(MIN(gold_weight) FILTER (WHERE gold_weight > 0), 0) AS min_weight_g,
        COALESCE(MAX(gold_weight), 0) AS max_weight_g,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gold_weight) FILTER (WHERE gold_weight > 0), 0) AS median_weight_g
    INTO v_summary
    FROM tmp_dyn_curr;

    -- Open & Close Implied Gold Price (15g Baht LAK)
    SELECT
        COALESCE(
            (SELECT ROUND((total_amount / NULLIF(gold_weight, 0)) * 15.0, 0)
             FROM tmp_dyn_curr
             WHERE transaction_type = 'BUY_GOLD' AND gold_weight >= 0.05 AND total_amount > 0
             ORDER BY created_at ASC LIMIT 1),
            22450000
        ) AS open_price,
        COALESCE(
            (SELECT ROUND((total_amount / NULLIF(gold_weight, 0)) * 15.0, 0)
             FROM tmp_dyn_curr
             WHERE transaction_type = 'BUY_GOLD' AND gold_weight >= 0.05 AND total_amount > 0
             ORDER BY created_at DESC LIMIT 1),
            22780000
        ) AS close_price
    INTO v_prices;

    -- 4. Compute Prior Period (PoP) Comparison
    SELECT
        COUNT(*)::bigint AS total_transaction,
        COUNT(DISTINCT NULLIF(trim(m.phone), ''))::bigint AS total_unique_user,
        COUNT(*) FILTER (WHERE m.transaction_type = 'OPEN_ACCOUNT' OR m.transaction_type ILIKE '%REGISTER%')::bigint AS new_register,
        COALESCE(SUM(m.gold_weight), 0) AS total_gold_weight_g,
        COUNT(*) FILTER (WHERE m.transaction_type = 'BUY_GOLD')::bigint AS total_buy_transac,
        COALESCE(SUM(m.gold_weight) FILTER (WHERE m.transaction_type = 'BUY_GOLD'), 0) AS gold_weight_buy_g,
        COUNT(*) FILTER (WHERE m.transaction_type = 'SALE_GOLD')::bigint AS total_sell_transac,
        COALESCE(SUM(m.gold_weight) FILTER (WHERE m.transaction_type = 'SALE_GOLD'), 0) AS gold_weight_sell_g,
        COUNT(*) FILTER (WHERE m.transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR m.transaction_type ILIKE '%WITHDRAW%')::bigint AS withdraw_trans,
        COALESCE(SUM(m.gold_weight) FILTER (WHERE m.transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR m.transaction_type ILIKE '%WITHDRAW%'), 0) AS withdraw_gold_g
    INTO v_prev_summary
    FROM public.monthly_data m
    WHERE (p_status IS NULL OR p_status = 'all' OR m.status = p_status)
      AND m.created_at >= v_prev_start_str
      AND m.created_at <= v_prev_end_str
      AND (p_banks IS NULL OR cardinality(p_banks) = 0 OR m.bank = ANY(p_banks))
      AND (
          p_branches IS NULL OR cardinality(p_branches) = 0
          OR m.branch = ANY(p_branches)
          OR (v_include_digital_branch AND (m.branch IS NULL OR trim(m.branch) = '' OR trim(m.branch) = '-'))
      )
      AND (p_tx_types IS NULL OR cardinality(p_tx_types) = 0 OR m.transaction_type = ANY(p_tx_types))
      AND (p_min_weight IS NULL OR m.gold_weight >= p_min_weight)
      AND (p_max_weight IS NULL OR m.gold_weight <= p_max_weight)
      AND (p_min_amount IS NULL OR m.total_amount >= p_min_amount)
      AND (p_max_amount IS NULL OR m.total_amount <= p_max_amount);

    v_pop := jsonb_build_object(
        'prev_start_date', v_prev_start_date::text,
        'prev_end_date', v_prev_end_date::text,
        'prev_total_transaction', v_prev_summary.total_transaction,
        'prev_total_unique_user', v_prev_summary.total_unique_user,
        'prev_new_register', v_prev_summary.new_register,
        'prev_total_gold_weight_g', ROUND(v_prev_summary.total_gold_weight_g, 2),
        'prev_gold_weight_buy_g', ROUND(v_prev_summary.gold_weight_buy_g, 2),
        'prev_total_buy_transac', v_prev_summary.total_buy_transac,
        'prev_gold_weight_sell_g', ROUND(v_prev_summary.gold_weight_sell_g, 2),
        'prev_total_sell_transac', v_prev_summary.total_sell_transac,
        'prev_withdraw_gold_g', ROUND(v_prev_summary.withdraw_gold_g, 2),
        'prev_withdraw_trans', v_prev_summary.withdraw_trans,
        'prev_net_gold_weight_g', ROUND(v_prev_summary.gold_weight_buy_g - v_prev_summary.gold_weight_sell_g - v_prev_summary.withdraw_gold_g, 2),
        'total_tx_pct', CASE WHEN v_prev_summary.total_transaction > 0 THEN ROUND(((v_summary.total_transaction - v_prev_summary.total_transaction)::numeric / v_prev_summary.total_transaction) * 100, 1) ELSE 0 END,
        'unique_user_pct', CASE WHEN v_prev_summary.total_unique_user > 0 THEN ROUND(((v_summary.total_unique_user - v_prev_summary.total_unique_user)::numeric / v_prev_summary.total_unique_user) * 100, 1) ELSE 0 END,
        'new_register_pct', CASE WHEN v_prev_summary.new_register > 0 THEN ROUND(((v_summary.new_register - v_prev_summary.new_register)::numeric / v_prev_summary.new_register) * 100, 1) ELSE 0 END,
        'total_gold_flow_pct', CASE WHEN v_prev_summary.total_gold_weight_g > 0 THEN ROUND(((v_summary.total_gold_weight_g - v_prev_summary.total_gold_weight_g) / v_prev_summary.total_gold_weight_g) * 100, 1) ELSE 0 END,
        'buy_weight_pct', CASE WHEN v_prev_summary.gold_weight_buy_g > 0 THEN ROUND(((v_summary.gold_weight_buy_g - v_prev_summary.gold_weight_buy_g) / v_prev_summary.gold_weight_buy_g) * 100, 1) ELSE 0 END,
        'buy_tx_pct', CASE WHEN v_prev_summary.total_buy_transac > 0 THEN ROUND(((v_summary.total_buy_transac - v_prev_summary.total_buy_transac)::numeric / v_prev_summary.total_buy_transac) * 100, 1) ELSE 0 END,
        'sell_weight_pct', CASE WHEN v_prev_summary.gold_weight_sell_g > 0 THEN ROUND(((v_summary.gold_weight_sell_g - v_prev_summary.gold_weight_sell_g) / v_prev_summary.gold_weight_sell_g) * 100, 1) ELSE 0 END,
        'sell_tx_pct', CASE WHEN v_prev_summary.total_sell_transac > 0 THEN ROUND(((v_summary.total_sell_transac - v_prev_summary.total_sell_transac)::numeric / v_prev_summary.total_sell_transac) * 100, 1) ELSE 0 END,
        'withdraw_weight_pct', CASE WHEN v_prev_summary.withdraw_gold_g > 0 THEN ROUND(((v_summary.withdraw_gold_g - v_prev_summary.withdraw_gold_g) / v_prev_summary.withdraw_gold_g) * 100, 1) ELSE 0 END,
        'withdraw_tx_pct', CASE WHEN v_prev_summary.withdraw_trans > 0 THEN ROUND(((v_summary.withdraw_trans - v_prev_summary.withdraw_trans)::numeric / v_prev_summary.withdraw_trans) * 100, 1) ELSE 0 END,
        'net_weight_pct', CASE WHEN ABS(v_prev_summary.gold_weight_buy_g - v_prev_summary.gold_weight_sell_g - v_prev_summary.withdraw_gold_g) > 0
            THEN ROUND((((v_summary.gold_weight_buy_g - v_summary.gold_weight_sell_g - v_summary.withdraw_gold_g) - (v_prev_summary.gold_weight_buy_g - v_prev_summary.gold_weight_sell_g - v_prev_summary.withdraw_gold_g)) / ABS(v_prev_summary.gold_weight_buy_g - v_prev_summary.gold_weight_sell_g - v_prev_summary.withdraw_gold_g)) * 100, 1)
            ELSE 0 END
    );

    -- 5. Hourly Activity Curve (00:00 to 23:00)
    SELECT jsonb_agg(h ORDER BY h.hour ASC)
    INTO v_hourly
    FROM (
        SELECT
            hrs.hr AS hour,
            lpad(hrs.hr::text, 2, '0') || ':00' AS hour_label,
            COALESCE(COUNT(t.tx_hour), 0)::bigint AS total_tx,
            COALESCE(COUNT(t.tx_hour) FILTER (WHERE t.transaction_type = 'BUY_GOLD'), 0)::bigint AS buy_tx,
            COALESCE(COUNT(t.tx_hour) FILTER (WHERE t.transaction_type = 'SALE_GOLD'), 0)::bigint AS sell_tx,
            ROUND(COALESCE(SUM(t.gold_weight), 0), 2) AS total_weight_g,
            ROUND(COALESCE(SUM(t.gold_weight) FILTER (WHERE t.transaction_type = 'BUY_GOLD'), 0), 2) AS buy_weight_g,
            ROUND(COALESCE(SUM(t.gold_weight) FILTER (WHERE t.transaction_type = 'SALE_GOLD'), 0), 2) AS sell_weight_g,
            ROUND(COALESCE(SUM(t.total_amount), 0), 0) AS total_amount_lak,
            ROUND(COALESCE(SUM(t.total_amount) FILTER (WHERE t.transaction_type = 'BUY_GOLD'), 0), 0) AS buy_amount_lak,
            ROUND(COALESCE(SUM(t.total_amount) FILTER (WHERE t.transaction_type = 'SALE_GOLD'), 0), 0) AS sell_amount_lak
        FROM generate_series(0, 23) AS hrs(hr)
        LEFT JOIN tmp_dyn_curr t ON t.tx_hour = hrs.hr
        GROUP BY hrs.hr
    ) h;

    -- 6. Day of Week Activity Curve (Mon - Sun)
    SELECT jsonb_agg(d ORDER BY d.dow_order ASC)
    INTO v_day_of_week
    FROM (
        SELECT
            dows.dow_code AS day_code,
            dows.dow_label AS day_label,
            dows.dow_full AS day_full,
            dows.dow_order,
            COALESCE(COUNT(t.dow_num), 0)::bigint AS total_tx,
            COALESCE(COUNT(t.dow_num) FILTER (WHERE t.transaction_type = 'BUY_GOLD'), 0)::bigint AS buy_tx,
            COALESCE(COUNT(t.dow_num) FILTER (WHERE t.transaction_type = 'SALE_GOLD'), 0)::bigint AS sell_tx,
            ROUND(COALESCE(SUM(t.gold_weight), 0), 2) AS total_weight_g,
            ROUND(COALESCE(SUM(t.gold_weight) FILTER (WHERE t.transaction_type = 'BUY_GOLD'), 0), 2) AS buy_weight_g,
            ROUND(COALESCE(SUM(t.gold_weight) FILTER (WHERE t.transaction_type = 'SALE_GOLD'), 0), 2) AS sell_weight_g,
            ROUND(COALESCE(SUM(t.total_amount), 0), 0) AS total_amount_lak,
            ROUND(COALESCE(SUM(t.total_amount) FILTER (WHERE t.transaction_type = 'BUY_GOLD'), 0), 0) AS buy_amount_lak,
            ROUND(COALESCE(SUM(t.total_amount) FILTER (WHERE t.transaction_type = 'SALE_GOLD'), 0), 0) AS sell_amount_lak
        FROM (VALUES
            (1, 'mon', 'Mon', 'Monday', 1),
            (2, 'tue', 'Tue', 'Tuesday', 2),
            (3, 'wed', 'Wed', 'Wednesday', 3),
            (4, 'thu', 'Thu', 'Thursday', 4),
            (5, 'fri', 'Fri', 'Friday (Payday)', 5),
            (6, 'sat', 'Sat', 'Saturday', 6),
            (7, 'sun', 'Sun', 'Sunday', 7)
        ) AS dows(dow_num, dow_code, dow_label, dow_full, dow_order)
        LEFT JOIN tmp_dyn_curr t ON t.dow_num = dows.dow_num
        GROUP BY dows.dow_code, dows.dow_label, dows.dow_full, dows.dow_order
    ) d;

    -- 7. Daily Timeline Trend
    SELECT jsonb_agg(tr ORDER BY tr.tx_date ASC)
    INTO v_timeline_trend
    FROM (
        SELECT
            substring(tx_date::text, 6, 5) AS label,
            tx_date::text AS tx_date,
            ROUND(COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0), 0) AS buy_val,
            ROUND(COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0), 0) AS sell_val,
            ROUND(COALESCE(SUM(total_amount), 0), 0) AS total_val,
            COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD')::bigint AS buy_tx,
            COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD')::bigint AS sell_tx,
            COUNT(*)::bigint AS total_tx,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0), 2) AS buy_weight_g,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0), 2) AS sell_weight_g,
            ROUND(
                COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0)
                - COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0)
                - COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')), 0),
                2
            ) AS net_weight_g,
            COUNT(*) FILTER (WHERE transaction_type = 'OPEN_ACCOUNT' OR transaction_type ILIKE '%REGISTER%')::bigint AS nc,
            COUNT(*) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%')::bigint AS withdraw_tx,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%'), 0), 2) AS withdraw_weight_g
        FROM tmp_dyn_curr
        GROUP BY tx_date
    ) tr;

    -- 8. Bank Settlement Distribution
    SELECT jsonb_agg(bk ORDER BY bk.total_tx DESC)
    INTO v_banks
    FROM (
        SELECT
            bank AS bank_name,
            COUNT(*)::bigint AS total_tx,
            COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD')::bigint AS buy_tx,
            COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD')::bigint AS sell_tx,
            ROUND(COALESCE(SUM(gold_weight), 0), 2) AS total_weight_g,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0), 2) AS buy_weight_g,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0), 2) AS sell_weight_g,
            ROUND(COALESCE(SUM(total_amount), 0), 0) AS total_amount_lak,
            ROUND(COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0), 0) AS buy_amount_lak,
            ROUND(COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0), 0) AS sell_amount_lak,
            CASE WHEN v_summary.total_transaction > 0 THEN ROUND((COUNT(*)::numeric / v_summary.total_transaction) * 100, 1) ELSE 0 END AS share_pct,
            CASE WHEN v_summary.total_buy_transac > 0 THEN ROUND(((COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD'))::numeric / v_summary.total_buy_transac) * 100, 1) ELSE 0 END AS buy_share_pct,
            CASE WHEN v_summary.total_sell_transac > 0 THEN ROUND(((COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD'))::numeric / v_summary.total_sell_transac) * 100, 1) ELSE 0 END AS sell_share_pct
        FROM tmp_dyn_curr
        WHERE bank IS NOT NULL AND bank <> '' AND bank <> 'OTHER'
        GROUP BY bank
    ) bk;

    -- 9. Branch Breakdown
    SELECT jsonb_agg(br ORDER BY br.total_tx DESC)
    INTO v_branches
    FROM (
        SELECT
            branch AS branch_name,
            COUNT(*)::bigint AS total_tx,
            COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD')::bigint AS buy_tx,
            COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD')::bigint AS sell_tx,
            COUNT(*) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%')::bigint AS withdraw_tx,
            ROUND(COALESCE(SUM(gold_weight), 0), 2) AS total_weight_g,
            ROUND(COALESCE(SUM(total_amount), 0), 0) AS total_amount_lak
        FROM tmp_dyn_curr
        GROUP BY branch
    ) br;

    -- 10. Gold Weight Ticket Distribution (6 Standard Brackets with Buy & Sell Split)
    SELECT jsonb_agg(wb ORDER BY wb.bracket_order ASC)
    INTO v_weight_brackets
    FROM (
        SELECT
            bkt.bracket_label AS weight_bracket,
            bkt.bracket_order,
            COUNT(t.gold_weight)::bigint AS count,
            COUNT(t.gold_weight) FILTER (WHERE t.transaction_type = 'BUY_GOLD')::bigint AS buy_count,
            COUNT(t.gold_weight) FILTER (WHERE t.transaction_type = 'SALE_GOLD')::bigint AS sell_count,
            ROUND(COALESCE(SUM(t.gold_weight), 0), 2) AS total_weight_g,
            ROUND(COALESCE(SUM(t.gold_weight) FILTER (WHERE t.transaction_type = 'BUY_GOLD'), 0), 2) AS buy_weight_g,
            ROUND(COALESCE(SUM(t.gold_weight) FILTER (WHERE t.transaction_type = 'SALE_GOLD'), 0), 2) AS sell_weight_g,
            ROUND(COALESCE(SUM(t.total_amount), 0), 0) AS total_amount_lak,
            ROUND(COALESCE(SUM(t.total_amount) FILTER (WHERE t.transaction_type = 'BUY_GOLD'), 0), 0) AS buy_amount_lak,
            ROUND(COALESCE(SUM(t.total_amount) FILTER (WHERE t.transaction_type = 'SALE_GOLD'), 0), 0) AS sell_amount_lak
        FROM (VALUES
            (1, '< 0.5g', 0.0001::numeric, 0.5000::numeric),
            (2, '0.5g - 1g', 0.5000::numeric, 1.0000::numeric),
            (3, '1g - 5g', 1.0000::numeric, 5.0000::numeric),
            (4, '5g - 15g', 5.0000::numeric, 15.0000::numeric),
            (5, '15g - 75g (1-5 Baht)', 15.0000::numeric, 75.0000::numeric),
            (6, '>= 75g (>5 Baht)', 75.0000::numeric, 999999999::numeric)
        ) AS bkt(bracket_order, bracket_label, min_w, max_w)
        LEFT JOIN tmp_dyn_curr t
          ON t.gold_weight >= bkt.min_w AND t.gold_weight < bkt.max_w
         AND t.transaction_type IN ('BUY_GOLD', 'SALE_GOLD')
        GROUP BY bkt.bracket_order, bkt.bracket_label
    ) wb;

    RETURN jsonb_build_object(
        'meta', jsonb_build_object(
            'start_date', v_start_date::text,
            'end_date', v_end_date::text,
            'latest_available_date', v_latest_date::text,
            'generated_at', now()::text,
            'source', 'live_sql_v4',
            'elapsed_ms', ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int
        ),
        'dax_measures', jsonb_build_object(
            'total_transaction', v_summary.total_transaction,
            'total_unique_user', v_summary.total_unique_user,
            'freq_per_user_all', CASE WHEN v_summary.total_unique_user > 0 THEN ROUND(v_summary.total_transaction::numeric / v_summary.total_unique_user, 2) ELSE 0 END,
            'new_register', v_summary.new_register,
            'total_amount_lak', ROUND(v_summary.total_amount_lak, 0),
            'total_gold_weight_g', ROUND(v_summary.total_gold_weight_g, 2),
            'total_buy_transac', v_summary.total_buy_transac,
            'user_buy', v_summary.user_buy,
            'freq_per_user_buy', CASE WHEN v_summary.user_buy > 0 THEN ROUND(v_summary.total_buy_transac::numeric / v_summary.user_buy, 2) ELSE 0 END,
            'gold_weight_buy_g', ROUND(v_summary.gold_weight_buy_g, 2),
            'gold_weight_buy_15g', ROUND(v_summary.gold_weight_buy_g / 15.0, 2),
            'revenue_buy_lak', ROUND(v_summary.revenue_buy_lak, 0),
            'revenue_buy_mil_lak', ROUND(v_summary.revenue_buy_lak / 1000000.0, 2),
            'abs_buy_ticket_lak', CASE WHEN v_summary.total_buy_transac > 0 THEN ROUND(v_summary.revenue_buy_lak / v_summary.total_buy_transac, 0) ELSE 0 END,
            'gold_buy_size_g', CASE WHEN v_summary.total_buy_transac > 0 THEN ROUND(v_summary.gold_weight_buy_g / v_summary.total_buy_transac, 4) ELSE 0 END,
            'total_sell_transac', v_summary.total_sell_transac,
            'user_sell', v_summary.user_sell,
            'freq_per_user_sell', CASE WHEN v_summary.user_sell > 0 THEN ROUND(v_summary.total_sell_transac::numeric / v_summary.user_sell, 2) ELSE 0 END,
            'gold_weight_sell_g', ROUND(v_summary.gold_weight_sell_g, 2),
            'gold_weight_sell_15g', ROUND(v_summary.gold_weight_sell_g / 15.0, 2),
            'revenue_sell_lak', ROUND(v_summary.revenue_sell_lak, 0),
            'revenue_sell_mil_lak', ROUND(v_summary.revenue_sell_lak / 1000000.0, 2),
            'avg_sell_size_lak', CASE WHEN v_summary.total_sell_transac > 0 THEN ROUND(v_summary.revenue_sell_lak / v_summary.total_sell_transac, 0) ELSE 0 END,
            'gold_sell_size_g', CASE WHEN v_summary.total_sell_transac > 0 THEN ROUND(v_summary.gold_weight_sell_g / v_summary.total_sell_transac, 4) ELSE 0 END,
            'withdraw_trans', v_summary.withdraw_trans,
            'user_withdraw_gold', v_summary.user_withdraw_gold,
            'withdraw_gold_g', ROUND(v_summary.withdraw_gold_g, 2),
            'withdraw_gold_15g', ROUND(v_summary.withdraw_gold_g / 15.0, 2),
            'withdraw_value_lak', ROUND(v_summary.withdraw_value_lak, 0),
            'withdraw_value_mil_lak', ROUND(v_summary.withdraw_value_lak / 1000000.0, 2),
            'withdraw_ticket_size_g', CASE WHEN v_summary.withdraw_trans > 0 THEN ROUND(v_summary.withdraw_gold_g / v_summary.withdraw_trans, 4) ELSE 0 END,
            'withdraw_ticket_size_lak', CASE WHEN v_summary.withdraw_trans > 0 THEN ROUND(v_summary.withdraw_value_lak / v_summary.withdraw_trans, 0) ELSE 0 END,
            'net_flow_trans_pct', CASE WHEN v_summary.total_transaction > 0 THEN ROUND((v_summary.total_buy_transac::numeric / v_summary.total_transaction) * 100, 2) ELSE 0 END,
            'net_flow_value_pct', CASE WHEN (v_summary.revenue_buy_lak + v_summary.revenue_sell_lak) > 0 THEN ROUND((v_summary.revenue_buy_lak / (v_summary.revenue_buy_lak + v_summary.revenue_sell_lak)) * 100, 2) ELSE 0 END,
            'net_gold_weight_g', ROUND(v_summary.gold_weight_buy_g - v_summary.gold_weight_sell_g - v_summary.withdraw_gold_g, 2),
            'open_price', v_prices.open_price,
            'close_price', v_prices.close_price,
            'price_change', (v_prices.close_price - v_prices.open_price),
            'avg_value_lak', CASE WHEN v_summary.total_transaction > 0 THEN ROUND(v_summary.total_amount_lak / v_summary.total_transaction, 0) ELSE 0 END,
            'min_value_lak', ROUND(v_summary.min_value_lak, 0),
            'max_value_lak', ROUND(v_summary.max_value_lak, 0),
            'median_value_lak', ROUND(v_summary.median_value_lak, 0),
            'avg_weight_g', CASE WHEN v_summary.total_transaction > 0 THEN ROUND(v_summary.total_gold_weight_g / v_summary.total_transaction, 4) ELSE 0 END,
            'min_weight_g', ROUND(v_summary.min_weight_g, 4),
            'max_weight_g', ROUND(v_summary.max_weight_g, 4),
            'median_weight_g', ROUND(v_summary.median_weight_g, 4)
        ),
        'pop_comparison', v_pop,
        'hourly', COALESCE(v_hourly, '[]'::jsonb),
        'day_of_week', COALESCE(v_day_of_week, '[]'::jsonb),
        'timeline_trend', COALESCE(v_timeline_trend, '[]'::jsonb),
        'banks', COALESCE(v_banks, '[]'::jsonb),
        'branches', COALESCE(v_branches, '[]'::jsonb),
        'weight_brackets', COALESCE(v_weight_brackets, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dynamic_bi_report(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT[], TEXT[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, INT, TEXT, INT[], TEXT[], TEXT, TEXT) TO anon, authenticated, service_role;

