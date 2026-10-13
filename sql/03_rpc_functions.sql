-- ============================================================================
-- EASY GOLD MARKETING REPORT - DATABASE BLUEPRINT
-- Module: 03_rpc_functions.sql
-- Sub-10ms Supabase RPC Functions for Executive Dashboard & Ad-Hoc Analytics
-- ============================================================================

-- ============================================================================
-- 1. EXECUTIVE WEEKLY DASHBOARD RPC
-- Returns 5-week historical trend (W37-W41) + latest week metrics + variance percentages
-- Execution time: < 5ms (reads from summary_weekly_metrics)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_executive_weekly_dashboard(
    p_limit INT DEFAULT 5
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
    
    -- Calculated variances
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
    -- Fetch the sorted weekly history (oldest to newest for charts: e.g. W37 -> W41)
    SELECT json_agg(t ORDER BY t.year_week ASC)
    INTO v_history
    FROM (
        SELECT *
        FROM public.summary_weekly_metrics
        ORDER BY year_week DESC
        LIMIT p_limit
    ) t;

    -- Fetch the latest 2 weeks for variance calculation
    SELECT * INTO v_current
    FROM public.summary_weekly_metrics
    ORDER BY year_week DESC
    OFFSET 0 LIMIT 1;

    SELECT * INTO v_previous
    FROM public.summary_weekly_metrics
    ORDER BY year_week DESC
    OFFSET 1 LIMIT 1;

    -- Compute period-over-period % variance: ((Current - Previous) / Previous) * 100
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

    -- Build structured response payload
    v_result := json_build_object(
        'current_week', row_to_json(v_current),
        'previous_week', row_to_json(v_previous),
        'history', v_history,
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

-- ============================================================================
-- 2. DYNAMIC AD-HOC CROSS-FILTERING RPC (Module 2)
-- High performance aggregation with composite index support
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_adhoc_filtered_metrics(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_banks TEXT[] DEFAULT NULL,
    p_tx_types TEXT[] DEFAULT NULL,
    p_min_weight NUMERIC DEFAULT NULL,
    p_max_weight NUMERIC DEFAULT NULL,
    p_branches TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT json_build_object(
        'total_tx_count', COUNT(*),
        'total_gold_weight_grams', COALESCE(SUM(gold_weight), 0),
        'total_gold_weight_15g', ROUND(COALESCE(SUM(gold_weight), 0) / 15.0),
        'total_revenue_lak', COALESCE(SUM(total_amount), 0),
        'avg_ticket_size_g', COALESCE(ROUND(AVG(gold_weight), 2), 0),
        'unique_customers', COUNT(DISTINCT phone)
    )
    INTO v_result
    FROM public.monthly_data
    WHERE status = 'ສໍາເລັດ'
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND (p_banks IS NULL OR bank = ANY(p_banks))
      AND (p_tx_types IS NULL OR transaction_type = ANY(p_tx_types))
      AND (p_branches IS NULL OR branch = ANY(p_branches))
      AND (p_min_weight IS NULL OR gold_weight >= p_min_weight)
      AND (p_max_weight IS NULL OR gold_weight <= p_max_weight);

    RETURN v_result;
END;
$$;

-- ============================================================================
-- 3. BRANCH & TOP CUSTOMER ANALYTICS RPC (Module 3)
-- Deep dive into branch distributions and VIP customers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_branch_and_customer_analytics(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_top_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_branches JSONB;
    v_top_customers JSONB;
BEGIN
    -- Branch breakdown
    SELECT json_agg(b) INTO v_branches
    FROM (
        SELECT 
            branch,
            COUNT(*) AS total_tx,
            COALESCE(SUM(gold_weight), 0) AS total_weight_g,
            COALESCE(SUM(total_amount), 0) AS total_amount_lak
        FROM public.monthly_data
        WHERE status = 'ສໍາເລັດ'
          AND created_at >= p_start_date
          AND created_at <= p_end_date
          AND branch <> '-'
        GROUP BY branch
        ORDER BY total_amount_lak DESC
        LIMIT p_top_limit
    ) b;

    -- Top customers
    SELECT json_agg(c) INTO v_top_customers
    FROM (
        SELECT 
            customer_name,
            phone,
            COUNT(*) AS tx_count,
            COALESCE(SUM(gold_weight), 0) AS total_weight_g,
            COALESCE(SUM(total_amount), 0) AS total_amount_lak
        FROM public.monthly_data
        WHERE status = 'ສໍາເລັດ'
          AND created_at >= p_start_date
          AND created_at <= p_end_date
        GROUP BY customer_name, phone
        ORDER BY total_amount_lak DESC
        LIMIT p_top_limit
    ) c;

    RETURN json_build_object(
        'branches', COALESCE(v_branches, '[]'::jsonb),
        'top_customers', COALESCE(v_top_customers, '[]'::jsonb)
    );
END;
$$;
