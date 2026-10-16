-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Test Suite: 25_test_campaign_ldb_and_timeline_in_supabase.sql
-- Purpose: Verify Campaign Condition 'LDB' + 'Buy trans >= 100k' and Timeline Evaluation
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to SQL Editor -> New Query.
-- 3. Paste and run this script to see raw counts and exact function outputs.
-- ============================================================================


-- ============================================================================
-- TEST 1: INSPECT RAW LDB TRANSACTIONS IN `monthly_data`
-- Checks if LDB data exists, what date ranges exist, and transactions >= 100,000 LAK
-- ============================================================================
SELECT 
    '1. RAW LDB DATA OVERVIEW' AS test_name,
    COUNT(*) AS total_ldb_all_records,
    COUNT(CASE WHEN status = 'ສໍາເລັດ' THEN 1 END) AS completed_ldb_all,
    COUNT(CASE WHEN status = 'ສໍາເລັດ' AND transaction_type = 'BUY_GOLD' THEN 1 END) AS buy_gold_ldb_completed,
    COUNT(CASE WHEN status = 'ສໍາເລັດ' AND transaction_type = 'BUY_GOLD' AND total_amount >= 100000 THEN 1 END) AS buy_gold_ldb_gte_100k,
    MIN(public.parse_tx_date(created_at::text))::date AS earliest_ldb_tx,
    MAX(public.parse_tx_date(created_at::text))::date AS latest_ldb_tx
FROM public.monthly_data
WHERE bank ILIKE '%LDB%';


-- ============================================================================
-- TEST 2: LDB TRANSACTIONS BY DATE IN OCTOBER 2026
-- Shows daily volume of LDB Buy Gold transactions >= 100k in October
-- ============================================================================
SELECT 
    public.parse_tx_date(created_at::text)::date AS tx_date,
    COUNT(*) AS buy_trans_ldb_gte_100k,
    ROUND(SUM(total_amount) / 1000000.0, 1) AS buy_value_mil_lak,
    ROUND(SUM(gold_weight), 1) AS gold_weight_g
FROM public.monthly_data
WHERE bank ILIKE '%LDB%'
  AND status = 'ສໍາເລັດ'
  AND transaction_type = 'BUY_GOLD'
  AND total_amount >= 100000
  AND public.parse_tx_date(created_at::text) >= '2026-10-01'::timestamptz
  AND public.parse_tx_date(created_at::text) <= '2026-10-31 23:59:59.999'::timestamptz
GROUP BY 1
ORDER BY tx_date ASC;


-- ============================================================================
-- TEST 3: EXACT FUNCTION EXECUTION AS SHOWN ON YOUR SCREEN
-- Campaign: 16 Oct 2026 -> 27 Oct 2026
-- Cutoff As-Of Date: 14 Oct 2026 (2 days before campaign start -> UPCOMING)
-- Expected Result:
--   mtd_transac = 0  (Campaign has not started yet as of 14 Oct)
--   backward_transac > 0  (Shows pre-event 12-day benchmark: 04 Oct to 15 Oct)
-- ============================================================================
SELECT 
    'TEST 3 (CURRENT SCREEN): As of 14 Oct, Start 16 Oct' AS scenario,
    public.get_campaign_actual_metrics(
        p_start_date       := '2026-10-16'::date,
        p_as_of_date       := '2026-10-14'::date,
        p_backward_start   := '2026-10-04'::date,
        p_backward_end     := '2026-10-15'::date,
        p_cond_type        := 'amount_gte',
        p_cond_op          := '>=',
        p_cond_val         := 100000,
        p_cond_max         := NULL,
        p_tx_type          := 'BUY_GOLD',
        p_bank             := 'LDB'
    ) AS engine_output;


-- ============================================================================
-- TEST 4: IF CUTOFF AS-OF DATE IS TODAY (16 Oct 2026 - Day 1 of Campaign)
-- Campaign: 16 Oct 2026 -> 27 Oct 2026
-- Cutoff As-Of Date: 16 Oct 2026 (Day 1)
-- Expected Result:
--   mtd_transac = Day 1 actual volume on 16 Oct for LDB >= 100k
-- ============================================================================
SELECT 
    'TEST 4: As of 16 Oct (Today / Day 1), Start 16 Oct' AS scenario,
    public.get_campaign_actual_metrics(
        p_start_date       := '2026-10-16'::date,
        p_as_of_date       := '2026-10-16'::date,
        p_backward_start   := '2026-10-15'::date,
        p_backward_end     := '2026-10-15'::date,
        p_cond_type        := 'amount_gte',
        p_cond_op          := '>=',
        p_cond_val         := 100000,
        p_cond_max         := NULL,
        p_tx_type          := 'BUY_GOLD',
        p_bank             := 'LDB'
    ) AS engine_output;


-- ============================================================================
-- TEST 5: IF THE CAMPAIGN WAS PLANNED FROM 01 OCT TO 14 OCT (14-Day MTD)
-- Shows what total volume LDB >= 100k accumulated between 01 Oct and 14 Oct
-- ============================================================================
SELECT 
    'TEST 5: Full Oct MTD (01 Oct to 14 Oct)' AS scenario,
    public.get_campaign_actual_metrics(
        p_start_date       := '2026-10-01'::date,
        p_as_of_date       := '2026-10-14'::date,
        p_backward_start   := '2026-09-17'::date,
        p_backward_end     := '2026-09-30'::date,
        p_cond_type        := 'amount_gte',
        p_cond_op          := '>=',
        p_cond_val         := 100000,
        p_cond_max         := NULL,
        p_tx_type          := 'BUY_GOLD',
        p_bank             := 'LDB'
    ) AS engine_output;
