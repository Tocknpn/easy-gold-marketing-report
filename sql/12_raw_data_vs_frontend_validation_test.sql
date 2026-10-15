-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Test Suite: 12_raw_data_vs_frontend_validation_test.sql
-- Purpose: End-to-End Validation Test Case: Raw Table (monthly_data) vs Frontend Web Display
-- ============================================================================

-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard -> SQL Editor.
-- 2. Run the queries below to verify that the raw transactions in `monthly_data`
--    calculate to the EXACT same numbers shown on the frontend dashboard.
-- ============================================================================


-- ============================================================================
-- TEST CASE 1: WEEKLY EXECUTIVE DASHBOARD VERIFICATION (e.g. Week 41 / W41)
-- Compares direct raw aggregation of `monthly_data` against `summary_weekly_metrics`
-- which is what the frontend web Platform Overview, Buy Activity & Sell Activity cards display.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'RUNNING TEST CASE 1: RAW DATA VS FRONTEND WEEKLY METRICS';
    RAISE NOTICE '=======================================================';
END $$;

WITH target_week AS (
    -- You can change this to any week you want to test (e.g. '2026-W41' or latest week)
    SELECT 
        COALESCE(
            (SELECT year_week FROM public.summary_weekly_metrics ORDER BY year_week DESC LIMIT 1),
            '2026-W41'
        ) AS year_week
),
week_bounds AS (
    SELECT 
        w.year_week,
        s.start_date::timestamptz AS start_ts,
        (s.end_date::date + interval '1 day')::timestamptz AS end_ts,
        s.week_label
    FROM target_week w
    JOIN public.summary_weekly_metrics s ON s.year_week = w.year_week
),
raw_calculations AS (
    -- Calculate metrics directly from raw transactions in monthly_data
    SELECT 
        b.year_week,
        b.week_label,
        -- 1. Platform Overview
        COUNT(*) FILTER (WHERE m.status = 'ສໍາເລັດ') AS raw_all_transactions,
        COUNT(DISTINCT m.phone) FILTER (WHERE m.status = 'ສໍາເລັດ') AS raw_active_users,
        COUNT(*) FILTER (WHERE m.transaction_type = 'OPEN_ACCOUNT') AS raw_new_registers,
        COALESCE(SUM(m.gold_weight) FILTER (WHERE m.transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') AND m.status = 'ສໍາເລັດ'), 0) AS raw_withdraw_gold_grams,

        -- 2. Buy Activity
        ROUND(COALESCE(SUM(m.gold_weight) FILTER (WHERE m.transaction_type = 'BUY_GOLD' AND m.status = 'ສໍາເລັດ'), 0) / 15.0) AS raw_buy_weight_15g,
        COUNT(*) FILTER (WHERE m.transaction_type = 'BUY_GOLD' AND m.status = 'ສໍາເລັດ') AS raw_buy_transactions,
        CASE 
            WHEN COUNT(*) FILTER (WHERE m.transaction_type = 'BUY_GOLD' AND m.status = 'ສໍາເລັດ') > 0
            THEN ROUND(
                (COALESCE(SUM(m.gold_weight) FILTER (WHERE m.transaction_type = 'BUY_GOLD' AND m.status = 'ສໍາເລັດ'), 0) 
                 / COUNT(*) FILTER (WHERE m.transaction_type = 'BUY_GOLD' AND m.status = 'ສໍາເລັດ'))::numeric, 1
            )
            ELSE 0 
        END AS raw_buy_ticket_size_g,

        -- 3. Sell Activity
        ROUND(COALESCE(SUM(m.gold_weight) FILTER (WHERE m.transaction_type = 'SALE_GOLD' AND m.status = 'ສໍາເລັດ'), 0) / 15.0) AS raw_sell_weight_15g,
        COUNT(*) FILTER (WHERE m.transaction_type = 'SALE_GOLD' AND m.status = 'ສໍາເລັດ') AS raw_sell_transactions,
        CASE 
            WHEN COUNT(*) FILTER (WHERE m.transaction_type = 'SALE_GOLD' AND m.status = 'ສໍາເລັດ') > 0
            THEN ROUND(
                (COALESCE(SUM(m.gold_weight) FILTER (WHERE m.transaction_type = 'SALE_GOLD' AND m.status = 'ສໍາເລັດ'), 0) 
                 / COUNT(*) FILTER (WHERE m.transaction_type = 'SALE_GOLD' AND m.status = 'ສໍາເລັດ'))::numeric, 1
            )
            ELSE 0 
        END AS raw_sell_ticket_size_g

    FROM week_bounds b
    LEFT JOIN public.monthly_data m 
        ON m.created_at >= b.start_ts 
       AND m.created_at < b.end_ts
    GROUP BY b.year_week, b.week_label
),
frontend_stored AS (
    SELECT 
        s.year_week,
        s.week_label,
        s.all_transactions AS web_all_transactions,
        s.active_users AS web_active_users,
        s.new_registers AS web_new_registers,
        s.withdraw_gold_grams AS web_withdraw_gold_grams,
        s.buy_weight_15g AS web_buy_weight_15g,
        s.buy_transactions AS web_buy_transactions,
        s.buy_ticket_size_g AS web_buy_ticket_size_g,
        s.sell_weight_15g AS web_sell_weight_15g,
        s.sell_transactions AS web_sell_transactions,
        s.sell_ticket_size_g AS web_sell_ticket_size_g
    FROM public.summary_weekly_metrics s
    JOIN target_week t ON t.year_week = s.year_week
)
-- PIVOTED SIDE-BY-SIDE AUDIT REPORT
SELECT 
    f.week_label AS target_week,
    metric.name AS metric_name,
    metric.raw_value::text AS raw_data_from_monthly_data,
    metric.web_value::text AS frontend_web_card_value,
    CASE 
        WHEN metric.raw_value = metric.web_value THEN '✅ 100% MATCH'
        ELSE '❌ MISMATCH'
    END AS validation_status,
    metric.unit_formula AS calculation_formula
FROM frontend_stored f
JOIN raw_calculations r ON r.year_week = f.year_week
CROSS JOIN LATERAL (
    VALUES 
        ('Platform: All Transactions', r.raw_all_transactions, f.web_all_transactions, 'COUNT(*) WHERE status = ''ສໍາເລັດ'''),
        ('Platform: User Participate', r.raw_active_users, f.web_active_users, 'COUNT(DISTINCT phone) WHERE status = ''ສໍາເລັດ'''),
        ('Platform: New Register', r.raw_new_registers, f.web_new_registers, 'COUNT(*) WHERE transaction_type = ''OPEN_ACCOUNT'''),
        ('Platform: Gold Withdraw (g)', r.raw_withdraw_gold_grams, f.web_withdraw_gold_grams, 'SUM(gold_weight) WHERE type IN (WITHDRAW, MARKETHUB)'),
        ('Buy: Gold Weight (15g Baht)', r.raw_buy_weight_15g, f.web_buy_weight_15g, 'ROUND(SUM(gold_weight) / 15.0)'),
        ('Buy: Transactions', r.raw_buy_transactions, f.web_buy_transactions, 'COUNT(*) WHERE type = ''BUY_GOLD'''),
        ('Buy: Ticket Size (g/tx)', r.raw_buy_ticket_size_g, f.web_buy_ticket_size_g, 'ROUND(Buy_Grams / Buy_Tx, 1)'),
        ('Sell: Gold Weight (15g Baht)', r.raw_sell_weight_15g, f.web_sell_weight_15g, 'ROUND(SUM(gold_weight) / 15.0)'),
        ('Sell: Transactions', r.raw_sell_transactions, f.web_sell_transactions, 'COUNT(*) WHERE type = ''SALE_GOLD'''),
        ('Sell: Ticket Size (g/tx)', r.raw_sell_ticket_size_g, f.web_sell_ticket_size_g, 'ROUND(Sell_Grams / Sell_Tx, 1)')
) AS metric(name, raw_value, web_value, unit_formula);



-- ============================================================================
-- TEST CASE 2: DYNAMIC BI RPC TEST (get_dynamic_bi_report vs Raw SQL)
-- Validates the Dynamic BI Reporting Module calculations over custom dates
-- ============================================================================

WITH test_date_range AS (
    SELECT 
        -- Default to the most recent month present in monthly_data
        date_trunc('month', MAX(created_at)) AS start_ts,
        MAX(created_at) AS end_ts
    FROM public.monthly_data
),
raw_dynamic AS (
    SELECT 
        COUNT(*) AS raw_total_tx,
        COUNT(DISTINCT phone) AS raw_unique_users,
        COALESCE(SUM(total_amount), 0) AS raw_total_amount_lak,
        COALESCE(SUM(gold_weight), 0) AS raw_total_gold_weight_g,
        COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD') AS raw_buy_tx,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD'), 0) AS raw_buy_gold_g,
        COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD') AS raw_sell_tx,
        COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD'), 0) AS raw_sell_gold_g
    FROM public.monthly_data m, test_date_range r
    WHERE m.created_at >= r.start_ts 
      AND m.created_at <= r.end_ts
      AND m.status = 'ສໍາເລັດ'
),
rpc_dynamic AS (
    SELECT 
        (res->'summary'->>'total_transaction')::bigint AS rpc_total_tx,
        (res->'summary'->>'total_unique_user')::bigint AS rpc_unique_users,
        (res->'summary'->>'total_amount_lak')::numeric AS rpc_total_amount_lak,
        (res->'summary'->>'total_gold_weight_g')::numeric AS rpc_total_gold_weight_g,
        (res->'summary'->>'total_buy_transac')::bigint AS rpc_buy_tx,
        (res->'summary'->>'gold_weight_buy_g')::numeric AS rpc_buy_gold_g,
        (res->'summary'->>'total_sell_transac')::bigint AS rpc_sell_tx,
        (res->'summary'->>'gold_weight_sell_g')::numeric AS rpc_sell_gold_g
    FROM test_date_range r,
    LATERAL public.get_dynamic_bi_report(
        p_start_date := r.start_ts,
        p_end_date := r.end_ts,
        p_status := 'ສໍາເລັດ'
    ) AS res
)
SELECT 
    'Dynamic BI Summary' AS test_suite,
    metric_name,
    raw_val::text AS raw_sql_value,
    rpc_val::text AS rpc_frontend_value,
    CASE WHEN raw_val = rpc_val THEN '✅ 100% MATCH' ELSE '❌ MISMATCH' END AS status
