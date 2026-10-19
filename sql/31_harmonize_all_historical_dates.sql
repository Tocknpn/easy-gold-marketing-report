-- ============================================================================
-- EASY GOLD MARKETING REPORT - COMPLETE DATABASE HARMONIZATION ENGINE
-- File: 31_harmonize_all_historical_dates.sql
-- Description:
-- Standardizes ALL historical data (August, July, June, May, April, March, 
-- Feb, Jan 2026, and any 2025) into universal ISO 'YYYY-MM-DD HH24:MI:SS'.
-- Month-by-month chunking ensures fast execution (< 3 sec per month)
-- without hitting PostgreSQL statement or memory limits.
-- ============================================================================

-- Ensure parse_tx_date helper is present and fast
CREATE OR REPLACE FUNCTION public.parse_tx_date(val TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF val IS NULL OR trim(val) = '' THEN
        RETURN NULL;
    END IF;
    IF val ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}' THEN
        BEGIN
            RETURN to_timestamp(val, 'DD/MM/YYYY, HH24:MI:SS');
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                RETURN to_timestamp(val, 'DD/MM/YYYY, HH24:MI');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    RETURN to_timestamp(val, 'DD/MM/YYYY HH24:MI');
                EXCEPTION WHEN OTHERS THEN
                    RETURN to_date(split_part(split_part(val, ',', 1), ' ', 1), 'DD/MM/YYYY')::timestamptz;
                END;
            END;
        END;
    ELSIF val ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN
        RETURN val::timestamptz;
    ELSE
        RETURN to_date(split_part(split_part(val, ',', 1), ' ', 1), 'DD/MM/YYYY')::timestamptz;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


-- ============================================================================
-- 1. HARMONIZE AUGUST 2026 (08/2026)
-- Converts '30/08/2026, 00:05' -> '2026-08-30 00:05:00'
-- ============================================================================
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE created_at LIKE '%/08/2026%'
  AND created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';


-- ============================================================================
-- 2. HARMONIZE JULY 2026 (07/2026)
-- Converts '23/07/2026, 00:00' -> '2026-07-23 00:00:00'
-- ============================================================================
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE created_at LIKE '%/07/2026%'
  AND created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';


-- ============================================================================
-- 3. HARMONIZE JUNE 2026 (06/2026)
-- ============================================================================
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE created_at LIKE '%/06/2026%'
  AND created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';


-- ============================================================================
-- 4. HARMONIZE MAY 2026 (05/2026)
-- ============================================================================
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE created_at LIKE '%/05/2026%'
  AND created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';


-- ============================================================================
-- 5. HARMONIZE APRIL 2026 (04/2026)
-- ============================================================================
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE created_at LIKE '%/04/2026%'
  AND created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';


-- ============================================================================
-- 6. HARMONIZE MARCH 2026 (03/2026)
-- ============================================================================
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE created_at LIKE '%/03/2026%'
  AND created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';


-- ============================================================================
-- 7. HARMONIZE FEBRUARY & JANUARY 2026 (02/2026, 01/2026)
-- ============================================================================
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE (created_at LIKE '%/02/2026%' OR created_at LIKE '%/01/2026%')
  AND created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';


-- ============================================================================
-- 8. HARMONIZE ANY 2025 OR OLDER DATES
-- ============================================================================
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE created_at LIKE '%/2025%'
  AND created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}';


-- ============================================================================
-- 9. SAFETY SWEEPER: CATCH ANY REMAINING ROWS (IN 50K CHUNKS)
-- Ensures 0 legacy formatted rows remain anywhere in the table
-- ============================================================================
DO $$
DECLARE
    v_count INT;
BEGIN
    LOOP
        UPDATE public.monthly_data
        SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
        WHERE id IN (
            SELECT id FROM public.monthly_data
            WHERE created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}'
            LIMIT 50000
        );
        GET DIAGNOSTICS v_count = ROW_COUNT;
        EXIT WHEN v_count = 0;
        RAISE NOTICE 'Processed chunk of % legacy date rows...', v_count;
    END LOOP;
END $$;


-- ============================================================================
-- 10. FINAL VERIFICATION: CHECK FULL DATABASE STATUS
-- ============================================================================
-- A. Verify legacy format count is now ZERO:
SELECT 
    COUNT(*) FILTER (WHERE created_at ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}') AS legacy_format_remaining,
    COUNT(*) FILTER (WHERE created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}') AS iso_standard_rows,
    COUNT(*) AS total_database_rows
FROM public.monthly_data;

-- B. Summary of all months in the entire database (ordered by month):
SELECT 
    substring(created_at from 1 for 7) AS month_year,
    COUNT(*) AS total_transactions,
    MIN(created_at) AS earliest_record,
    MAX(created_at) AS latest_record
FROM public.monthly_data
WHERE created_at IS NOT NULL AND trim(created_at) <> ''
GROUP BY 1
ORDER BY month_year DESC;
