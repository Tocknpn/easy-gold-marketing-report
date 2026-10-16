-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Unified Complete Engine: 24_campaign_bank_condition_and_calc_engine.sql
-- Target: Supabase (PostgreSQL 15+)
-- Purpose: Complete, Self-Contained Campaign Tracking & Target Calculation Engine
--          With 'Bank' Filter, Safe Table Creation & Zero-Error Function Grants
-- ============================================================================

-- STEP 0: ENSURE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 1: CREATE TABLE IF NOT EXISTS (Fixes 42P01 relation does not exist)
CREATE TABLE IF NOT EXISTS public.campaign_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    campaign_name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_start_date DATE NOT NULL,
    campaign_end_date DATE NOT NULL,
    as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
    backward_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    backward_end_date DATE NOT NULL DEFAULT CURRENT_DATE,
    condition_type VARCHAR(64) NOT NULL DEFAULT 'amount_gte',
    condition_value NUMERIC(18, 2) NOT NULL DEFAULT 500000,
    condition_max_value NUMERIC(18, 2),
    condition_operator VARCHAR(32) DEFAULT '>=',
    condition_label VARCHAR(128) NOT NULL DEFAULT 'Buy trans >= 500k',
    tx_type VARCHAR(64) NOT NULL DEFAULT 'BUY_GOLD',
    ec_target NUMERIC(18, 2) NOT NULL DEFAULT 307500,
    nc_target NUMERIC(18, 2) NOT NULL DEFAULT 17220,
    revenue_target_mil NUMERIC(18, 2),
    gold_weight_target_g NUMERIC(18, 2),
    target_types JSONB DEFAULT '["ec", "nc"]'::jsonb,
    category_tag VARCHAR(64) DEFAULT 'Volume Driver',
    image_url TEXT,
    bank VARCHAR(64) DEFAULT 'all',
    auto_sync_max_date BOOLEAN DEFAULT true,
    baseline_daily_rr NUMERIC(18, 2) DEFAULT 79.0,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all enhanced columns exist if table was previously created with an older schema
ALTER TABLE public.campaign_setups 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS category_tag VARCHAR(64) DEFAULT 'Volume Driver',
ADD COLUMN IF NOT EXISTS condition_operator VARCHAR(32) DEFAULT '>=',
ADD COLUMN IF NOT EXISTS condition_max_value NUMERIC(18, 2),
ADD COLUMN IF NOT EXISTS target_types JSONB DEFAULT '["ec", "nc"]'::jsonb,
ADD COLUMN IF NOT EXISTS revenue_target_mil NUMERIC(18, 2),
ADD COLUMN IF NOT EXISTS gold_weight_target_g NUMERIC(18, 2),
ADD COLUMN IF NOT EXISTS auto_sync_max_date BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS bank VARCHAR(64) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';

-- Index for bank and status queries
CREATE INDEX IF NOT EXISTS idx_campaign_setups_bank
ON public.campaign_setups (bank);

CREATE INDEX IF NOT EXISTS idx_campaign_setups_status
ON public.campaign_setups (status);

-- Enable RLS
ALTER TABLE public.campaign_setups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'campaign_setups' 
          AND policyname = 'Public read and write for campaign setups'
    ) THEN
        CREATE POLICY "Public read and write for campaign setups"
        ON public.campaign_setups
        FOR ALL
        TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;


-- STEP 2: SAFE DATE PARSER FOR TEXT / TIMESTAMPTZ
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
        RETURN to_date(split_part(split_part(val, ',', 1), ' ', 1), 'DD/MM/YYYY')::timestamptz;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


-- STEP 3: HELPER TO GET THE MAX DATA DATE IN SUPABASE
CREATE OR REPLACE FUNCTION public.get_max_monthly_data_date()
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_date DATE;
BEGIN
    SELECT MAX(public.parse_tx_date(created_at::text))::date
    INTO v_max_date
    FROM public.monthly_data;
    
    RETURN COALESCE(v_max_date, CURRENT_DATE);
