-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Test Suite & Engine: 24_campaign_bank_condition_and_calc_engine.sql
-- Purpose: Support 'Bank' in Campaign Condition Rules, Eligibility & Live Calculate Engine
-- ============================================================================

-- STEP 1: Add Bank column to campaign_setups table
ALTER TABLE IF EXISTS public.campaign_setups 
ADD COLUMN IF NOT EXISTS bank VARCHAR(64) DEFAULT 'all';

-- Index for bank queries
CREATE INDEX IF NOT EXISTS idx_campaign_setups_bank
ON public.campaign_setups (bank);

-- STEP 2: Update get_campaign_actual_metrics function with p_bank parameter
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

GRANT EXECUTE ON FUNCTION public.get_campaign_actual_metrics(DATE, DATE, DATE, DATE, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;
