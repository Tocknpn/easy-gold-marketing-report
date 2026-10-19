-- ============================================================================
-- Migration: 34_support_multi_conditions_campaigns.sql
-- Description: Adds conditions JSONB column to public.campaign_setups to support
--              dynamic multi-conditions (AND logic) and zero-condition (e.g. NC only)
-- ============================================================================

ALTER TABLE public.campaign_setups
ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.campaign_setups.conditions IS 'Array of condition rules: [{ metric, operator, value, max_value }]';
