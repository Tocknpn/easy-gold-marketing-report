-- ==============================================================================
-- 66_campaign_nc_registers_fix.sql
-- Run this whole file once in the Supabase SQL Editor.
--
-- What it fixes for campaigns with an NC (new customer) target:
--   1. NC in 'all_registers' mode = unique phones with a completed OPEN_ACCOUNT in the
--      window (was a raw row count).
--   2. NC buys = ALL completed BUY_GOLD in the window by those new customers (was the
--      first-buy row only). New output: mtd_nc_buy_trans.
--   3. '1st Purchase' mode keeps its rule (first-ever buy falls in the window and meets
--      the tier). Its cohort buys use the same "all buys in window" rule.
--   4. Recomputes campaigns with an NC target whose numbers are not locked.
--
-- Only the live function get_campaign_actual_metrics_live14 changes. The public
-- get_campaign_actual_metrics wrappers (sql/60, sql/62) keep calling it, so locked
-- backward numbers saved before the raw cutoff stay exactly as they are.
-- Deletes no raw data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NC for one window: count + what that cohort bought in the same window
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.campaign_nc_window_metrics(
    p_from_ts TEXT,
    p_to_ts TEXT,
    p_bank TEXT,
    p_nc_mode TEXT,
    p_nc_is_weight BOOLEAN,
    p_nc_op TEXT,
    p_nc_val NUMERIC,
    p_nc_max NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_is_all_bank BOOLEAN := (p_bank IS NULL OR lower(p_bank) = 'all' OR p_bank = '');
    v_result JSONB;
BEGIN
    IF p_nc_mode = 'first_purchase_tier' THEN
        -- Registered in the window AND first-ever completed buy is in the window AND meets the tier
        WITH registers AS (
            SELECT DISTINCT o.phone
            FROM public.monthly_data o
            WHERE o.transaction_type = 'OPEN_ACCOUNT'
              AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND o.created_at >= p_from_ts
              AND o.created_at <= p_to_ts
              AND o.phone IS NOT NULL
              AND (v_is_all_bank OR o.bank ILIKE ('%' || p_bank || '%'))
        ),
        cohort AS (
            SELECT r.phone
            FROM registers r
            CROSS JOIN LATERAL (
                SELECT b.created_at, b.gold_weight, b.total_amount
                FROM public.monthly_data b
                WHERE b.phone = r.phone
                  AND b.transaction_type = 'BUY_GOLD'
                  AND b.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
                  AND b.created_at <= p_to_ts
                  AND (v_is_all_bank OR b.bank ILIKE ('%' || p_bank || '%'))
                ORDER BY b.created_at ASC
                LIMIT 1
            ) fb
            WHERE fb.created_at >= p_from_ts
              AND (
                  (p_nc_op = '>=' AND ((p_nc_is_weight AND fb.gold_weight >= p_nc_val) OR (NOT p_nc_is_weight AND fb.total_amount >= p_nc_val)))
                  OR (p_nc_op = '<=' AND ((p_nc_is_weight AND fb.gold_weight <= p_nc_val) OR (NOT p_nc_is_weight AND fb.total_amount <= p_nc_val)))
                  OR (p_nc_op = 'between' AND p_nc_max IS NOT NULL AND ((p_nc_is_weight AND fb.gold_weight BETWEEN p_nc_val AND p_nc_max) OR (NOT p_nc_is_weight AND fb.total_amount BETWEEN p_nc_val AND p_nc_max)))
                  OR (p_nc_op IN ('==', '=') AND ((p_nc_is_weight AND fb.gold_weight = p_nc_val) OR (NOT p_nc_is_weight AND fb.total_amount = p_nc_val)))
                  OR (p_nc_op = 'all' OR p_nc_val = 0)
              )
        ),
        buys AS (
            SELECT COUNT(*) AS n,
                   ROUND(COALESCE(SUM(b.total_amount), 0) / 1000000.0, 1) AS value_mil,
                   ROUND(COALESCE(SUM(b.gold_weight), 0), 1) AS weight_g
            FROM public.monthly_data b
            JOIN cohort c ON c.phone = b.phone
            WHERE b.transaction_type = 'BUY_GOLD'
              AND b.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND b.created_at >= p_from_ts
              AND b.created_at <= p_to_ts
              AND (v_is_all_bank OR b.bank ILIKE ('%' || p_bank || '%'))
        )
        SELECT jsonb_build_object(
            'nc', (SELECT COUNT(*) FROM cohort),
            'buy_trans', buys.n, 'buy_value_mil', buys.value_mil, 'buy_weight_g', buys.weight_g)
        INTO v_result
        FROM buys;
    ELSE
        -- all_registers: unique phones with a completed registration in the window
        WITH cohort AS (
            SELECT DISTINCT o.phone
            FROM public.monthly_data o
            WHERE o.transaction_type = 'OPEN_ACCOUNT'
              AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND o.created_at >= p_from_ts
              AND o.created_at <= p_to_ts
              AND o.phone IS NOT NULL
              AND (v_is_all_bank OR o.bank ILIKE ('%' || p_bank || '%'))
        ),
        buys AS (
            SELECT COUNT(*) AS n,
                   ROUND(COALESCE(SUM(b.total_amount), 0) / 1000000.0, 1) AS value_mil,
                   ROUND(COALESCE(SUM(b.gold_weight), 0), 1) AS weight_g
            FROM public.monthly_data b
            JOIN cohort c ON c.phone = b.phone
            WHERE b.transaction_type = 'BUY_GOLD'
              AND b.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND b.created_at >= p_from_ts
              AND b.created_at <= p_to_ts
              AND (v_is_all_bank OR b.bank ILIKE ('%' || p_bank || '%'))
        )
        SELECT jsonb_build_object(
            'nc', (SELECT COUNT(*) FROM cohort),
            'buy_trans', buys.n, 'buy_value_mil', buys.value_mil, 'buy_weight_g', buys.weight_g)
        INTO v_result
        FROM buys;
    END IF;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Live campaign metrics (same signature as before, so the sql/60 + sql/62
--    wrappers keep working). Buy-transaction and unique-user parts are unchanged.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_campaign_actual_metrics_live14(
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
    v_mtd_revenue_mil NUMERIC := 0.0;
    v_mtd_gold_g NUMERIC := 0.0;
    v_mtd_nc JSONB := jsonb_build_object('nc', 0, 'buy_trans', 0, 'buy_value_mil', 0, 'buy_weight_g', 0);

    v_bwd_transac BIGINT := 0;
    v_bwd_users BIGINT := 0;
    v_bwd_revenue_mil NUMERIC := 0.0;
    v_bwd_gold_g NUMERIC := 0.0;
    v_bwd_nc JSONB := jsonb_build_object('nc', 0, 'buy_trans', 0, 'buy_value_mil', 0, 'buy_weight_g', 0);

    v_is_weight BOOLEAN := (p_cond_type ILIKE '%weight%');
    v_is_all_bank BOOLEAN := (p_bank IS NULL OR lower(p_bank) = 'all' OR p_bank = '');

    v_nc_is_weight BOOLEAN;
    v_nc_op TEXT;
    v_nc_val NUMERIC;
    v_nc_max NUMERIC;
BEGIN
    -- NC first-purchase tier: custom override when provided, else the main condition
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

    -- 1. MTD
    IF p_as_of_date >= p_start_date THEN
        SELECT
            COUNT(*),
            ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 1),
            ROUND(COALESCE(SUM(gold_weight), 0), 1)
        INTO v_mtd_transac, v_mtd_revenue_mil, v_mtd_gold_g
        FROM public.monthly_data m
        WHERE m.created_at >= v_start_ts
          AND m.created_at <= v_end_ts
          AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
          AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
          AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'))
          AND (
              (p_cond_op = '>=' AND ((v_is_weight AND m.gold_weight >= p_cond_val) OR (NOT v_is_weight AND m.total_amount >= p_cond_val)))
              OR (p_cond_op = '<=' AND ((v_is_weight AND m.gold_weight <= p_cond_val) OR (NOT v_is_weight AND m.total_amount <= p_cond_val)))
              OR (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND ((v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= p_cond_max) OR (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= p_cond_max)))
              OR (p_cond_op IN ('==', '=') AND ((v_is_weight AND m.gold_weight = p_cond_val) OR (NOT v_is_weight AND m.total_amount = p_cond_val)))
              OR (p_cond_op = 'all' OR p_cond_val = 0)
          );

        IF p_unique_users_mode = 'time_only' THEN
            SELECT COUNT(DISTINCT phone) INTO v_mtd_users
            FROM public.monthly_data m
            WHERE m.created_at >= v_start_ts
              AND m.created_at <= v_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'));
        ELSE
            SELECT COUNT(DISTINCT phone) INTO v_mtd_users
            FROM public.monthly_data m
            WHERE m.created_at >= v_start_ts
              AND m.created_at <= v_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'))
              AND (
                  (p_cond_op = '>=' AND ((v_is_weight AND m.gold_weight >= p_cond_val) OR (NOT v_is_weight AND m.total_amount >= p_cond_val)))
                  OR (p_cond_op = '<=' AND ((v_is_weight AND m.gold_weight <= p_cond_val) OR (NOT v_is_weight AND m.total_amount <= p_cond_val)))
                  OR (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND ((v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= p_cond_max) OR (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= p_cond_max)))
                  OR (p_cond_op IN ('==', '=') AND ((v_is_weight AND m.gold_weight = p_cond_val) OR (NOT v_is_weight AND m.total_amount = p_cond_val)))
                  OR (p_cond_op = 'all' OR p_cond_val = 0)
              );
        END IF;

        v_mtd_nc := public.campaign_nc_window_metrics(
            v_start_ts, v_end_ts, p_bank, p_nc_mode, v_nc_is_weight, v_nc_op, v_nc_val, v_nc_max);
    END IF;

    -- 2. Backward benchmark (equal window just before the start)
    IF p_backward_start IS NOT NULL AND p_backward_end IS NOT NULL THEN
        SELECT
            COUNT(*),
            ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 1),
            ROUND(COALESCE(SUM(gold_weight), 0), 1)
        INTO v_bwd_transac, v_bwd_revenue_mil, v_bwd_gold_g
        FROM public.monthly_data m
        WHERE m.created_at >= v_bwd_start_ts
          AND m.created_at <= v_bwd_end_ts
          AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
          AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
          AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'))
          AND (
              (p_cond_op = '>=' AND ((v_is_weight AND m.gold_weight >= p_cond_val) OR (NOT v_is_weight AND m.total_amount >= p_cond_val)))
              OR (p_cond_op = '<=' AND ((v_is_weight AND m.gold_weight <= p_cond_val) OR (NOT v_is_weight AND m.total_amount <= p_cond_val)))
              OR (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND ((v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= p_cond_max) OR (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= p_cond_max)))
              OR (p_cond_op IN ('==', '=') AND ((v_is_weight AND m.gold_weight = p_cond_val) OR (NOT v_is_weight AND m.total_amount = p_cond_val)))
              OR (p_cond_op = 'all' OR p_cond_val = 0)
          );

        IF p_unique_users_mode = 'time_only' THEN
            SELECT COUNT(DISTINCT phone) INTO v_bwd_users
            FROM public.monthly_data m
            WHERE m.created_at >= v_bwd_start_ts
              AND m.created_at <= v_bwd_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'));
        ELSE
            SELECT COUNT(DISTINCT phone) INTO v_bwd_users
            FROM public.monthly_data m
            WHERE m.created_at >= v_bwd_start_ts
              AND m.created_at <= v_bwd_end_ts
              AND m.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
              AND (lower(p_tx_type) = 'all' OR m.transaction_type = p_tx_type)
              AND (v_is_all_bank OR m.bank ILIKE ('%' || p_bank || '%'))
              AND (
                  (p_cond_op = '>=' AND ((v_is_weight AND m.gold_weight >= p_cond_val) OR (NOT v_is_weight AND m.total_amount >= p_cond_val)))
                  OR (p_cond_op = '<=' AND ((v_is_weight AND m.gold_weight <= p_cond_val) OR (NOT v_is_weight AND m.total_amount <= p_cond_val)))
                  OR (p_cond_op = 'between' AND p_cond_max IS NOT NULL AND ((v_is_weight AND m.gold_weight >= p_cond_val AND m.gold_weight <= p_cond_max) OR (NOT v_is_weight AND m.total_amount >= p_cond_val AND m.total_amount <= p_cond_max)))
                  OR (p_cond_op IN ('==', '=') AND ((v_is_weight AND m.gold_weight = p_cond_val) OR (NOT v_is_weight AND m.total_amount = p_cond_val)))
                  OR (p_cond_op = 'all' OR p_cond_val = 0)
              );
        END IF;

        v_bwd_nc := public.campaign_nc_window_metrics(
            v_bwd_start_ts, v_bwd_end_ts, p_bank, p_nc_mode, v_nc_is_weight, v_nc_op, v_nc_val, v_nc_max);
    END IF;

    -- Same keys as before (the snapshot wrappers depend on the backward_* names),
    -- plus mtd_nc_buy_trans.
    RETURN jsonb_build_object(
        'mtd_transac', v_mtd_transac,
        'mtd_unique_users', v_mtd_users,
        'mtd_new_customers', (v_mtd_nc->>'nc')::bigint,
        'mtd_revenue_mil_lak', v_mtd_revenue_mil,
        'mtd_gold_weight_g', v_mtd_gold_g,
        'mtd_nc_buy_trans', (v_mtd_nc->>'buy_trans')::bigint,
        'mtd_nc_buy_value_mil_lak', (v_mtd_nc->>'buy_value_mil')::numeric,
        'mtd_nc_buy_weight_g', (v_mtd_nc->>'buy_weight_g')::numeric,
        'backward_transac', v_bwd_transac,
        'backward_unique_users', v_bwd_users,
        'backward_new_customers', (v_bwd_nc->>'nc')::bigint,
        'backward_revenue_mil_lak', v_bwd_revenue_mil,
        'backward_gold_weight_g', v_bwd_gold_g,
        'backward_nc_buy_value_mil_lak', (v_bwd_nc->>'buy_value_mil')::numeric,
        'backward_nc_buy_weight_g', (v_bwd_nc->>'buy_weight_g')::numeric
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Nightly sync: same as sql/55, plus nc_mtd_buy_trans in result_json.
--    Keeps the 170s timeout set by sql/62.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_active_campaigns_daily(p_target_campaign_id TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '170s'
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
            COALESCE(r.tx_type, 'BUY_GOLD'),
            COALESCE(r.bank, 'all'),
            r.conditions,
            COALESCE(r.unique_users_filter_mode, 'condition_tier'),
            COALESCE(r.nc_qualification_mode, 'all_registers'),
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
                    'nc_mtd_buy_trans', COALESCE((v_metrics->>'mtd_nc_buy_trans')::bigint, 0),
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

-- ------------------------------------------------------------------------------
-- 4. Recompute campaigns with an NC target that are not locked.
--    Campaigns whose period or backward window starts before the raw cutoff keep
--    their locked numbers (the sql/60 trigger would keep them anyway).
-- ------------------------------------------------------------------------------
UPDATE public.campaign_setups c
SET is_frozen = false, result_json = NULL
FROM public.raw_retention_settings s
WHERE s.id = 1
  AND COALESCE(c.target_types, '[]'::jsonb) ? 'nc'
  AND c.campaign_start_date >= s.cutoff_date
  AND COALESCE(c.backward_start_date, c.campaign_start_date) >= s.cutoff_date;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.id
        FROM public.campaign_setups c, public.raw_retention_settings s
        WHERE s.id = 1
          AND COALESCE(c.target_types, '[]'::jsonb) ? 'nc'
          AND c.result_json IS NULL
    LOOP
        PERFORM public.sync_active_campaigns_daily(r.id);
    END LOOP;
END $$;

-- Check: NC target campaigns and their new numbers
SELECT campaign_name, campaign_start_date, campaign_end_date, nc_target,
       result_json->>'nc_actual_mtd' AS nc_actual,
       result_json->>'backward_nc' AS nc_backward,
       result_json->>'nc_mtd_buy_trans' AS nc_buy_trans,
       result_json->>'nc_mtd_buy_value_mil_lak' AS nc_buy_value_mil
FROM public.campaign_setups
WHERE COALESCE(target_types, '[]'::jsonb) ? 'nc'
ORDER BY campaign_start_date;
