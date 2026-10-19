-- ============================================================================
-- EASY GOLD MARKETING - RESCUE DATABASE STORAGE UNDER 300 MB
-- File: 34_shrink_database_under_300mb.sql
-- Goal: Cut 538 MB down to ~220-250 MB immediately on Supabase Free Tier
-- ============================================================================

-- 1. INSPECT CURRENT TOP SPACE CONSUMERS (Run first to see breakdown)
SELECT 
    relname AS object_name,
    CASE WHEN relkind = 'r' THEN 'table' WHEN relkind = 'i' THEN 'index' ELSE relkind::text END AS type,
    pg_size_pretty(pg_total_relation_size(oid)) AS total_size,
    pg_size_pretty(pg_relation_size(oid)) AS data_size
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY pg_total_relation_size(oid) DESC
LIMIT 15;


-- 2. DROP REDUNDANT / BLOATED INDEXES ON monthly_data (Saves ~180-220 MB instantly)
-- In Postgres, dropping an index instantly frees disk space without vacuum.
DROP INDEX IF EXISTS public.idx_monthly_data_perf_composite;
DROP INDEX IF EXISTS public.idx_monthly_data_adhoc_bank_weight;
DROP INDEX IF EXISTS public.idx_monthly_data_phone_active;
DROP INDEX IF EXISTS public.idx_monthly_data_bank;
DROP INDEX IF EXISTS public.idx_monthly_data_camp_filter;
DROP INDEX IF EXISTS public.idx_monthly_data_created_at_btree;
DROP INDEX IF EXISTS public.idx_monthly_data_tx_status;
DROP INDEX IF EXISTS public.idx_monthly_data_all_filters;
DROP INDEX IF EXISTS public.idx_fact_customer_daily_date;
DROP INDEX IF EXISTS public.idx_fact_customer_daily_phone;
DROP INDEX IF EXISTS public.idx_fact_daily_wide_date;
DROP INDEX IF EXISTS public.idx_fact_daily_core_type;

-- Keep ONLY 1 lightweight BRIN index for date ranges (Takes only 64 KB vs 45 MB B-Tree!)
CREATE INDEX IF NOT EXISTS idx_monthly_data_created_at_brin
ON public.monthly_data USING BRIN (created_at) WITH (pages_per_range = 64);

-- Keep 1 lightweight index for fast status & type filter
CREATE INDEX IF NOT EXISTS idx_monthly_data_status_type
ON public.monthly_data (status, transaction_type);


-- 3. DROP UNUSED EXPERIMENTAL / STAGING FACT TABLES & LOGS (Saves ~40-60 MB)
DROP TABLE IF EXISTS public.fact_customer_daily CASCADE;
DROP TABLE IF EXISTS public.fact_daily_wide CASCADE;
DROP TABLE IF EXISTS public.fact_hourly CASCADE;
DROP TABLE IF EXISTS public.query_log CASCADE;
DROP TABLE IF EXISTS public.refresh_log CASCADE;
DROP VIEW IF EXISTS public.stg_clean_transactions CASCADE;


-- 4. RECLAIM DEAD TUPLES FROM HISTORICAL UPDATES
-- The mass UPDATE scripts (28, 30, 31) created 1.4M dead rows.
-- VACUUM marks dead rows reusable so table will not grow.
VACUUM (ANALYZE) public.monthly_data;
VACUUM (ANALYZE) public.summary_weekly_metrics;
VACUUM (ANALYZE) public.campaign_setups;


-- 5. VERIFY NEW TOTAL DATABASE SIZE
SELECT 
    pg_size_pretty(pg_database_size(current_database())) AS final_database_size;
