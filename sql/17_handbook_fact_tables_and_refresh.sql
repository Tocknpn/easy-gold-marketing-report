-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE REPORT
-- Module: 17_handbook_fact_tables_and_refresh.sql
-- Description: 4 Summary Fact Tables (core, wide, hourly, customer_daily)
--              + Idempotent Refresh Engine + Refresh Log
-- ============================================================================

-- 1. REFRESH LOG TABLE
CREATE TABLE IF NOT EXISTS public.refresh_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    target_start_date DATE,
    target_end_date DATE,
    rows_affected BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'RUNNING',
    error_message TEXT
);

-- 2. FACT 1: fact_daily_core (~80% of executive reports)
-- Grain: date x branch x bank x transaction_type x status_code
CREATE TABLE IF NOT EXISTS public.fact_daily_core (
    date_id DATE NOT NULL,
    branch_code TEXT NOT NULL,
    bank_code TEXT NOT NULL,
    tx_type_code TEXT NOT NULL,
    status_code TEXT NOT NULL,
    -- Additive facts
    trans_count BIGINT NOT NULL DEFAULT 0,
    gold_weight_g NUMERIC(14,4) NOT NULL DEFAULT 0,
    amount_lak NUMERIC(20,2) NOT NULL DEFAULT 0,
    -- Campaign >= 500k additive facts
    trans_count_ge_500k BIGINT NOT NULL DEFAULT 0,
    gold_weight_g_ge_500k NUMERIC(14,4) NOT NULL DEFAULT 0,
    amount_lak_ge_500k NUMERIC(20,2) NOT NULL DEFAULT 0,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_fact_daily_core PRIMARY KEY (date_id, branch_code, bank_code, tx_type_code, status_code)
);

CREATE INDEX IF NOT EXISTS idx_fact_daily_core_date ON public.fact_daily_core (date_id);
CREATE INDEX IF NOT EXISTS idx_fact_daily_core_type ON public.fact_daily_core (tx_type_code, date_id);

-- 3. FACT 2: fact_daily_wide (Ticket size, distribution & range analysis)
-- Grain: date x branch x bank x transaction_type x weight bucket x amount bucket
CREATE TABLE IF NOT EXISTS public.fact_daily_wide (
    date_id DATE NOT NULL,
    branch_code TEXT NOT NULL,
    bank_code TEXT NOT NULL,
    tx_type_code TEXT NOT NULL,
    weight_bucket_code TEXT NOT NULL,
    amount_bucket_code TEXT NOT NULL,
    -- Additive facts
    trans_count BIGINT NOT NULL DEFAULT 0,
    gold_weight_g NUMERIC(14,4) NOT NULL DEFAULT 0,
    amount_lak NUMERIC(20,2) NOT NULL DEFAULT 0,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_fact_daily_wide PRIMARY KEY (date_id, branch_code, bank_code, tx_type_code, weight_bucket_code, amount_bucket_code)
);

CREATE INDEX IF NOT EXISTS idx_fact_daily_wide_date ON public.fact_daily_wide (date_id);

-- 4. FACT 3: fact_hourly (Intraday pace, peak hours, hourly operations)
-- Grain: date x hour x transaction_type x bank
CREATE TABLE IF NOT EXISTS public.fact_hourly (
    date_id DATE NOT NULL,
    tx_hour INT NOT NULL,
    tx_type_code TEXT NOT NULL,
    bank_code TEXT NOT NULL,
    -- Additive facts
    trans_count BIGINT NOT NULL DEFAULT 0,
    gold_weight_g NUMERIC(14,4) NOT NULL DEFAULT 0,
    amount_lak NUMERIC(20,2) NOT NULL DEFAULT 0,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_fact_hourly PRIMARY KEY (date_id, tx_hour, tx_type_code, bank_code)
);

CREATE INDEX IF NOT EXISTS idx_fact_hourly_date ON public.fact_hourly (date_id, tx_hour);

