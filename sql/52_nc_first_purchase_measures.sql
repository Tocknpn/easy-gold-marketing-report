-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Script: 52_nc_first_purchase_measures.sql
-- Purpose:
--   Add two new Custom Pivot measures: 'nc_first_purchase_g' and 'nc_first_purchase_lak'.
--   Definition: a BUY_GOLD transaction counts only when the same phone has a completed
--   OPEN_ACCOUNT transaction at the exact same created_at timestamp (the customer's very
--   first purchase, made at account opening). Mirrors the NC pairing logic already used in
--   51_campaign_unique_users_and_nc_first_purchase.sql (o.phone = b.phone AND o.created_at = b.created_at,
--   o.transaction_type = 'OPEN_ACCOUNT'), expressed here as a correlated EXISTS against the raw
--   monthly_data table so the pairing is independent of whatever row filters the pivot applies.
--   This CREATE OR REPLACE carries forward the full pp_measure_sql body from
--   49_custom_pivot_topn_datetime_validation.sql unchanged except for the two new CASE branches.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pp_measure_sql(p_id TEXT, p_customs JSONB DEFAULT '{}'::jsonb, p_depth INT DEFAULT 0)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    f_buy  TEXT := $f$FILTER (WHERE b.transaction_type = 'BUY_GOLD')$f$;
    f_sell TEXT := $f$FILTER (WHERE b.transaction_type = 'SALE_GOLD')$f$;
    f_wd   TEXT := $f$FILTER (WHERE b.transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR b.transaction_type ILIKE '%WITHDRAW%')$f$;
    f_open TEXT := $f$FILTER (WHERE b.transaction_type = 'OPEN_ACCOUNT' OR b.transaction_type ILIKE '%REGISTER%')$f$;
    u_all  TEXT := $f$COUNT(DISTINCT NULLIF(trim(b.phone), ''))$f$;
    c      JSONB := p_customs -> p_id;
    v_expr TEXT;
    v_fld  TEXT;
    v_conds TEXT;
    v_filter TEXT := '';
    v_div  NUMERIC;
    v_mul  NUMERIC;
