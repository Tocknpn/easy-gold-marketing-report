-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE REPORT
-- Module: 22_marketing_targets_and_run_rate_performance.sql
-- Target: Supabase (PostgreSQL 15+)
-- Purpose: 2026 Monthly Marketing Targets, Run-Rate Performance Engine & SQL Console
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. MONTHLY MARKETING TARGETS TABLE
CREATE TABLE IF NOT EXISTS public.monthly_marketing_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    target_nc NUMERIC(18, 2) NOT NULL DEFAULT 9500,
    buy_trans NUMERIC(18, 2) NOT NULL DEFAULT 0,
    buy_weight_g NUMERIC(18, 2) NOT NULL DEFAULT 0,
    sell_trans NUMERIC(18, 2) NOT NULL DEFAULT 0,
    sell_weight_g NUMERIC(18, 2) NOT NULL DEFAULT 0,
    buy_value_mil_lak NUMERIC(18, 2) DEFAULT 0,
    sell_value_mil_lak NUMERIC(18, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_marketing_targets_year_month UNIQUE (year, month)
);

-- Index for instant lookups by year and month
CREATE INDEX IF NOT EXISTS idx_marketing_targets_year_month 
ON public.monthly_marketing_targets (year, month);

-- 3. SEED 2026 MARKETING TARGETS (OFFICIAL BOARD BUDGET)
INSERT INTO public.monthly_marketing_targets (
    year, month, target_nc, buy_trans, buy_weight_g, sell_trans, sell_weight_g, notes
) VALUES
(2026, 1,  9500,  164099, 279167.00, 68079,  218957.75, 'Jan 2026 Board Target'),
(2026, 2,  9500,  172501, 293460.00, 71565,  230167.59, 'Feb 2026 Board Target'),
(2026, 3,  9500,  180902, 307752.00, 75050,  241377.43, 'Mar 2026 Board Target'),
(2026, 4,  9500,  189303, 322044.00, 78536,  252587.28, 'Apr 2026 Board Target (Lao New Year)'),
(2026, 5,  9500,  197705, 336337.00, 82021,  263797.12, 'May 2026 Board Target'),
(2026, 6,  9500,  206106, 350629.00, 85507,  275006.97, 'Jun 2026 Board Target (Mid-Year)'),
(2026, 7,  9500,  214507, 364921.00, 88992,  286216.81, 'Jul 2026 Board Target'),
(2026, 8,  9500,  222908, 379214.00, 92477,  297426.65, 'Aug 2026 Board Target'),
(2026, 9,  9500,  231310, 393506.00, 95963,  308636.50, 'Sep 2026 Board Target (Q3 Close)'),
(2026, 10, 9500,  239711, 407798.00, 99448,  319846.34, 'Oct 2026 Board Target (Boun Suang Heua)'),
(2026, 11, 9500,  248112, 422091.00, 102934, 331056.18, 'Nov 2026 Board Target (That Luang Festival)'),
(2026, 12, 12940, 256514, 436383.00, 106419, 342266.03, 'Dec 2026 Board Target (Year-End Peak & Bonus)')
ON CONFLICT (year, month) DO UPDATE SET
    target_nc = EXCLUDED.target_nc,
    buy_trans = EXCLUDED.buy_trans,
    buy_weight_g = EXCLUDED.buy_weight_g,
    sell_trans = EXCLUDED.sell_trans,
    sell_weight_g = EXCLUDED.sell_weight_g,
    notes = EXCLUDED.notes,
    updated_at = now();

-- 4. ENABLE RLS & GRANTS
ALTER TABLE public.monthly_marketing_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read marketing targets" ON public.monthly_marketing_targets;
CREATE POLICY "Anyone can read marketing targets"
ON public.monthly_marketing_targets
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Admins can modify marketing targets" ON public.monthly_marketing_targets;
CREATE POLICY "Admins can modify marketing targets"
ON public.monthly_marketing_targets
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'operations_manager')
    ) OR auth.uid() IS NULL
);

-- 5. RPC: GET TARGETS FOR GIVEN YEAR
CREATE OR REPLACE FUNCTION public.get_annual_marketing_targets(p_year INT DEFAULT 2026)
RETURNS TABLE (
    year INT,
    month INT,
    target_nc NUMERIC,
    buy_trans NUMERIC,
    buy_weight_g NUMERIC,
    sell_trans NUMERIC,
    sell_weight_g NUMERIC,
    total_trans NUMERIC,
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.year,
        t.month,
        t.target_nc,
        t.buy_trans,
        t.buy_weight_g,
        t.sell_trans,
        t.sell_weight_g,
        (t.buy_trans + t.sell_trans) AS total_trans,
        t.notes
    FROM public.monthly_marketing_targets t
    WHERE t.year = p_year
    ORDER BY t.month ASC;
END;
$$;

-- 6. RPC: GET EXECUTIVE RUN-RATE & TARGET ATTAINMENT REPORT
-- Calculates Run Rate projections, MoM comparisons, and Target Attainment percentages
CREATE OR REPLACE FUNCTION public.get_marketing_run_rate_report(
    p_year INT DEFAULT 2026,
    p_month INT DEFAULT 10,
    p_comp_year INT DEFAULT 2026,
    p_comp_month INT DEFAULT 9,
    p_as_of_day INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_days_in_month INT;
    v_days_in_comp_month INT;
    v_time_gone_pct NUMERIC;
    v_target RECORD;
    v_comp_target RECORD;
    v_result JSONB;
BEGIN
    -- Determine total days in current month
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(p_year, p_month, 1)) + INTERVAL '1 month - 1 day'));
    v_days_in_comp_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(p_comp_year, p_comp_month, 1)) + INTERVAL '1 month - 1 day'));
    
    -- Ensure as_of_day is within bounds
    IF p_as_of_day > v_days_in_month THEN
        p_as_of_day := v_days_in_month;
    END IF;

    v_time_gone_pct := ROUND((p_as_of_day::numeric / v_days_in_month) * 100, 1);

    -- Fetch current and comp month targets
    SELECT * INTO v_target 
    FROM public.monthly_marketing_targets 
    WHERE year = p_year AND month = p_month;

    SELECT * INTO v_comp_target 
    FROM public.monthly_marketing_targets 
    WHERE year = p_comp_year AND month = p_comp_month;

    RETURN jsonb_build_object(
        'meta', jsonb_build_object(
            'year', p_year,
            'month', p_month,
            'comp_year', p_comp_year,
            'comp_month', p_comp_month,
            'as_of_day', p_as_of_day,
            'days_in_month', v_days_in_month,
            'time_gone_pct', v_time_gone_pct,
            'run_rate_multiplier', ROUND((v_days_in_month::numeric / GREATEST(1, p_as_of_day)), 4)
        ),
        'targets', jsonb_build_object(
            'current', row_to_json(v_target),
            'comparison', row_to_json(v_comp_target)
        )
    );
END;
$$;