-- 5. FACT 4: fact_customer_daily (Distinct users, retention, customer frequency)
-- Grain: date x customer_phone x transaction_type x branch
CREATE TABLE IF NOT EXISTS public.fact_customer_daily (
    date_id DATE NOT NULL,
    customer_phone TEXT NOT NULL,
    tx_type_code TEXT NOT NULL,
    branch_code TEXT NOT NULL,
    -- Additive facts
    trans_count BIGINT NOT NULL DEFAULT 0,
    gold_weight_g NUMERIC(14,4) NOT NULL DEFAULT 0,
    amount_lak NUMERIC(20,2) NOT NULL DEFAULT 0,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_fact_customer_daily PRIMARY KEY (date_id, customer_phone, tx_type_code, branch_code)
);

CREATE INDEX IF NOT EXISTS idx_fact_customer_daily_date ON public.fact_customer_daily (date_id, tx_type_code);
CREATE INDEX IF NOT EXISTS idx_fact_customer_daily_phone ON public.fact_customer_daily (customer_phone);

-- ============================================================================
-- 6. REFRESH ENGINE: IDEMPOTENT PROCEDURES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_handbook_facts_range(
    p_start_date DATE,
    p_end_date DATE,
    p_job_name TEXT DEFAULT 'MANUAL_REFRESH'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_rows_core BIGINT := 0;
    v_rows_wide BIGINT := 0;
    v_rows_hourly BIGINT := 0;
    v_rows_cust BIGINT := 0;
    v_start_time TIMESTAMPTZ := now();
BEGIN
    -- Log job start
    INSERT INTO public.refresh_log (job_name, target_start_date, target_end_date, status)
    VALUES (p_job_name, p_start_date, p_end_date, 'RUNNING')
    RETURNING id INTO v_log_id;

    -- A. Delete existing data for the slice (Idempotent)
    DELETE FROM public.fact_daily_core WHERE date_id >= p_start_date AND date_id <= p_end_date;
    DELETE FROM public.fact_daily_wide WHERE date_id >= p_start_date AND date_id <= p_end_date;
    DELETE FROM public.fact_hourly WHERE date_id >= p_start_date AND date_id <= p_end_date;
    DELETE FROM public.fact_customer_daily WHERE date_id >= p_start_date AND date_id <= p_end_date;

    -- B. Populate fact_daily_core
    INSERT INTO public.fact_daily_core (
        date_id, branch_code, bank_code, tx_type_code, status_code,
        trans_count, gold_weight_g, amount_lak,
        trans_count_ge_500k, gold_weight_g_ge_500k, amount_lak_ge_500k,
        refreshed_at
    )
    SELECT 
        tx_date AS date_id,
        branch_code,
        bank_code,
        tx_type_code,
        status_code,
        COUNT(*) AS trans_count,
        SUM(gold_weight_g) AS gold_weight_g,
        SUM(amount_lak) AS amount_lak,
        COUNT(*) FILTER (WHERE is_ge_500k) AS trans_count_ge_500k,
        COALESCE(SUM(gold_weight_g) FILTER (WHERE is_ge_500k), 0) AS gold_weight_g_ge_500k,
        COALESCE(SUM(amount_lak) FILTER (WHERE is_ge_500k), 0) AS amount_lak_ge_500k,
        now()
    FROM public.stg_clean_transactions
    WHERE tx_date >= p_start_date AND tx_date <= p_end_date
    GROUP BY tx_date, branch_code, bank_code, tx_type_code, status_code;
    GET DIAGNOSTICS v_rows_core = ROW_COUNT;

    -- C. Populate fact_daily_wide
    INSERT INTO public.fact_daily_wide (
        date_id, branch_code, bank_code, tx_type_code,
        weight_bucket_code, amount_bucket_code,
        trans_count, gold_weight_g, amount_lak,
        refreshed_at
    )
    SELECT 
        tx_date AS date_id,
        branch_code,
        bank_code,
        tx_type_code,
        weight_bucket_code,
        amount_bucket_code,
        COUNT(*) AS trans_count,
        SUM(gold_weight_g) AS gold_weight_g,
        SUM(amount_lak) AS amount_lak,
        now()
    FROM public.stg_clean_transactions
    WHERE tx_date >= p_start_date AND tx_date <= p_end_date
    GROUP BY tx_date, branch_code, bank_code, tx_type_code, weight_bucket_code, amount_bucket_code;
    GET DIAGNOSTICS v_rows_wide = ROW_COUNT;

    -- D. Populate fact_hourly
    INSERT INTO public.fact_hourly (
        date_id, tx_hour, tx_type_code, bank_code,
        trans_count, gold_weight_g, amount_lak,
        refreshed_at
    )
    SELECT 
        tx_date AS date_id,
        tx_hour,
        tx_type_code,
        bank_code,
        COUNT(*) AS trans_count,
        SUM(gold_weight_g) AS gold_weight_g,
        SUM(amount_lak) AS amount_lak,
        now()
    FROM public.stg_clean_transactions
    WHERE tx_date >= p_start_date AND tx_date <= p_end_date
    GROUP BY tx_date, tx_hour, tx_type_code, bank_code;
    GET DIAGNOSTICS v_rows_hourly = ROW_COUNT;

    -- E. Populate fact_customer_daily
    INSERT INTO public.fact_customer_daily (
        date_id, customer_phone, tx_type_code, branch_code,
        trans_count, gold_weight_g, amount_lak,
        refreshed_at
    )
    SELECT 
        tx_date AS date_id,
        COALESCE(customer_phone, 'ANONYMOUS'),
        tx_type_code,
        branch_code,
        COUNT(*) AS trans_count,
        SUM(gold_weight_g) AS gold_weight_g,
        SUM(amount_lak) AS amount_lak,
        now()
    FROM public.stg_clean_transactions
    WHERE tx_date >= p_start_date AND tx_date <= p_end_date
    GROUP BY tx_date, COALESCE(customer_phone, 'ANONYMOUS'), tx_type_code, branch_code;
    GET DIAGNOSTICS v_rows_cust = ROW_COUNT;

    -- Complete log
    UPDATE public.refresh_log
    SET end_time = now(),
        rows_affected = v_rows_core + v_rows_wide + v_rows_hourly + v_rows_cust,
        status = 'COMPLETED'
    WHERE id = v_log_id;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'job_name', p_job_name,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'fact_daily_core_rows', v_rows_core,
        'fact_daily_wide_rows', v_rows_wide,
        'fact_hourly_rows', v_rows_hourly,
        'fact_customer_daily_rows', v_rows_cust,
        'duration_seconds', ROUND(EXTRACT(EPOCH FROM (now() - v_start_time))::numeric, 2)
    );