BEGIN
    IF p_depth > 3 THEN
        RAISE EXCEPTION 'Measure % references are nested too deeply', p_id;
    END IF;

    -- Custom measures
    IF c IS NOT NULL THEN
        IF c->>'type' = 'ratio' THEN
            v_mul := COALESCE(NULLIF(c->>'multiplier', '')::numeric, 1);
            RETURN format('ROUND((%s)::numeric * %L::numeric / NULLIF((%s)::numeric, 0), 4)',
                          public.pp_measure_sql(c->>'num', p_customs, p_depth + 1),
                          v_mul,
                          public.pp_measure_sql(c->>'den', p_customs, p_depth + 1));
        ELSIF c->>'type' = 'calc' THEN
            v_fld := CASE c->>'field'
                        WHEN 'gold_weight'  THEN 'b.gold_weight'
                        WHEN 'total_amount' THEN 'b.total_amount'
                        WHEN 'phone'        THEN 'NULLIF(trim(b.phone), '''')'
                        WHEN 'rows'         THEN '*'
                        ELSE NULL END;
            IF v_fld IS NULL THEN
                RAISE EXCEPTION 'Custom measure % has invalid field', p_id;
            END IF;
            SELECT string_agg(public.pp_filter_sql(x), ' AND ')
              INTO v_conds
              FROM jsonb_array_elements(COALESCE(c->'filters', '[]'::jsonb)) x;
            IF v_conds IS NOT NULL AND v_conds <> '' THEN
                v_filter := ' FILTER (WHERE ' || v_conds || ')';
            END IF;
            v_div := COALESCE(NULLIF(c->>'divisor', '')::numeric, 1);
            IF v_div = 0 THEN v_div := 1; END IF;
            v_expr := CASE c->>'agg'
                        WHEN 'sum'            THEN format('SUM(%s)', v_fld)
                        WHEN 'count'          THEN format('COUNT(%s)', v_fld)
                        WHEN 'distinct_count' THEN format('COUNT(DISTINCT %s)', v_fld)
                        WHEN 'avg'            THEN format('AVG(%s)', v_fld)
                        WHEN 'min'            THEN format('MIN(%s)', v_fld)
                        WHEN 'max'            THEN format('MAX(%s)', v_fld)
                        ELSE NULL END;
            IF v_expr IS NULL THEN
                RAISE EXCEPTION 'Custom measure % has invalid aggregation', p_id;
            END IF;
            RETURN format('ROUND(COALESCE(%s%s, 0)::numeric / %L::numeric, 2)', v_expr, v_filter, v_div);
        END IF;
        RAISE EXCEPTION 'Custom measure % has invalid type', p_id;
    END IF;

    -- Built-in measures catalog
    RETURN CASE p_id
        -- Counts
        WHEN 'total_transaction'  THEN 'COUNT(*)'
        WHEN 'total_buy_transac'  THEN 'COUNT(*) ' || f_buy
        WHEN 'total_sell_transac' THEN 'COUNT(*) ' || f_sell
        WHEN 'withdraw_trans'     THEN 'COUNT(*) ' || f_wd
        WHEN 'new_register'       THEN 'COUNT(*) ' || f_open
        -- Verification Timestamps (Min & Max DateTime)
        WHEN 'min_datetime'       THEN $q$COALESCE(MIN(b.iso_ts), '(no date)')$q$
        WHEN 'max_datetime'       THEN $q$COALESCE(MAX(b.iso_ts), '(no date)')$q$
        -- Users
        WHEN 'total_unique_user'  THEN u_all
        WHEN 'user_buy'           THEN 'COUNT(DISTINCT NULLIF(trim(b.phone), '''')) ' || f_buy
        WHEN 'user_sell'          THEN 'COUNT(DISTINCT NULLIF(trim(b.phone), '''')) ' || f_sell
        WHEN 'user_withdraw'      THEN 'COUNT(DISTINCT NULLIF(trim(b.phone), '''')) ' || f_wd
        -- Revenue (mil LAK & exact LAK)
        WHEN 'revenue_buy_mil'    THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_buy)
        WHEN 'revenue_buy_lak'    THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0), 0)', f_buy)
        -- NC First Purchase (LAK): BUY_GOLD counted only when same phone has a completed
        -- OPEN_ACCOUNT row at the exact same created_at timestamp (see sql/51 for the source pattern)
        WHEN 'nc_first_purchase_lak' THEN $q$ROUND(COALESCE(SUM(b.total_amount) FILTER (
            WHERE b.transaction_type = 'BUY_GOLD' AND EXISTS (
              SELECT 1 FROM public.monthly_data o
              WHERE o.phone = b.phone AND o.created_at::text = b.iso_ts
                AND o.transaction_type = 'OPEN_ACCOUNT'
                AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
            )), 0), 0)$q$
        WHEN 'revenue_sell_mil'   THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_sell)
        WHEN 'revenue_sell_lak'   THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0), 0)', f_sell)
        WHEN 'withdraw_value_mil' THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_wd)
        WHEN 'withdraw_value_lak' THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0), 0)', f_wd)
        WHEN 'abs_value_mil'      THEN format('ROUND((COALESCE(SUM(b.total_amount) %s, 0) - COALESCE(SUM(b.total_amount) %s, 0)) / 1000000.0, 2)', f_buy, f_sell)
        -- Gold weight (g & 15g Baht)
        WHEN 'gold_weight_buy_g'    THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0), 2)', f_buy)
        -- NC First Purchase (g): same pairing as nc_first_purchase_lak, summed over gold_weight
        WHEN 'nc_first_purchase_g' THEN $q$ROUND(COALESCE(SUM(b.gold_weight) FILTER (
            WHERE b.transaction_type = 'BUY_GOLD' AND EXISTS (
              SELECT 1 FROM public.monthly_data o
              WHERE o.phone = b.phone AND o.created_at::text = b.iso_ts
                AND o.transaction_type = 'OPEN_ACCOUNT'
                AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
            )), 0), 2)$q$
        WHEN 'gold_weight_sell_g'   THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0), 2)', f_sell)
        WHEN 'withdraw_gold_g'      THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0), 2)', f_wd)
        WHEN 'gold_weight_buy_15g'  THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_buy)
        WHEN 'gold_weight_sell_15g' THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_sell)
        WHEN 'withdraw_gold_15g'    THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_wd)
        -- Ticket sizes
        WHEN 'gold_buy_size_g'    THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / NULLIF(COUNT(*) %s, 0), 2)', f_buy, f_buy)
        WHEN 'gold_sell_size_g'   THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / NULLIF(COUNT(*) %s, 0), 2)', f_sell, f_sell)
        WHEN 'avg_sell_size'      THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0 / NULLIF(COUNT(*) %s, 0), 4)', f_sell, f_sell)
        -- Ratios / net flow (% of total)
        WHEN 'net_flow_trans'     THEN format('ROUND(100.0 * COUNT(*) %s / NULLIF(COUNT(*), 0), 1)', f_buy)
        WHEN 'net_flow_value'     THEN format('ROUND(100.0 * COALESCE(SUM(b.total_amount) %s, 0) / NULLIF(COALESCE(SUM(b.total_amount) %s, 0) + COALESCE(SUM(b.total_amount) %s, 0), 0), 1)', f_buy, f_buy, f_sell)
        -- Frequency per user
        WHEN 'freq_per_user_all'  THEN format('ROUND(COUNT(*)::numeric / NULLIF(%s, 0), 2)', u_all)
        WHEN 'freq_per_user_buy'  THEN format('ROUND(COUNT(*) %s ::numeric / NULLIF(COUNT(DISTINCT NULLIF(trim(b.phone), '''')) %s, 0), 2)', f_buy, f_buy)
        WHEN 'freq_per_user_sell' THEN format('ROUND(COUNT(*) %s ::numeric / NULLIF(COUNT(DISTINCT NULLIF(trim(b.phone), '''')) %s, 0), 2)', f_sell, f_sell)
        -- Generic sums / averages
        WHEN 'sum_gold_weight'    THEN 'ROUND(COALESCE(SUM(b.gold_weight), 0), 2)'
        WHEN 'sum_amount_lak'     THEN 'ROUND(COALESCE(SUM(b.total_amount), 0), 0)'
        WHEN 'avg_gold_weight'    THEN 'ROUND(COALESCE(AVG(b.gold_weight), 0), 2)'
        WHEN 'avg_amount_lak'     THEN 'ROUND(COALESCE(AVG(b.total_amount), 0), 0)'
        ELSE NULL
    END;
END;
$$;
