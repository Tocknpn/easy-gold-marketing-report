-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE REPORT
-- Module: 20_compare_periods_engine.sql
-- Description: Single-Pass Period Comparison Engine (Current vs Comp with Deltas)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compare_reporting_periods(
    p_cur_start DATE,
    p_cur_end DATE,
    p_comp_start DATE,
    p_comp_end DATE,
    p_branches TEXT[] DEFAULT NULL,
    p_banks TEXT[] DEFAULT NULL,
    p_status TEXT DEFAULT 'COMPLETED'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cur_days INT;
    v_comp_days INT;
    v_cur_record RECORD;
    v_comp_record RECORD;
    v_result JSONB;
BEGIN
    v_cur_days := (p_cur_end - p_cur_start) + 1;
    v_comp_days := (p_comp_end - p_comp_start) + 1;

    -- 1. Query fact_daily_core in a single pass with conditional aggregates
    SELECT
        -- Current Period
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end), 0) AS total_trans_cur,
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'BUY_GOLD'), 0) AS buy_trans_cur,
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'SALE_GOLD'), 0) AS sell_trans_cur,
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'WITHDRAW_GOLD'), 0) AS withdraw_trans_cur,
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'OPEN_ACCOUNT'), 0) AS new_reg_cur,
        COALESCE(SUM(gold_weight_g) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'BUY_GOLD'), 0) AS buy_weight_g_cur,
        COALESCE(SUM(gold_weight_g) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'SALE_GOLD'), 0) AS sell_weight_g_cur,
        COALESCE(SUM(gold_weight_g) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'WITHDRAW_GOLD'), 0) AS withdraw_weight_g_cur,
        COALESCE(SUM(amount_lak) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'BUY_GOLD'), 0) AS buy_amount_cur,
        COALESCE(SUM(amount_lak) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end AND tx_type_code = 'SALE_GOLD'), 0) AS sell_amount_cur,
        COALESCE(SUM(trans_count_ge_500k) FILTER (WHERE date_id BETWEEN p_cur_start AND p_cur_end), 0) AS ge_500k_trans_cur,

        -- Comparison Period
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end), 0) AS total_trans_comp,
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'BUY_GOLD'), 0) AS buy_trans_comp,
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'SALE_GOLD'), 0) AS sell_trans_comp,
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'WITHDRAW_GOLD'), 0) AS withdraw_trans_comp,
        COALESCE(SUM(trans_count) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'OPEN_ACCOUNT'), 0) AS new_reg_comp,
        COALESCE(SUM(gold_weight_g) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'BUY_GOLD'), 0) AS buy_weight_g_comp,
        COALESCE(SUM(gold_weight_g) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'SALE_GOLD'), 0) AS sell_weight_g_comp,
        COALESCE(SUM(gold_weight_g) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'WITHDRAW_GOLD'), 0) AS withdraw_weight_g_comp,
        COALESCE(SUM(amount_lak) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'BUY_GOLD'), 0) AS buy_amount_comp,
        COALESCE(SUM(amount_lak) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end AND tx_type_code = 'SALE_GOLD'), 0) AS sell_amount_comp,
        COALESCE(SUM(trans_count_ge_500k) FILTER (WHERE date_id BETWEEN p_comp_start AND p_comp_end), 0) AS ge_500k_trans_comp
    INTO v_cur_record
    FROM public.fact_daily_core
    WHERE (date_id BETWEEN p_cur_start AND p_cur_end OR date_id BETWEEN p_comp_start AND p_comp_end)
      AND (p_branches IS NULL OR branch_code = ANY(p_branches))
      AND (p_banks IS NULL OR bank_code = ANY(p_banks))
      AND (p_status IS NULL OR status_code = p_status);

    -- 2. Build structured JSON response with metrics and variances
    RETURN jsonb_build_object(
        'meta', jsonb_build_object(
            'current_period', jsonb_build_object('start_date', p_cur_start, 'end_date', p_cur_end, 'days', v_cur_days),
            'comparison_period', jsonb_build_object('start_date', p_comp_start, 'end_date', p_comp_end, 'days', v_comp_days),
            'generated_at', now()
        ),
        'metrics', jsonb_build_object(
            'buy_transactions', jsonb_build_object(
                'label', 'Buy Transactions',
                'current', v_cur_record.buy_trans_cur,
                'comparison', v_cur_record.buy_trans_comp,
                'delta', v_cur_record.buy_trans_cur - v_cur_record.buy_trans_comp,
                'growth_pct', CASE WHEN v_cur_record.buy_trans_comp > 0 
                    THEN ROUND(((v_cur_record.buy_trans_cur - v_cur_record.buy_trans_comp)::numeric / v_cur_record.buy_trans_comp) * 100, 1) 
                    ELSE 0 END
            ),
            'buy_weight_g', jsonb_build_object(
                'label', 'Buy Weight (g)',
                'current', ROUND(v_cur_record.buy_weight_g_cur, 2),
                'comparison', ROUND(v_cur_record.buy_weight_g_comp, 2),
                'delta', ROUND(v_cur_record.buy_weight_g_cur - v_cur_record.buy_weight_g_comp, 2),
                'growth_pct', CASE WHEN v_cur_record.buy_weight_g_comp > 0 
                    THEN ROUND(((v_cur_record.buy_weight_g_cur - v_cur_record.buy_weight_g_comp) / v_cur_record.buy_weight_g_comp) * 100, 1) 
                    ELSE 0 END
            ),
            'sell_transactions', jsonb_build_object(
                'label', 'Sell Transactions',
                'current', v_cur_record.sell_trans_cur,
                'comparison', v_cur_record.sell_trans_comp,
                'delta', v_cur_record.sell_trans_cur - v_cur_record.sell_trans_comp,
                'growth_pct', CASE WHEN v_cur_record.sell_trans_comp > 0 
                    THEN ROUND(((v_cur_record.sell_trans_cur - v_cur_record.sell_trans_comp)::numeric / v_cur_record.sell_trans_comp) * 100, 1) 
                    ELSE 0 END
            ),
            'sell_weight_g', jsonb_build_object(
                'label', 'Sell Weight (g)',
                'current', ROUND(v_cur_record.sell_weight_g_cur, 2),
                'comparison', ROUND(v_cur_record.sell_weight_g_comp, 2),
                'delta', ROUND(v_cur_record.sell_weight_g_cur - v_cur_record.sell_weight_g_comp, 2),
                'growth_pct', CASE WHEN v_cur_record.sell_weight_g_comp > 0 
                    THEN ROUND(((v_cur_record.sell_weight_g_cur - v_cur_record.sell_weight_g_comp) / v_cur_record.sell_weight_g_comp) * 100, 1) 
                    ELSE 0 END
            ),
            'withdraw_weight_g', jsonb_build_object(
                'label', 'Withdraw Weight (g)',
                'current', ROUND(v_cur_record.withdraw_weight_g_cur, 2),
                'comparison', ROUND(v_cur_record.withdraw_weight_g_comp, 2),
                'delta', ROUND(v_cur_record.withdraw_weight_g_cur - v_cur_record.withdraw_weight_g_comp, 2),
                'growth_pct', CASE WHEN v_cur_record.withdraw_weight_g_comp > 0 
                    THEN ROUND(((v_cur_record.withdraw_weight_g_cur - v_cur_record.withdraw_weight_g_comp) / v_cur_record.withdraw_weight_g_comp) * 100, 1) 
                    ELSE 0 END
            ),
            'new_registers', jsonb_build_object(
                'label', 'New Registers',
                'current', v_cur_record.new_reg_cur,
                'comparison', v_cur_record.new_reg_comp,
                'delta', v_cur_record.new_reg_cur - v_cur_record.new_reg_comp,
                'growth_pct', CASE WHEN v_cur_record.new_reg_comp > 0 
                    THEN ROUND(((v_cur_record.new_reg_cur - v_cur_record.new_reg_comp)::numeric / v_cur_record.new_reg_comp) * 100, 1) 
                    ELSE 0 END
            ),
            'campaign_ge_500k_trans', jsonb_build_object(
                'label', 'Transactions >= 500k LAK',
                'current', v_cur_record.ge_500k_trans_cur,
                'comparison', v_cur_record.ge_500k_trans_comp,
                'delta', v_cur_record.ge_500k_trans_cur - v_cur_record.ge_500k_trans_comp,
                'growth_pct', CASE WHEN v_cur_record.ge_500k_trans_comp > 0 
                    THEN ROUND(((v_cur_record.ge_500k_trans_cur - v_cur_record.ge_500k_trans_comp)::numeric / v_cur_record.ge_500k_trans_comp) * 100, 1) 
                    ELSE 0 END
            )
        )
    );
END;
$$;
