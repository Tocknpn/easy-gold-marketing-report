-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE REPORT
-- Module: 18_handbook_reconciliation_test.sql
-- Description: Data Quality & Reconciliation Test Suite (Section 11 of Handbook)
-- Tests 5 random date ranges comparing summary fact tables against raw data.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.test_handbook_reconciliation()
RETURNS TABLE (
    test_range_id INT,
    start_date DATE,
    end_date DATE,
    raw_trans_count BIGINT,
    summary_trans_count BIGINT,
    count_delta BIGINT,
    raw_weight_g NUMERIC,
    summary_weight_g NUMERIC,
    weight_delta_g NUMERIC,
    raw_amount_lak NUMERIC,
    summary_amount_lak NUMERIC,
    amount_delta_lak NUMERIC,
    test_status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_test_id INT := 1;
    v_start DATE;
    v_end DATE;
    v_raw_count BIGINT;
    v_sum_count BIGINT;
    v_raw_weight NUMERIC;
    v_sum_weight NUMERIC;
    v_raw_amount NUMERIC;
    v_sum_amount NUMERIC;
BEGIN
    -- Define 5 test date slices
    FOR r IN 
        SELECT d_start::date AS s_date, (d_start + interval '6 days')::date AS e_date
        FROM (
            VALUES 
                ('2026-09-01'::date),
                ('2026-09-15'::date),
                ('2026-09-28'::date),
                ('2026-10-01'::date),
                ('2026-10-06'::date)
        ) AS t(d_start)
    LOOP
        v_start := r.s_date;
        v_end := r.e_date;

        -- 1. Query Raw Staging view
        SELECT 
            COALESCE(COUNT(*), 0),
            COALESCE(SUM(gold_weight_g), 0),
            COALESCE(SUM(amount_lak), 0)
        INTO v_raw_count, v_raw_weight, v_raw_amount
        FROM public.stg_clean_transactions
        WHERE tx_date >= v_start AND tx_date <= v_end;

        -- 2. Query fact_daily_core
        SELECT 
            COALESCE(SUM(trans_count), 0),
            COALESCE(SUM(gold_weight_g), 0),
            COALESCE(SUM(amount_lak), 0)
        INTO v_sum_count, v_sum_weight, v_sum_amount
        FROM public.fact_daily_core
        WHERE date_id >= v_start AND date_id <= v_end;

        -- 3. Return comparison row
        test_range_id := v_test_id;
        start_date := v_start;
        end_date := v_end;
        raw_trans_count := v_raw_count;
        summary_trans_count := v_sum_count;
        count_delta := v_sum_count - v_raw_count;
        raw_weight_g := ROUND(v_raw_weight, 4);
        summary_weight_g := ROUND(v_sum_weight, 4);
        weight_delta_g := ROUND(v_sum_weight - v_raw_weight, 4);
        raw_amount_lak := ROUND(v_raw_amount, 2);
        summary_amount_lak := ROUND(v_sum_amount, 2);
        amount_delta_lak := ROUND(v_sum_amount - v_raw_amount, 2);
        
        IF (count_delta = 0 AND ABS(weight_delta_g) < 0.001 AND ABS(amount_delta_lak) < 1.0) THEN
            test_status := 'PASS (100% RECONCILED)';
        ELSE
            test_status := 'FAIL (DISCREPANCY DETECTED)';
        END IF;

        RETURN NEXT;
        v_test_id := v_test_id + 1;
    END LOOP;
END;
$$;
