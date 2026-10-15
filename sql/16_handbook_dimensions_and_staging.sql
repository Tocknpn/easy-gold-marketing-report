-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE REPORT
-- Module: 16_handbook_dimensions_and_staging.sql
-- Description: Dimension Tables (Date, Branch, Bank, Status, Buckets)
--              and Staging View based on "Data Structure Handbook"
-- ============================================================================

-- 1. EXTENSIONS & SAFE PARSER
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure parse_tx_date exists and handles raw formats (DD/MM/YYYY, ISO, etc.)
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
                RETURN to_timestamp(val, 'DD/MM/YYYY HH24:MI');
            EXCEPTION WHEN OTHERS THEN
                RETURN to_date(split_part(split_part(val, ',', 1), ' ', 1), 'DD/MM/YYYY')::timestamptz;
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

-- 2. DIMENSION: DATE (dim_date)
-- Replaces Power BI calendar table; covers 2024 to 2027
CREATE TABLE IF NOT EXISTS public.dim_date (
    date_id DATE PRIMARY KEY,
    year_num INT NOT NULL,
    quarter_num INT NOT NULL,
    month_num INT NOT NULL,
    month_name TEXT NOT NULL,
    year_month TEXT NOT NULL,
    week_num INT NOT NULL,
    year_week TEXT NOT NULL,
    week_start_date DATE NOT NULL,
    day_of_week INT NOT NULL,
    day_name TEXT NOT NULL,
    is_weekend BOOLEAN NOT NULL,
    is_working_day BOOLEAN NOT NULL
);

-- Seed dim_date if empty
INSERT INTO public.dim_date (
    date_id, year_num, quarter_num, month_num, month_name, year_month,
    week_num, year_week, week_start_date, day_of_week, day_name, is_weekend, is_working_day
)
SELECT 
    d::date AS date_id,
    EXTRACT(YEAR FROM d)::int AS year_num,
    EXTRACT(QUARTER FROM d)::int AS quarter_num,
    EXTRACT(MONTH FROM d)::int AS month_num,
    to_char(d, 'Mon') AS month_name,
    to_char(d, 'YYYY-MM') AS year_month,
    EXTRACT(WEEK FROM d)::int AS week_num,
    to_char(d, 'IYYY-"W"IW') AS year_week,
    (date_trunc('week', d))::date AS week_start_date,
    EXTRACT(ISODOW FROM d)::int AS day_of_week,
    to_char(d, 'Day') AS day_name,
    EXTRACT(ISODOW FROM d) IN (6, 7) AS is_weekend,
    EXTRACT(ISODOW FROM d) NOT IN (6, 7) AS is_working_day
FROM generate_series('2024-01-01'::date, '2027-12-31'::date, '1 day'::interval) d
ON CONFLICT (date_id) DO NOTHING;

-- 3. DIMENSION: STATUS (dim_status)
CREATE TABLE IF NOT EXISTS public.dim_status (
    status_code TEXT PRIMARY KEY,
    raw_status_lao TEXT NOT NULL,
    display_label TEXT NOT NULL,
    is_successful BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 100
);

INSERT INTO public.dim_status (status_code, raw_status_lao, display_label, is_successful, sort_order)
VALUES 
    ('COMPLETED', 'ສໍາເລັດ', 'Completed / ສໍາເລັດ', true, 1),
    ('PENDING', 'ລໍຖ້າ', 'Pending / ລໍຖ້າ', false, 2),
    ('FAILED', 'ບໍ່ສໍາເລັດ', 'Failed / ບໍ່ສໍາເລັດ', false, 3),
    ('CANCELLED', 'ຍົກເລີກ', 'Cancelled / ຍົກເລີກ', false, 4),
    ('UNKNOWN', 'UNKNOWN', 'Unknown / ອື່ນໆ', false, 99)
ON CONFLICT (status_code) DO NOTHING;

-- 4. DIMENSION: BRANCH (dim_branch)
CREATE TABLE IF NOT EXISTS public.dim_branch (
    branch_code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 100
);

