-- ==============================================================================
-- 41. EASY GOLD - RECALCULATE & CLEANUP SUMMARY METRICS AFTER ROW DELETIONS
-- File: 41_cleanup_and_recalc_after_delete.sql
-- ==============================================================================
-- Run this script in the Supabase SQL Editor whenever:
--   1. You manually deleted rows or bad transactions from public.monthly_data.
--   2. You want to make sure MTD and Weekly Reports match your current raw data 100%.
-- ==============================================================================

-- 1. Fast cleanup of any orphaned dates above the actual latest transaction date
DELETE FROM public.summary_daily_metrics
WHERE date_id > public.get_max_monthly_data_date();

-- 2. Recalculate daily summary for MTD for the active month using surviving transactions
SELECT public.refresh_summary_daily(DATE '2026-10-01', public.get_max_monthly_data_date());

-- 3. Recalculate current in-progress week (W43 / active week)
SELECT public.sync_active_week_summary(public.get_max_monthly_data_date());

-- 4. Recalculate all historical weekly summaries
SELECT public.sync_all_weekly_summaries();

-- 5. Verification check: view latest 5 days of synchronized MTD summary
SELECT date_id, buy_weight_15g, buy_transactions, sell_weight_15g, sell_transactions, new_customers, total_transactions, updated_at
FROM public.summary_daily_metrics
ORDER BY date_id DESC
LIMIT 5;
