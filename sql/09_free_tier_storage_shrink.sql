-- ============================================================================
-- EASY GOLD - SUPABASE FREE TIER STORAGE SHRINK & RESCUE
-- Module: 09_free_tier_storage_shrink.sql
-- Goal: Drop database storage from 527 MB back to ~270 MB
-- Note: In PostgreSQL, dropping an index deletes its disk file IMMEDIATELY.
-- No VACUUM is needed!
-- ============================================================================

-- STEP 1: DROP THE 3 BLOATED B-TREE INDEXES (~260 MB of disk space freed instantly)
DROP INDEX IF EXISTS public.idx_monthly_data_perf_composite;
DROP INDEX IF EXISTS public.idx_monthly_data_adhoc_bank_weight;
DROP INDEX IF EXISTS public.idx_monthly_data_phone_active;

-- STEP 2: ENSURE LIGHTWEIGHT BRIN INDEX EXISTS (Takes only 64 KB instead of 200 MB!)
CREATE INDEX IF NOT EXISTS idx_monthly_data_created_at_brin
ON public.monthly_data USING BRIN (created_at);

-- STEP 3: CHECK NEW DATABASE SIZE (Immediately reflects the freed space!)
SELECT 
    pg_size_pretty(pg_database_size(current_database())) AS total_database_size;
