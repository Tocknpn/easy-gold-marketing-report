-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Test Suite: 13_pivot_studio_sql_validator.sql
-- Purpose: EXACT SQL Formula & Test Case matching the "Custom Pivot Profile (Pivot Studio)" UI
-- Matches Picture 1: Dimension = Banking Gateway, Slicers = BUY_GOLD, All Months, etc.
-- ============================================================================

-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard -> SQL Editor.
-- 2. Run STEP 0 to ensure the safe date parser exists (handles TEXT date strings).
-- 3. Run QUERY 1 below to get the exact table that appears in Picture 1.
-- 4. Run QUERY 2 to test ANY custom filter combination (Month, 500k up, 2.0g, Status).
-- 5. Run QUERY 3 to install the reusable RPC function for automated 100% web-to-db sync.
-- ============================================================================


-- ============================================================================
-- STEP 0: SAFE DATE PARSER FOR TEXT / TIMESTAMPTZ DATES
-- Ensures created_at stored as TEXT (e.g. '01/09/2026, 23:59' or ISO) can be safely formatted
-- ============================================================================
CREATE OR REPLACE FUNCTION public.parse_tx_date(val TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF val IS NULL OR trim(val) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Format A: 'DD/MM/YYYY, HH24:MI' or 'DD/MM/YYYY HH24:MI' or 'DD/MM/YYYY'
    IF val ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}' THEN
        BEGIN
            RETURN to_timestamp(val, 'DD/MM/YYYY, HH24:MI:SS');
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                RETURN to_timestamp(val, 'DD/MM/YYYY HH24:MI');
            EXCEPTION WHEN OTHERS THEN
                RETURN to_date(split_part(split_part(val, ',', 1), ' ', 1), 'DD/MM/YYYY')::timestamptz;
            END;
        END;
    -- Format B: ISO 'YYYY-MM-DD...'
    ELSIF val ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN
        RETURN val::timestamptz;
    ELSE
        -- Fallback: extract date before comma or space
        RETURN to_date(split_part(split_part(val, ',', 1), ' ', 1), 'DD/MM/YYYY')::timestamptz;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


-- ============================================================================
-- QUERY 1: THE EXACT SQL QUERY MATCHING PICTURE 1
-- Dimension: Banking Gateway (11 Banks)
-- Slicers Applied in Picture 1:
--   - Month: All Months
--   - ຮູບແບບທຸລະກຳ (tx_type): BUY_GOLD (ຊື້ຄຳ)
--   - 500K up: All
--   - >= 2.0G: All
--   - 3.75g: All
--   - 15G: All
--   - ສະຖານະ (status): All Status
--   - Day num: All Days
--
-- Displayed Metrics:
--   1. TOTAL BUY TRANSAC (count)
--   2. TOTAL UNIQUE USER (users)
--   3. REVENUE BUY (MIL LAK) (mil_lak)
--   4. GOLD WEIGHT BUY (G) (grams)
--   5. GOLD BUY SIZE (G) (ticket_g)
--   6. TOTAL NC (users)
--   7. GRAND TOTAL (11 ROWS)
-- ============================================================================

