-- ============================================================================
-- EASY GOLD MARKETING REPORT - DATABASE MIGRATION
-- Module: 53_remove_plaintext_password_storage.sql
-- Purpose: Undo sql/35_add_plain_password_to_profiles.sql. Passwords must never
--          be stored in plaintext - Supabase Auth already hashes them correctly.
--
-- Run this in the Supabase SQL editor manually. Not executed automatically.
-- Recommended order: 1) rotate/replace exposed credentials, 2) run this,
-- 3) force a password reset for every user (see note at the bottom).
-- ============================================================================

-- 1. Stop the trigger from writing plaintext passwords on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assigned_role public.app_role := 'viewer';
    user_name TEXT;
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

-- 2. Drop the plaintext password column entirely (not just clear its values)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plain_password;

-- ============================================================================
-- AFTER RUNNING THIS: force a password reset for every account that was ever
-- provisioned with the shared default password ('EasyGold2026!') or whose
-- password may have been exposed while this table held plaintext values.
-- In the Supabase dashboard: Authentication -> Users -> select each user ->
-- "Send password recovery", or call supabase.auth.admin.generateLink()/
-- resetPasswordForEmail() for each address from a trusted server context.
-- ============================================================================
