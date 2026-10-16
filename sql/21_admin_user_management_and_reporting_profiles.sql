-- ============================================================================
-- EASY GOLD MARKETING REPORT - DATABASE MIGRATION
-- Module: 21_admin_user_management_and_reporting_profiles.sql
-- Target: Supabase (PostgreSQL 15+)
-- Purpose: Schema for Admin User Management, RBAC, and Assigned Reporting Profiles
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER ROLE ENUM
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'operations_manager', 'viewer');
    END IF;
END $$;

-- 3. ENHANCED PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role public.app_role NOT NULL DEFAULT 'viewer',
    assigned_profiles JSONB NOT NULL DEFAULT '["profile-daily-buy-summary", "profile-customer-gold-volume", "profile-bank-performance"]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'invited'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure assigned_profiles and status columns exist if table was already created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_profiles JSONB NOT NULL DEFAULT '["profile-daily-buy-summary", "profile-customer-gold-volume", "profile-bank-performance"]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'active';

-- Index for searching and filtering users by role and email
CREATE INDEX IF NOT EXISTS idx_profiles_role_email ON public.profiles (role, email);

-- 4. AUTO-SYNC TRIGGER: auth.users -> public.profiles
-- Automatically create profile row when user signs up in Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    assigned_role public.app_role := 'viewer';
    user_name TEXT;
BEGIN
    -- Infer role from metadata or email domain/prefix
    IF (new.raw_user_meta_data->>'role') IS NOT NULL THEN
        BEGIN
            assigned_role := (new.raw_user_meta_data->>'role')::public.app_role;
        EXCEPTION WHEN OTHERS THEN
            assigned_role := 'viewer';
        END;
    ELSIF new.email ILIKE '%director%' OR new.email ILIKE '%admin%' THEN
        assigned_role := 'admin';
    ELSIF new.email ILIKE '%manager%' THEN
        assigned_role := 'operations_manager';
    END IF;

    user_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

    INSERT INTO public.profiles (id, email, full_name, role, assigned_profiles, status, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        user_name,
        assigned_role,
        '["profile-daily-buy-summary", "profile-customer-gold-volume", "profile-bank-performance"]'::jsonb,
        'active',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. ROW LEVEL SECURITY (RLS) FOR PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admins can read and modify all profiles
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR auth.uid() IS NULL -- Allow during setup/service role
);

-- Users can read their own profile and view basic profile info of colleagues
DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
CREATE POLICY "Users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 6. RPC: GET ALL USERS FOR ADMIN DASHBOARD
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role public.app_role,
    assigned_profiles JSONB,
    status VARCHAR(32),
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.assigned_profiles,
        p.status,
        p.created_at,
        u.last_sign_in_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
$$;

-- 7. RPC: UPDATE USER ROLE AND ASSIGNED REPORTING PROFILES (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_set_user_role_and_profiles(
    target_user_id UUID,
    new_role public.app_role,
    new_assigned_profiles JSONB,
    new_status VARCHAR(32) DEFAULT 'active'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller is admin or service_role
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required.';
    END IF;

    UPDATE public.profiles
    SET 
        role = new_role,
        assigned_profiles = new_assigned_profiles,
        status = new_status,
        updated_at = now()
    WHERE id = target_user_id;
END;
$$;
