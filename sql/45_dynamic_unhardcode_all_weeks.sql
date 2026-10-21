-- ==============================================================================
-- EASY GOLD - DYNAMIC UNHARDCODED ACTIVE WEEK AUTO-SYNC
-- File: 45_dynamic_unhardcode_all_weeks.sql
-- ==============================================================================
-- PURPOSE:
-- Eliminates all hardcoded week labels ('W43') and dates from the database.
-- Automatically computes Sunday-to-Saturday company week boundaries for any
-- current or future week (W43, W44, W45, and beyond) dynamically.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_active_week_summary(p_as_of DATE DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
    v_target_date DATE := COALESCE(p_as_of, public.get_max_monthly_data_date());
    v_week_start DATE;
    v_week_end DATE;
    v_year_week TEXT;
    v_week_label TEXT;
    v_week_num INT;
    v_year INT;
    v_start_ts TEXT;
    v_end_ts TEXT;

    v_all_tx INT := 0;
    v_active_users INT := 0;
    v_new_reg INT := 0;
    v_withdraw_g NUMERIC(14, 2) := 0;
    v_buy_wt NUMERIC(14, 2) := 0;
    v_buy_tx INT := 0;
    v_buy_ticket NUMERIC(10, 2) := 0;
    v_sell_wt NUMERIC(14, 2) := 0;
    v_sell_tx INT := 0;
    v_sell_ticket NUMERIC(10, 2) := 0;
BEGIN
    -- Dynamic Sunday-to-Saturday company week:
    -- DOW: 0 = Sunday, 1 = Monday ... 6 = Saturday
    v_week_start := v_target_date - (EXTRACT(DOW FROM v_target_date)::int);
    v_week_end   := v_week_start + 6;
    v_week_num   := EXTRACT(week FROM (v_week_start + 3))::int;
    v_year       := EXTRACT(isoyear FROM (v_week_start + 3))::int;
    v_week_label := 'W' || v_week_num;
    v_year_week  := v_year || '-W' || LPAD(v_week_num::text, 2, '0');

    v_start_ts := v_week_start::text || ' 00:00:00';
    v_end_ts   := v_week_end::text || ' 23:59:59';

    -- Fast indexed aggregation over the 7-day slice only
    SELECT
        COUNT(*) FILTER (WHERE status IN ('ສໍາເລັດ', 'ສຳເລັດ') OR status ILIKE '%success%' OR status ILIKE '%complete%'),
        COUNT(DISTINCT phone) FILTER (WHERE status IN ('ສໍາເລັດ', 'ສຳເລັດ') OR status ILIKE '%success%' OR status ILIKE '%complete%'),
        COUNT(*) FILTER (WHERE transaction_type ILIKE '%OPEN_ACCOUNT%' OR transaction_type ILIKE '%REGISTER%'),
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') AND (status IN ('ສໍາເລັດ', 'ສຳເລັດ') OR status ILIKE '%success%')), 0),
        ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD' AND (status IN ('ສໍາເລັດ', 'ສຳເລັດ') OR status ILIKE '%success%')), 0) / 15.0, 2),
        COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD' AND (status IN ('ສໍາເລັດ', 'ສຳເລັດ') OR status ILIKE '%success%')),
        ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD' AND (status IN ('ສໍາເລັດ', 'ສຳເລັດ') OR status ILIKE '%success%')), 0) / 15.0, 2),
        COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD' AND (status IN ('ສໍາເລັດ', 'ສຳເລັດ') OR status ILIKE '%success%'))
    INTO
        v_all_tx,
        v_active_users,
        v_new_reg,
        v_withdraw_g,
        v_buy_wt,
        v_buy_tx,
        v_sell_wt,
        v_sell_tx
    FROM public.monthly_data
    WHERE created_at >= v_start_ts
      AND created_at <= v_end_ts;

    IF v_buy_tx > 0 THEN
        v_buy_ticket := ROUND((v_buy_wt * 15.0) / v_buy_tx, 2);
    END IF;
    IF v_sell_tx > 0 THEN
        v_sell_ticket := ROUND((v_sell_wt * 15.0) / v_sell_tx, 2);
    END IF;

    -- Upsert into summary_weekly_metrics
    INSERT INTO public.summary_weekly_metrics (
        year_week, week_label, week_number, year, start_date, end_date,
        all_transactions, active_users, new_registers, withdraw_gold_grams,
        buy_weight_15g, buy_transactions, buy_ticket_size_g,
        sell_weight_15g, sell_transactions, sell_ticket_size_g, updated_at
    )
    VALUES (
        v_year_week, v_week_label, v_week_num, v_year, v_week_start, v_week_end,
        v_all_tx, v_active_users, v_new_reg, v_withdraw_g,
        v_buy_wt, v_buy_tx, v_buy_ticket,
        v_sell_wt, v_sell_tx, v_sell_ticket, now()
    )
    ON CONFLICT (year_week) DO UPDATE SET
        all_transactions    = EXCLUDED.all_transactions,
        active_users        = EXCLUDED.active_users,
        new_registers       = EXCLUDED.new_registers,
        withdraw_gold_grams = EXCLUDED.withdraw_gold_grams,
        buy_weight_15g      = EXCLUDED.buy_weight_15g,
        buy_transactions    = EXCLUDED.buy_transactions,
        buy_ticket_size_g   = EXCLUDED.buy_ticket_size_g,
        sell_weight_15g     = EXCLUDED.sell_weight_15g,
        sell_transactions   = EXCLUDED.sell_transactions,
        sell_ticket_size_g  = EXCLUDED.sell_ticket_size_g,
        updated_at          = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_active_week_summary(DATE) TO anon, authenticated, service_role;
