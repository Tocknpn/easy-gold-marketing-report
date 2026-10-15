-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Test Suite & Engine: 14_campaign_tracking_engine.sql
-- Purpose: Backend Engine for Campaign Profile, Dynamic Timegone, Reverse Backward Comparison, and Target RR Forecast
-- ============================================================================

-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard -> SQL Editor.
-- 2. Run this script to install the schema updates and live campaign calculation RPC functions.
-- ============================================================================

-- STEP 0: SAFE DATE PARSER FOR TEXT / TIMESTAMPTZ
CREATE OR REPLACE FUNCTION public.parse_tx_date(val TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF val IS NULL OR trim(val) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Format A: 'DD/MM/YYYY, HH24:MI' or 'DD/MM/YYYY HH24:MI' or 'DD/MM/YYYY'
    IF val ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}' THEN
        BEGIN
            RETURN to_timestamp(val, 'DD/MM/YYYY, HH24:MI:SS');
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                RETURN to_timestamp(val, 'DD/MM/YYYY HH24:MI');
            EXCEPTION WHEN OTHERS THEN
                RETURN to_date(split_part(split_part(val, ',', 1), ' ', 1), 'DD/MM/YYYY')::timestamptz;
            END;
        END;
    -- Format B: ISO 'YYYY-MM-DD...'
    ELSIF val ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN
        RETURN val::timestamptz;
    ELSE
        -- Fallback: extract date before comma or space
        RETURN to_date(split_part(split_part(val, ',', 1), ' ', 1), 'DD/MM/YYYY')::timestamptz;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


-- STEP 1: ENHANCE CAMPAIGN SETUPS TABLE COLUMNS
ALTER TABLE IF EXISTS public.campaign_setups 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS category_tag VARCHAR(64) DEFAULT 'Volume Driver',
ADD COLUMN IF NOT EXISTS condition_operator VARCHAR(32) DEFAULT '>=',
ADD COLUMN IF NOT EXISTS condition_max_value NUMERIC(18, 2),
ADD COLUMN IF NOT EXISTS target_types JSONB DEFAULT '["ec", "nc"]'::jsonb,
ADD COLUMN IF NOT EXISTS revenue_target_mil NUMERIC(18, 2),
ADD COLUMN IF NOT EXISTS gold_weight_target_g NUMERIC(18, 2),
ADD COLUMN IF NOT EXISTS auto_sync_max_date BOOLEAN DEFAULT true;


-- STEP 2: HELPER TO GET THE MAX DATA DATE IN SUPABASE
CREATE OR REPLACE FUNCTION public.get_max_monthly_data_date()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        MAX(public.parse_tx_date(created_at::text))::date, 
        CURRENT_DATE
    )
    FROM public.monthly_data;
$$;