-- Seed standard known branches
INSERT INTO public.dim_branch (branch_code, display_name, is_active, sort_order)
VALUES 
    ('UNKNOWN', 'Online / Unspecified', true, 1),
    ('VTE_MAIN', 'Vientiane Main Branch', true, 2),
    ('VTE_DONGDOK', 'Dongdok Branch', true, 3),
    ('LUANGPRABANG', 'Luang Prabang Branch', true, 4),
    ('PAKSE', 'Pakse Branch', true, 5),
    ('SAVANNAKHET', 'Savannakhet Branch', true, 6)
ON CONFLICT (branch_code) DO NOTHING;

-- 5. DIMENSION: BANK (dim_bank)
CREATE TABLE IF NOT EXISTS public.dim_bank (
    bank_code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 100
);

INSERT INTO public.dim_bank (bank_code, display_name, is_active, sort_order)
VALUES 
    ('BCEL', 'BCEL One', true, 1),
    ('MMONEY', 'M-Money (Unitel)', true, 2),
    ('PSVB', 'Phongsavanh Bank', true, 3),
    ('LDB', 'Lao Development Bank', true, 4),
    ('APB', 'Agricultural Promotion Bank', true, 5),
    ('JDB', 'Joint Development Bank', true, 6),
    ('OTHER', 'Other Bank / App', true, 99)
ON CONFLICT (bank_code) DO NOTHING;

-- 6. DIMENSION: TRANSACTION TYPE (dim_transaction_type)
CREATE TABLE IF NOT EXISTS public.dim_transaction_type (
    tx_type_code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    is_trade_flow BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 100
);

INSERT INTO public.dim_transaction_type (tx_type_code, display_name, is_trade_flow, sort_order)
VALUES 
    ('BUY_GOLD', 'Buy Gold (ຊື້ຄຳ)', true, 1),
    ('SALE_GOLD', 'Sell Gold (ຂາຍຄຳ)', true, 2),
    ('WITHDRAW_GOLD', 'Withdraw Gold (ຖອນຄຳ)', false, 3),
    ('OPEN_ACCOUNT', 'Open Account (ເປີດບັນຊີ)', false, 4)
ON CONFLICT (tx_type_code) DO NOTHING;

-- 7. DIMENSION: BUCKETS (dim_weight_bucket & dim_amount_bucket)
CREATE TABLE IF NOT EXISTS public.dim_weight_bucket (
    bucket_code TEXT PRIMARY KEY,
    display_label TEXT NOT NULL,
    min_grams NUMERIC(12,4) NOT NULL,
    max_grams NUMERIC(12,4), -- NULL means infinity
    sort_order INT NOT NULL
);

INSERT INTO public.dim_weight_bucket (bucket_code, display_label, min_grams, max_grams, sort_order)
VALUES 
    ('W_0_0.5', '0 – 0.5g', 0.0000, 0.5000, 1),
    ('W_0.5_1', '0.5 – 1g', 0.5000, 1.0000, 2),
    ('W_1_2',   '1 – 2g',   1.0000, 2.0000, 3),
    ('W_2_5',   '2 – 5g',   2.0000, 5.0000, 4),
    ('W_5_15',  '5 – 15g',  5.0000, 15.0000, 5),
    ('W_15_30', '15 – 30g', 15.0000, 30.0000, 6),
    ('W_30_PLUS','30g+',    30.0000, NULL, 7)
