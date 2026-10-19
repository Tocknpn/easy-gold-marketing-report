-- ============================================================================
-- EASY GOLD MARKETING REPORT - CHECK LATEST UPLOADED DATA
-- File: 27_check_latest_uploaded_data.sql
-- Description: Super-fast queries (< 10ms) to inspect the latest uploaded data
--              without timing out on 1.3M+ rows.
-- ============================================================================

-- ============================================================================
-- 1. INSPECT THE LATEST 10 TRANSACTIONS JUST UPLOADED
-- Uses Primary Key index on `id DESC` (Instant: ~2ms)
-- ============================================================================
SELECT 
    id,
    created_at AS transaction_datetime,
    customer_name,
    transaction_type,
    bank,
    gold_weight,
    total_amount,
    status,
    branch
FROM public.monthly_data
ORDER BY id DESC
LIMIT 10;


-- ============================================================================
-- 2. BREAKDOWN OF DATES IN TODAY'S UPLOAD (Exact 33,701 rows: ID >= 1447735)
-- Prevents older historical data from spilling into the report
-- ============================================================================
SELECT 
    substring(created_at from 1 for 10) AS transaction_date,
    COUNT(*) AS total_transactions,
    MIN(created_at) AS earliest_timestamp,
    MAX(created_at) AS latest_timestamp
FROM public.monthly_data
WHERE id >= 1447735
GROUP BY substring(created_at from 1 for 10)
ORDER BY transaction_date DESC;

