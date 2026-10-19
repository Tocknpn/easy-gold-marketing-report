-- ==============================================================================
-- 37. Fix Campaign Tracking: Pure Date-Filtered NC (OPEN_ACCOUNT) & Dual Lao Status
-- ==============================================================================
-- Note: NC (New Customers) is unaffected by bank or transaction amount conditions.
--       NC is strictly filtered by transaction_type = 'OPEN_ACCOUNT' and datetime window.

CREATE OR REPLACE FUNCTION public.get_campaign_actual_metrics(
    p_start_date DATE,
    p_as_of_date DATE,
    p_backward_start DATE,
    p_backward_end DATE,
    p_cond_type TEXT DEFAULT 'amount_gte',
    p_cond_op TEXT DEFAULT '>=',
    p_cond_val NUMERIC DEFAULT 100000,
    p_cond_max NUMERIC DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'BUY_GOLD',
    p_bank TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '20s'
AS $$
DECLARE
    v_start_ts TEXT := (p_start_date::text || ' 00:00:00');
    v_end_ts TEXT := (p_as_of_date::text || ' 23:59:59');
    v_bwd_start_ts TEXT := (p_backward_start::text || ' 00:00:00');
    v_bwd_end_ts TEXT := (p_backward_end::text || ' 23:59:59');

    v_mtd_transac BIGINT := 0;
    v_mtd_users BIGINT := 0;
    v_mtd_nc BIGINT := 0;
    v_mtd_revenue_mil NUMERIC := 0.0;
    v_mtd_gold_g NUMERIC := 0.0;

    v_bwd_transac BIGINT := 0;
    v_bwd_users BIGINT := 0;
    v_bwd_nc BIGINT := 0;
    v_bwd_revenue_mil NUMERIC := 0.0;
    v_bwd_gold_g NUMERIC := 0.0;

    v_is_weight BOOLEAN := (p_cond_type ILIKE '%weight%');
BEGIN
    -- 1. Compute MTD Actuals (only if as_of_date >= start_date)
    IF p_as_of_date >= p_start_date THEN
        -- Buy Transactions, Weight, Value, Unique Customers (filtered by bank & conditions)
        SELECT 
            COUNT(*),
            COUNT(DISTINCT phone),
            ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 1),
            ROUND(COALESCE(SUM(gold_weight), 0), 1)
        INTO 
            v_mtd_transac,
            v_mtd_users,
            v_mtd_revenue_mil,
            v_mtd_gold_g
        FROM public.monthly_data m
        WHERE m.created_at >= v_start_ts
          AND m.created_at <= v_end_ts
          AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
          AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
          AND (
              p_bank IS NULL 
              OR lower(p_bank) = 'all' 
              OR p_bank = ''
              OR lower(m.bank) = lower(p_bank) 
              OR m.bank ILIKE ('%' || p_bank || '%')
          )
          AND (
              (p_cond_op = '>=' AND (
                  (v_is_weight AND m.gold_weight >= p_cond_val) OR
                  (NOT v_is_weight AND m.total_amount >= p_cond_val)
              ))
              OR
              (p_cond_op = '<=' AND (
                  (v_is_weight AND m.gold_weight <= p_cond_val) OR
                  (NOT v_is_weight AND m.total_amount <= p_cond_val)
              ))
              OR
              (p_cond_op = 'between' AND (
                  (v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= COALESCE(p_cond_max, 999999)) OR
                  (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= COALESCE(p_cond_max, 999999999999))
              ))
              OR
              (p_cond_op IN ('==', '=') AND (
                  (v_is_weight AND m.gold_weight = p_cond_val) OR
                  (NOT v_is_weight AND m.total_amount = p_cond_val)
              ))
              OR
              (p_cond_op = 'all')
          );

        -- Exact New Customers: STRICTLY date filtered only (no bank, no amount conditions)
        SELECT COUNT(*)
        INTO v_mtd_nc
        FROM public.monthly_data m
        WHERE m.created_at >= v_start_ts
          AND m.created_at <= v_end_ts
          AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
          AND m.transaction_type = 'OPEN_ACCOUNT';
    END IF;

    -- 2. Compute Backward Benchmark Actuals
    IF p_backward_start IS NOT NULL AND p_backward_end IS NOT NULL THEN
        SELECT 
            COUNT(*),
            COUNT(DISTINCT phone),
            ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 1),
            ROUND(COALESCE(SUM(gold_weight), 0), 1)
        INTO 
            v_bwd_transac,
            v_bwd_users,
            v_bwd_revenue_mil,
            v_bwd_gold_g
        FROM public.monthly_data m
        WHERE m.created_at >= v_bwd_start_ts
          AND m.created_at <= v_bwd_end_ts
          AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
          AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
          AND (
              p_bank IS NULL 
              OR lower(p_bank) = 'all' 
              OR p_bank = ''
              OR lower(m.bank) = lower(p_bank) 
              OR m.bank ILIKE ('%' || p_bank || '%')
          )
          AND (
              (p_cond_op = '>=' AND (
                  (v_is_weight AND m.gold_weight >= p_cond_val) OR
                  (NOT v_is_weight AND m.total_amount >= p_cond_val)
              ))
              OR
              (p_cond_op = '<=' AND (
                  (v_is_weight AND m.gold_weight <= p_cond_val) OR
                  (NOT v_is_weight AND m.total_amount <= p_cond_val)
              ))
              OR
              (p_cond_op = 'between' AND (
                  (v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= COALESCE(p_cond_max, 999999)) OR
                  (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= COALESCE(p_cond_max, 999999999999))
              ))
              OR
              (p_cond_op IN ('==', '=') AND (
                  (v_is_weight AND m.gold_weight = p_cond_val) OR
                  (NOT v_is_weight AND m.total_amount = p_cond_val)
              ))
              OR
              (p_cond_op = 'all')
          );

        -- Exact New Customers for backward window: STRICTLY date filtered only
        SELECT COUNT(*)
        INTO v_bwd_nc
        FROM public.monthly_data m
        WHERE m.created_at >= v_bwd_start_ts
          AND m.created_at <= v_bwd_end_ts
          AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
          AND m.transaction_type = 'OPEN_ACCOUNT';
    END IF;

    RETURN jsonb_build_object(
        'mtd_transac', v_mtd_transac,
        'mtd_new_customers', v_mtd_nc,
        'mtd_unique_customers', v_mtd_users,
        'mtd_revenue_mil_lak', v_mtd_revenue_mil,
        'mtd_gold_weight_g', v_mtd_gold_g,
        'backward_transac', v_bwd_transac,
        'backward_new_customers', v_bwd_nc,
        'backward_unique_customers', v_bwd_users,
        'backward_revenue_mil_lak', v_bwd_revenue_mil,
        'backward_gold_weight_g', v_bwd_gold_g
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_actual_metrics(DATE, DATE, DATE, DATE, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) 
TO anon, authenticated, service_role;
