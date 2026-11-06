-- ==============================================================================
-- 62_delete_raw_month.sql
-- Run this whole file once. It creates the delete function and DELETES NOTHING yet.
-- Then delete one month per run, oldest first, in a separate query:
--
--     SELECT public.delete_raw_month('2026-04');
--     SELECT public.delete_raw_month('2026-05');
--     SELECT public.delete_raw_month('2026-06');
--
-- Each run deletes only after every check below passes. If any check fails, it stops
-- with a message and nothing is deleted. Deleted rows cannot be recovered from the
-- database; the only copy is the backup in archive/raw_YYYY-MM.csv.gz.
--
-- After the last month, run sql/63_reclaim_space.sql to free the disk space.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Faster campaign calls: when saved backward numbers exist, the live function
--    computes only a one-day backward window, and the saved numbers replace it.
--    The saved numbers came from these same functions, so results do not change.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.campaign_has_backward_snapshot(
    p_version INT, p_backward_start DATE, p_backward_end DATE, p_param_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.raw_retention_settings s, public.campaign_backward_snapshots c
        WHERE s.id = 1 AND p_backward_start < s.cutoff_date
          AND c.version = p_version AND c.backward_start = p_backward_start
          AND c.backward_end = p_backward_end AND c.param_key = p_param_key
    );
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_actual_metrics(
    p_start_date DATE, p_as_of_date DATE, p_backward_start DATE, p_backward_end DATE,
    p_cond_type TEXT, p_cond_op TEXT, p_cond_val NUMERIC, p_cond_max NUMERIC,
    p_tx_type TEXT, p_bank TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
    v_key TEXT := public.campaign_backward_param_key(
        p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank, NULL, NULL, NULL, NULL);
    v_live_start DATE := p_backward_start;
BEGIN
    IF public.campaign_has_backward_snapshot(10, p_backward_start, p_backward_end, v_key) THEN
        v_live_start := p_backward_end;
    END IF;
    RETURN public.campaign_apply_backward_snapshot(
        public.get_campaign_actual_metrics_live10(
            p_start_date, p_as_of_date, v_live_start, p_backward_end,
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank
        ),
        10, p_backward_start, p_backward_end, v_key
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_actual_metrics(
    p_start_date DATE, p_as_of_date DATE, p_backward_start DATE, p_backward_end DATE,
    p_cond_type TEXT DEFAULT 'amount_gte', p_cond_op TEXT DEFAULT '>=',
    p_cond_val NUMERIC DEFAULT 100000, p_cond_max NUMERIC DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'BUY_GOLD', p_bank TEXT DEFAULT 'all',
    p_conditions JSONB DEFAULT NULL, p_unique_users_mode TEXT DEFAULT 'condition_tier',
    p_nc_mode TEXT DEFAULT 'all_registers', p_nc_conditions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
    v_key TEXT := public.campaign_backward_param_key(
        p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank,
        p_conditions, p_unique_users_mode, p_nc_mode, p_nc_conditions);
    v_live_start DATE := p_backward_start;
BEGIN
    IF public.campaign_has_backward_snapshot(14, p_backward_start, p_backward_end, v_key) THEN
        v_live_start := p_backward_end;
    END IF;
    RETURN public.campaign_apply_backward_snapshot(
        public.get_campaign_actual_metrics_live14(
            p_start_date, p_as_of_date, v_live_start, p_backward_end,
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank,
            p_conditions, p_unique_users_mode, p_nc_mode, p_nc_conditions
        ),
        14, p_backward_start, p_backward_end, v_key
    );
END;
$$;

-- The nightly sync runs several campaign calculations in one call.
ALTER FUNCTION public.sync_active_campaigns_daily(TEXT) SET statement_timeout = '170s';

-- ------------------------------------------------------------------------------
-- 2. The delete function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_raw_month(p_month TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET statement_timeout = '0'
AS $$
DECLARE
    v_start DATE;
    v_next DATE;
    v_from TEXT;
    v_to TEXT;
    v_settings RECORD;
    v_manifest RECORD;
    v_rows BIGINT;
    v_oldest TEXT;
    v_locks INT;
    v_as_of DATE;
    v_missing INT := 0;
    v_deleted BIGINT;
    r RECORD;
BEGIN
    IF p_month !~ '^\d{4}-\d{2}$' THEN
        RAISE EXCEPTION 'Use a month like 2026-04, not %', p_month;
    END IF;
    v_start := (p_month || '-01')::date;
    v_next := (v_start + INTERVAL '1 month')::date;
    v_from := v_start::text;
    v_to := v_next::text;

    -- Check 1: the month is inside the locked period.
    SELECT * INTO v_settings FROM public.raw_retention_settings WHERE id = 1;
    IF v_settings IS NULL OR v_next > v_settings.cutoff_date THEN
        RAISE EXCEPTION 'STOP: % is not before the lock cutoff %. Nothing deleted.', p_month, v_settings.cutoff_date;
    END IF;

    -- Check 2: oldest month first, so the remaining raw data has no gaps.
    SELECT substring(MIN(created_at), 1, 7) INTO v_oldest FROM public.monthly_data;
    IF v_oldest IS DISTINCT FROM p_month THEN
        RAISE EXCEPTION 'STOP: the oldest month with raw data is %, so delete that first. Nothing deleted.', v_oldest;
    END IF;

    -- Check 3: all 5 locks are installed.
    SELECT COUNT(*) INTO v_locks FROM pg_trigger WHERE tgname IN (
        'trg_lock_summary_daily', 'trg_lock_summary_weekly', 'trg_lock_fact_daily_core',
        'trg_lock_dynamic_cache', 'trg_lock_campaign');
    IF v_locks <> 5 THEN
        RAISE EXCEPTION 'STOP: only % of 5 locks are installed. Run sql/60 again. Nothing deleted.', v_locks;
    END IF;

    -- Check 4: the backup was verified, and the database still has exactly the rows backed up.
    SELECT * INTO v_manifest FROM public.raw_export_manifest WHERE month = p_month;
    IF v_manifest IS NULL THEN
        RAISE EXCEPTION 'STOP: no verified backup for %. Run export_raw_month.py and build_raw_archive.py. Nothing deleted.', p_month;
    END IF;
    SELECT COUNT(*) INTO v_rows FROM public.monthly_data WHERE created_at >= v_from AND created_at < v_to;
    IF v_rows <> v_manifest.row_count THEN
        RAISE EXCEPTION 'STOP: % now has % rows but the backup has %. Back it up again. Nothing deleted.',
            p_month, v_rows, v_manifest.row_count;
    END IF;

    -- Check 5: the saved daily totals cover every row of the month.
    SELECT COALESCE(SUM(tx_count), 0) INTO v_rows
    FROM public.raw_rollup_daily WHERE tx_date >= v_start AND tx_date < v_next;
    IF v_rows <> v_manifest.row_count THEN
        RAISE EXCEPTION 'STOP: saved daily totals for % hold % rows, expected %. Nothing deleted.',
            p_month, v_rows, v_manifest.row_count;
    END IF;

    -- Check 6: the month's Dynamic BI report is saved.
    IF NOT EXISTS (
        SELECT 1 FROM public.raw_archive_snapshots
        WHERE period_key = p_month AND dimension = 'all'
    ) THEN
        RAISE EXCEPTION 'STOP: the saved Dynamic BI report for % is missing. Nothing deleted.', p_month;
    END IF;

    -- Check 7: every active campaign has saved backward numbers for each remaining
    -- day whose backward window reaches into this month, in both function versions.
    v_as_of := public.get_max_monthly_data_date();
    FOR r IN
        SELECT id, campaign_start_date, campaign_end_date FROM public.campaign_setups
        WHERE COALESCE(is_frozen, false) = false AND campaign_end_date >= v_as_of
    LOOP
        IF r.campaign_start_date < v_next THEN
            RAISE EXCEPTION 'STOP: active campaign % runs inside %, so its raw rows are still needed. Nothing deleted.',
                r.id, p_month;
        END IF;
        SELECT COUNT(*) INTO v_missing
        FROM generate_series(
            GREATEST(1, LEAST(r.campaign_end_date - r.campaign_start_date + 1, v_as_of - r.campaign_start_date + 1)),
            r.campaign_end_date - r.campaign_start_date + 1
        ) AS elapsed
        CROSS JOIN (VALUES (10), (14)) AS v(version)
        WHERE (r.campaign_start_date - elapsed) < v_next
          AND NOT EXISTS (
              SELECT 1 FROM public.campaign_backward_snapshots s
              WHERE s.version = v.version
                AND s.backward_end = r.campaign_start_date - 1
                AND s.backward_start = r.campaign_start_date - elapsed
          );
        IF v_missing > 0 THEN
            RAISE EXCEPTION 'STOP: campaign % is missing % saved backward windows. Run build_raw_archive.py. Nothing deleted.',
                r.id, v_missing;
        END IF;
    END LOOP;

    -- All checks passed: delete the month.
    DELETE FROM public.monthly_data WHERE created_at >= v_from AND created_at < v_to;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    IF v_deleted <> v_manifest.row_count THEN
        RAISE EXCEPTION 'STOP: delete matched % rows, expected %. Rolled back, nothing deleted.',
            v_deleted, v_manifest.row_count;
    END IF;

    -- Raw data now starts at the next month. The website uses this for its messages.
    UPDATE public.raw_retention_settings
    SET raw_deleted_before = v_next, updated_at = now()
    WHERE id = 1;

    RETURN format('DELETED %s rows for %s. Raw data now starts %s.', v_deleted, p_month, v_next);
END;
$$;

-- Only the SQL Editor (postgres role) can run it. Not the website, not the API keys.
REVOKE ALL ON FUNCTION public.delete_raw_month(TEXT) FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Should return 1 row: delete_raw_month.
SELECT proname, pg_get_function_identity_arguments(oid) AS arguments
FROM pg_proc WHERE proname = 'delete_raw_month';