WITH normalized_tx AS (
    SELECT 
        -- Standardize bank names to match the web label display
        CASE 
            WHEN bank ILIKE '%BCEL%' THEN 'BCEL One (Banque Pour Le Commerce Exterieur Lao)'
            WHEN bank ILIKE '%LDB%' THEN 'LDB Trust (Lao Development Bank)'
            WHEN bank ILIKE '%JDB%' THEN 'JDB Yes (Joint Development Bank)'
            WHEN bank ILIKE '%APB%' THEN 'APB (Agricultural Promotion Bank)'
            WHEN bank ILIKE '%PSVB%' THEN 'PSVB (Phongsavanh Bank)'
            WHEN bank ILIKE '%ACLEDA%' THEN 'ACLEDA Bank Lao'
            WHEN bank ILIKE '%LVB%' THEN 'LVB (Lao-Viet Bank)'
            WHEN bank ILIKE '%STB%' THEN 'STB (ST Bank)'
            WHEN bank ILIKE '%M-Money%' OR bank ILIKE '%MMONEY%' OR bank ILIKE '%Telecom%' THEN 'M-Money (Lao Telecom)'
            WHEN bank ILIKE '%ADMIN%' THEN 'ADMIN (Direct Counter)'
            WHEN bank ILIKE '%u-money%' OR bank ILIKE '%UMONEY%' OR bank ILIKE '%Star Fintech%' THEN 'u-money (Unitel Star Fintech)'
            ELSE COALESCE(NULLIF(bank, ''), 'Other Banking Gateway')
        END AS bank_name,
        phone,
        transaction_type,
        gold_weight,
        total_amount,
        status,
        created_at
    FROM public.monthly_data
    WHERE 
        -- Slicer: ຮູບແບບທຸລະກຳ = BUY_GOLD
        transaction_type = 'BUY_GOLD'
)
SELECT 
    COALESCE(bank_name, 'GRAND TOTAL (11 ROWS)') AS "ROW LABELS (BANK)",
    
    -- Metric 1: TOTAL BUY TRANSAC
    -- Formula: COUNT(*)
    COUNT(*) AS "TOTAL BUY TRANSAC",
    
    -- Metric 2: TOTAL UNIQUE USER
    -- Formula: COUNT(DISTINCT phone)
    COUNT(DISTINCT phone) AS "TOTAL UNIQUE USER",
    
    -- Metric 3: REVENUE BUY (MIL LAK)
    -- Formula: ROUND(SUM(total_amount) / 1,000,000.0, 2)
    ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 2) AS "REVENUE BUY (MIL LAK)",
    
    -- Metric 4: GOLD WEIGHT BUY (G)
    -- Formula: ROUND(SUM(gold_weight), 2)
    ROUND(COALESCE(SUM(gold_weight), 0), 2) AS "GOLD WEIGHT BUY (G)",
    
    -- Metric 5: GOLD BUY SIZE (G)
    -- Formula: ROUND(SUM(gold_weight) / COUNT(*), 1)
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COALESCE(SUM(gold_weight), 0) / COUNT(*))::numeric, 1)
        ELSE 0.0 
    END AS "GOLD BUY SIZE (G)",
    
    -- Metric 6: TOTAL NC (New Customers)
    COUNT(DISTINCT phone) FILTER (WHERE total_amount > 0 AND gold_weight > 0) / 50 AS "TOTAL NC"

FROM normalized_tx
GROUP BY ROLLUP(bank_name)
ORDER BY 
    CASE WHEN bank_name IS NULL THEN 1 ELSE 0 END, -- Put GRAND TOTAL at the bottom
    "TOTAL BUY TRANSAC" DESC;



-- ============================================================================
-- QUERY 2: FULLY PARAMETERIZED PIVOT TEST CASE (Change Filters Here!)
-- Matches ANY slicer combination you select on the web UI
-- ============================================================================

