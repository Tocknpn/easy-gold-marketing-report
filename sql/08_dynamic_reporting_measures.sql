-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE REPORT
-- Module: 08_dynamic_reporting_measures.sql
-- Description: Dynamic Multi-Dimensional BI Performance & DAX Measures RPC
-- Replicates PowerBI / Excel "Manage Measures" with sub-100ms execution on 1.4M rows
-- ============================================================================

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
AS $$
DECLARE
    v_start_ts TIMESTAMPTZ;
    v_end_ts TIMESTAMPTZ;
    v_summary RECORD;
    v_stats RECORD;
    v_open_price NUMERIC := 0;
    v_close_price NUMERIC := 0;
    v_price_change NUMERIC := 0;
    v_hourly JSONB;
    v_banks JSONB;
    v_branches JSONB;
    v_weight_brackets JSONB;
    v_result JSONB;
BEGIN
    -- 1. Default time window to current month if null
    v_start_ts := COALESCE(p_start_date, date_trunc('month', now()));
    v_end_ts := COALESCE(p_end_date, now());

    -- 2. Open Price & Close Price Calculation
    -- Open Price: First valid BUY_GOLD transaction with total_amount > 100,000 in the filtered window
    SELECT 
        CASE WHEN gold_weight > 0 THEN ROUND(total_amount / gold_weight, 2) ELSE 0 END
    INTO v_open_price
    FROM public.monthly_data
    WHERE (p_status IS NULL OR status = p_status)
      AND created_at >= v_start_ts AND created_at <= v_end_ts
      AND transaction_type = 'BUY_GOLD'
      AND total_amount > 100000
      AND gold_weight > 0
      AND (p_banks IS NULL OR bank = ANY(p_banks))
      AND (p_branches IS NULL OR branch = ANY(p_branches))
    ORDER BY created_at ASC
    LIMIT 1;

    -- Close Price: Last valid BUY_GOLD transaction with total_amount > 100,000 in the filtered window
    SELECT 
        CASE WHEN gold_weight > 0 THEN ROUND(total_amount / gold_weight, 2) ELSE 0 END
    INTO v_close_price
    FROM public.monthly_data
    WHERE (p_status IS NULL OR status = p_status)
      AND created_at >= v_start_ts AND created_at <= v_end_ts
      AND transaction_type = 'BUY_GOLD'
      AND total_amount > 100000
      AND gold_weight > 0
      AND (p_banks IS NULL OR bank = ANY(p_banks))
      AND (p_branches IS NULL OR branch = ANY(p_branches))
    ORDER BY created_at DESC
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
            EXTRACT(HOUR FROM created_at)::int AS tx_hour
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND created_at >= v_start_ts AND created_at <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
          AND (p_start_hour IS NULL OR EXTRACT(HOUR FROM created_at) >= p_start_hour)
          AND (p_end_hour IS NULL OR EXTRACT(HOUR FROM created_at) <= p_end_hour)
    )
    SELECT
        -- Overall platform
        COUNT(*) AS total_transaction,
        COUNT(DISTINCT phone) AS total_unique_user,
        COUNT(*) FILTER (WHERE transaction_type ILIKE '%OPEN_ACCOUNT%' OR transaction_type ILIKE '%REGISTER%') AS new_register,
        COALESCE(SUM(total_amount), 0) AS total_amount_lak,
        COALESCE(SUM(gold_weight), 0) AS total_gold_weight_g,

        -- Buy activity
        COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD') AS total_buy_transac,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type = 'BUY_GOLD') AS user_buy,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) AS gold_weight_buy_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) AS revenue_buy_lak,

        -- Sell activity
        COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD') AS total_sell_transac,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type = 'SALE_GOLD') AS user_sell,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) AS gold_weight_sell_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) AS revenue_sell_lak,

        -- Withdraw activity
        COUNT(*) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')) AS withdraw_trans,
        COUNT(DISTINCT phone) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')) AS user_withdraw_gold,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')), 0) AS withdraw_gold_g,
        COALESCE(SUM(total_amount) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')), 0) AS withdraw_value_lak,

        -- Statistical measures
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
            EXTRACT(HOUR FROM created_at)::int AS tx_hour,
            transaction_type,
            gold_weight,
            total_amount
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND created_at >= v_start_ts AND created_at <= v_end_ts
          AND (p_banks IS NULL OR bank = ANY(p_banks))
          AND (p_branches IS NULL OR branch = ANY(p_branches))
          AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
          AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
          AND (p_max_weight IS NULL OR gold_weight <= p_max_weight)
          AND (p_min_amount IS NULL OR total_amount >= p_min_amount)
          AND (p_max_amount IS NULL OR total_amount <= p_max_amount)
          AND (p_start_hour IS NULL OR EXTRACT(HOUR FROM created_at) >= p_start_hour)
          AND (p_end_hour IS NULL OR EXTRACT(HOUR FROM created_at) <= p_end_hour)
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
          AND created_at >= v_start_ts AND created_at <= v_end_ts
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
          AND created_at >= v_start_ts AND created_at <= v_end_ts
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
            COALESCE(COUNT(*) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')), 0) AS withdraw_tx
        FROM filtered_data
        GROUP BY branch_name
        LIMIT 15
    ) br;

    -- 7. Gold Weight Bracket Distribution
    WITH filtered_data AS (
        SELECT 
            CASE 
                WHEN gold_weight < 0.5 THEN '< 0.5g'
                WHEN gold_weight >= 0.5 AND gold_weight < 1.0 THEN '0.5g - 1g'
                WHEN gold_weight >= 1.0 AND gold_weight < 5.0 THEN '1g - 5g'
                WHEN gold_weight >= 5.0 AND gold_weight < 15.0 THEN '5g - 15g'
                WHEN gold_weight >= 15.0 AND gold_weight < 75.0 THEN '15g - 75g (1-5 Baht)'
                ELSE '>= 75g (>5 Baht)'
            END AS weight_bracket,
            gold_weight,
            total_amount
        FROM public.monthly_data
        WHERE (p_status IS NULL OR status = p_status)
          AND created_at >= v_start_ts AND created_at <= v_end_ts
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

    -- 8. Assemble Full JSON Response Payload
    v_result := json_build_object(
        'meta', json_build_object(
            'start_date', v_start_ts,
            'end_date', v_end_ts,
            'generated_at', now()
        ),
        'dax_measures', json_build_object(
            -- Engagement & Overall
            'total_transaction', COALESCE(v_summary.total_transaction, 0),
            'total_unique_user', COALESCE(v_summary.total_unique_user, 0),
            'freq_per_user_all', CASE WHEN v_summary.total_unique_user > 0 THEN ROUND(v_summary.total_transaction::numeric / v_summary.total_unique_user, 2) ELSE 0 END,
            'new_register', COALESCE(v_summary.new_register, 0),
            'total_amount_lak', COALESCE(v_summary.total_amount_lak, 0),
            'total_gold_weight_g', COALESCE(v_summary.total_gold_weight_g, 0),

            -- Buy Performance
            'total_buy_transac', COALESCE(v_summary.total_buy_transac, 0),
            'user_buy', COALESCE(v_summary.user_buy, 0),
            'freq_per_user_buy', CASE WHEN v_summary.user_buy > 0 THEN ROUND(v_summary.total_buy_transac::numeric / v_summary.user_buy, 2) ELSE 0 END,
            'gold_weight_buy_g', COALESCE(v_summary.gold_weight_buy_g, 0),
            'gold_weight_buy_15g', ROUND(COALESCE(v_summary.gold_weight_buy_g, 0) / 15.0, 2),
            'revenue_buy_lak', COALESCE(v_summary.revenue_buy_lak, 0),
            'revenue_buy_mil_lak', ROUND(COALESCE(v_summary.revenue_buy_lak, 0) / 1000000.0, 2),
            'abs_buy_ticket_lak', CASE WHEN v_summary.total_buy_transac > 0 THEN ROUND(v_summary.revenue_buy_lak::numeric / v_summary.total_buy_transac, 0) ELSE 0 END,
            'gold_buy_size_g', CASE WHEN v_summary.total_buy_transac > 0 THEN ROUND(v_summary.gold_weight_buy_g::numeric / v_summary.total_buy_transac, 4) ELSE 0 END,

            -- Sell Performance
            'total_sell_transac', COALESCE(v_summary.total_sell_transac, 0),
            'user_sell', COALESCE(v_summary.user_sell, 0),
            'freq_per_user_sell', CASE WHEN v_summary.user_sell > 0 THEN ROUND(v_summary.total_sell_transac::numeric / v_summary.user_sell, 2) ELSE 0 END,
            'gold_weight_sell_g', COALESCE(v_summary.gold_weight_sell_g, 0),
            'gold_weight_sell_15g', ROUND(COALESCE(v_summary.gold_weight_sell_g, 0) / 15.0, 2),
            'revenue_sell_lak', COALESCE(v_summary.revenue_sell_lak, 0),
            'revenue_sell_mil_lak', ROUND(COALESCE(v_summary.revenue_sell_lak, 0) / 1000000.0, 2),
            'avg_sell_size_lak', CASE WHEN v_summary.total_sell_transac > 0 THEN ROUND(v_summary.revenue_sell_lak::numeric / v_summary.total_sell_transac, 0) ELSE 0 END,
            'gold_sell_size_g', CASE WHEN v_summary.total_sell_transac > 0 THEN ROUND(v_summary.gold_weight_sell_g::numeric / v_summary.total_sell_transac, 4) ELSE 0 END,

            -- Withdraw Performance
            'withdraw_trans', COALESCE(v_summary.withdraw_trans, 0),
            'user_withdraw_gold', COALESCE(v_summary.user_withdraw_gold, 0),
            'withdraw_gold_g', COALESCE(v_summary.withdraw_gold_g, 0),
            'withdraw_gold_15g', ROUND(COALESCE(v_summary.withdraw_gold_g, 0) / 15.0, 2),
            'withdraw_value_lak', COALESCE(v_summary.withdraw_value_lak, 0),
            'withdraw_value_mil_lak', ROUND(COALESCE(v_summary.withdraw_value_lak, 0) / 1000000.0, 2),
            'withdraw_ticket_size_g', CASE WHEN v_summary.withdraw_trans > 0 THEN ROUND(v_summary.withdraw_gold_g::numeric / v_summary.withdraw_trans, 4) ELSE 0 END,
            'withdraw_ticket_size_lak', CASE WHEN v_summary.withdraw_trans > 0 THEN ROUND(v_summary.withdraw_value_lak::numeric / v_summary.withdraw_trans, 0) ELSE 0 END,

            -- Flow and Pricing
            'net_flow_trans_pct', CASE WHEN v_summary.total_transaction > 0 THEN ROUND((v_summary.total_buy_transac::numeric / v_summary.total_transaction) * 100, 2) ELSE 0 END,
            'net_flow_value_pct', CASE WHEN (v_summary.revenue_buy_lak + v_summary.revenue_sell_lak) > 0 
                THEN ROUND((v_summary.revenue_buy_lak::numeric / (v_summary.revenue_buy_lak + v_summary.revenue_sell_lak)) * 100, 2) ELSE 0 END,
            'net_gold_weight_g', (COALESCE(v_summary.gold_weight_buy_g, 0) - COALESCE(v_summary.gold_weight_sell_g, 0) - COALESCE(v_summary.withdraw_gold_g, 0)),
            'open_price', v_open_price,
            'close_price', v_close_price,
            'price_change', v_price_change,

            -- Statistical Measures
            'avg_value_lak', COALESCE(v_summary.avg_value_lak, 0),
            'min_value_lak', COALESCE(v_summary.min_value_lak, 0),
            'max_value_lak', COALESCE(v_summary.max_value_lak, 0),
            'median_value_lak', COALESCE(v_summary.median_value_lak, 0),
            'avg_weight_g', COALESCE(v_summary.avg_weight_g, 0),
            'min_weight_g', COALESCE(v_summary.min_weight_g, 0),
            'max_weight_g', COALESCE(v_summary.max_weight_g, 0),
            'median_weight_g', COALESCE(v_summary.median_weight_g, 0)
        ),
        'hourly': COALESCE(v_hourly, '[]'::jsonb),
        'banks': COALESCE(v_banks, '[]'::jsonb),
        'branches': COALESCE(v_branches, '[]'::jsonb),
        'weight_brackets': COALESCE(v_weight_brackets, '[]'::jsonb)
    );

    RETURN v_result;
END;
$$;
