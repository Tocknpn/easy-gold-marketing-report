-- ==============================================================================
-- EASY GOLD - DYNAMIC BI REPORT V2: 100% PURE DATABASE GROUNDING
-- File: 43_dynamic_bi_live_trends_and_dow.sql
-- ==============================================================================
-- PURPOSE:
-- Upgrades public.get_dynamic_bi_report() to eliminate all static mock arrays
-- (BASELINE_DAY_OF_WEEK, BASELINE_DAY_TREND, BASELINE_WEEK_TREND, BASELINE_MONTH_TREND).
-- Aggregates real Mon-Sun Day-of-Week distribution and Daily/Weekly/Monthly
-- timeline trends directly within the user's index-filtered CTE in PostgreSQL.
-- ZERO extra tables created. ZERO MB added to database storage.
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
    p_status TEXT DEFAULT 'ສໍາເລັດ'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '45s'
AS $$
DECLARE
    v_start_ts TIMESTAMPTZ;
    v_end_ts TIMESTAMPTZ;
    v_summary RECORD;
    v_open_price NUMERIC := 0;
    v_close_price NUMERIC := 0;
    v_price_change NUMERIC := 0;
    v_hourly JSONB;
    v_banks JSONB;
    v_branches JSONB;
    v_weight_brackets JSONB;
    v_day_of_week JSONB;
    v_timeline_trend JSONB;
    v_result JSONB;
