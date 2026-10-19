-- ============================================================================
-- EASY GOLD MARKETING REPORT - FIX 31/08/2026 DATE FORMAT
-- File: 28_fix_31_08_2026_date_format.sql
-- Description: Standardizes 31/08/2026 into ISO format '2026-08-31 HH:MI:SS'
--              and cleans up the single test row from earlier.
-- ============================================================================

-- 1. Clean up the single ping test row (ID: 1447734)
DELETE FROM public.monthly_data 
WHERE id = 1447734;


-- 2. Standardize 31/08/2026 format into 'YYYY-MM-DD HH24:MI:SS'
-- Uses ID range (1356225 to 1363232) so it runs in < 0.5s without timeout
UPDATE public.monthly_data
SET created_at = to_char(public.parse_tx_date(created_at), 'YYYY-MM-DD HH24:MI:SS')
WHERE id BETWEEN 1356225 AND 1363232
  AND created_at LIKE '31/08/2026%';


-- 3. Verify: Check that 31/08/2026 is now cleanly formatted as 2026-08-31
SELECT 
    id,
    created_at AS new_formatted_date,
    customer_name,
    transaction_type,
    total_amount
FROM public.monthly_data
WHERE id BETWEEN 1356225 AND 1356230;