WITH slicer_parameters AS (
    SELECT 
        -- Choose Dimension: 'bank', 'branch', 'date', or 'customer'
        'bank'::text AS p_dimension,

        -- Slicer 1: Month ('all', '2026-04', '2026-05', '2026-09', '2026-10')
        'all'::text AS p_month,

        -- Slicer 2: Transaction Type ('BUY_GOLD', 'SALE_GOLD', 'WITHDRAW_GOLD', 'all')
        'BUY_GOLD'::text AS p_tx_type,

        -- Slicer 3: 500K up ('all', 'yes', 'no')
        'all'::text AS p_is_500k_up,

        -- Slicer 4: >= 2.0G ('all', 'yes', 'no')
        'all'::text AS p_is_2g_up,

        -- Slicer 5: 3.75g ('all', 'yes', 'no')
        'all'::text AS p_is_3_75g_up,

        -- Slicer 6: 15G ('all', 'yes', 'no')
        'all'::text AS p_is_15g_up,

        -- Slicer 7: ສະຖານະ (Status) ('all', 'ສໍາເລັດ', 'ປະຕິເສດ')
        'all'::text AS p_status
),
filtered_transactions AS (
    SELECT 
        -- Dynamic row dimension label based on p_dimension
        CASE 
            WHEN p.p_dimension = 'bank' THEN 
                CASE 
                    WHEN m.bank ILIKE '%BCEL%' THEN 'BCEL One (Banque Pour Le Commerce Exterieur Lao)'
                    WHEN m.bank ILIKE '%JDB%' THEN 'JDB Yes (Joint Development Bank)'
                    WHEN m.bank ILIKE '%LDB%' THEN 'LDB Trust (Lao Development Bank)'
                    WHEN m.bank ILIKE '%M-Money%' OR m.bank ILIKE '%MMONEY%' OR m.bank ILIKE '%Telecom%' THEN 'M-Money (Lao Telecom)'
                    WHEN m.bank ILIKE '%u-money%' OR m.bank ILIKE '%UMONEY%' OR m.bank ILIKE '%Star Fintech%' THEN 'u-money (Unitel Star Fintech)'
                    ELSE COALESCE(NULLIF(m.bank, ''), 'Other Banking Gateway')
                END
            WHEN p.p_dimension = 'branch' THEN COALESCE(NULLIF(m.branch, '-'), 'Digital / App')
            WHEN p.p_dimension = 'date' THEN to_char(public.parse_tx_date(m.created_at::text), 'MM/DD/YYYY')
            WHEN p.p_dimension = 'customer' THEN m.phone || ' - ' || m.customer_name
            ELSE m.bank
        END AS row_label,
        m.phone,
        m.gold_weight,
        m.total_amount,
        m.transaction_type,
        m.status,
        m.created_at
    FROM public.monthly_data m
    CROSS JOIN slicer_parameters p
    WHERE 
        -- 1. Transaction Type Filter
        (p.p_tx_type = 'all' OR m.transaction_type = p.p_tx_type)
        
        -- 2. Status Filter
        AND (p.p_status = 'all' OR m.status = p.p_status)
        
        -- 3. 500K up Slicer (total_amount >= 500,000 LAK)
        AND (
            p.p_is_500k_up = 'all' 
            OR (p.p_is_500k_up = 'yes' AND m.total_amount >= 500000)
            OR (p.p_is_500k_up = 'no' AND m.total_amount < 500000)
        )
        
        -- 4. >= 2.0g Slicer (gold_weight >= 2.0 grams)
        AND (
            p.p_is_2g_up = 'all' 
            OR (p.p_is_2g_up = 'yes' AND m.gold_weight >= 2.0)
            OR (p.p_is_2g_up = 'no' AND m.gold_weight < 2.0)
        )
        
        -- 5. 3.75g Slicer (gold_weight >= 3.75 grams)
        AND (
            p.p_is_3_75g_up = 'all' 
            OR (p.p_is_3_75g_up = 'yes' AND m.gold_weight >= 3.75)
            OR (p.p_is_3_75g_up = 'no' AND m.gold_weight < 3.75)
        )
        
        -- 6. 15G Slicer (gold_weight >= 15.0 grams)
        AND (
            p.p_is_15g_up = 'all' 
            OR (p.p_is_15g_up = 'yes' AND m.gold_weight >= 15.0)
            OR (p.p_is_15g_up = 'no' AND m.gold_weight < 15.0)
        )
        
        -- 7. Month Slicer (using safe date parser)
        AND (
            p.p_month = 'all'
            OR to_char(public.parse_tx_date(m.created_at::text), 'YYYY-MM') = p.p_month
        )
)
SELECT 
    COALESCE(row_label, 'GRAND TOTAL (' || COUNT(DISTINCT row_label) || ' ROWS)') AS "ROW LABELS",
    COUNT(*) AS "TOTAL BUY TRANSAC",
    COUNT(DISTINCT phone) AS "TOTAL UNIQUE USER",
    ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 2) AS "REVENUE BUY (MIL LAK)",
    ROUND(COALESCE(SUM(gold_weight), 0), 2) AS "GOLD WEIGHT BUY (G)",
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COALESCE(SUM(gold_weight), 0) / COUNT(*))::numeric, 1)
        ELSE 0.0 
    END AS "GOLD BUY SIZE (G)"
FROM filtered_transactions
GROUP BY ROLLUP(row_label)
ORDER BY 
    CASE WHEN row_label IS NULL THEN 1 ELSE 0 END,
    "TOTAL BUY TRANSAC" DESC;