ON CONFLICT (bucket_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dim_amount_bucket (
    bucket_code TEXT PRIMARY KEY,
    display_label TEXT NOT NULL,
    min_lak NUMERIC(18,2) NOT NULL,
    max_lak NUMERIC(18,2), -- NULL means infinity
    sort_order INT NOT NULL
);

-- Note: 500k is explicitly an edge as required by Campaign tracking rules
INSERT INTO public.dim_amount_bucket (bucket_code, display_label, min_lak, max_lak, sort_order)
VALUES 
    ('A_UNDER_100K', '< 100K LAK', 0, 100000, 1),
    ('A_100K_500K',  '100K – 500K LAK', 100000, 500000, 2),
    ('A_500K_1M',    '500K – 1M LAK', 500000, 1000000, 3),
    ('A_1M_5M',      '1M – 5M LAK', 1000000, 5000000, 4),
    ('A_5M_10M',     '5M – 10M LAK', 5000000, 10000000, 5),
    ('A_10M_PLUS',   '10M+ LAK', 10000000, NULL, 6)
ON CONFLICT (bucket_code) DO NOTHING;

-- 8. HELPER MAPPING FUNCTIONS (Bucket assignment without joins)
CREATE OR REPLACE FUNCTION public.get_weight_bucket_code(p_weight NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN p_weight IS NULL OR p_weight <= 0 THEN 'W_0_0.5'
        WHEN p_weight < 0.5 THEN 'W_0_0.5'
        WHEN p_weight < 1.0 THEN 'W_0.5_1'
        WHEN p_weight < 2.0 THEN 'W_1_2'
        WHEN p_weight < 5.0 THEN 'W_2_5'
        WHEN p_weight < 15.0 THEN 'W_5_15'
        WHEN p_weight < 30.0 THEN 'W_15_30'
        ELSE 'W_30_PLUS'
    END;
$$;

CREATE OR REPLACE FUNCTION public.get_amount_bucket_code(p_amount NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN p_amount IS NULL OR p_amount < 100000 THEN 'A_UNDER_100K'
        WHEN p_amount < 500000 THEN 'A_100K_500K'
        WHEN p_amount < 1000000 THEN 'A_500K_1M'
        WHEN p_amount < 5000000 THEN 'A_1M_5M'
        WHEN p_amount < 10000000 THEN 'A_5M_10M'
        ELSE 'A_10M_PLUS'
    END;
$$;

-- 9. STAGING VIEW (stg_clean_transactions)
-- Normalizes raw data types, converts timestamps, maps branch '-' to UNKNOWN, maps status
CREATE OR REPLACE VIEW public.stg_clean_transactions AS
SELECT 
    m.id,
    -- Handle created_at safely
    COALESCE(
        CASE 
            WHEN m.created_at IS NULL THEN NULL
            ELSE public.parse_tx_date(m.created_at::text)
        END,
        now()
    ) AS tx_timestamp,
    -- Cast to date for grain keys
    COALESCE(
        (public.parse_tx_date(m.created_at::text))::date,
        CURRENT_DATE
    ) AS tx_date,
    EXTRACT(HOUR FROM public.parse_tx_date(m.created_at::text))::int AS tx_hour,
    -- Normalized branch
    CASE 
        WHEN m.branch IS NULL OR trim(m.branch) = '' OR trim(m.branch) = '-' THEN 'UNKNOWN'
        ELSE trim(m.branch)
    END AS branch_code,
    -- Normalized bank
    COALESCE(NULLIF(upper(trim(m.bank)), ''), 'OTHER') AS bank_code,
    -- Transaction type
    COALESCE(NULLIF(trim(m.transaction_type), ''), 'BUY_GOLD') AS tx_type_code,
    -- Normalized status code
    CASE 
        WHEN m.status = 'ສໍາເລັດ' THEN 'COMPLETED'
        WHEN m.status = 'ລໍຖ້າ' THEN 'PENDING'
        WHEN m.status = 'ບໍ່ສໍາເລັດ' THEN 'FAILED'
        WHEN m.status = 'ຍົກເລີກ' THEN 'CANCELLED'
        ELSE 'COMPLETED' -- Default successful if matching standard flow
    END AS status_code,
    -- Clean customer identifier
    NULLIF(trim(m.phone), '') AS customer_phone,
    -- Numbers with clean precision
    COALESCE(m.gold_weight, 0)::numeric(12,4) AS gold_weight_g,
    COALESCE(m.total_amount, 0)::numeric(18,2) AS amount_lak,
    -- Buckets
    public.get_weight_bucket_code(COALESCE(m.gold_weight, 0)) AS weight_bucket_code,
    public.get_amount_bucket_code(COALESCE(m.total_amount, 0)) AS amount_bucket_code,
    -- Campaign 500k flag
    (COALESCE(m.total_amount, 0) >= 500000) AS is_ge_500k
FROM public.monthly_data m;
