-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Migration: 54_dynamic_bi_report_cache.sql
-- Target: Supabase (PostgreSQL 15+)
-- Purpose:
--   1. Add dynamic_bi_report_cache table: one row per cacheable Dynamic BI
--      quick-preset (default-filter combos only — any advanced filter bypasses
--      this entirely), storing the full computed report payload as JSONB so
--      the frontend can load pre-computed results instantly instead of paying
--      the ~25s live SQL cube cost on every page load.
--   2. Add upsert_dynamic_bi_cache() RPC: writes a fresh payload into a row,
--      shifting the row's previous payload into previous_payload (one-snapshot
--      rollback if a refresh produces a bad result or a cron run fails).
--   3. Refreshed daily at 3:00 AM (Indochina Time GMT+7) by the Cloudflare
--      Worker's scheduled() cron (see worker.js syncDynamicBiCache) — dynamic
--      presets (today/yesterday/last7d/last30d/this_month) always refresh;
--      static closed-period presets (last_month/aug_month/q3) only refresh
--      when their resolved date range actually changed (e.g. month rollover).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dynamic_bi_report_cache (
    preset_id TEXT PRIMARY KEY,
    is_static BOOLEAN NOT NULL DEFAULT false,
    resolved_start_date DATE NOT NULL,
    resolved_end_date DATE NOT NULL,
    latest_available_date DATE,
    payload JSONB,
    previous_payload JSONB,
    computed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dynamic_bi_report_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'dynamic_bi_report_cache'
          AND policyname = 'Service role manages dynamic BI cache'
    ) THEN
        CREATE POLICY "Service role manages dynamic BI cache"
        ON public.dynamic_bi_report_cache
        FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.dynamic_bi_report_cache TO service_role;

-- Atomic upsert: shifts the row's current payload into previous_payload before
-- writing the new one, so one stale/bad refresh can always be rolled back by
-- reading previous_payload instead of payload.
CREATE OR REPLACE FUNCTION public.upsert_dynamic_bi_cache(
    p_preset_id TEXT,
    p_is_static BOOLEAN,
    p_resolved_start_date DATE,
    p_resolved_end_date DATE,
    p_latest_available_date DATE,
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '15s'
AS $$
BEGIN
    INSERT INTO public.dynamic_bi_report_cache (
        preset_id, is_static, resolved_start_date, resolved_end_date,
        latest_available_date, payload, previous_payload, computed_at, updated_at
    ) VALUES (
        p_preset_id, p_is_static, p_resolved_start_date, p_resolved_end_date,
        p_latest_available_date, p_payload, NULL, now(), now()
    )
    ON CONFLICT (preset_id) DO UPDATE SET
        is_static = EXCLUDED.is_static,
        resolved_start_date = EXCLUDED.resolved_start_date,
        resolved_end_date = EXCLUDED.resolved_end_date,
        latest_available_date = EXCLUDED.latest_available_date,
        previous_payload = public.dynamic_bi_report_cache.payload,
        payload = EXCLUDED.payload,
        computed_at = now(),
        updated_at = now();

    RETURN jsonb_build_object('success', true, 'preset_id', p_preset_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_dynamic_bi_cache(TEXT, BOOLEAN, DATE, DATE, DATE, JSONB) TO service_role;
