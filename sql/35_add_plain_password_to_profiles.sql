-- ============================================================================
-- EASY GOLD MARKETING REPORT - DATABASE MIGRATION
-- Module: 35_add_plain_password_to_profiles.sql
-- Purpose: Add plain_password column to public.profiles table
-- Allows admins to directly view and edit user passwords in Supabase Table Editor
-- ============================================================================

-- 1. Add plain_password column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plain_password TEXT DEFAULT 'EasyGold2026!';

-- 2. Populate existing users
UPDATE public.profiles
SET plain_password = 'EasyGold2026!'
WHERE plain_password IS NULL;

-- 3. Update handle_new_user trigger to save plain_password automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    assigned_role public.app_role := 'viewer';
    user_name TEXT;
    raw_pwd TEXT;
BEGIN
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
    raw_pwd := COALESCE(new.raw_user_meta_data->>'plain_password', 'EasyGold2026!');

    INSERT INTO public.profiles (id, email, full_name, role, plain_password, assigned_profiles, status, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        user_name,
        assigned_role,
        raw_pwd,
        '["profile-daily-buy-summary", "profile-customer-gold-volume", "profile-bank-performance"]'::jsonb,
        'active',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        plain_password = COALESCE(EXCLUDED.plain_password, public.profiles.plain_password),
        updated_at = now();

    RETURN NEW;
END;
$$;
