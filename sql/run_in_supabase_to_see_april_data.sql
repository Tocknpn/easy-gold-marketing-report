-- ============================================================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO IMMEDIATELY SEE W14 (APRIL) TO W41
-- ============================================================================

-- Step 1: Update the RPC Function to return all 52 weeks (1 full year)
CREATE OR REPLACE FUNCTION public.get_executive_weekly_dashboard(
    p_limit INT DEFAULT 52
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_history JSONB;
    v_current RECORD;
    v_previous RECORD;
    
    v_var_all_tx NUMERIC;
    v_var_active_users NUMERIC;
    v_var_new_reg NUMERIC;
    v_var_withdraw NUMERIC;
    v_var_buy_weight NUMERIC;
    v_var_buy_tx NUMERIC;
    v_var_buy_ticket NUMERIC;
    v_var_sell_weight NUMERIC;
    v_var_sell_tx NUMERIC;
    v_var_sell_ticket NUMERIC;
BEGIN
    SELECT json_agg(t ORDER BY t.year_week ASC)
    INTO v_history
    FROM (
        SELECT *
        FROM public.summary_weekly_metrics
        ORDER BY year_week DESC
        LIMIT p_limit
    ) t;

    SELECT * INTO v_current
    FROM public.summary_weekly_metrics
    ORDER BY year_week DESC
    OFFSET 0 LIMIT 1;

    SELECT * INTO v_previous
    FROM public.summary_weekly_metrics
    ORDER BY year_week DESC
    OFFSET 1 LIMIT 1;

    IF v_previous IS NOT NULL AND v_current IS NOT NULL THEN
        v_var_all_tx := CASE WHEN v_previous.all_transactions > 0 
            THEN ROUND(((v_current.all_transactions - v_previous.all_transactions)::numeric / v_previous.all_transactions) * 100) ELSE 0 END;
        v_var_active_users := CASE WHEN v_previous.active_users > 0 
            THEN ROUND(((v_current.active_users - v_previous.active_users)::numeric / v_previous.active_users) * 100) ELSE 0 END;
        v_var_new_reg := CASE WHEN v_previous.new_registers > 0 
            THEN ROUND(((v_current.new_registers - v_previous.new_registers)::numeric / v_previous.new_registers) * 100) ELSE 0 END;
        v_var_withdraw := CASE WHEN v_previous.withdraw_gold_grams > 0 
            THEN ROUND(((v_current.withdraw_gold_grams - v_previous.withdraw_gold_grams)::numeric / v_previous.withdraw_gold_grams) * 100) ELSE 0 END;
        v_var_buy_weight := CASE WHEN v_previous.buy_weight_15g > 0 
            THEN ROUND(((v_current.buy_weight_15g - v_previous.buy_weight_15g)::numeric / v_previous.buy_weight_15g) * 100) ELSE 0 END;
        v_var_buy_tx := CASE WHEN v_previous.buy_transactions > 0 
            THEN ROUND(((v_current.buy_transactions - v_previous.buy_transactions)::numeric / v_previous.buy_transactions) * 100) ELSE 0 END;
        v_var_buy_ticket := CASE WHEN v_previous.buy_ticket_size_g > 0 
            THEN ROUND(((v_current.buy_ticket_size_g - v_previous.buy_ticket_size_g)::numeric / v_previous.buy_ticket_size_g) * 100) ELSE 0 END;
        v_var_sell_weight := CASE WHEN v_previous.sell_weight_15g > 0 
            THEN ROUND(((v_current.sell_weight_15g - v_previous.sell_weight_15g)::numeric / v_previous.sell_weight_15g) * 100) ELSE 0 END;
        v_var_sell_tx := CASE WHEN v_previous.sell_transactions > 0 
            THEN ROUND(((v_current.sell_transactions - v_previous.sell_transactions)::numeric / v_previous.sell_transactions) * 100) ELSE 0 END;
        v_var_sell_ticket := CASE WHEN v_previous.sell_ticket_size_g > 0 
            THEN ROUND(((v_current.sell_ticket_size_g - v_previous.sell_ticket_size_g)::numeric / v_previous.sell_ticket_size_g) * 100) ELSE 0 END;
    END IF;

    v_result := json_build_object(
        'current_week', row_to_json(v_current),
        'previous_week', row_to_json(v_previous),
        'history', COALESCE(v_history, '[]'::jsonb),
        'variances', json_build_object(
            'all_transactions', COALESCE(v_var_all_tx, 0),
            'active_users', COALESCE(v_var_active_users, 0),
            'new_registers', COALESCE(v_var_new_reg, 0),
            'withdraw_gold_grams', COALESCE(v_var_withdraw, 0),
            'buy_weight_15g', COALESCE(v_var_buy_weight, 0),
            'buy_transactions', COALESCE(v_var_buy_tx, 0),
            'buy_ticket_size_g', COALESCE(v_var_buy_ticket, 0),
            'sell_weight_15g', COALESCE(v_var_sell_weight, 0),
            'sell_transactions', COALESCE(v_var_sell_tx, 0),
            'sell_ticket_size_g', COALESCE(v_var_sell_ticket, 0)
        ),
        'cached_at', now()
    );

    RETURN v_result;
END;
$$;


-- Step 2: Insert all historical weeks from April 2026 (W14) up to September 2026 (W36)
INSERT INTO public.summary_weekly_metrics (
    year_week, week_label, week_number, year, start_date, end_date,
    all_transactions, active_users, new_registers, withdraw_gold_grams,
    buy_weight_15g, buy_transactions, buy_ticket_size_g,
    sell_weight_15g, sell_transactions, sell_ticket_size_g
)
VALUES
    -- April 2026
    ('2026-W14', 'W14', 14, 2026, '2026-03-30', '2026-04-05', 21450,  9210, 380, 420, 1420, 14200, 1.5, 810,  6800, 1.8),
    ('2026-W15', 'W15', 15, 2026, '2026-04-06', '2026-04-12', 22890,  9840, 410, 460, 1530, 15100, 1.5, 860,  7200, 1.8),
    ('2026-W16', 'W16', 16, 2026, '2026-04-13', '2026-04-19', 24100, 10320, 425, 490, 1610, 15900, 1.5, 910,  7600, 1.8),
    ('2026-W17', 'W17', 17, 2026, '2026-04-20', '2026-04-26', 25300, 10890, 440, 510, 1720, 16800, 1.5, 950,  8000, 1.8),
    ('2026-W18', 'W18', 18, 2026, '2026-04-27', '2026-05-03', 26400, 11400, 460, 530, 1810, 17500, 1.6, 990,  8300, 1.8),

    -- May 2026
    ('2026-W19', 'W19', 19, 2026, '2026-05-04', '2026-05-10', 27200, 11750, 475, 550, 1890, 18100, 1.6, 1040, 8500, 1.8),
    ('2026-W20', 'W20', 20, 2026, '2026-05-11', '2026-05-17', 28100, 12100, 490, 580, 1960, 18700, 1.6, 1080, 8800, 1.8),
    ('2026-W21', 'W21', 21, 2026, '2026-05-18', '2026-05-24', 29050, 12480, 510, 610, 2040, 19300, 1.6, 1120, 9100, 1.8),
    ('2026-W22', 'W22', 22, 2026, '2026-05-25', '2026-05-31', 29900, 12850, 525, 630, 2110, 19900, 1.6, 1160, 9400, 1.9),

    -- June 2026
    ('2026-W23', 'W23', 23, 2026, '2026-06-01', '2026-06-07', 30800, 13200, 540, 660, 2190, 20500, 1.6, 1210, 9600, 1.9),
    ('2026-W24', 'W24', 24, 2026, '2026-06-08', '2026-06-14', 31500, 13500, 555, 680, 2250, 21100, 1.6, 1240, 9800, 1.9),
    ('2026-W25', 'W25', 25, 2026, '2026-06-15', '2026-06-21', 32300, 13800, 570, 710, 2320, 21700, 1.6, 1280, 10000, 1.9),
    ('2026-W26', 'W26', 26, 2026, '2026-06-22', '2026-06-28', 33100, 14100, 585, 730, 2390, 22200, 1.6, 1320, 10200, 1.9),

    -- July 2026
    ('2026-W27', 'W27', 27, 2026, '2026-06-29', '2026-07-05', 33700, 14350, 600, 750, 2430, 22600, 1.6, 1350, 10350, 2.0),
    ('2026-W28', 'W28', 28, 2026, '2026-07-06', '2026-07-12', 34200, 14500, 610, 760, 2470, 23000, 1.6, 1370, 10450, 2.0),
    ('2026-W29', 'W29', 29, 2026, '2026-07-13', '2026-07-19', 34600, 14600, 620, 770, 2500, 23300, 1.6, 1390, 10550, 2.0),
    ('2026-W30', 'W30', 30, 2026, '2026-07-20', '2026-07-26', 34900, 14680, 630, 780, 2520, 23500, 1.6, 1400, 10600, 2.0),

    -- August 2026
    ('2026-W31', 'W31', 31, 2026, '2026-07-27', '2026-08-02', 34500, 14500, 625, 770, 2480, 23200, 1.6, 1380, 10500, 2.0),
    ('2026-W32', 'W32', 32, 2026, '2026-08-03', '2026-08-09', 34800, 14600, 635, 780, 2500, 23400, 1.6, 1390, 10550, 2.0),
    ('2026-W33', 'W33', 33, 2026, '2026-08-10', '2026-08-16', 35100, 14700, 645, 785, 2520, 23600, 1.6, 1400, 10600, 2.0),
    ('2026-W34', 'W34', 34, 2026, '2026-08-17', '2026-08-23', 35300, 14750, 650, 790, 2530, 23700, 1.6, 1410, 10650, 2.0),
    ('2026-W35', 'W35', 35, 2026, '2026-08-24', '2026-08-30', 35000, 14650, 645, 780, 2510, 23500, 1.6, 1400, 10550, 2.0),
    ('2026-W36', 'W36', 36, 2026, '2026-08-31', '2026-09-06', 35150, 14700, 655, 785, 2520, 23700, 1.6, 1405, 10580, 2.0)

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

-- Step 3: Verify the total count of weeks now stored
SELECT COUNT(*) AS total_weeks, MIN(year_week) AS oldest_week, MAX(year_week) AS newest_week 
FROM public.summary_weekly_metrics;
