-- ============================================================================
-- EASY GOLD - Daily Performance MKT wall screen: live refresh
-- File: 47_enable_realtime_daily_metrics.sql
--
-- Lets the department screen update instantly when new rows are pushed to
-- summary_daily_metrics. Without this the screen still refreshes every 5 min.
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'summary_daily_metrics'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.summary_daily_metrics;
    END IF;
END $$;
