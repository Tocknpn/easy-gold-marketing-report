-- ==============================================================================
-- 58_storage_check_readonly.sql
-- READ-ONLY. Changes nothing and returns no customer names or phone numbers.
-- Run once in the Supabase SQL Editor and paste all result rows back.
-- It confirms what the Apr-Jun delete and the summary locks must be written against.
-- ==============================================================================
WITH report AS (
    -- Tables over 1MB
    SELECT 'table' AS k, c.relname::text AS a, pg_total_relation_size(c.oid)::text AS b, c.relkind::text AS c
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND c.relkind IN ('r', 'm') AND pg_total_relation_size(c.oid) > 1048576

    -- Indexes on monthly_data: size in bytes and how often each is used
    UNION ALL
    SELECT 'index', indexrelname::text, pg_relation_size(indexrelid)::text, idx_scan::text
    FROM pg_stat_user_indexes WHERE relname = 'monthly_data'

    -- Column types of monthly_data
    UNION ALL
    SELECT 'column', column_name::text, data_type::text, NULL
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'monthly_data'

    -- Row counts by the first 7 characters of created_at. A key that is not
    -- YYYY-MM means a row in another date format, which a date filter would miss.
    UNION ALL
    SELECT 'rows_by_month', substring(created_at::text, 1, 7), COUNT(*)::text, NULL
    FROM public.monthly_data GROUP BY 2

    -- Dead rows
    UNION ALL
    SELECT 'dead_rows', relname::text, n_dead_tup::text, n_live_tup::text
    FROM pg_stat_user_tables WHERE relname = 'monthly_data'

    -- Who can read monthly_data
    UNION ALL
    SELECT 'policy', policyname::text, cmd::text, roles::text
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'monthly_data'
    UNION ALL
    SELECT 'rls_enabled', relname::text, relrowsecurity::text, NULL
    FROM pg_class WHERE oid = 'public.monthly_data'::regclass

    -- campaign_setups columns (shows whether migration 51 was applied)
    UNION ALL
    SELECT 'campaign_column', column_name::text, data_type::text, NULL
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'campaign_setups'

    -- Deployed versions of the functions the delete must protect
    UNION ALL
    SELECT 'function', p.proname::text, pg_get_function_identity_arguments(p.oid), NULL
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
        'get_campaign_actual_metrics', 'sync_active_campaigns_daily', 'refresh_summary_daily',
        'recalculate_week_summary', 'sync_all_weekly_summaries', 'sync_active_week_summary',
        'get_dynamic_bi_report', 'upsert_dynamic_bi_cache'
    )

    -- Triggers already on the tables the locks will cover
    UNION ALL
    SELECT 'trigger', t.tgname::text, c.relname::text, NULL
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE NOT t.tgisinternal AND c.relname IN (
        'monthly_data', 'summary_daily_metrics', 'summary_weekly_metrics',
        'fact_daily_core', 'campaign_setups', 'dynamic_bi_report_cache'
    )

    -- Total size
    UNION ALL
    SELECT 'database_size', current_database()::text, pg_database_size(current_database())::text, NULL
)
SELECT * FROM report ORDER BY k, a;