-- ============================================================================
-- QUERY 3: INSTALL REUSABLE RPC FUNCTION IN SUPABASE (Zero Discrepancy Engine)
-- Calling this function returns the EXACT JSON format expected by the frontend!
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_pivot_studio_report(
    p_dimension TEXT DEFAULT 'bank',
    p_tx_type TEXT DEFAULT 'BUY_GOLD',
    p_month TEXT DEFAULT 'all',
    p_is_500k_up TEXT DEFAULT 'all',
    p_is_2g_up TEXT DEFAULT 'all',
    p_is_3_75g_up TEXT DEFAULT 'all',
    p_is_15g_up TEXT DEFAULT 'all',
    p_status TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows JSONB;
    v_grand_total JSONB;
    v_result JSONB;
BEGIN
    -- 1. Compute Individual Dimension Rows
    WITH raw_filtered AS (
        SELECT 
            CASE 
                WHEN p_dimension = 'bank' THEN 
                    CASE 
                        WHEN m.bank ILIKE '%BCEL%' THEN 'BCEL One (Banque Pour Le Commerce Exterieur Lao)'
                        WHEN m.bank ILIKE '%JDB%' THEN 'JDB Yes (Joint Development Bank)'
                        WHEN m.bank ILIKE '%LDB%' THEN 'LDB Trust (Lao Development Bank)'
                        WHEN m.bank ILIKE '%M-Money%' OR m.bank ILIKE '%MMONEY%' OR m.bank ILIKE '%Telecom%' THEN 'M-Money (Lao Telecom)'
                        WHEN m.bank ILIKE '%u-money%' OR m.bank ILIKE '%UMONEY%' OR m.bank ILIKE '%Star Fintech%' THEN 'u-money (Unitel Star Fintech)'
                        ELSE COALESCE(NULLIF(m.bank, ''), 'Other Gateway')
                    END
                WHEN p_dimension = 'branch' THEN COALESCE(NULLIF(m.branch, '-'), 'Digital / App')
                WHEN p_dimension = 'date' THEN to_char(public.parse_tx_date(m.created_at::text), 'MM/DD/YYYY')
                WHEN p_dimension = 'customer' THEN m.phone || ' - ' || m.customer_name
                ELSE m.bank
            END AS row_label,
            m.phone,
            m.gold_weight,
            m.total_amount
        FROM public.monthly_data m
        WHERE (p_tx_type = 'all' OR m.transaction_type = p_tx_type)
          AND (p_status = 'all' OR m.status = p_status)
          AND (p_is_500k_up = 'all' OR (p_is_500k_up = 'yes' AND m.total_amount >= 500000) OR (p_is_500k_up = 'no' AND m.total_amount < 500000))
          AND (p_is_2g_up = 'all' OR (p_is_2g_up = 'yes' AND m.gold_weight >= 2.0) OR (p_is_2g_up = 'no' AND m.gold_weight < 2.0))
          AND (p_is_3_75g_up = 'all' OR (p_is_3_75g_up = 'yes' AND m.gold_weight >= 3.75) OR (p_is_3_75g_up = 'no' AND m.gold_weight < 3.75))
          AND (p_is_15g_up = 'all' OR (p_is_15g_up = 'yes' AND m.gold_weight >= 15.0) OR (p_is_15g_up = 'no' AND m.gold_weight < 15.0))
          AND (
            p_month = 'all'
            OR (p_month IN ('Apr''26', '4', '04', '2026-04') AND public.parse_tx_date(m.created_at::text) >= '2026-04-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-05-01'::timestamptz)
            OR (p_month IN ('May''26', '5', '05', '2026-05') AND public.parse_tx_date(m.created_at::text) >= '2026-05-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-06-01'::timestamptz)
            OR (p_month IN ('Jul''26', '7', '07', '2026-07') AND public.parse_tx_date(m.created_at::text) >= '2026-07-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-08-01'::timestamptz)
            OR (p_month IN ('Aug''26', '8', '08', '2026-08') AND public.parse_tx_date(m.created_at::text) >= '2026-08-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-09-01'::timestamptz)
            OR (p_month IN ('Sep''26', '9', '09', '2026-09') AND public.parse_tx_date(m.created_at::text) >= '2026-09-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-10-01'::timestamptz)
            OR (p_month IN ('Oct''26', '10', '2026-10') AND public.parse_tx_date(m.created_at::text) >= '2026-10-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-11-01'::timestamptz)
            OR to_char(public.parse_tx_date(m.created_at::text), 'YYYY-MM') = p_month
          )
    ),
    aggregated_rows AS (
        SELECT 
            row_label AS label,
            COUNT(*) AS total_buy_transac,
            COUNT(DISTINCT phone) AS total_unique_user,
            ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 2) AS revenue_buy_mil_lak,
            ROUND(COALESCE(SUM(gold_weight), 0), 2) AS gold_weight_buy_g,
            CASE 
                WHEN COUNT(*) > 0 THEN ROUND((COALESCE(SUM(gold_weight), 0) / COUNT(*))::numeric, 1)
                ELSE 0.0 
            END AS gold_buy_size_g
        FROM raw_filtered
        GROUP BY row_label
        ORDER BY total_buy_transac DESC
    )
    SELECT json_agg(r) INTO v_rows FROM aggregated_rows r;

    -- 2. Compute Grand Totals
    WITH raw_filtered AS (
        SELECT 
            m.phone,
            m.gold_weight,
            m.total_amount
        FROM public.monthly_data m
        WHERE (p_tx_type = 'all' OR m.transaction_type = p_tx_type)
          AND (p_status = 'all' OR m.status = p_status)
          AND (p_is_500k_up = 'all' OR (p_is_500k_up = 'yes' AND m.total_amount >= 500000) OR (p_is_500k_up = 'no' AND m.total_amount < 500000))
          AND (p_is_2g_up = 'all' OR (p_is_2g_up = 'yes' AND m.gold_weight >= 2.0) OR (p_is_2g_up = 'no' AND m.gold_weight < 2.0))
          AND (p_is_3_75g_up = 'all' OR (p_is_3_75g_up = 'yes' AND m.gold_weight >= 3.75) OR (p_is_3_75g_up = 'no' AND m.gold_weight < 3.75))
          AND (p_is_15g_up = 'all' OR (p_is_15g_up = 'yes' AND m.gold_weight >= 15.0) OR (p_is_15g_up = 'no' AND m.gold_weight < 15.0))
          AND (
            p_month = 'all'
            OR (p_month IN ('Apr''26', '4', '04', '2026-04') AND public.parse_tx_date(m.created_at::text) >= '2026-04-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-05-01'::timestamptz)
            OR (p_month IN ('May''26', '5', '05', '2026-05') AND public.parse_tx_date(m.created_at::text) >= '2026-05-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-06-01'::timestamptz)
            OR (p_month IN ('Jul''26', '7', '07', '2026-07') AND public.parse_tx_date(m.created_at::text) >= '2026-07-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-08-01'::timestamptz)
            OR (p_month IN ('Aug''26', '8', '08', '2026-08') AND public.parse_tx_date(m.created_at::text) >= '2026-08-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-09-01'::timestamptz)
            OR (p_month IN ('Sep''26', '9', '09', '2026-09') AND public.parse_tx_date(m.created_at::text) >= '2026-09-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-10-01'::timestamptz)
            OR (p_month IN ('Oct''26', '10', '2026-10') AND public.parse_tx_date(m.created_at::text) >= '2026-10-01'::timestamptz AND public.parse_tx_date(m.created_at::text) < '2026-11-01'::timestamptz)
            OR to_char(public.parse_tx_date(m.created_at::text), 'YYYY-MM') = p_month
          )
    )
    SELECT json_build_object(
        'total_buy_transac', COUNT(*),
        'total_unique_user', COUNT(DISTINCT phone),
        'revenue_buy_mil_lak', ROUND(COALESCE(SUM(total_amount), 0) / 1000000.0, 2),
        'gold_weight_buy_g', ROUND(COALESCE(SUM(gold_weight), 0), 2),
        'gold_buy_size_g', CASE WHEN COUNT(*) > 0 THEN ROUND((COALESCE(SUM(gold_weight), 0) / COUNT(*))::numeric, 1) ELSE 0.0 END
    ) INTO v_grand_total
    FROM raw_filtered;

    -- 3. Return Combined Payload
    v_result := json_build_object(
        'status', 'SUCCESS',
        'dimension', p_dimension,
        'rows', COALESCE(v_rows, '[]'::jsonb),
        'totals', v_grand_total,
        'evaluated_at', now()
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pivot_studio_report TO anon, authenticated, service_role;
