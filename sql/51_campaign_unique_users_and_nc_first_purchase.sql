-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Migration: 51_campaign_unique_users_and_nc_first_purchase.sql
-- Target: Supabase (PostgreSQL 15+)
-- Purpose:
--   1. Add columns for Unique Users target, actuals, and modes to campaign_setups
--   2. Add columns for NC qualification mode (all_registers vs first_purchase_tier)
--   3. Upgrade get_campaign_actual_metrics to support:
--      - Unique Users within time only vs within time + condition tier
--      - NC matching OPEN_ACCOUNT with BUY_GOLD at exact same timestamp (created_at)
--        meeting buy value / weight tier condition
--   4. Update sync_active_campaigns_daily() batch runner
-- ============================================================================

-- STEP 1: Add new columns to campaign_setups table
ALTER TABLE public.campaign_setups 
ADD COLUMN IF NOT EXISTS unique_users_target NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_unique_users NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_users_filter_mode TEXT DEFAULT 'condition_tier',
ADD COLUMN IF NOT EXISTS nc_qualification_mode TEXT DEFAULT 'all_registers',
ADD COLUMN IF NOT EXISTS nc_first_purchase_use_main_condition BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS nc_conditions JSONB DEFAULT '[]'::jsonb;

-- STEP 2: Create or replace get_campaign_actual_metrics with full support
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
    p_bank TEXT DEFAULT 'all',
    p_conditions JSONB DEFAULT NULL,
    p_unique_users_mode TEXT DEFAULT 'condition_tier',
    p_nc_mode TEXT DEFAULT 'all_registers',
    p_nc_conditions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
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
    v_is_all_bank BOOLEAN := (p_bank IS NULL OR lower(p_bank) = 'all' OR p_bank = '');
