-- ==============================================================================
-- 59_fix_campaign_sync_missing_columns.sql
-- Adds the campaign_setups columns from migration 51, which never reached the live
-- database. The deployed sync_active_campaigns_daily reads and writes these columns,
-- and the active campaign has not updated since 2026-11-02 20:01 UTC.
-- Only adds columns. Deletes nothing and changes no existing values.
-- Run once in the Supabase SQL Editor.
-- ==============================================================================
ALTER TABLE public.campaign_setups
ADD COLUMN IF NOT EXISTS unique_users_target NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_unique_users NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_users_filter_mode TEXT DEFAULT 'condition_tier',
ADD COLUMN IF NOT EXISTS nc_qualification_mode TEXT DEFAULT 'all_registers',
ADD COLUMN IF NOT EXISTS nc_first_purchase_use_main_condition BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS nc_conditions JSONB DEFAULT '[]'::jsonb;

-- Refreshes the API's view of the table so the new columns are visible straight away.
NOTIFY pgrst, 'reload schema';

-- Should list all 6 new columns.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'campaign_setups'
  AND column_name IN (
      'unique_users_target', 'actual_unique_users', 'unique_users_filter_mode',
      'nc_qualification_mode', 'nc_first_purchase_use_main_condition', 'nc_conditions'
  )
ORDER BY column_name;