-- STEP 3: RPC ENGINE FOR LIVE CAMPAIGN AGGREGATION & BACKWARD COMPARISON
CREATE OR REPLACE FUNCTION public.get_campaign_actual_metrics(
    p_start_date DATE,
    p_as_of_date DATE,
    p_backward_start DATE,
    p_backward_end DATE,
    p_cond_type TEXT DEFAULT 'amount_gte',
    p_cond_op TEXT DEFAULT '>=',
    p_cond_val NUMERIC DEFAULT 500000,
    p_cond_max NUMERIC DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'BUY_GOLD'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mtd_start TIMESTAMPTZ := p_start_date::timestamptz;
    v_mtd_end TIMESTAMPTZ := (p_as_of_date + interval '1 day - 1 millisecond')::timestamptz;
    v_bwd_start TIMESTAMPTZ := p_backward_start::timestamptz;
    v_bwd_end TIMESTAMPTZ := (p_backward_end + interval '1 day - 1 millisecond')::timestamptz;

    v_mtd_transac BIGINT := 0;
    v_mtd_users BIGINT := 0;
    v_mtd_nc BIGINT := 0;
    v_mtd_revenue_mil NUMERIC := 0.0;
    v_mtd_gold_g NUMERIC := 0.0;

    v_bwd_transac BIGINT := 0;
    v_bwd_users BIGINT := 0;
    v_bwd_revenue_mil NUMERIC := 0.0;
    v_bwd_gold_g NUMERIC := 0.0;
BEGIN
    -- 1. Compute MTD Actuals
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
    WHERE public.parse_tx_date(m.created_at::text) >= v_mtd_start
      AND public.parse_tx_date(m.created_at::text) <= v_mtd_end
      AND (p_tx_type = 'all' OR m.transaction_type = p_tx_type)
      AND m.status = 'ສໍາເລັດ'
      AND (
          -- Threshold conditions
          (p_cond_op = '>=' AND (
              (p_cond_type LIKE '%weight%' AND m.gold_weight >= p_cond_val) OR
              (p_cond_type NOT LIKE '%weight%' AND m.total_amount >= p_cond_val)
          ))
          OR
          (p_cond_op = '<=' AND (
              (p_cond_type LIKE '%weight%' AND m.gold_weight <= p_cond_val) OR
              (p_cond_type NOT LIKE '%weight%' AND m.total_amount <= p_cond_val)
          ))
          OR
          (p_cond_op = 'between' AND (
              (p_cond_type LIKE '%weight%' AND m.gold_weight >= p_cond_val AND m.gold_weight <= COALESCE(p_cond_max, 999999)) OR
              (p_cond_type NOT LIKE '%weight%' AND m.total_amount >= p_cond_val AND m.total_amount <= COALESCE(p_cond_max, 999999999999))
          ))
          OR
          (p_cond_op = 'all')
      );

    -- 2. Compute New Customers (NC) for MTD:
    -- Customers whose earliest ever transaction is in [v_mtd_start, v_mtd_end]
    WITH first_tx_per_customer AS (
        SELECT 
            phone,
            MIN(public.parse_tx_date(created_at::text)) AS earliest_tx
        FROM public.monthly_data
        WHERE phone IS NOT NULL AND trim(phone) <> ''
        GROUP BY phone
    )
    SELECT COUNT(*) INTO v_mtd_nc
    FROM first_tx_per_customer
    WHERE earliest_tx >= v_mtd_start AND earliest_tx <= v_mtd_end;

    -- 3. Compute Same Period Backward Actuals
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
    WHERE public.parse_tx_date(m.created_at::text) >= v_bwd_start
      AND public.parse_tx_date(m.created_at::text) <= v_bwd_end
      AND (p_tx_type = 'all' OR m.transaction_type = p_tx_type)
      AND m.status = 'ສໍາເລັດ'
      AND (
          (p_cond_op = '>=' AND (
              (p_cond_type LIKE '%weight%' AND m.gold_weight >= p_cond_val) OR
              (p_cond_type NOT LIKE '%weight%' AND m.total_amount >= p_cond_val)
          ))
          OR
          (p_cond_op = '<=' AND (
              (p_cond_type LIKE '%weight%' AND m.gold_weight <= p_cond_val) OR
              (p_cond_type NOT LIKE '%weight%' AND m.total_amount <= p_cond_val)
          ))
          OR
          (p_cond_op = 'between' AND (
              (p_cond_type LIKE '%weight%' AND m.gold_weight >= p_cond_val AND m.gold_weight <= COALESCE(p_cond_max, 999999)) OR
              (p_cond_type NOT LIKE '%weight%' AND m.total_amount >= p_cond_val AND m.total_amount <= COALESCE(p_cond_max, 999999999999))
          ))
          OR
          (p_cond_op = 'all')
      );

    -- Return structured JSON
    RETURN json_build_object(
        'status', 'SUCCESS',
        'mtd_transac', COALESCE(v_mtd_transac, 0),
        'mtd_users', COALESCE(v_mtd_users, 0),
        'mtd_new_customers', COALESCE(v_mtd_nc, 0),
        'mtd_revenue_mil_lak', COALESCE(v_mtd_revenue_mil, 0),
        'mtd_gold_weight_g', COALESCE(v_mtd_gold_g, 0),
        'backward_transac', COALESCE(v_bwd_transac, 0),
        'backward_users', COALESCE(v_bwd_users, 0),
        'backward_revenue_mil_lak', COALESCE(v_bwd_revenue_mil, 0),
        'backward_gold_weight_g', COALESCE(v_bwd_gold_g, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_max_monthly_data_date() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_campaign_actual_metrics TO anon, authenticated, service_role;
