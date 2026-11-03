-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Migration: 55_nc_first_purchase_broad_window.sql
-- Target: Supabase (PostgreSQL 15+)
-- Purpose:
--   1. Redefine NC "first purchase" from the old narrow same-instant join
--      (BUY_GOLD at the exact same created_at as OPEN_ACCOUNT) to the
--      customer's true chronologically-first-ever BUY_GOLD, bounded to the
--      campaign's own window (both registration and first purchase must
--      fall within [start, as-of/backward-end]), bank-filtered on the buy
--      side.
--   2. Fix get_campaign_actual_metrics: p_nc_conditions was declared but
--      never used, so a custom NC first-purchase threshold silently fell
--      back to the main Section-3 condition. Now actually gates NC
--      qualification when nc_qualification_mode = 'first_purchase_tier'.
--   3. Add NC-scoped buy value/weight aggregates (from NC's first purchase
--      only) to both the MTD and backward-benchmark payload, for the
--      campaign card's NC-only display mode.
--   4. Thread the 4 new fields through sync_active_campaigns_daily() into
--      result_json and two new dedicated columns on campaign_setups.
-- ============================================================================

-- STEP 1: New columns + supporting index
ALTER TABLE public.campaign_setups
ADD COLUMN IF NOT EXISTS nc_actual_buy_value_mil_lak NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS nc_actual_buy_weight_g NUMERIC DEFAULT 0;

-- "First-ever purchase" now scans phone history unbounded on the lower side;
-- this partial index keeps that DISTINCT ON scan cheap.
CREATE INDEX IF NOT EXISTS idx_monthly_data_buygold_phone_created
ON public.monthly_data (phone, created_at)
WHERE transaction_type = 'BUY_GOLD';

-- STEP 2: Replace get_campaign_actual_metrics (same signature as sql/51)
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
    v_mtd_nc_buy_value_mil NUMERIC := 0.0;
    v_mtd_nc_buy_weight_g NUMERIC := 0.0;

    v_bwd_transac BIGINT := 0;
    v_bwd_users BIGINT := 0;
    v_bwd_nc BIGINT := 0;
    v_bwd_revenue_mil NUMERIC := 0.0;
    v_bwd_gold_g NUMERIC := 0.0;
    v_bwd_nc_buy_value_mil NUMERIC := 0.0;
    v_bwd_nc_buy_weight_g NUMERIC := 0.0;

    v_is_weight BOOLEAN := (p_cond_type ILIKE '%weight%');
    v_is_all_bank BOOLEAN := (p_bank IS NULL OR lower(p_bank) = 'all' OR p_bank = '');

    -- Effective NC qualification rule: custom override when provided, else
    -- falls back to the main Section-3 condition (this fallback used to live
    -- client-side and silently dropped the override; now centralized here).
    v_nc_is_weight BOOLEAN;
    v_nc_op TEXT;
    v_nc_val NUMERIC;
    v_nc_max NUMERIC;
