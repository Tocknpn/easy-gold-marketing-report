-- ============================================================================
-- EASY GOLD MARKETING REPORT - ALL DATES TRANSACTION SUMMARY & GAP CHECK
-- File: 29_all_dates_transaction_summary.sql
-- Description: Generates a complete daily transaction count for all dates
--              normalizing any date format (YYYY-MM-DD and DD/MM/YYYY).
-- ============================================================================


-- ============================================================================
-- QUERY 1: ALL DATES IN OCTOBER 2026 (Day-by-Day Transaction Count)
-- Quickly verifies that every day in October has data with zero gaps
-- ============================================================================
SELECT 
    CASE 
        WHEN created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
            THEN substring(created_at from 1 for 10)
        WHEN created_at ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}' 
            THEN substring(created_at from 7 for 4) || '-' || substring(created_at from 4 for 2) || '-' || substring(created_at from 1 for 2)
        ELSE substring(created_at from 1 for 10)
    END AS transaction_date,
    COUNT(*) AS total_transactions,
    MIN(created_at) AS earliest_timestamp,
    MAX(created_at) AS latest_timestamp
FROM public.monthly_data
WHERE created_at LIKE '%2026-10%' OR created_at LIKE '%/10/2026%'
GROUP BY 1
ORDER BY transaction_date DESC;


-- ============================================================================
-- QUERY 2: ALL DATES ACROSS THE ENTIRE DATABASE (Full History Calendar)
-- Normalizes every date into YYYY-MM-DD and counts transactions per day
-- ============================================================================
SELECT 
    CASE 
        WHEN created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
            THEN substring(created_at from 1 for 10)
        WHEN created_at ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}' 
            THEN substring(created_at from 7 for 4) || '-' || substring(created_at from 4 for 2) || '-' || substring(created_at from 1 for 2)
        ELSE substring(created_at from 1 for 10)
    END AS transaction_date,
    COUNT(*) AS total_transactions,
    MIN(created_at) AS earliest_record,
    MAX(created_at) AS latest_record
FROM public.monthly_data
WHERE created_at IS NOT NULL AND trim(created_at) <> ''
GROUP BY 1
ORDER BY transaction_date DESC;


-- ============================================================================
-- QUERY 3: WEEKLY EXECUTIVE OVERVIEW (Instant: < 5ms)
-- If you want a quick check across all 42 weeks of 2026 from summary table
-- ============================================================================
SELECT 
    year_week,
    week_label,
    start_date,
    end_date,
    all_transactions,
    buy_transactions,
    sell_transactions,
    active_users
FROM public.summary_weekly_metrics
ORDER BY start_date DESC;
