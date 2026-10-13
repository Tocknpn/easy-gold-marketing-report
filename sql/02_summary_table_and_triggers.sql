-- ============================================================================
-- EASY GOLD MARKETING REPORT - DATABASE BLUEPRINT
-- Module: 02_summary_table_and_triggers.sql
-- Strategy: Pre-aggregated Weekly Rollup (Sub-10ms Executive Dashboard)
-- ============================================================================

-- 1. PRE-AGGREGATED WEEKLY METRICS TABLE
-- Stores pre-computed weekly rollups so executive views require reading ~5-52 rows
-- instead of performing sequential scans over 1.4 million rows.
CREATE TABLE IF NOT EXISTS public.summary_weekly_metrics (
    year_week VARCHAR(10) PRIMARY KEY,      -- e.g., '2026-W41'
    week_label VARCHAR(10) NOT NULL,        -- e.g., 'W41'
    week_number INT NOT NULL,               -- e.g., 41
    year INT NOT NULL,                      -- e.g., 2026
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- PLATFORM OVERVIEW METRICS
    all_transactions INT NOT NULL DEFAULT 0,
    active_users INT NOT NULL DEFAULT 0,
    new_registers INT NOT NULL DEFAULT 0,
    withdraw_gold_grams NUMERIC(12, 2) NOT NULL DEFAULT 0,
    
    -- BUY ACTIVITY METRICS
    buy_weight_15g NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- Weight in 15g units (1 Baht = 15g)
    buy_transactions INT NOT NULL DEFAULT 0,
    buy_ticket_size_g NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Average grams per transaction
    
    -- SELL ACTIVITY METRICS
    sell_weight_15g NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Weight in 15g units
    sell_transactions INT NOT NULL DEFAULT 0,
    sell_ticket_size_g NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Average grams per transaction
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_summary_weekly_metrics_lookup
ON public.summary_weekly_metrics (year DESC, week_number DESC);

-- ============================================================================
-- 2. REFRESH PROCEDURE FOR A SPECIFIC WEEK OR RANGE
-- Aggregates raw transactional data for given week window and upserts into summary table
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_weekly_summary_metric(
    p_year INT,
    p_week INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_year_week VARCHAR(10);
    v_week_label VARCHAR(10);
    
    -- Calculation variables
    v_all_tx INT;
    v_active_users INT;
    v_new_registers INT;
    v_withdraw_grams NUMERIC(12, 2);
    
    v_buy_weight NUMERIC(14, 4);
    v_buy_tx INT;
    v_buy_weight_15g NUMERIC(12, 2);
    v_buy_ticket NUMERIC(10, 2);
    
    v_sell_weight NUMERIC(14, 4);
    v_sell_tx INT;
    v_sell_weight_15g NUMERIC(12, 2);
    v_sell_ticket NUMERIC(10, 2);
BEGIN
    v_year_week := format('%s-W%s', p_year, LPAD(p_week::text, 2, '0'));
    v_week_label := format('W%s', p_week);
    
    -- Derive ISO week start (Monday 00:00:00) and end (Sunday 23:59:59.999)
    v_start_date := to_timestamp(format('%s %s 1', p_year, p_week), 'IYYY IW ID')::date;
    v_end_date := v_start_date + INTERVAL '7 days';

    -- 1. All Completed Transactions
    SELECT COUNT(*) INTO v_all_tx
    FROM public.monthly_data
    WHERE status = 'ສໍາເລັດ'
      AND created_at >= v_start_date AND created_at < v_end_date;

    -- 2. Active Users (Distinct phones transacting)
    SELECT COUNT(DISTINCT phone) INTO v_active_users
    FROM public.monthly_data
    WHERE status = 'ສໍາເລັດ'
      AND created_at >= v_start_date AND created_at < v_end_date;

    -- 3. New Register (OPEN_ACCOUNT)
    SELECT COUNT(*) INTO v_new_registers
    FROM public.monthly_data
    WHERE transaction_type = 'OPEN_ACCOUNT'
      AND created_at >= v_start_date AND created_at < v_end_date;

    -- 4. Gold Withdraw (WITHDRAW_GOLD, MARKETHUB_WITHDRAW) in grams
    SELECT COALESCE(SUM(gold_weight), 0) INTO v_withdraw_grams
    FROM public.monthly_data
    WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW')
      AND status = 'ສໍາເລັດ'
      AND created_at >= v_start_date AND created_at < v_end_date;

    -- 5. Buy Activity (BUY_GOLD)
    SELECT 
        COALESCE(SUM(gold_weight), 0),
        COUNT(*)
    INTO v_buy_weight, v_buy_tx
    FROM public.monthly_data
    WHERE transaction_type = 'BUY_GOLD'
      AND status = 'ສໍາເລັດ'
      AND created_at >= v_start_date AND created_at < v_end_date;

    v_buy_weight_15g := ROUND(v_buy_weight / 15.0);
    v_buy_ticket := CASE WHEN v_buy_tx > 0 THEN ROUND(v_buy_weight / v_buy_tx::numeric, 1) ELSE 0 END;

    -- 6. Sell Activity (SALE_GOLD)
    SELECT 
        COALESCE(SUM(gold_weight), 0),
        COUNT(*)
    INTO v_sell_weight, v_sell_tx
    FROM public.monthly_data
    WHERE transaction_type = 'SALE_GOLD'
      AND status = 'ສໍາເລັດ'
      AND created_at >= v_start_date AND created_at < v_end_date;

    v_sell_weight_15g := ROUND(v_sell_weight / 15.0);
    v_sell_ticket := CASE WHEN v_sell_tx > 0 THEN ROUND(v_sell_weight / v_sell_tx::numeric, 1) ELSE 0 END;

    -- UPSERT into summary_weekly_metrics
    INSERT INTO public.summary_weekly_metrics (
        year_week, week_label, week_number, year, start_date, end_date,
        all_transactions, active_users, new_registers, withdraw_gold_grams,
        buy_weight_15g, buy_transactions, buy_ticket_size_g,
        sell_weight_15g, sell_transactions, sell_ticket_size_g,
        updated_at
    )
    VALUES (
        v_year_week, v_week_label, p_week, p_year, v_start_date::date, (v_end_date - INTERVAL '1 day')::date,
        v_all_tx, v_active_users, v_new_registers, v_withdraw_grams,
        v_buy_weight_15g, v_buy_tx, v_buy_ticket,
        v_sell_weight_15g, v_sell_tx, v_sell_ticket,
        now()
    )
    ON CONFLICT (year_week) DO UPDATE SET
        all_transactions = EXCLUDED.all_transactions,
        active_users = EXCLUDED.active_users,
        new_registers = EXCLUDED.new_registers,
        withdraw_gold_grams = EXCLUDED.withdraw_gold_grams,
        buy_weight_15g = EXCLUDED.buy_weight_15g,
        buy_transactions = EXCLUDED.buy_transactions,
        buy_ticket_size_g = EXCLUDED.buy_ticket_size_g,
        sell_weight_15g = EXCLUDED.sell_weight_15g,
        sell_transactions = EXCLUDED.sell_transactions,
        sell_ticket_size_g = EXCLUDED.sell_ticket_size_g,
        updated_at = now();
END;
$$;