EXCEPTION WHEN OTHERS THEN
    UPDATE public.refresh_log
    SET end_time = now(),
        status = 'FAILED',
        error_message = SQLERRM
    WHERE id = v_log_id;
    RAISE EXCEPTION 'Fact refresh error: %', SQLERRM;
END;
$$;

-- 7. SCHEDULE CONVENIENCE WRAPPERS
-- Intraday: rebuild today only (runs every 15-30m)
CREATE OR REPLACE FUNCTION public.refresh_facts_intraday()
RETURNS JSONB
LANGUAGE sql
AS $$
    SELECT public.refresh_handbook_facts_range(CURRENT_DATE, CURRENT_DATE, 'INTRADAY_TODAY');
$$;

-- Nightly: rebuild last 3 days (catches corrections / late entries)
CREATE OR REPLACE FUNCTION public.refresh_facts_nightly()
RETURNS JSONB
LANGUAGE sql
AS $$
    SELECT public.refresh_handbook_facts_range(CURRENT_DATE - 3, CURRENT_DATE, 'NIGHTLY_ROLLING_3D');
$$;

-- Full historical backfill
CREATE OR REPLACE FUNCTION public.refresh_facts_full_history()
RETURNS JSONB
LANGUAGE sql
AS $$
    SELECT public.refresh_handbook_facts_range('2024-01-01'::date, CURRENT_DATE, 'FULL_REBUILD');
$$;
