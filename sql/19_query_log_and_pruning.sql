-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE REPORT
-- Module: 19_query_log_and_pruning.sql
-- Description: Query Telemetry Log, Automated 90-Day Pruning,
--              Official Daily Gold Price Dimension, and Saved Reports Table
-- ============================================================================

-- 1. QUERY LOG TABLE (Tracks request lane, dimensions, duration for smart promotion)
CREATE TABLE IF NOT EXISTS public.query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    endpoint TEXT NOT NULL,
    target_lane TEXT NOT NULL, -- 'fact_daily_core', 'fact_daily_wide', 'fact_hourly', 'fact_customer_daily', 'raw'
    dimensions_requested TEXT[] DEFAULT '{}',
    date_range_start DATE,
    date_range_end DATE,
    execution_time_ms NUMERIC(10,2) DEFAULT 0,
    row_count INT DEFAULT 0,
    user_id TEXT,
    client_ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_query_log_created_at ON public.query_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_log_lane ON public.query_log (target_lane, created_at DESC);

-- RPC for Worker / API to log telemetry asynchronously
CREATE OR REPLACE FUNCTION public.log_query_telemetry(
    p_endpoint TEXT,
    p_target_lane TEXT,
    p_dimensions TEXT[] DEFAULT '{}',
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_exec_ms NUMERIC DEFAULT 0,
    p_row_count INT DEFAULT 0,
    p_user_id TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO public.query_log (
        endpoint, target_lane, dimensions_requested,
        date_range_start, date_range_end,
        execution_time_ms, row_count, user_id, client_ip_hash
    )
    VALUES (
        p_endpoint, p_target_lane, p_dimensions,
        p_start_date, p_end_date,
        p_exec_ms, p_row_count, p_user_id, p_ip_hash
    );
$$;

-- 2. AUTOMATED PRUNING ENGINE (Keep last 90 days of logs to protect 500MB budget)
CREATE OR REPLACE FUNCTION public.prune_system_logs(p_retention_days INT DEFAULT 90)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_refresh BIGINT := 0;
    v_deleted_query BIGINT := 0;
    v_cutoff TIMESTAMPTZ;
BEGIN
    v_cutoff := now() - (p_retention_days || ' days')::interval;

    -- Prune refresh_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refresh_log') THEN
        DELETE FROM public.refresh_log WHERE start_time < v_cutoff;
        GET DIAGNOSTICS v_deleted_refresh = ROW_COUNT;
    END IF;

    -- Prune query_log
    DELETE FROM public.query_log WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_deleted_query = ROW_COUNT;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'retention_days', p_retention_days,
        'cutoff_time', v_cutoff,
        'refresh_logs_pruned', v_deleted_refresh,
        'query_logs_pruned', v_deleted_query
    );
END;
$$;

-- Embed pruning into nightly refresh procedure
CREATE OR REPLACE FUNCTION public.refresh_facts_nightly()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_refresh_res JSONB;
    v_prune_res JSONB;
BEGIN
    -- 1. Refresh last 3 days
    v_refresh_res := public.refresh_handbook_facts_range(CURRENT_DATE - 3, CURRENT_DATE, 'NIGHTLY_ROLLING_3D');
    
    -- 2. Prune old logs (> 90 days)
    v_prune_res := public.prune_system_logs(90);

    RETURN jsonb_build_object(
        'refresh', v_refresh_res,
        'prune', v_prune_res
    );
END;
$$;

-- 3. OFFICIAL GOLD PRICE DIMENSION (dim_gold_price)
CREATE TABLE IF NOT EXISTS public.dim_gold_price (
    price_date DATE PRIMARY KEY,
    open_price NUMERIC(14,2) NOT NULL,
    close_price NUMERIC(14,2) NOT NULL,
    high_price NUMERIC(14,2),
    low_price NUMERIC(14,2),
    currency TEXT NOT NULL DEFAULT 'LAK',
    source TEXT NOT NULL DEFAULT 'OFFICIAL_RATE',
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dim_gold_price_date ON public.dim_gold_price (price_date DESC);

-- Helper procedure to backfill / seed dim_gold_price from clean buy transactions if empty
CREATE OR REPLACE FUNCTION public.seed_gold_prices_from_transactions()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    INSERT INTO public.dim_gold_price (price_date, open_price, close_price, high_price, low_price, source)
    SELECT 
        tx_date AS price_date,
        -- Approximate open price (first buy tx with weight > 0)
        ROUND(AVG(amount_lak / NULLIF(gold_weight_g, 0)), 2) AS open_price,
        ROUND(AVG(amount_lak / NULLIF(gold_weight_g, 0)), 2) AS close_price,
        ROUND(MAX(amount_lak / NULLIF(gold_weight_g, 0)), 2) AS high_price,
        ROUND(MIN(amount_lak / NULLIF(gold_weight_g, 0)), 2) AS low_price,
        'DERIVED_BACKFILL'
    FROM public.stg_clean_transactions
    WHERE tx_type_code = 'BUY_GOLD' AND gold_weight_g > 0 AND amount_lak > 100000
    GROUP BY tx_date
    ON CONFLICT (price_date) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- 4. SAVED REPORTS & LAYOUTS TABLE (Cloud-synced custom report profiles)
CREATE TABLE IF NOT EXISTS public.saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'PIVOT', -- 'PIVOT', 'CAMPAIGN', 'EXECUTIVE'
    is_public BOOLEAN DEFAULT true,
    created_by TEXT DEFAULT 'ANONYMOUS',
    layout_config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_category ON public.saved_reports (category, is_public);