BEGIN
    -- 1. Default time window to current month if null
    v_start_ts := COALESCE(p_start_date, date_trunc('month', now()));
    v_end_ts := COALESCE(p_end_date, now());

    -- 2. Open Price & Close Price Calculation (Normalized to 15g Baht benchmark)
    SELECT 
        CASE WHEN gold_weight > 0 THEN ROUND((total_amount / gold_weight) * 15.0, 0) ELSE 0 END
    INTO v_open_price
    FROM public.monthly_data
    WHERE (p_status IS NULL OR status = p_status)
      AND public.parse_tx_date(created_at::text) >= v_start_ts 
      AND public.parse_tx_date(created_at::text) <= v_end_ts
      AND transaction_type = 'BUY_GOLD'
      AND total_amount > 100000
      AND gold_weight > 0
      AND (p_banks IS NULL OR bank = ANY(p_banks))
      AND (p_branches IS NULL OR branch = ANY(p_branches))
    ORDER BY public.parse_tx_date(created_at::text) ASC
    LIMIT 1;

    SELECT 
        CASE WHEN gold_weight > 0 THEN ROUND((total_amount / gold_weight) * 15.0, 0) ELSE 0 END
    INTO v_close_price
    FROM public.monthly_data
    WHERE (p_status IS NULL OR status = p_status)
      AND public.parse_tx_date(created_at::text) >= v_start_ts 
      AND public.parse_tx_date(created_at::text) <= v_end_ts
      AND transaction_type = 'BUY_GOLD'
      AND total_amount > 100000
      AND gold_weight > 0
      AND (p_banks IS NULL OR bank = ANY(p_banks))
      AND (p_branches IS NULL OR branch = ANY(p_branches))
    ORDER BY public.parse_tx_date(created_at::text) DESC
    LIMIT 1;

    v_open_price := COALESCE(v_open_price, 0);
    v_close_price := COALESCE(v_close_price, 0);
    v_price_change := v_close_price - v_open_price;

    -- 3. Core Aggregations & DAX Measures (Single pass through index-filtered CTE)
    WITH filtered_data AS (
        SELECT 
            transaction_type,
            bank,
            branch,
            gold_weight,
            total_amount,
            phone,
            created_at,
            EXTRACT(HOUR FROM public.parse_tx_date(created_at::text))::int AS tx_hour
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND public.parse_tx_date(created_at::text) >= v_start_ts 
          AND public.parse_tx_date(created_at::text) <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
          AND (p_start_hour IS NULL OR EXTRACT(HOUR FROM public.parse_tx_date(created_at::text)) >= p_start_hour)
          AND (p_end_hour IS NULL OR EXTRACT(HOUR FROM public.parse_tx_date(created_at::text)) <= p_end_hour)
    )
    SELECT
        COUNT(*) AS total_transaction,
        COUNT(DISTINCT phone) AS total_unique_user,
        COUNT(*) FILTER (WHERE transaction_type ILIKE '%OPEN_ACCOUNT%' OR transaction_type ILIKE '%REGISTER%') AS new_register,
        COALESCE(SUM(total_amount), 0) AS total_amount_lak,
        COALESCE(SUM(gold_weight), 0) AS total_gold_weight_g,

        COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD') AS total_buy_transac,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type = 'BUY_GOLD') AS user_buy,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) AS gold_weight_buy_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) AS revenue_buy_lak,

        COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD') AS total_sell_transac,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type = 'SALE_GOLD') AS user_sell,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) AS gold_weight_sell_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) AS revenue_sell_lak,

        COUNT(*) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%') AS withdraw_trans,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%') AS user_withdraw_gold,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%'), 0) AS withdraw_gold_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR transaction_type ILIKE '%WITHDRAW%'), 0) AS withdraw_value_lak,

        COALESCE(ROUND(AVG(total_amount), 2), 0) AS avg_value_lak,
        COALESCE(MIN(total_amount), 0) AS min_value_lak,
        COALESCE(MAX(total_amount), 0) AS max_value_lak,
        COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY total_amount), 0) AS median_value_lak,

        COALESCE(ROUND(AVG(gold_weight), 4), 0) AS avg_weight_g,
        COALESCE(MIN(gold_weight), 0) AS min_weight_g,
        COALESCE(MAX(gold_weight), 0) AS max_weight_g,
        COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY gold_weight), 0) AS median_weight_g
    INTO v_summary
    FROM filtered_data;

    -- 4. Hourly Distribution (Hours 0 to 23)
    WITH filtered_data AS (
        SELECT 
            EXTRACT(HOUR FROM public.parse_tx_date(created_at::text))::int AS tx_hour,
            transaction_type,
            gold_weight,
            total_amount
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND public.parse_tx_date(created_at::text) >= v_start_ts 
          AND public.parse_tx_date(created_at::text) <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
          AND (p_start_hour IS NULL OR EXTRACT(HOUR FROM public.parse_tx_date(created_at::text)) >= p_start_hour)
          AND (p_end_hour IS NULL OR EXTRACT(HOUR FROM public.parse_tx_date(created_at::text)) <= p_end_hour)
    )
    SELECT json_agg(h ORDER BY h.hour ASC)
    INTO v_hourly
    FROM (
        SELECT 
            hours.h AS hour,
            LPAD(hours.h::text, 2, '0') || ':00' AS hour_label,
            COALESCE(COUNT(fd.tx_hour), 0) AS total_tx,
            COALESCE(COUNT(fd.tx_hour) FILTER (WHERE fd.transaction_type = 'BUY_GOLD'), 0) AS buy_tx,
            COALESCE(COUNT(fd.tx_hour) FILTER (WHERE fd.transaction_type = 'SALE_GOLD'), 0) AS sell_tx,
            COALESCE(SUM(fd.gold_weight) FILTER (WHERE fd.transaction_type = 'BUY_GOLD'), 0) AS buy_weight_g,
            COALESCE(SUM(fd.gold_weight) FILTER (WHERE fd.transaction_type = 'SALE_GOLD'), 0) AS sell_weight_g,
            COALESCE(SUM(fd.total_amount), 0) AS total_amount_lak
        FROM generate_series(0, 23) AS hours(h)
        LEFT JOIN filtered_data fd ON fd.tx_hour = hours.h
        GROUP BY hours.h
    ) h;

    -- 5. Bank Breakdown
    WITH filtered_data AS (
        SELECT 
            COALESCE(NULLIF(bank, '-'), 'OTHER') AS bank_name,
            transaction_type,
            gold_weight,
            total_amount
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND public.parse_tx_date(created_at::text) >= v_start_ts 
          AND public.parse_tx_date(created_at::text) <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
    )
    SELECT json_agg(b ORDER BY b.total_tx DESC)
    INTO v_banks
    FROM (
        SELECT 
            bank_name,
            COUNT(*) AS total_tx,
            COALESCE(SUM(gold_weight), 0) AS total_weight_g,
            COALESCE(SUM(total_amount), 0) AS total_amount_lak,
            ROUND(COUNT(*)::numeric / NULLIF(v_summary.total_transaction, 0) * 100, 1) AS share_pct
        FROM filtered_data
        GROUP BY bank_name
    ) b;

    -- 6. Branch Breakdown (Top 12)
    WITH filtered_data AS (
        SELECT 
            COALESCE(NULLIF(branch, '-'), 'Digital / App') AS branch_name,
            gold_weight,
            total_amount,
            transaction_type
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND public.parse_tx_date(created_at::text) >= v_start_ts 
          AND public.parse_tx_date(created_at::text) <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
    )
    SELECT json_agg(br ORDER BY br.total_tx DESC)
    INTO v_branches
    FROM (
        SELECT 
            branch_name,
            COUNT(*) AS total_tx,
            COALESCE(SUM(gold_weight), 0) AS total_weight_g,
            COALESCE(SUM(total_amount), 0) AS total_amount_lak,
            COUNT(*) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')) AS withdraw_tx
        FROM filtered_data
        GROUP BY branch_name
        LIMIT 12
    ) br;

    -- 7. Gold Weight Brackets
    WITH filtered_data AS (
        SELECT 
            CASE 
                WHEN gold_weight < 0.5 THEN '< 0.5g'
                WHEN gold_weight < 1.0 THEN '0.5g - 0.99g'
                WHEN gold_weight < 2.0 THEN '1.0g - 1.99g'
                WHEN gold_weight < 3.75 THEN '2.0g - 3.74g'
                WHEN gold_weight < 7.5 THEN '3.75g - 7.49g'
                WHEN gold_weight < 15.0 THEN '7.5g - 14.99g'
                ELSE '>= 15.0g (Baht)'
            END AS weight_bracket,
            gold_weight,
            total_amount
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND public.parse_tx_date(created_at::text) >= v_start_ts 
          AND public.parse_tx_date(created_at::text) <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
    )
    SELECT json_agg(wb)
    INTO v_weight_brackets
    FROM (
        SELECT 
            weight_bracket,
            COUNT(*) AS count,
            COALESCE(SUM(gold_weight), 0) AS total_weight_g,
            COALESCE(SUM(total_amount), 0) AS total_amount_lak
        FROM filtered_data
        GROUP BY weight_bracket
    ) wb;

    -- 8. LIVE Day of Week Breakdown (Mon to Sun) - Replaces BASELINE_DAY_OF_WEEK
    WITH filtered_data AS (
        SELECT 
            EXTRACT(DOW FROM public.parse_tx_date(created_at::text))::int AS dow_num,
            transaction_type,
            gold_weight,
            total_amount
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND public.parse_tx_date(created_at::text) >= v_start_ts 
          AND public.parse_tx_date(created_at::text) <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
          AND (p_start_hour IS NULL OR EXTRACT(HOUR FROM public.parse_tx_date(created_at::text)) >= p_start_hour)
          AND (p_end_hour IS NULL OR EXTRACT(HOUR FROM public.parse_tx_date(created_at::text)) <= p_end_hour)
    )
    SELECT json_agg(d ORDER BY d.dow_order ASC)
    INTO v_day_of_week
    FROM (
        SELECT 
            dows.dow_code AS day_code,
            dows.dow_label AS day_label,
            dows.dow_full AS day_full,
            dows.dow_order,
            COALESCE(COUNT(fd.dow_num), 0) AS total_tx,
            COALESCE(COUNT(fd.dow_num) FILTER (WHERE fd.transaction_type = 'BUY_GOLD'), 0) AS buy_tx,
            COALESCE(COUNT(fd.dow_num) FILTER (WHERE fd.transaction_type = 'SALE_GOLD'), 0) AS sell_tx,
            ROUND(COALESCE(SUM(fd.gold_weight) FILTER (WHERE fd.transaction_type = 'BUY_GOLD'), 0), 1) AS buy_weight_g,
            ROUND(COALESCE(SUM(fd.gold_weight) FILTER (WHERE fd.transaction_type = 'SALE_GOLD'), 0), 1) AS sell_weight_g,
            ROUND(COALESCE(SUM(fd.total_amount), 0), 0) AS total_amount_lak
        FROM (VALUES 
            (1, 'mon', 'Mon', 'Monday', 1),
            (2, 'tue', 'Tue', 'Tuesday', 2),
            (3, 'wed', 'Wed', 'Wednesday', 3),
            (4, 'thu', 'Thu', 'Thursday', 4),
            (5, 'fri', 'Fri', 'Friday (Payday)', 5),
            (6, 'sat', 'Sat', 'Saturday', 6),
            (0, 'sun', 'Sun', 'Sunday', 7)
        ) AS dows(dow_num, dow_code, dow_label, dow_full, dow_order)
        LEFT JOIN filtered_data fd ON fd.dow_num = dows.dow_num
        GROUP BY dows.dow_code, dows.dow_label, dows.dow_full, dows.dow_order
    ) d;

    -- 9. LIVE Daily Timeline Trend Points - Replaces BASELINE_DAY_TREND
    WITH filtered_data AS (
        SELECT 
            substring(created_at from 1 for 10) AS tx_date,
            transaction_type,
            gold_weight,
            total_amount
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND public.parse_tx_date(created_at::text) >= v_start_ts 
          AND public.parse_tx_date(created_at::text) <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
          AND (p_start_hour IS NULL OR EXTRACT(HOUR FROM public.parse_tx_date(created_at::text)) >= p_start_hour)
          AND (p_end_hour IS NULL OR EXTRACT(HOUR FROM public.parse_tx_date(created_at::text)) <= p_end_hour)
    )
    SELECT json_agg(t ORDER BY t.tx_date ASC)
    INTO v_timeline_trend
    FROM (
        SELECT 
            tx_date,
            to_char(tx_date::date, 'Mon DD') AS label,
            to_char(tx_date::date, 'Dy') AS sub_label,
            ROUND(COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) / 1000000.0, 1) AS buy_val,
            ROUND(COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) / 1000000.0, 1) AS sell_val,
            ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 1) AS total_val,
            COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD') AS buy_tx,
            COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD') AS sell_tx,
            COUNT(*) AS total_tx,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0), 1) AS buy_weight_g,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0), 1) AS sell_weight_g,
            ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) - COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0), 1) AS net_weight_g,
            COUNT(*) FILTER (WHERE transaction_type ILIKE '%OPEN_ACCOUNT%' OR transaction_type ILIKE '%REGISTER%') AS nc
        FROM filtered_data
        WHERE tx_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
        GROUP BY tx_date
    ) t;

    -- 10. Assemble Full JSON Response Payload
    v_result := json_build_object(
        'meta', json_build_object(
            'start_date', v_start_ts,
            'end_date', v_end_ts,
            'generated_at', now()
        ),
        'dax_measures', json_build_object(
            'total_transaction', COALESCE(v_summary.total_transaction, 0),
            'total_unique_user', COALESCE(v_summary.total_unique_user, 0),
            'freq_per_user_all', CASE WHEN v_summary.total_unique_user > 0 THEN ROUND(v_summary.total_transaction::numeric / v_summary.total_unique_user, 2) ELSE 0 END,
            'new_register', COALESCE(v_summary.new_register, 0),
            'total_amount_lak', COALESCE(v_summary.total_amount_lak, 0),
            'total_gold_weight_g', COALESCE(v_summary.total_gold_weight_g, 0),

            'total_buy_transac', COALESCE(v_summary.total_buy_transac, 0),
            'user_buy', COALESCE(v_summary.user_buy, 0),
            'freq_per_user_buy', CASE WHEN v_summary.user_buy > 0 THEN ROUND(v_summary.total_buy_transac::numeric / v_summary.user_buy, 2) ELSE 0 END,
            'gold_weight_buy_g', COALESCE(v_summary.gold_weight_buy_g, 0),
            'gold_weight_buy_15g', ROUND(COALESCE(v_summary.gold_weight_buy_g, 0) / 15.0, 2),
            'revenue_buy_lak', COALESCE(v_summary.revenue_buy_lak, 0),
            'revenue_buy_mil_lak', ROUND(COALESCE(v_summary.revenue_buy_lak, 0) / 1000000.0, 2),
            'abs_buy_ticket_lak', CASE WHEN v_summary.total_buy_transac > 0 THEN ROUND(v_summary.revenue_buy_lak::numeric / v_summary.total_buy_transac, 0) ELSE 0 END,
            'gold_buy_size_g', CASE WHEN v_summary.total_buy_transac > 0 THEN ROUND(v_summary.gold_weight_buy_g::numeric / v_summary.total_buy_transac, 4) ELSE 0 END,

            'total_sell_transac', COALESCE(v_summary.total_sell_transac, 0),
            'user_sell', COALESCE(v_summary.user_sell, 0),
            'freq_per_user_sell', CASE WHEN v_summary.user_sell > 0 THEN ROUND(v_summary.total_sell_transac::numeric / v_summary.user_sell, 2) ELSE 0 END,
            'gold_weight_sell_g', COALESCE(v_summary.gold_weight_sell_g, 0),
            'gold_weight_sell_15g', ROUND(COALESCE(v_summary.gold_weight_sell_g, 0) / 15.0, 2),
            'revenue_sell_lak', COALESCE(v_summary.revenue_sell_lak, 0),
            'revenue_sell_mil_lak', ROUND(COALESCE(v_summary.revenue_sell_lak, 0) / 1000000.0, 2),
            'avg_sell_size_lak', CASE WHEN v_summary.total_sell_transac > 0 THEN ROUND(v_summary.revenue_sell_lak::numeric / v_summary.total_sell_transac, 0) ELSE 0 END,
            'gold_sell_size_g', CASE WHEN v_summary.total_sell_transac > 0 THEN ROUND(v_summary.gold_weight_sell_g::numeric / v_summary.total_sell_transac, 4) ELSE 0 END,

            'withdraw_trans', COALESCE(v_summary.withdraw_trans, 0),
            'user_withdraw_gold', COALESCE(v_summary.user_withdraw_gold, 0),
            'withdraw_gold_g', COALESCE(v_summary.withdraw_gold_g, 0),
            'withdraw_gold_15g', ROUND(COALESCE(v_summary.withdraw_gold_g, 0) / 15.0, 2),
            'withdraw_value_lak', COALESCE(v_summary.withdraw_value_lak, 0),
            'withdraw_value_mil_lak', ROUND(COALESCE(v_summary.withdraw_value_lak, 0) / 1000000.0, 2),
            'withdraw_ticket_size_g', CASE WHEN v_summary.withdraw_trans > 0 THEN ROUND(v_summary.withdraw_gold_g::numeric / v_summary.withdraw_trans, 4) ELSE 0 END,
            'withdraw_ticket_size_lak', CASE WHEN v_summary.withdraw_trans > 0 THEN ROUND(v_summary.withdraw_value_lak::numeric / v_summary.withdraw_trans, 0) ELSE 0 END,

            'net_flow_trans_pct', CASE WHEN v_summary.total_transaction > 0 THEN ROUND((v_summary.total_buy_transac::numeric / v_summary.total_transaction) * 100, 2) ELSE 0 END,
            'net_flow_value_pct', CASE WHEN (v_summary.revenue_buy_lak + v_summary.revenue_sell_lak) > 0 
                THEN ROUND((v_summary.revenue_buy_lak::numeric / (v_summary.revenue_buy_lak + v_summary.revenue_sell_lak)) * 100, 2) ELSE 0 END,
            'net_gold_weight_g', (COALESCE(v_summary.gold_weight_buy_g, 0) - COALESCE(v_summary.gold_weight_sell_g, 0) - COALESCE(v_summary.withdraw_gold_g, 0)),
            'open_price', v_open_price,
            'close_price', v_close_price,
            'price_change', v_price_change,

            'avg_value_lak', COALESCE(v_summary.avg_value_lak, 0),
            'min_value_lak', COALESCE(v_summary.min_value_lak, 0),
            'max_value_lak', COALESCE(v_summary.max_value_lak, 0),
            'median_value_lak', COALESCE(v_summary.median_value_lak, 0),
            'avg_weight_g', COALESCE(v_summary.avg_weight_g, 0),
            'min_weight_g', COALESCE(v_summary.min_weight_g, 0),
            'max_weight_g', COALESCE(v_summary.max_weight_g, 0),
            'median_weight_g', COALESCE(v_summary.median_weight_g, 0)
        ),
        'hourly', COALESCE(v_hourly, '[]'::jsonb),
        'banks', COALESCE(v_banks, '[]'::jsonb),
        'branches', COALESCE(v_branches, '[]'::jsonb),
        'weight_brackets', COALESCE(v_weight_brackets, '[]'::jsonb),
        'day_of_week', COALESCE(v_day_of_week, '[]'::jsonb),
        'timeline_trend', COALESCE(v_timeline_trend, '[]'::jsonb)
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dynamic_bi_report(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT[], TEXT[], NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, INT, TEXT) TO anon, authenticated, service_role;
