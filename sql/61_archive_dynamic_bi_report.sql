-- ==============================================================================
-- 61_archive_dynamic_bi_report.sql
-- Saves one unfiltered or single-filter Dynamic BI report into raw_archive_snapshots.
-- Used only by scripts/build_raw_archive.py, and only by the service role.
--
-- Large periods (a whole quarter) and bank or branch filters take longer than the
-- 30 second limit that get_dynamic_bi_report keeps for the website. This function
-- has its own 170 second limit, which applies to the whole call. The website's
-- limit does not change. Deletes nothing.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.archive_dynamic_bi_report(
    p_period_key TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_dimension TEXT DEFAULT 'all',
    p_filter_value TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '170s'
AS $$
DECLARE
    v_payload JSONB;
BEGIN
    -- Same arguments worker.js sends for an unfiltered report.
    v_payload := public.get_dynamic_bi_report(
        (p_start_date::text || 'T00:00:00Z')::timestamptz,
        (p_end_date::text || 'T23:59:59Z')::timestamptz,
        CASE WHEN p_dimension = 'bank' THEN ARRAY[p_filter_value] END,
        CASE WHEN p_dimension = 'branch' THEN ARRAY[p_filter_value] END,
        CASE WHEN p_dimension = 'tx_type' THEN ARRAY[p_filter_value] END,
        NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric,
        NULL::int, NULL::int,
        'ສໍາເລັດ',
        NULL::int[], NULL::text[],
        'all',
        NULL::text
    );

    IF v_payload IS NULL OR jsonb_typeof(v_payload -> 'dax_measures') IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Empty report for % % %', p_period_key, p_dimension, p_filter_value;
    END IF;

    INSERT INTO public.raw_archive_snapshots (period_key, start_date, end_date, dimension, filter_value, payload)
    VALUES (p_period_key, p_start_date, p_end_date, p_dimension, p_filter_value, v_payload)
    ON CONFLICT (period_key, dimension, filter_value)
    DO UPDATE SET payload = EXCLUDED.payload, start_date = EXCLUDED.start_date,
                  end_date = EXCLUDED.end_date, created_at = now();

    RETURN jsonb_build_object(
        'bytes', octet_length(v_payload::text),
        'total_transaction', v_payload -> 'dax_measures' -> 'total_transaction'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_dynamic_bi_report(TEXT, DATE, DATE, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_dynamic_bi_report(TEXT, DATE, DATE, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';

-- Should return one row.
SELECT proname, pg_get_function_identity_arguments(oid) AS arguments
FROM pg_proc WHERE proname = 'archive_dynamic_bi_report';
