-- ==============================================================================
-- 63_reclaim_space.sql
-- Run once after the last delete_raw_month(). Deletes nothing.
--
-- A delete only marks rows as free. VACUUM FULL rewrites the table and its indexes
-- so the space is returned and the database size drops. It locks monthly_data
-- while it runs, usually a few minutes: Dynamic BI, Pivot and uploads wait or fail
-- in that time. Run it when nobody is uploading.
--
-- Run each statement on its own if the editor says VACUUM cannot run in a transaction.
-- ==============================================================================
VACUUM (FULL, ANALYZE) public.monthly_data;

SELECT
    pg_size_pretty(pg_total_relation_size('public.monthly_data')) AS monthly_data_size,
    pg_size_pretty(pg_database_size(current_database())) AS database_size,
    (SELECT substring(MIN(created_at), 1, 10) FROM public.monthly_data) AS raw_data_starts,
    (SELECT COUNT(*) FROM public.monthly_data) AS raw_rows;
