-- ============================================================================
-- EASY GOLD - REAL DATA AGGREGATION SCRIPT
-- File: aggregate_real_monthly_data.sql
-- Run this in Supabase SQL Editor to compute real weekly metrics from monthly_data
-- ============================================================================

-- FIRST: Quick Check on your real data in monthly_data
SELECT 
    COUNT(*) AS total_real_transactions,
    MIN(created_at) AS earliest_transaction_date,
    MAX(created_at) AS latest_transaction_date,
    COUNT(DISTINCT date_trunc('week', created_at)) AS total_distinct_weeks
FROM public.monthly_data;


-- SECOND: Update RPC Function to fetch up to 52 weeks (1 full year)
CREATE OR REPLACE FUNCTION public.get_executive_weekly_dashboard(
    p_limit INT DEFAULT 52
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_history JSONB;
    v_current RECORD;
    v_previous RECORD;
    
    v_var_all_tx NUMERIC;
    v_var_active_users NUMERIC;
    v_var_new_reg NUMERIC;
    v_var_withdraw NUMERIC;
    v_var_buy_weight NUMERIC;
    v_var_buy_tx NUMERIC;
    v_var_buy_ticket NUMERIC;
    v_var_sell_weight NUMERIC;
    v_var_sell_tx NUMERIC;
    v_var_sell_ticket NUMERIC;
BEGIN
    SELECT json_agg(t ORDER BY t.year_week ASC)
    INTO v_history
    FROM (
        SELECT *
        FROM public.summary_weekly_metrics
        ORDER BY year_week DESC
        LIMIT p_limit
    ) t;

    SELECT * INTO v_current
    FROM public.summary_weekly_metrics
    ORDER BY year_week DESC
    OFFSET 0 LIMIT 1;

    SELECT * INTO v_previous
    FROM public.summary_weekly_metrics
    ORDER BY year_week DESC
    OFFSET 1 LIMIT 1;

    IF v_previous IS NOT NULL AND v_current IS NOT NULL THEN
        v_var_all_tx := CASE WHEN v_previous.all_transactions > 0 
            THEN ROUND(((v_current.all_transactions - v_previous.all_transactions)::numeric / v_previous.all_transactions) * 100) ELSE 0 END;
        v_var_active_users := CASE WHEN v_previous.active_users > 0 
            THEN ROUND(((v_current.active_users - v_previous.active_users)::numeric / v_previous.active_users) * 100) ELSE 0 END;
        v_var_new_reg := CASE WHEN v_previous.new_registers > 0 
            THEN ROUND(((v_current.new_registers - v_previous.new_registers)::numeric / v_previous.new_registers) * 100) ELSE 0 END;
        v_var_withdraw := CASE WHEN v_previous.withdraw_gold_grams > 0 
            THEN ROUND(((v_current.withdraw_gold_grams - v_previous.withdraw_gold_grams)::numeric / v_previous.withdraw_gold_grams) * 100) ELSE 0 END;
        v_var_buy_weight := CASE WHEN v_previous.buy_weight_15g > 0 
            THEN ROUND(((v_current.buy_weight_15g - v_previous.buy_weight_15g)::numeric / v_previous.buy_weight_15g) * 100) ELSE 0 END;
        v_var_buy_tx := CASE WHEN v_previous.buy_transactions > 0 
            THEN ROUND(((v_current.buy_transactions - v_previous.buy_transactions)::numeric / v_previous.buy_transactions) * 100) ELSE 0 END;
        v_var_buy_ticket := CASE WHEN v_previous.buy_ticket_size_g > 0 
            THEN ROUND(((v_current.buy_ticket_size_g - v_previous.buy_ticket_size_g)::numeric / v_previous.buy_ticket_size_g) * 100) ELSE 0 END;
        v_var_sell_weight := CASE WHEN v_previous.sell_weight_15g > 0 
            THEN ROUND(((v_current.sell_weight_15g - v_previous.sell_weight_15g)::numeric / v_previous.sell_weight_15g) * 100) ELSE 0 END;
        v_var_sell_tx := CASE WHEN v_previous.sell_transactions > 0 
            THEN ROUND(((v_current.sell_transactions - v_previous.sell_transactions)::numeric / v_previous.sell_transactions) * 100) ELSE 0 END;
        v_var_sell_ticket := CASE WHEN v_previous.sell_ticket_size_g > 0 
            THEN ROUND(((v_current.sell_ticket_size_g - v_previous.sell_ticket_size_g)::numeric / v_previous.sell_ticket_size_g) * 100) ELSE 0 END;
    END IF;

    v_result := json_build_object(
        'current_week', row_to_json(v_current),
        'previous_week', row_to_json(v_previous),
        'history', COALESCE(v_history, '[]'::jsonb),
        'variances', json_build_object(
            'all_transactions', COALESCE(v_var_all_tx, 0),
            'active_users', COALESCE(v_var_active_users, 0),
            'new_registers', COALESCE(v_var_new_reg, 0),
            'withdraw_gold_grams', COALESCE(v_var_withdraw, 0),
            'buy_weight_15g', COALESCE(v_var_buy_weight, 0),
            'buy_transactions', COALESCE(v_var_buy_tx, 0),
            'buy_ticket_size_g', COALESCE(v_var_buy_ticket, 0),
            'sell_weight_15g', COALESCE(v_var_sell_weight, 0),
            'sell_transactions', COALESCE(v_var_sell_tx, 0),
            'sell_ticket_size_g', COALESCE(v_var_sell_ticket, 0)
        ),
        'cached_at', now()
    );

    RETURN v_result;
END;
$$;


-- THIRD: Aggregate ALL real data from monthly_data into summary_weekly_metrics
INSERT INTO public.summary_weekly_metrics (
    year_week,
    week_label,
    week_number,
    year,
    start_date,
    end_date,
    all_transactions,
    active_users,
    new_registers,
    withdraw_gold_grams,
    buy_weight_15g,
    buy_transactions,
    buy_ticket_size_g,
    sell_weight_15g,
    sell_transactions,
    sell_ticket_size_g,
    updated_at
)
SELECT
    to_char(date_trunc('week', created_at), 'IYYY-"W"IW') AS year_week,
    'W' || EXTRACT(week FROM date_trunc('week', created_at))::int AS week_label,
    EXTRACT(week FROM date_trunc('week', created_at))::int AS week_number,
    EXTRACT(isoyear FROM date_trunc('week', created_at))::int AS year,
    date_trunc('week', created_at)::date AS start_date,
    (date_trunc('week', created_at) + interval '6 days')::date AS end_date,
    
    -- 1. All Transactions (completed)
    COUNT(*) FILTER (WHERE status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%') AS all_transactions,
    
    -- 2. Active Users (distinct phone numbers)
    COUNT(DISTINCT phone) FILTER (WHERE status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%') AS active_users,
    
    -- 3. New Register
    COUNT(*) FILTER (WHERE transaction_type ILIKE '%OPEN_ACCOUNT%' OR transaction_type ILIKE '%REGISTER%') AS new_registers,
    
    -- 4. Gold Withdraw in grams
    COALESCE(SUM(gold_weight) FILTER (
        WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') 
          AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
    ), 0) AS withdraw_gold_grams,
    
    -- 5. Buy Activity
    ROUND(COALESCE(SUM(gold_weight) FILTER (
        WHERE transaction_type = 'BUY_GOLD' 
          AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
    ), 0) / 15.0) AS buy_weight_15g,
    
    COUNT(*) FILTER (
        WHERE transaction_type = 'BUY_GOLD' 
          AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
    ) AS buy_transactions,
    
    CASE 
        WHEN COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')) > 0 
        THEN ROUND(
            (COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')), 0) 
            / COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%'))::numeric), 
            1
        )
        ELSE 0 
    END AS buy_ticket_size_g,
    
    -- 6. Sell Activity
    ROUND(COALESCE(SUM(gold_weight) FILTER (
        WHERE transaction_type = 'SALE_GOLD' 
          AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
    ), 0) / 15.0) AS sell_weight_15g,
    
    COUNT(*) FILTER (
        WHERE transaction_type = 'SALE_GOLD' 
          AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
    ) AS sell_transactions,
    
    CASE 
        WHEN COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')) > 0 
        THEN ROUND(
            (COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')), 0) 
            / COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%'))::numeric), 
            1
        )
        ELSE 0 
    END AS sell_ticket_size_g,
    
    now() AS updated_at
FROM public.monthly_data
WHERE created_at IS NOT NULL
GROUP BY date_trunc('week', created_at)
ON CONFLICT (year_week) DO UPDATE SET
    all_transactions = EXCLUDED.all_transactions,
    active_users = EXCLUDED.active_users,
    new_registers = EXCLUDED.new_registers,
    withdraw_gold_grams = EXCLUDED.withdraw_gold_grams,
    buy_weight_15g = EXCLUDED.buy_weight_15g,
    buy_transactions = EXCLUDED.buy_transactions,
    buy_ticket_size_g = EXCLUDED.buy_ticket_size_g,
    sell_weight_15g = EXCLUDED.sell_weight_15g,
    sell_transactions = EXCLUDED.sell_transactions,
    sell_ticket_size_g = EXCLUDED.sell_ticket_size_g,
    updated_at = now();


-- FOURTH: Confirmation of all loaded weeks in summary table
SELECT 
    year_week, 
    week_label, 
    start_date, 
    end_date, 
    all_transactions, 
    active_users,
    buy_transactions,
    sell_transactions
FROM public.summary_weekly_metrics
ORDER BY year_week DESC;