BEGIN
    IF p_nc_conditions IS NOT NULL AND jsonb_array_length(p_nc_conditions) > 0 THEN
        v_nc_is_weight := (p_nc_conditions->0->>'metric') = 'weight';
        v_nc_op  := COALESCE(p_nc_conditions->0->>'operator', '>=');
        v_nc_val := COALESCE((p_nc_conditions->0->>'value')::numeric, 0);
        v_nc_max := NULLIF(p_nc_conditions->0->>'max_value', '')::numeric;
    ELSE
        v_nc_is_weight := v_is_weight;
        v_nc_op  := p_cond_op;
        v_nc_val := p_cond_val;
        v_nc_max := p_cond_max;
    END IF;

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

        -- New Customers: broad "first-ever purchase" definition, bounded to the
        -- campaign window, bank-filtered on the buy side. all_registers mode
        -- keeps the original raw OPEN_ACCOUNT row count; first_purchase_tier
        -- mode gates on whether that customer's in-window first purchase meets
        -- the resolved NC condition. Value/weight sums are scoped to that same
        -- qualifying first-purchase row in both modes (0 contribution for a
        -- registered customer who hasn't purchased yet).
        WITH first_buy AS (
            SELECT DISTINCT ON (b.phone)
                b.phone, b.created_at AS first_buy_at, b.gold_weight, b.total_amount
            FROM public.monthly_data b
            WHERE b.transaction_type = 'BUY_GOLD'
              AND b.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND b.created_at <= v_end_ts
              AND (v_is_all_bank OR b.bank ILIKE ('%' || p_bank || '%'))
            ORDER BY b.phone, b.created_at ASC
        ),
        nc_registers AS (
            SELECT o.phone
            FROM public.monthly_data o
            WHERE o.transaction_type = 'OPEN_ACCOUNT'
              AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND o.created_at >= v_start_ts
              AND o.created_at <= v_end_ts
              AND (v_is_all_bank OR o.bank ILIKE ('%' || p_bank || '%'))
        ),
        nc_joined AS (
            SELECT
                r.phone,
                fb.gold_weight,
                fb.total_amount,
                (fb.first_buy_at IS NOT NULL AND fb.first_buy_at >= v_start_ts AND fb.first_buy_at <= v_end_ts) AS has_in_window_first_buy,
                (
                    fb.first_buy_at IS NOT NULL AND fb.first_buy_at >= v_start_ts AND fb.first_buy_at <= v_end_ts
                    AND (
                        (v_nc_op = '>=' AND ((v_nc_is_weight AND fb.gold_weight >= v_nc_val) OR (NOT v_nc_is_weight AND fb.total_amount >= v_nc_val)))
                        OR (v_nc_op = '<=' AND ((v_nc_is_weight AND fb.gold_weight <= v_nc_val) OR (NOT v_nc_is_weight AND fb.total_amount <= v_nc_val)))
                        OR (v_nc_op = 'between' AND v_nc_max IS NOT NULL AND ((v_nc_is_weight AND fb.gold_weight BETWEEN v_nc_val AND v_nc_max) OR (NOT v_nc_is_weight AND fb.total_amount BETWEEN v_nc_val AND v_nc_max)))
                        OR (v_nc_op IN ('==', '=') AND ((v_nc_is_weight AND fb.gold_weight = v_nc_val) OR (NOT v_nc_is_weight AND fb.total_amount = v_nc_val)))
                        OR (v_nc_op = 'all' OR v_nc_val = 0)
                    )
                ) AS meets_nc_condition
            FROM nc_registers r
            LEFT JOIN first_buy fb ON fb.phone = r.phone
        )
        SELECT
            CASE WHEN p_nc_mode = 'first_purchase_tier'
                 THEN COUNT(DISTINCT phone) FILTER (WHERE meets_nc_condition)
                 ELSE COUNT(*)
            END,
            ROUND(COALESCE(SUM(total_amount) FILTER (
                WHERE CASE WHEN p_nc_mode = 'first_purchase_tier' THEN meets_nc_condition ELSE has_in_window_first_buy END
            ), 0) / 1000000.0, 1),
            ROUND(COALESCE(SUM(gold_weight) FILTER (
                WHERE CASE WHEN p_nc_mode = 'first_purchase_tier' THEN meets_nc_condition ELSE has_in_window_first_buy END
            ), 0), 1)
        INTO v_mtd_nc, v_mtd_nc_buy_value_mil, v_mtd_nc_buy_weight_g
        FROM nc_joined;
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

        -- Backward NC: same broad first-purchase definition, bounded to the
        -- backward window.
        WITH first_buy AS (
            SELECT DISTINCT ON (b.phone)
                b.phone, b.created_at AS first_buy_at, b.gold_weight, b.total_amount
            FROM public.monthly_data b
            WHERE b.transaction_type = 'BUY_GOLD'
              AND b.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND b.created_at <= v_bwd_end_ts
              AND (v_is_all_bank OR b.bank ILIKE ('%' || p_bank || '%'))
            ORDER BY b.phone, b.created_at ASC
        ),
        nc_registers AS (
            SELECT o.phone
            FROM public.monthly_data o
            WHERE o.transaction_type = 'OPEN_ACCOUNT'
              AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND o.created_at >= v_bwd_start_ts
              AND o.created_at <= v_bwd_end_ts
              AND (v_is_all_bank OR o.bank ILIKE ('%' || p_bank || '%'))
        ),
        nc_joined AS (
            SELECT
                r.phone,
                fb.gold_weight,
                fb.total_amount,
                (fb.first_buy_at IS NOT NULL AND fb.first_buy_at >= v_bwd_start_ts AND fb.first_buy_at <= v_bwd_end_ts) AS has_in_window_first_buy,
                (
                    fb.first_buy_at IS NOT NULL AND fb.first_buy_at >= v_bwd_start_ts AND fb.first_buy_at <= v_bwd_end_ts
                    AND (
                        (v_nc_op = '>=' AND ((v_nc_is_weight AND fb.gold_weight >= v_nc_val) OR (NOT v_nc_is_weight AND fb.total_amount >= v_nc_val)))
                        OR (v_nc_op = '<=' AND ((v_nc_is_weight AND fb.gold_weight <= v_nc_val) OR (NOT v_nc_is_weight AND fb.total_amount <= v_nc_val)))
                        OR (v_nc_op = 'between' AND v_nc_max IS NOT NULL AND ((v_nc_is_weight AND fb.gold_weight BETWEEN v_nc_val AND v_nc_max) OR (NOT v_nc_is_weight AND fb.total_amount BETWEEN v_nc_val AND v_nc_max)))
                        OR (v_nc_op IN ('==', '=') AND ((v_nc_is_weight AND fb.gold_weight = v_nc_val) OR (NOT v_nc_is_weight AND fb.total_amount = v_nc_val)))
                        OR (v_nc_op = 'all' OR v_nc_val = 0)
                    )
                ) AS meets_nc_condition
            FROM nc_registers r
            LEFT JOIN first_buy fb ON fb.phone = r.phone
        )
        SELECT
            CASE WHEN p_nc_mode = 'first_purchase_tier'
                 THEN COUNT(DISTINCT phone) FILTER (WHERE meets_nc_condition)
                 ELSE COUNT(*)
            END,
            ROUND(COALESCE(SUM(total_amount) FILTER (
                WHERE CASE WHEN p_nc_mode = 'first_purchase_tier' THEN meets_nc_condition ELSE has_in_window_first_buy END
            ), 0) / 1000000.0, 1),
            ROUND(COALESCE(SUM(gold_weight) FILTER (
                WHERE CASE WHEN p_nc_mode = 'first_purchase_tier' THEN meets_nc_condition ELSE has_in_window_first_buy END
            ), 0), 1)
        INTO v_bwd_nc, v_bwd_nc_buy_value_mil, v_bwd_nc_buy_weight_g
        FROM nc_joined;
    END IF;

    -- Return full JSON payload
    RETURN jsonb_build_object(
        'mtd_transac', v_mtd_transac,
        'mtd_unique_users', v_mtd_users,
        'mtd_new_customers', v_mtd_nc,
        'mtd_revenue_mil_lak', v_mtd_revenue_mil,
        'mtd_gold_weight_g', v_mtd_gold_g,
        'mtd_nc_buy_value_mil_lak', v_mtd_nc_buy_value_mil,
        'mtd_nc_buy_weight_g', v_mtd_nc_buy_weight_g,
        'backward_transac', v_bwd_transac,
        'backward_unique_users', v_bwd_users,
        'backward_new_customers', v_bwd_nc,
        'backward_revenue_mil_lak', v_bwd_revenue_mil,
        'backward_gold_weight_g', v_bwd_gold_g,
        'backward_nc_buy_value_mil_lak', v_bwd_nc_buy_value_mil,
        'backward_nc_buy_weight_g', v_bwd_nc_buy_weight_g
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_actual_metrics(DATE, DATE, DATE, DATE, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

-- STEP 3: Replace sync_active_campaigns_daily to resolve the NC override the
-- same way the callee now does, and persist the 4 new NC-scoped fields.
CREATE OR REPLACE FUNCTION public.sync_active_campaigns_daily(p_target_campaign_id TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
    r RECORD;
    v_as_of DATE;
    v_count INT := 0;
    v_skipped INT := 0;
    v_updated INT := 0;
    v_metrics JSONB;
    v_bwd_start DATE;
    v_bwd_end DATE;
    v_total_days INT;
    v_elapsed_days INT;
    v_is_ended BOOLEAN;
    v_effective_cutoff DATE;
    v_rule_type TEXT;
    v_rule_op TEXT;
    v_rule_val NUMERIC;
    v_rule_max NUMERIC;
    v_tx_type TEXT;
    v_bank TEXT;
    v_uu_mode TEXT;
    v_nc_mode TEXT;
    v_conditions JSONB;
    v_nc_conditions JSONB;
BEGIN
    SELECT COALESCE(MAX(created_at::date), CURRENT_DATE)
    INTO v_as_of
    FROM public.monthly_data;

    FOR r IN
        SELECT * FROM public.campaign_setups
        WHERE (p_target_campaign_id IS NULL OR id = p_target_campaign_id)
    LOOP
        v_count := v_count + 1;
        v_is_ended := (v_as_of >= r.campaign_end_date);

        -- If campaign has already ended and is frozen, skip recalculation
        IF v_is_ended AND r.is_frozen = true AND r.result_json IS NOT NULL AND p_target_campaign_id IS NULL THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        v_total_days := GREATEST(1, (r.campaign_end_date - r.campaign_start_date) + 1);
        v_effective_cutoff := LEAST(r.campaign_end_date, v_as_of);
        v_elapsed_days := CASE
            WHEN v_as_of < r.campaign_start_date THEN 0
            WHEN v_is_ended THEN v_total_days
            ELSE GREATEST(1, LEAST(v_total_days, (v_effective_cutoff - r.campaign_start_date) + 1))
        END;

        v_bwd_end := r.campaign_start_date - 1;
        v_bwd_start := v_bwd_end - GREATEST(0, (CASE WHEN v_elapsed_days > 0 THEN v_elapsed_days ELSE v_total_days END) - 1);

        v_rule_type := CASE WHEN (r.condition_type ILIKE '%weight%' OR r.condition_label ILIKE '%g%') THEN 'weight_gte' ELSE 'amount_gte' END;
        v_rule_op := COALESCE(r.condition_operator, '>=');
        v_rule_val := COALESCE(r.condition_value, 0);
        v_rule_max := r.condition_max_value;
        v_tx_type := COALESCE(r.tx_type, 'BUY_GOLD');
        v_bank := COALESCE(r.bank, 'all');
        v_uu_mode := COALESCE(r.unique_users_filter_mode, 'condition_tier');
        v_nc_mode := COALESCE(r.nc_qualification_mode, 'all_registers');
        v_conditions := r.conditions;

        -- Only pass a custom NC override through when it's actually configured
        -- to be used; otherwise NULL so the callee falls back to the main condition.
        v_nc_conditions := CASE
            WHEN r.nc_qualification_mode = 'first_purchase_tier'
             AND r.nc_first_purchase_use_main_condition = false
             AND jsonb_array_length(COALESCE(r.nc_conditions, '[]'::jsonb)) > 0
            THEN r.nc_conditions
            ELSE NULL
        END;

        SELECT public.get_campaign_actual_metrics(
            r.campaign_start_date,
            v_effective_cutoff,
            v_bwd_start,
            v_bwd_end,
            v_rule_type,
            v_rule_op,
            v_rule_val,
            v_rule_max,
            v_tx_type,
            v_bank,
            v_conditions,
            v_uu_mode,
            v_nc_mode,
            v_nc_conditions
        ) INTO v_metrics;

        IF v_metrics IS NOT NULL AND (v_metrics->>'mtd_transac') IS NOT NULL THEN
            UPDATE public.campaign_setups
            SET
                result_json = jsonb_build_object(
                    'ec_actual_mtd', (v_metrics->>'mtd_transac')::bigint,
                    'unique_users_actual_mtd', (v_metrics->>'mtd_unique_users')::bigint,
                    'mtd_unique_users', (v_metrics->>'mtd_unique_users')::bigint,
                    'nc_actual_mtd', (v_metrics->>'mtd_new_customers')::bigint,
                    'mtd_buy_weight_g', (v_metrics->>'mtd_gold_weight_g')::numeric,
                    'mtd_buy_value_mil_lak', (v_metrics->>'mtd_revenue_mil_lak')::numeric,
                    'nc_mtd_buy_value_mil_lak', (v_metrics->>'mtd_nc_buy_value_mil_lak')::numeric,
                    'nc_mtd_buy_weight_g', (v_metrics->>'mtd_nc_buy_weight_g')::numeric,
                    'backward_trans', (v_metrics->>'backward_transac')::bigint,
                    'backward_unique_users', (v_metrics->>'backward_unique_users')::bigint,
                    'backward_users', (v_metrics->>'backward_unique_users')::bigint,
                    'backward_val_mil', (v_metrics->>'backward_revenue_mil_lak')::numeric,
                    'backward_weight_g', (v_metrics->>'backward_gold_weight_g')::numeric,
                    'nc_backward_buy_value_mil_lak', (v_metrics->>'backward_nc_buy_value_mil_lak')::numeric,
                    'nc_backward_buy_weight_g', (v_metrics->>'backward_nc_buy_weight_g')::numeric,
                    'backward_ticket', CASE
                        WHEN (v_metrics->>'backward_transac')::bigint > 0
                        THEN ROUND(((v_metrics->>'backward_gold_weight_g')::numeric / (v_metrics->>'backward_transac')::numeric), 1)
                        ELSE 2.8
                    END,
                    'backward_nc', (v_metrics->>'backward_new_customers')::bigint,
                    'max_db_date', v_as_of::text,
                    'is_frozen', v_is_ended,
                    'calculated_at', NOW()::text
                ),
                actual_ec = (v_metrics->>'mtd_transac')::numeric,
                actual_unique_users = (v_metrics->>'mtd_unique_users')::numeric,
                actual_nc = (v_metrics->>'mtd_new_customers')::numeric,
                actual_gold_weight_g = (v_metrics->>'mtd_gold_weight_g')::numeric,
                actual_revenue_mil = (v_metrics->>'mtd_revenue_mil_lak')::numeric,
                nc_actual_buy_value_mil_lak = (v_metrics->>'mtd_nc_buy_value_mil_lak')::numeric,
                nc_actual_buy_weight_g = (v_metrics->>'mtd_nc_buy_weight_g')::numeric,
                as_of_date = v_as_of,
                backward_start_date = v_bwd_start,
                backward_end_date = v_bwd_end,
                is_frozen = v_is_ended,
                updated_at = NOW()
            WHERE id = r.id;

            v_updated := v_updated + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'as_of_date', v_as_of,
        'total_scanned', v_count,
        'updated_active', v_updated,
        'skipped_frozen', v_skipped,
        'synced_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_active_campaigns_daily(TEXT) TO anon, authenticated, service_role;