FROM raw_dynamic r
CROSS JOIN rpc_dynamic p
CROSS JOIN LATERAL (
    VALUES
        ('Total Transactions', r.raw_total_tx, p.rpc_total_tx),
        ('Total Unique Users', r.raw_unique_users, p.rpc_unique_users),
        ('Total Amount (LAK)', r.raw_total_amount_lak, p.rpc_total_amount_lak),
        ('Total Gold Weight (g)', r.raw_total_gold_weight_g, p.rpc_total_gold_weight_g),
        ('Buy Transactions', r.raw_buy_tx, p.rpc_buy_tx),
        ('Buy Gold Weight (g)', r.raw_buy_gold_g, p.rpc_buy_gold_g),
        ('Sell Transactions', r.raw_sell_tx, p.rpc_sell_tx),
        ('Sell Gold Weight (g)', r.raw_sell_gold_g, p.rpc_sell_gold_g)
) AS v(metric_name, raw_val, rpc_val);



-- ============================================================================
-- TEST CASE 3: PERIOD-OVER-PERIOD VARIANCE CALCULATION TEST (WoW %)
-- Validates the percentage variance formula used in the frontend badges:
-- Formula: ((Current_Week - Previous_Week) / Previous_Week) * 100
-- ============================================================================

WITH sorted_weeks AS (
    SELECT 
        week_label,
        year_week,
        all_transactions,
        active_users,
        buy_weight_15g,
        buy_transactions,
        sell_weight_15g,
        sell_transactions,
        ROW_NUMBER() OVER (ORDER BY year_week DESC) AS rn
    FROM public.summary_weekly_metrics
),
latest_pair AS (
    SELECT 
        c.week_label AS current_week,
        p.week_label AS prev_week,
        c.all_transactions AS cur_all_tx,
        p.all_transactions AS prev_all_tx,
        c.active_users AS cur_users,
        p.active_users AS prev_users,
        c.buy_weight_15g AS cur_buy_wt,
        p.buy_weight_15g AS prev_buy_wt
    FROM (SELECT * FROM sorted_weeks WHERE rn = 1) c
    LEFT JOIN (SELECT * FROM sorted_weeks WHERE rn = 2) p ON true
)
SELECT 
    current_week || ' vs ' || prev_week AS comparison_weeks,
    'All Transactions WoW %' AS metric,
    cur_all_tx AS current_value,
    prev_all_tx AS previous_value,
    ROUND(((cur_all_tx - prev_all_tx)::numeric / NULLIF(prev_all_tx, 0)) * 100) || '%' AS calculated_variance,
    '((Current - Previous) / Previous) * 100' AS formula_verified