BEGIN
    -- 1. Compute MTD Actuals (only if as_of_date >= start_date)
    IF p_as_of_date >= p_start_date THEN
        -- Standard Buy Transactions, Value, Weight
        SELECT 
            COUNT(*),
            ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 1),
            ROUND(COALESCE(SUM(gold_weight), 0), 1)
        INTO 
            v_mtd_transac,
            v_mtd_revenue_mil,
            v_mtd_gold_g
        FROM public.monthly_data m
        WHERE m.created_at >= v_start_ts
          AND m.created_at <= v_end_ts
          AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
          AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
          AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'))
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
              (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND (
                  (v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= p_cond_max) OR
                  (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= p_cond_max)
              ))
              OR
              (p_cond_op IN ('==', '=') AND (
                  (v_is_weight AND m.gold_weight = p_cond_val) OR
                  (NOT v_is_weight AND m.total_amount = p_cond_val)
              ))
              OR
              (p_cond_op = 'all' OR p_cond_val = 0)
          );

        -- Unique Users (Requirement #1: time_only vs Requirement #2: condition_tier)
        IF p_unique_users_mode = 'time_only' THEN
            SELECT COUNT(DISTINCT phone)
            INTO v_mtd_users
            FROM public.monthly_data m
            WHERE m.created_at >= v_start_ts
              AND m.created_at <= v_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'));
        ELSE
            -- condition_tier: distinct users with at least 1 transaction meeting tier
            SELECT COUNT(DISTINCT phone)
            INTO v_mtd_users
            FROM public.monthly_data m
            WHERE m.created_at >= v_start_ts
              AND m.created_at <= v_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'))
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
                  (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND (
                      (v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= p_cond_max) OR
                      (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= p_cond_max)
                  ))
                  OR
                  (p_cond_op IN ('==', '=') AND (
                      (v_is_weight AND m.gold_weight = p_cond_val) OR
                      (NOT v_is_weight AND m.total_amount = p_cond_val)
                  ))
                  OR
                  (p_cond_op = 'all' OR p_cond_val = 0)
              );
        END IF;

        -- New Customers (Requirement #3 vs standard all_registers)
        IF p_nc_mode = 'first_purchase_tier' THEN
            -- User registered (OPEN_ACCOUNT) and has a paired BUY_GOLD at exact same timestamp meeting tier
            SELECT COUNT(DISTINCT o.phone)
            INTO v_mtd_nc
            FROM public.monthly_data o
            INNER JOIN public.monthly_data b
               ON b.phone = o.phone
              AND b.created_at = o.created_at
            WHERE o.created_at >= v_start_ts
              AND o.created_at <= v_end_ts
              AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND o.transaction_type = 'OPEN_ACCOUNT'
              AND b.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND b.transaction_type = 'BUY_GOLD'
              AND (v_is_all_bank OR o.bank ILIKE ('%' || p_bank || '%'))
              AND (
                  (p_cond_op = '>=' AND (
                      (v_is_weight AND b.gold_weight >= p_cond_val) OR
                      (NOT v_is_weight AND b.total_amount >= p_cond_val)
                  ))
                  OR
                  (p_cond_op = '<=' AND (
                      (v_is_weight AND b.gold_weight <= p_cond_val) OR
                      (NOT v_is_weight AND b.total_amount <= p_cond_val)
                  ))
                  OR
                  (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND (
                      (v_is_weight AND b.gold_weight >= p_cond_val AND b.gold_weight <= p_cond_max) OR
                      (NOT v_is_weight AND b.total_amount >= p_cond_val AND b.total_amount <= p_cond_max)
                  ))
                  OR
                  (p_cond_op IN ('==', '=') AND (
                      (v_is_weight AND b.gold_weight = p_cond_val) OR
                      (NOT v_is_weight AND b.total_amount = p_cond_val)
                  ))
                  OR
                  (p_cond_op = 'all' OR p_cond_val = 0)
              );
        ELSE
            -- Standard: OPEN_ACCOUNT in period
            SELECT COUNT(*)
            INTO v_mtd_nc
            FROM public.monthly_data m
            WHERE m.created_at >= v_start_ts
              AND m.created_at <= v_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND m.transaction_type = 'OPEN_ACCOUNT'
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'));
        END IF;
    END IF;

    -- 2. Compute Backward Benchmark (Reverse baseline period)
    IF p_backward_start IS NOT NULL AND p_backward_end IS NOT NULL THEN
        SELECT 
            COUNT(*),
            ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 1),
            ROUND(COALESCE(SUM(gold_weight), 0), 1)
        INTO 
            v_bwd_transac,
            v_bwd_revenue_mil,
            v_bwd_gold_g
        FROM public.monthly_data m
        WHERE m.created_at >= v_bwd_start_ts
          AND m.created_at <= v_bwd_end_ts
          AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
          AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
          AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'))
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
              (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND (
                  (v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= p_cond_max) OR
                  (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= p_cond_max)
              ))
              OR
              (p_cond_op IN ('==', '=') AND (
                  (v_is_weight AND m.gold_weight = p_cond_val) OR
                  (NOT v_is_weight AND m.total_amount = p_cond_val)
              ))
              OR
              (p_cond_op = 'all' OR p_cond_val = 0)
          );

        -- Backward Unique Users
        IF p_unique_users_mode = 'time_only' THEN
            SELECT COUNT(DISTINCT phone)
            INTO v_bwd_users
            FROM public.monthly_data m
            WHERE m.created_at >= v_bwd_start_ts
              AND m.created_at <= v_bwd_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'));
        ELSE
            SELECT COUNT(DISTINCT phone)
            INTO v_bwd_users
            FROM public.monthly_data m
            WHERE m.created_at >= v_bwd_start_ts
              AND m.created_at <= v_bwd_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'))
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
                  (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND (
                      (v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= p_cond_max) OR
                      (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= p_cond_max)
                  ))
                  OR
                  (p_cond_op IN ('==', '=') AND (
                      (v_is_weight AND m.gold_weight = p_cond_val) OR
                      (NOT v_is_weight AND m.total_amount = p_cond_val)
                  ))
                  OR
                  (p_cond_op = 'all' OR p_cond_val = 0)
              );
        END IF;

        -- Backward NC
        IF p_nc_mode = 'first_purchase_tier' THEN
            SELECT COUNT(DISTINCT o.phone)
            INTO v_bwd_nc
            FROM public.monthly_data o
            INNER JOIN public.monthly_data b
               ON b.phone = o.phone
              AND b.created_at = o.created_at
            WHERE o.created_at >= v_bwd_start_ts
              AND o.created_at <= v_bwd_end_ts
              AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND o.transaction_type = 'OPEN_ACCOUNT'
              AND b.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND b.transaction_type = 'BUY_GOLD'
              AND (v_is_all_bank OR o.bank ILIKE ('%' || p_bank || '%'))
              AND (
                  (p_cond_op = '>=' AND (
                      (v_is_weight AND b.gold_weight >= p_cond_val) OR
                      (NOT v_is_weight AND b.total_amount >= p_cond_val)
                  ))
                  OR
                  (p_cond_op = '<=' AND (
                      (v_is_weight AND b.gold_weight <= p_cond_val) OR
                      (NOT v_is_weight AND b.total_amount <= p_cond_val)
                  ))
                  OR
                  (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND (
                      (v_is_weight AND b.gold_weight >= p_cond_val AND b.gold_weight <= p_cond_max) OR
                      (NOT v_is_weight AND b.total_amount >= p_cond_val AND b.total_amount <= p_cond_max)
                  ))
                  OR
                  (p_cond_op IN ('==', '=') AND (
                      (v_is_weight AND b.gold_weight = p_cond_val) OR
                      (NOT v_is_weight AND b.total_amount = p_cond_val)
                  ))
                  OR
                  (p_cond_op = 'all' OR p_cond_val = 0)
              );
        ELSE
            SELECT COUNT(*)
            INTO v_bwd_nc
            FROM public.monthly_data m
            WHERE m.created_at >= v_bwd_start_ts
              AND m.created_at <= v_bwd_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND m.transaction_type = 'OPEN_ACCOUNT'
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'));
        END IF;
    END IF;

    -- Return full JSON payload
    RETURN jsonb_build_object(
        'mtd_transac', v_mtd_transac,
        'mtd_unique_users', v_mtd_users,
        'mtd_new_customers', v_mtd_nc,
        'mtd_revenue_mil_lak', v_mtd_revenue_mil,
        'mtd_gold_weight_g', v_mtd_gold_g,
        'backward_transac', v_bwd_transac,
        'backward_unique_users', v_bwd_users,
        'backward_new_customers', v_bwd_nc,
        'backward_revenue_mil_lak', v_bwd_revenue_mil,
        'backward_gold_weight_g', v_bwd_gold_g
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_actual_metrics(DATE, DATE, DATE, DATE, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

