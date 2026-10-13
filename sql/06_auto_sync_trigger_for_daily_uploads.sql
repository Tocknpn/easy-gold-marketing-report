-- ============================================================================
-- EASY GOLD - AUTOMATIC SYNC TRIGGER FOR DAILY UPLOADS
-- Module: 06_auto_sync_trigger_for_daily_uploads.sql
-- Runs automatically whenever you upload new rows into monthly_data day-by-day!
-- ============================================================================

-- 1. Helper function to recalculate a specific week or all weeks
CREATE OR REPLACE FUNCTION public.recalculate_week_summary(p_week_start TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.summary_weekly_metrics (
        year_week,
        week_label,
        week_number,
        year,
        start_date,
        end_date,
        all_transactions,
        active_users,
        new_registers,
        withdraw_gold_grams,
        buy_weight_15g,
        buy_transactions,
        buy_ticket_size_g,
        sell_weight_15g,
        sell_transactions,
        sell_ticket_size_g,
        updated_at
    )
    SELECT
        to_char(p_week_start, 'IYYY-"W"IW') AS year_week,
        'W' || EXTRACT(week FROM p_week_start)::int AS week_label,
        EXTRACT(week FROM p_week_start)::int AS week_number,
        EXTRACT(isoyear FROM p_week_start)::int AS year,
        p_week_start::date AS start_date,
        (p_week_start + interval '6 days')::date AS end_date,
        
        -- 1. All Transactions (completed)
        COUNT(*) FILTER (WHERE status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%') AS all_transactions,
        
        -- 2. Active Users (distinct phones)
        COUNT(DISTINCT phone) FILTER (WHERE status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%') AS active_users,
        
        -- 3. New Register
        COUNT(*) FILTER (WHERE transaction_type ILIKE '%OPEN_ACCOUNT%' OR transaction_type ILIKE '%REGISTER%') AS new_registers,
        
        -- 4. Gold Withdraw (grams)
        COALESCE(SUM(gold_weight) FILTER (
            WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') 
              AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
        ), 0) AS withdraw_gold_grams,
        
        -- 5. Buy Activity
        ROUND(COALESCE(SUM(gold_weight) FILTER (
            WHERE transaction_type = 'BUY_GOLD' 
              AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
        ), 0) / 15.0) AS buy_weight_15g,
        
        COUNT(*) FILTER (
            WHERE transaction_type = 'BUY_GOLD' 
              AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
        ) AS buy_transactions,
        
        CASE 
            WHEN COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')) > 0 
            THEN ROUND(
                (COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')), 0) 
                / COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%'))::numeric), 
                1
            )
            ELSE 0 
        END AS buy_ticket_size_g,
        
        -- 6. Sell Activity
        ROUND(COALESCE(SUM(gold_weight) FILTER (
            WHERE transaction_type = 'SALE_GOLD' 
              AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
        ), 0) / 15.0) AS sell_weight_15g,
        
        COUNT(*) FILTER (
            WHERE transaction_type = 'SALE_GOLD' 
              AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')
        ) AS sell_transactions,
        
        CASE 
            WHEN COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')) > 0 
            THEN ROUND(
                (COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%')), 0) 
                / COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD' AND (status = 'ສໍາເລັດ' OR status ILIKE '%success%' OR status ILIKE '%complete%'))::numeric), 
                1
            )
            ELSE 0 
        END AS sell_ticket_size_g,
        
        now() AS updated_at
    FROM public.monthly_data
    WHERE date_trunc('week', public.parse_tx_date(created_at)) = p_week_start
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


-- 2. Statement-Level Trigger Function (Runs once per file/batch upload)
CREATE OR REPLACE FUNCTION public.trg_auto_refresh_weekly_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Loop through all distinct weeks contained in the newly uploaded rows
    FOR rec IN
        SELECT DISTINCT date_trunc('week', public.parse_tx_date(created_at)) AS week_start
        FROM new_rows
        WHERE public.parse_tx_date(created_at) IS NOT NULL
    LOOP
        PERFORM public.recalculate_week_summary(rec.week_start);
    END LOOP;
    
    RETURN NULL;
END;
$$;


-- 3. Attach the Trigger to public.monthly_data
DROP TRIGGER IF EXISTS trg_monthly_data_auto_summarize ON public.monthly_data;

CREATE TRIGGER trg_monthly_data_auto_summarize
AFTER INSERT ON public.monthly_data
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_auto_refresh_weekly_summary();


-- 4. Manual 1-Click Function to Re-sync ALL historical weeks from monthly_data
CREATE OR REPLACE FUNCTION public.sync_all_weekly_summaries()
RETURNS TABLE(year_week TEXT, week_label TEXT, tx_count INT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT DISTINCT date_trunc('week', public.parse_tx_date(created_at)) AS week_start
        FROM public.monthly_data
        WHERE public.parse_tx_date(created_at) IS NOT NULL
        ORDER BY week_start ASC
    LOOP
        PERFORM public.recalculate_week_summary(rec.week_start);
        
        year_week := to_char(rec.week_start, 'IYYY-"W"IW');
        week_label := 'W' || EXTRACT(week FROM rec.week_start)::int;
        SELECT all_transactions INTO tx_count FROM public.summary_weekly_metrics s WHERE s.year_week = to_char(rec.week_start, 'IYYY-"W"IW');
        status := 'SYNCED';
        RETURN NEXT;
    END LOOP;
END;
$$;