EXCEPTION WHEN OTHERS THEN
    RETURN CURRENT_DATE;
END;
$$;


-- STEP 4: CLEAN UP ALL OLD OVERLOADS (Fixes 42725 function name is not unique)
DROP FUNCTION IF EXISTS public.get_campaign_actual_metrics(DATE, DATE, DATE, DATE, TEXT, TEXT, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.get_campaign_actual_metrics(DATE, DATE, DATE, DATE, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT);


-- STEP 5: CREATE CAMPAIGN CALCULATION ENGINE WITH BANK & CONDITION SUPPORT
CREATE OR REPLACE FUNCTION public.get_campaign_actual_metrics(
    p_start_date DATE,
    p_as_of_date DATE,
    p_backward_start DATE,
    p_backward_end DATE,
    p_cond_type TEXT DEFAULT 'amount_gte',
    p_cond_op TEXT DEFAULT '>=',
    p_cond_val NUMERIC DEFAULT 500000,
    p_cond_max NUMERIC DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'BUY_GOLD',
    p_bank TEXT DEFAULT 'all'
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
    -- 1. Compute MTD Actuals (only if campaign has already started)
    IF p_as_of_date >= p_start_date THEN
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
              -- Bank Channel Filter
              p_bank IS NULL 
              OR p_bank = 'all' 
              OR lower(m.bank) = lower(p_bank)
              OR (m.bank ILIKE ('%' || p_bank || '%'))
          )
          AND (
              -- 1. Bank condition type
              (p_cond_type = 'bank' AND (
                  p_bank IS NOT NULL AND p_bank <> 'all' AND (lower(m.bank) = lower(p_bank) OR m.bank ILIKE ('%' || p_bank || '%'))
                  OR (m.bank IS NOT NULL AND trim(m.bank) <> '')
              ))
              OR
              -- 2. Threshold condition types
              (p_cond_type <> 'bank' AND (
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
              ))
          );

        -- 2. Compute New Customers (NC) for MTD:
        -- Customers whose earliest ever transaction is in [v_mtd_start, v_mtd_end]
        WITH first_tx_per_customer AS (
            SELECT 
                phone,
                MIN(public.parse_tx_date(created_at::text)) AS earliest_tx
            FROM public.monthly_data
            WHERE phone IS NOT NULL AND trim(phone) <> ''
              AND (
                  p_bank IS NULL 
                  OR p_bank = 'all' 
                  OR lower(bank) = lower(p_bank)
                  OR (bank ILIKE ('%' || p_bank || '%'))
              )
            GROUP BY phone
        )
        SELECT COUNT(*) INTO v_mtd_nc
        FROM first_tx_per_customer
        WHERE earliest_tx >= v_mtd_start AND earliest_tx <= v_mtd_end;
    END IF;

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
          p_bank IS NULL 
          OR p_bank = 'all' 
          OR lower(m.bank) = lower(p_bank)
          OR (m.bank ILIKE ('%' || p_bank || '%'))
      )
      AND (
          (p_cond_type = 'bank' AND (
              p_bank IS NOT NULL AND p_bank <> 'all' AND (lower(m.bank) = lower(p_bank) OR m.bank ILIKE ('%' || p_bank || '%'))
              OR (m.bank IS NOT NULL AND trim(m.bank) <> '')
          ))
          OR
          (p_cond_type <> 'bank' AND (
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
          ))
      );

    -- Return structured JSON
    RETURN json_build_object(
        'status', 'SUCCESS',
        'bank', p_bank,
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


-- STEP 6: GRANT EXECUTE PERMISSIONS WITH EXACT SIGNATURES (Disambiguated)
GRANT EXECUTE ON FUNCTION public.get_campaign_actual_metrics(DATE, DATE, DATE, DATE, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_max_monthly_data_date() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parse_tx_date(TEXT) TO anon, authenticated, service_role;
