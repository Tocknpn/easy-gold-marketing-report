-- ============================================================================
-- EASY GOLD MARKETING REPORT - UPLOAD TIMEOUT FIX
-- File: 26_fix_upload_timeout_drop_trigger.sql
-- Purpose: Drops the statement-level auto-summarize trigger on monthly_data
--          that was blocking daily batch uploads by timing out on 1.3M rows.
-- ============================================================================

-- 1. DROP the blocking INSERT trigger from monthly_data
DROP TRIGGER IF EXISTS trg_monthly_data_auto_summarize ON public.monthly_data;

-- 2. Verify: Monthly data table is now clean and ready for instant batch inserts
SELECT 
    tgname AS trigger_name,
    relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'monthly_data' 
  AND tgname = 'trg_monthly_data_auto_summarize';
-- (Should return 0 rows, confirming the trigger is dropped)
