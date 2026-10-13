-- ============================================================================
-- EASY GOLD MARKETING REPORT - DATABASE BLUEPRINT
-- Module: 01_schema_and_indexes.sql
-- Target: Supabase (PostgreSQL 15+)
-- Capacity: 1.4M+ Rows Optimized for Free-Tier Shared Compute
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. USER ROLES ENUM & PROFILES TABLE FOR RBAC
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'operations_manager', 'viewer');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role public.app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CORE TRANSACTIONAL TABLE (monthly_data)
-- Maps 1:1 with Excel sample: 
-- ລຳດັບ (no), ຊື່ ແລະ ນາມສະກຸນ (customer_name), ເບີໂທ (phone), ຮູບແບບທຸລະກໍາ (transaction_type),
-- ຜ່ານທະນາຄານ (bank), ຍອດຄໍາທັງໝົດ (gold_weight), ຖືກເປັນເງີນ(ກີບ) (total_amount),
-- ສະຖານະ (status), ສາຂາ (branch), ວັນທີ່ຮ້ອງຂໍ (created_at)
CREATE TABLE IF NOT EXISTS public.monthly_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no BIGINT,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    transaction_type VARCHAR(64) NOT NULL, -- BUY_GOLD, SALE_GOLD, OPEN_ACCOUNT, WITHDRAW_GOLD, MARKETHUB_WITHDRAW, REFUND
    bank VARCHAR(64),                      -- BCEL, LDB, JDB, UMONEY, MMONEY, etc.
    gold_weight NUMERIC(12, 4) NOT NULL DEFAULT 0, -- Weight in grams
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0, -- Amount in Lao Kip (LAK)
    status VARCHAR(32) NOT NULL DEFAULT 'ສໍາເລັດ',  -- 'ສໍາເລັດ' (Completed), 'ປະຕິເສດ' (Failed)
    branch VARCHAR(255) DEFAULT '-',
    created_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- 4. HIGH-PERFORMANCE INDEXING STRATEGY (Handling 1.4M Rows)
-- ============================================================================

-- A. Composite covering index for time-range + status + transaction_type filtering
-- Allows Index-Only Scans without reading the heap table pages
CREATE INDEX IF NOT EXISTS idx_monthly_data_perf_composite 
ON public.monthly_data (status, created_at DESC, transaction_type)
INCLUDE (gold_weight, total_amount, phone, bank);

-- B. B-Tree index on created_at for fast date slicing & weekly partitioning queries
CREATE INDEX IF NOT EXISTS idx_monthly_data_created_at_brin
ON public.monthly_data USING BRIN (created_at);

-- C. Index for phone to enable fast COUNT(DISTINCT phone) within filtered ranges
CREATE INDEX IF NOT EXISTS idx_monthly_data_phone_active
ON public.monthly_data (phone, created_at)
WHERE status = 'ສໍາເລັດ';

-- D. Partial index for Ad-Hoc cross-filtering (Bank + Gold Weight brackets 15g - 800g)
CREATE INDEX IF NOT EXISTS idx_monthly_data_adhoc_bank_weight
ON public.monthly_data (bank, gold_weight, transaction_type)
WHERE status = 'ສໍາເລັດ';

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own profile; Admins can view all
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
));

-- Monthly Data: Restricted to authenticated users with valid roles
CREATE POLICY "Authenticated users with roles can read data"
ON public.monthly_data FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'operations_manager', 'viewer')
    )
);
