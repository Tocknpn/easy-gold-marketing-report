-- ============================================================================
-- EASY GOLD MARKETING REPORT - DATABASE MIGRATION
-- Module: 10_user_profiles_and_campaigns.sql
-- Target: Supabase (PostgreSQL 15+)
-- Purpose: Schema for User Reporting Profiles & Campaign Tracking Setups
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER REPORTING PROFILES TABLE
-- Allows each user to save their custom pivot table configurations
-- (Row dimensions, selected metrics, slicer states, and presets)
CREATE TABLE IF NOT EXISTS public.user_reporting_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_name VARCHAR(128) NOT NULL,
    description TEXT,
    row_dimension VARCHAR(64) NOT NULL DEFAULT 'date', -- 'date', 'customer', 'bank', 'branch', 'transaction_type', 'month'
    selected_metrics JSONB NOT NULL DEFAULT '["total_buy_transac", "total_unique_user", "revenue_buy_mil_lak", "gold_weight_buy_g", "gold_buy_size_g", "total_nc"]'::jsonb,
    slicers JSONB NOT NULL DEFAULT '{"month": "all", "tx_type": "BUY_GOLD", "is_500k_up": "yes", "is_2g_up": "all", "is_3_75g_up": "all", "is_15g_up": "all", "status": "all"}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user profile queries
CREATE INDEX IF NOT EXISTS idx_user_reporting_profiles_user 
ON public.user_reporting_profiles (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_reporting_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage their own reporting profiles
CREATE POLICY "Users can manage own reporting profiles"
ON public.user_reporting_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid() OR auth.uid() IS NULL)
WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- 3. CAMPAIGN TRACKING SETUPS TABLE
-- Stores custom campaign concepts, date timelines, conditions, and targets
CREATE TABLE IF NOT EXISTS public.campaign_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    campaign_name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_start_date DATE NOT NULL,
    campaign_end_date DATE NOT NULL,
    as_of_date DATE NOT NULL,
    backward_start_date DATE NOT NULL,
    backward_end_date DATE NOT NULL,
    condition_type VARCHAR(64) NOT NULL DEFAULT 'amount_gte', -- 'amount_gte', 'weight_gte', 'tx_type'
    condition_value NUMERIC(18, 2) NOT NULL DEFAULT 500000,   -- e.g. 500000 LAK or 2.0g
    condition_label VARCHAR(128) NOT NULL DEFAULT 'Buy trans >= 500k',
    tx_type VARCHAR(64) NOT NULL DEFAULT 'BUY_GOLD',
    ec_target NUMERIC(18, 2) NOT NULL DEFAULT 307500,        -- Existing / Total Customers Target
    nc_target NUMERIC(18, 2) NOT NULL DEFAULT 17220,         -- New Customers Target
    baseline_daily_rr NUMERIC(18, 2) DEFAULT 79.0,           -- Baseline normal run-rate per day (e.g. Q3 average)
    status VARCHAR(32) NOT NULL DEFAULT 'active',            -- 'active', 'completed', 'draft'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for campaign setups
CREATE INDEX IF NOT EXISTS idx_campaign_setups_status_dates
ON public.campaign_setups (status, campaign_start_date DESC);

-- Enable RLS
ALTER TABLE public.campaign_setups ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read all campaigns; users manage their own or admins manage all
CREATE POLICY "Authenticated users can read campaign setups"
ON public.campaign_setups FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create and edit campaigns"
ON public.campaign_setups FOR ALL
TO authenticated
USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
));
