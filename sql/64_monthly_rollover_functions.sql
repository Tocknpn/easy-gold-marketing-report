-- ==============================================================================
-- 64_monthly_rollover_functions.sql
-- Functions for the automatic monthly rollover (scripts/roll_raw_month.py, run by
-- .github/workflows/monthly-raw-rollover.yml). Run this file once in the SQL Editor.
-- Creating these functions deletes nothing.
--
-- Each month the rollover keeps 5 calendar months of raw data. Before deleting the
-- oldest month it makes that month's WoW, MTD, Target and Daily numbers final, saves
-- its reports, then moves the lock so those numbers can never change.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Daily totals by hour, type, bank, branch and status for one month.
-- Same as section 2 of sql/60, for any month. Returns the number of raw rows covered.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_raw_rollup(p_month TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SET statement_timeout = '0'
AS $$
DECLARE
    v_start DATE := (p_month || '-01')::date;
    v_next DATE := ((p_month || '-01')::date + INTERVAL '1 month')::date;
    v_total BIGINT;
BEGIN
    DELETE FROM public.raw_rollup_daily WHERE tx_date >= v_start AND tx_date < v_next;

    INSERT INTO public.raw_rollup_daily
    SELECT
        substring(created_at, 1, 10)::date,
        NULLIF(substring(created_at, 12, 2), '')::int,
        transaction_type, bank, branch, status,
        COUNT(*),
        COALESCE(SUM(gold_weight), 0),
        COALESCE(SUM(total_amount), 0)
    FROM public.monthly_data
    WHERE created_at >= v_start::text AND created_at < v_next::text
    GROUP BY 1, 2, 3, 4, 5, 6;

    SELECT COALESCE(SUM(tx_count), 0) INTO v_total
    FROM public.raw_rollup_daily WHERE tx_date >= v_start AND tx_date < v_next;
    RETURN v_total;
END;
$$;

-- ------------------------------------------------------------------------------
-- Records the month's row count and totals, read from the database itself.
-- There is no backup file in the automatic rollover, so sha256 is 'no-file'.
-- delete_raw_month() refuses to delete unless the month still has exactly these rows.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_raw_month_manifest(p_month TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET statement_timeout = '0'
AS $$
DECLARE
    v_start DATE := (p_month || '-01')::date;
    v_next DATE := ((p_month || '-01')::date + INTERVAL '1 month')::date;
    v_rows BIGINT;
    v_gold NUMERIC;
    v_amount NUMERIC;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(gold_weight), 0), COALESCE(SUM(total_amount), 0)
    INTO v_rows, v_gold, v_amount
    FROM public.monthly_data
    WHERE created_at >= v_start::text AND created_at < v_next::text;

    INSERT INTO public.raw_export_manifest (month, row_count, gold_weight, total_amount, sha256, verified_at)
    VALUES (p_month, v_rows, v_gold, v_amount, 'no-file', now())
    ON CONFLICT (month) DO UPDATE SET
        row_count = EXCLUDED.row_count, gold_weight = EXCLUDED.gold_weight,
        total_amount = EXCLUDED.total_amount, sha256 = EXCLUDED.sha256, verified_at = now();

    RETURN jsonb_build_object('rows', v_rows, 'gold_weight', v_gold, 'total_amount', v_amount);
END;
$$;

-- ------------------------------------------------------------------------------
-- Makes the month's saved numbers final, from its complete raw data, before the lock
-- moves past it. Uses the same functions the daily upload runs:
--   refresh_summary_daily     -> MTD, Business Target and Daily Performance
--   recalculate_week_summary  -> WoW
-- Weeks that start before the current lock are already locked and stay unchanged.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_month_summaries(p_month TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET statement_timeout = '0'
AS $$
DECLARE
    v_start DATE := (p_month || '-01')::date;
    v_end DATE := ((p_month || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day')::date;
    v_week TIMESTAMPTZ;
    v_weeks INT := 0;
    v_days INT;
    v_expected INT;
BEGIN
    PERFORM public.refresh_summary_daily(v_start, v_end);

    FOR v_week IN
        SELECT generate_series(date_trunc('week', v_start::timestamptz), v_end::timestamptz, INTERVAL '1 week')
    LOOP
        PERFORM public.recalculate_week_summary(v_week);
        v_weeks := v_weeks + 1;
    END LOOP;

    v_expected := v_end - v_start + 1;
    SELECT COUNT(*) INTO v_days
    FROM public.summary_daily_metrics WHERE date_id BETWEEN v_start AND v_end;
    IF v_days <> v_expected THEN
        RAISE EXCEPTION 'STOP: % has saved daily totals for % of % days. Upload the missing days first.',
            p_month, v_days, v_expected;
    END IF;

    RETURN jsonb_build_object('month', p_month, 'days', v_days, 'weeks_recalculated', v_weeks);
END;
$$;

-- ------------------------------------------------------------------------------
-- Moves the lock forward. It never moves back, so locked numbers stay locked.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_raw_cutoff(p_new_cutoff DATE)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
    v_current DATE;
BEGIN
    SELECT cutoff_date INTO v_current FROM public.raw_retention_settings WHERE id = 1 FOR UPDATE;
    IF p_new_cutoff > v_current THEN
        UPDATE public.raw_retention_settings
        SET cutoff_date = p_new_cutoff, updated_at = now()
        WHERE id = 1;
        RETURN p_new_cutoff;
    END IF;
    RETURN v_current;
END;
$$;

-- Only the direct database connection (postgres) can run these.
REVOKE ALL ON FUNCTION public.build_raw_rollup(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_raw_month_manifest(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.finalize_month_summaries(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.advance_raw_cutoff(DATE) FROM PUBLIC, anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- Storage status for the emails. Read-only.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_raw_storage_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'database_mb', ROUND(pg_database_size(current_database()) / 1048576.0, 1),
        'monthly_data_mb', ROUND(pg_total_relation_size('public.monthly_data') / 1048576.0, 1),
        'limit_mb', 500,
        'raw_from', (SELECT substring(MIN(created_at), 1, 10) FROM public.monthly_data),
        'raw_to', (SELECT substring(MAX(created_at), 1, 10) FROM public.monthly_data
                   WHERE created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'),
        'locked_before', (SELECT cutoff_date FROM public.raw_retention_settings WHERE id = 1)
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_raw_storage_status() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Should return 5 rows.
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname IN (
    'build_raw_rollup', 'record_raw_month_manifest', 'finalize_month_summaries',
    'advance_raw_cutoff', 'get_raw_storage_status')
ORDER BY proname;