FROM latest_pair
UNION ALL
SELECT 
    current_week || ' vs ' || prev_week,
    'User Participate WoW %',
    cur_users,
    prev_users,
    ROUND(((cur_users - prev_users)::numeric / NULLIF(prev_users, 0)) * 100) || '%',
    '((Current - Previous) / Previous) * 100'
FROM latest_pair
UNION ALL
SELECT 
    current_week || ' vs ' || prev_week,
    'Buy Gold Weight (15g) WoW %',
    cur_buy_wt,
    prev_buy_wt,
    ROUND(((cur_buy_wt - prev_buy_wt)::numeric / NULLIF(prev_buy_wt, 0)) * 100) || '%',
    '((Current - Previous) / Previous) * 100'
FROM latest_pair;



-- ============================================================================
-- TEST CASE 4: MTD & FORECAST REPORT VERIFICATION (get_mtd_forecast_report)
-- Validates Month-to-Date and Projected Month-End Landing multipliers
-- ============================================================================

WITH mtd_params AS (
    SELECT 
        '2026-10-11'::date AS as_of_date,
        2026 AS comp_year,
        9 AS comp_month
),
raw_mtd AS (
    SELECT 
        -- October 1 to October 11 (Elapsed Days = 11, Total Days in Oct = 31)
        ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'BUY_GOLD' AND status = 'ສໍາເລັດ'), 0) / 15.0) AS cur_buy_weight_15g,
        COUNT(*) FILTER (WHERE transaction_type = 'BUY_GOLD' AND status = 'ສໍາເລັດ') AS cur_buy_tx,
        ROUND(COALESCE(SUM(gold_weight) FILTER (WHERE transaction_type = 'SALE_GOLD' AND status = 'ສໍາເລັດ'), 0) / 15.0) AS cur_sell_weight_15g,
        COUNT(*) FILTER (WHERE transaction_type = 'SALE_GOLD' AND status = 'ສໍາເລັດ') AS cur_sell_tx,
        COUNT(*) FILTER (WHERE status = 'ສໍາເລັດ') AS cur_total_tx
    FROM public.monthly_data, mtd_params p
    WHERE created_at >= date_trunc('month', p.as_of_date)
      AND created_at <= p.as_of_date + interval '1 day'
),
rpc_mtd AS (
    SELECT 
        (res->'current_mtd'->>'buy_weight_15g')::numeric AS rpc_buy_weight_15g,
        (res->'current_mtd'->>'buy_transactions')::bigint AS rpc_buy_tx,
        (res->'current_mtd'->>'sell_weight_15g')::numeric AS rpc_sell_weight_15g,
        (res->'current_mtd'->>'sell_transactions')::bigint AS rpc_sell_tx,
        (res->'current_mtd'->>'total_transactions')::bigint AS rpc_total_tx
    FROM mtd_params p,
    LATERAL public.get_mtd_forecast_report(
        p_as_of_date := p.as_of_date,
        p_comp_year := p.comp_year,
        p_comp_month := p.comp_month
    ) AS res
)
SELECT 
    'MTD Oct 1-11' AS report_section,
    v.metric_name,
    v.raw_val::text AS raw_table_val,
    v.rpc_val::text AS frontend_rpc_val,
    CASE WHEN v.raw_val = v.rpc_val THEN '✅ 100% MATCH' ELSE '❌ MISMATCH' END AS match_status,
    'Projected Month-End = MTD * (31 / 11) = ' || ROUND(v.raw_val * (31.0 / 11.0)) AS forecast_formula_check
FROM raw_mtd r
CROSS JOIN rpc_mtd p
CROSS JOIN LATERAL (
    VALUES
        ('Buy Gold Weight (15g)', r.cur_buy_weight_15g, p.rpc_buy_weight_15g),
        ('Buy Transactions', r.cur_buy_tx, p.rpc_buy_tx),
        ('Sell Gold Weight (15g)', r.cur_sell_weight_15g, p.rpc_sell_weight_15g),
        ('Sell Transactions', r.cur_sell_tx, p.rpc_sell_tx),
        ('Total Transactions', r.cur_total_tx, p.rpc_total_tx)
) AS v(metric_name, raw_val, rpc_val);



-- ============================================================================
-- TEST CASE 5: INSPECT 10 ACTUAL RAW TRANSACTION ROWS (SANITY CHECK)
-- Allows human spot-checking of actual transactions contributing to the KPIs.
-- ============================================================================

SELECT 
    no,
    customer_name,
    phone,
    transaction_type,
    bank,
    gold_weight,
    ROUND(gold_weight / 15.0, 2) AS weight_in_15g_baht,
    total_amount AS total_amount_lak,
    status,
    branch,
    created_at
FROM public.monthly_data
ORDER BY created_at DESC
LIMIT 10;

