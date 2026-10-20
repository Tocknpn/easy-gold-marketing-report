-- ==============================================================================
-- 41. EASY GOLD - RECALCULATE & CLEANUP SUMMARY METRICS AFTER ROW DELETIONS
-- File: 41_cleanup_and_recalc_after_delete.sql
-- ==============================================================================
-- Run this script in the Supabase SQL Editor whenever:
--   1. You manually deleted rows or bad transactions from public.monthly_data.
--   2. You want to make sure MTD and Weekly Reports match your current raw data 100%.
-- ==============================================================================

-- 1. Remove orphaned dates from summary_daily_metrics if all raw rows were deleted
DELETE FROM public.summary_daily_metrics
WHERE date_id >= '2026-04-01'
  AND source = 'monthly_data'
  AND date_id NOT IN (
      SELECT DISTINCT substring(created_at from 1 for 10)::date 
      FROM public.monthly_data 
      WHERE created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
  );

-- 2. Recalculate daily summary for MTD (adjust date range as needed)
-- This recalculates the daily totals using only the surviving rows in monthly_data
SELECT public.refresh_summary_daily(DATE '2026-04-01', CURRENT_DATE);

-- 3. Recalculate current in-progress week (W43 / active week)
SELECT public.sync_active_week_summary();

-- 4. Recalculate all historical weekly summaries
SELECT public.sync_all_weekly_summaries();

-- 5. Verification check: view latest 10 days of synchronized MTD summary
SELECT date_id, buy_weight_15g, buy_transactions, sell_weight_15g, sell_transactions, new_customers, total_transactions, updated_at
FROM public.summary_daily_metrics
ORDER BY date_id DESC
LIMIT 10;
