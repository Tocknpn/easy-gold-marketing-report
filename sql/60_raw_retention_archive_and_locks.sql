-- ==============================================================================
-- 60_raw_retention_archive_and_locks.sql
-- Prepares the database for removing old raw months from monthly_data.
-- DELETES NO monthly_data ROWS. Safe to run more than once.
--
--   1. Storage for saved reports, daily totals and campaign backward numbers
--   2. Apr-Jun 2026 totals by day, hour, type, bank, branch and status
--   3. Locks: saved results before the cutoff can no longer change
--   4. Campaign functions read saved backward numbers once raw rows are gone
--   5. Checks to paste back
--
-- To correct a locked row on purpose, run this in the same transaction first:
--   SET LOCAL app.raw_lock_bypass = 'on';
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STORAGE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.raw_retention_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    cutoff_date DATE NOT NULL,          -- saved results before this date are locked
    raw_deleted_before DATE,            -- raw rows before this date are gone (NULL = none yet)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.raw_retention_settings (id, cutoff_date)
VALUES (1, DATE '2026-07-01')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.raw_export_manifest (
    month TEXT PRIMARY KEY,             -- YYYY-MM
    row_count BIGINT NOT NULL,
    gold_weight NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    sha256 TEXT NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raw_archive_snapshots (
    period_key TEXT NOT NULL,           -- 2026-04, 2026-Q2, 2026-W14 or 2026-04-01
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    dimension TEXT NOT NULL DEFAULT 'all',      -- all, bank, branch or tx_type
    filter_value TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (period_key, dimension, filter_value)
);

CREATE TABLE IF NOT EXISTS public.raw_rollup_daily (
    tx_date DATE NOT NULL,
    tx_hour INT,
    transaction_type TEXT,
    bank TEXT,
    branch TEXT,
    status TEXT,
    tx_count BIGINT NOT NULL,
    gold_weight NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_raw_rollup_daily_date ON public.raw_rollup_daily (tx_date);

CREATE TABLE IF NOT EXISTS public.campaign_backward_snapshots (
    version INT NOT NULL,               -- 10 or 14: which function signature produced it
    backward_start DATE NOT NULL,
    backward_end DATE NOT NULL,
    param_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (version, backward_start, backward_end, param_key)
);

ALTER TABLE public.raw_retention_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_export_manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_archive_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_rollup_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_backward_snapshots ENABLE ROW LEVEL SECURITY;

-- These hold totals only, the same kind of data the summary tables already expose.
DROP POLICY IF EXISTS "Read retention settings" ON public.raw_retention_settings;
CREATE POLICY "Read retention settings" ON public.raw_retention_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Read archive snapshots" ON public.raw_archive_snapshots;
CREATE POLICY "Read archive snapshots" ON public.raw_archive_snapshots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Read raw rollup" ON public.raw_rollup_daily;
CREATE POLICY "Read raw rollup" ON public.raw_rollup_daily FOR SELECT USING (true);
GRANT SELECT ON public.raw_retention_settings, public.raw_archive_snapshots, public.raw_rollup_daily TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. APR-JUN TOTALS
-- ------------------------------------------------------------------------------
DELETE FROM public.raw_rollup_daily WHERE tx_date >= DATE '2026-04-01' AND tx_date < DATE '2026-07-01';

INSERT INTO public.raw_rollup_daily
SELECT
    substring(created_at, 1, 10)::date,
    NULLIF(substring(created_at, 12, 2), '')::int,
    transaction_type, bank, branch, status,
    COUNT(*),
    COALESCE(SUM(gold_weight), 0),
    COALESCE(SUM(total_amount), 0)
FROM public.monthly_data
WHERE created_at >= '2026-04-01' AND created_at < '2026-07-01'
GROUP BY 1, 2, 3, 4, 5, 6;

-- ------------------------------------------------------------------------------
-- 3. LOCKS
-- A locked change is skipped silently, so a normal upload carries on without errors.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.raw_lock_skip_row()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_row JSONB;
    v_date DATE;
    v_cutoff DATE;
BEGIN
    IF current_setting('app.raw_lock_bypass', true) = 'on' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    SELECT cutoff_date INTO v_cutoff FROM public.raw_retention_settings WHERE id = 1;
    v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    v_date := (v_row ->> TG_ARGV[0])::date;

    IF v_cutoff IS NOT NULL AND v_date < v_cutoff THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_summary_daily ON public.summary_daily_metrics;
CREATE TRIGGER trg_lock_summary_daily
BEFORE INSERT OR UPDATE OR DELETE ON public.summary_daily_metrics
FOR EACH ROW EXECUTE FUNCTION public.raw_lock_skip_row('date_id');

-- start_date locks any week that begins before the cutoff, including the
-- Jun 29-Jul 5 week, which would otherwise be recalculated from Jul 1-5 only.
DROP TRIGGER IF EXISTS trg_lock_summary_weekly ON public.summary_weekly_metrics;
CREATE TRIGGER trg_lock_summary_weekly
BEFORE INSERT OR UPDATE OR DELETE ON public.summary_weekly_metrics
FOR EACH ROW EXECUTE FUNCTION public.raw_lock_skip_row('start_date');

DROP TRIGGER IF EXISTS trg_lock_fact_daily_core ON public.fact_daily_core;
CREATE TRIGGER trg_lock_fact_daily_core
BEFORE INSERT OR UPDATE OR DELETE ON public.fact_daily_core
FOR EACH ROW EXECUTE FUNCTION public.raw_lock_skip_row('date_id');

-- A saved Dynamic BI report whose comparison period reaches before the cutoff
-- (for example Q3 against Q2) keeps its saved numbers while its dates stay the same.
CREATE OR REPLACE FUNCTION public.raw_lock_dynamic_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff DATE;
    v_prev_start DATE;
BEGIN
    IF current_setting('app.raw_lock_bypass', true) = 'on' THEN
        RETURN NEW;
    END IF;

    SELECT cutoff_date INTO v_cutoff FROM public.raw_retention_settings WHERE id = 1;
    v_prev_start := OLD.resolved_start_date - ((OLD.resolved_end_date - OLD.resolved_start_date) + 1);

    IF v_cutoff IS NOT NULL
       AND v_prev_start < v_cutoff
       AND NEW.resolved_start_date = OLD.resolved_start_date
       AND NEW.resolved_end_date = OLD.resolved_end_date THEN
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_dynamic_cache ON public.dynamic_bi_report_cache;
CREATE TRIGGER trg_lock_dynamic_cache
BEFORE UPDATE ON public.dynamic_bi_report_cache
FOR EACH ROW EXECUTE FUNCTION public.raw_lock_dynamic_cache();

-- Campaigns whose window or backward window reaches before the cutoff:
--   frozen results cannot be overwritten, and the rules behind saved numbers cannot change.
CREATE OR REPLACE FUNCTION public.raw_lock_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff DATE;
BEGIN
    IF current_setting('app.raw_lock_bypass', true) = 'on' THEN
        RETURN NEW;
    END IF;

    SELECT cutoff_date INTO v_cutoff FROM public.raw_retention_settings WHERE id = 1;
    IF v_cutoff IS NULL
       OR NOT (OLD.campaign_start_date < v_cutoff OR OLD.backward_start_date < v_cutoff) THEN
        RETURN NEW;
    END IF;

    IF NEW.campaign_start_date IS DISTINCT FROM OLD.campaign_start_date
       OR NEW.condition_type IS DISTINCT FROM OLD.condition_type
       OR NEW.condition_operator IS DISTINCT FROM OLD.condition_operator
       OR NEW.condition_value IS DISTINCT FROM OLD.condition_value
       OR NEW.condition_max_value IS DISTINCT FROM OLD.condition_max_value
       OR NEW.tx_type IS DISTINCT FROM OLD.tx_type
       OR NEW.bank IS DISTINCT FROM OLD.bank THEN
        RAISE EXCEPTION 'This campaign uses saved numbers from before %, so its start date and rules cannot be changed.', v_cutoff;
    END IF;

    IF OLD.is_frozen = true AND OLD.result_json IS NOT NULL THEN
        NEW.result_json := OLD.result_json;
        NEW.actual_ec := OLD.actual_ec;
        NEW.actual_nc := OLD.actual_nc;
        NEW.actual_unique_users := OLD.actual_unique_users;
        NEW.actual_gold_weight_g := OLD.actual_gold_weight_g;
        NEW.actual_revenue_mil := OLD.actual_revenue_mil;
        NEW.nc_actual_buy_value_mil_lak := OLD.nc_actual_buy_value_mil_lak;
        NEW.nc_actual_buy_weight_g := OLD.nc_actual_buy_weight_g;
        NEW.as_of_date := OLD.as_of_date;
        NEW.backward_start_date := OLD.backward_start_date;
        NEW.backward_end_date := OLD.backward_end_date;
        NEW.is_frozen := OLD.is_frozen;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_campaign ON public.campaign_setups;
CREATE TRIGGER trg_lock_campaign
BEFORE UPDATE ON public.campaign_setups
FOR EACH ROW EXECUTE FUNCTION public.raw_lock_campaign();

-- ------------------------------------------------------------------------------
-- 4. CAMPAIGN BACKWARD NUMBERS
-- The existing functions are kept unchanged under new names. New functions with the
-- original names call them, then replace backward_* values with the saved ones when
-- the backward window reaches before the cutoff.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regprocedure('public.get_campaign_actual_metrics_live10(date,date,date,date,text,text,numeric,numeric,text,text)') IS NULL THEN
        ALTER FUNCTION public.get_campaign_actual_metrics(date,date,date,date,text,text,numeric,numeric,text,text)
            RENAME TO get_campaign_actual_metrics_live10;
    END IF;
    IF to_regprocedure('public.get_campaign_actual_metrics_live14(date,date,date,date,text,text,numeric,numeric,text,text,jsonb,text,text,jsonb)') IS NULL THEN
        ALTER FUNCTION public.get_campaign_actual_metrics(date,date,date,date,text,text,numeric,numeric,text,text,jsonb,text,text,jsonb)
            RENAME TO get_campaign_actual_metrics_live14;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.campaign_backward_param_key(
    p_cond_type TEXT, p_cond_op TEXT, p_cond_val NUMERIC, p_cond_max NUMERIC,
    p_tx_type TEXT, p_bank TEXT, p_conditions JSONB, p_unique_users_mode TEXT,
    p_nc_mode TEXT, p_nc_conditions JSONB
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT md5(concat_ws('|',
        COALESCE(p_cond_type, ''), COALESCE(p_cond_op, ''),
        COALESCE(trim_scale(p_cond_val)::text, ''), COALESCE(trim_scale(p_cond_max)::text, ''),
        COALESCE(p_tx_type, ''), COALESCE(p_bank, ''),
        COALESCE(p_conditions::text, ''), COALESCE(p_unique_users_mode, ''),
        COALESCE(p_nc_mode, ''), COALESCE(p_nc_conditions::text, '')
    ));
$$;

CREATE OR REPLACE FUNCTION public.campaign_apply_backward_snapshot(
    p_result JSONB, p_version INT, p_backward_start DATE, p_backward_end DATE, p_param_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutoff DATE;
    v_deleted DATE;
    v_saved JSONB;
BEGIN
    SELECT cutoff_date, raw_deleted_before INTO v_cutoff, v_deleted
    FROM public.raw_retention_settings WHERE id = 1;

    IF p_result IS NULL OR v_cutoff IS NULL OR p_backward_start >= v_cutoff THEN
        RETURN p_result;
    END IF;

    SELECT payload INTO v_saved
    FROM public.campaign_backward_snapshots
    WHERE version = p_version AND backward_start = p_backward_start
      AND backward_end = p_backward_end AND param_key = p_param_key;

    IF v_saved IS NOT NULL THEN
        RETURN p_result || v_saved;
    END IF;

    -- Raw rows are gone and nothing was saved: say so instead of returning a false total.
    IF v_deleted IS NOT NULL AND p_backward_start < v_deleted THEN
        RETURN p_result || jsonb_build_object('backward_unavailable', true);
    END IF;
    RETURN p_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_actual_metrics(
    p_start_date DATE, p_as_of_date DATE, p_backward_start DATE, p_backward_end DATE,
    p_cond_type TEXT, p_cond_op TEXT, p_cond_val NUMERIC, p_cond_max NUMERIC,
    p_tx_type TEXT, p_bank TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
BEGIN
    RETURN public.campaign_apply_backward_snapshot(
        public.get_campaign_actual_metrics_live10(
            p_start_date, p_as_of_date, p_backward_start, p_backward_end,
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank
        ),
        10, p_backward_start, p_backward_end,
        public.campaign_backward_param_key(
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank,
            NULL, NULL, NULL, NULL
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_actual_metrics(
    p_start_date DATE, p_as_of_date DATE, p_backward_start DATE, p_backward_end DATE,
    p_cond_type TEXT DEFAULT 'amount_gte', p_cond_op TEXT DEFAULT '>=',
    p_cond_val NUMERIC DEFAULT 100000, p_cond_max NUMERIC DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'BUY_GOLD', p_bank TEXT DEFAULT 'all',
    p_conditions JSONB DEFAULT NULL, p_unique_users_mode TEXT DEFAULT 'condition_tier',
    p_nc_mode TEXT DEFAULT 'all_registers', p_nc_conditions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
BEGIN
    RETURN public.campaign_apply_backward_snapshot(
        public.get_campaign_actual_metrics_live14(
            p_start_date, p_as_of_date, p_backward_start, p_backward_end,
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank,
            p_conditions, p_unique_users_mode, p_nc_mode, p_nc_conditions
        ),
        14, p_backward_start, p_backward_end,
        public.campaign_backward_param_key(
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank,
            p_conditions, p_unique_users_mode, p_nc_mode, p_nc_conditions
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_actual_metrics(DATE,DATE,DATE,DATE,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_campaign_actual_metrics(DATE,DATE,DATE,DATE,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,JSONB,TEXT,TEXT,JSONB) TO anon, authenticated, service_role;

-- Called by scripts/build_raw_archive.py while raw rows still exist.
CREATE OR REPLACE FUNCTION public.save_campaign_backward_snapshot(
    p_version INT, p_start_date DATE, p_backward_start DATE, p_backward_end DATE,
    p_cond_type TEXT, p_cond_op TEXT, p_cond_val NUMERIC, p_cond_max NUMERIC,
    p_tx_type TEXT, p_bank TEXT, p_conditions JSONB DEFAULT NULL,
    p_unique_users_mode TEXT DEFAULT NULL, p_nc_mode TEXT DEFAULT NULL, p_nc_conditions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '180s'
AS $$
DECLARE
    v_result JSONB;
    v_payload JSONB;
    v_as_of DATE := p_start_date - 1;   -- before the start date, so only backward values are computed
BEGIN
    IF p_version = 10 THEN
        v_result := public.get_campaign_actual_metrics_live10(
            p_start_date, v_as_of, p_backward_start, p_backward_end,
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank
        );
    ELSE
        v_result := public.get_campaign_actual_metrics_live14(
            p_start_date, v_as_of, p_backward_start, p_backward_end,
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank,
            p_conditions, p_unique_users_mode, p_nc_mode, p_nc_conditions
        );
    END IF;

    SELECT jsonb_object_agg(key, value) INTO v_payload
    FROM jsonb_each(v_result) WHERE key LIKE 'backward%';

    IF v_payload IS NULL THEN
        RAISE EXCEPTION 'No backward values returned for % to %', p_backward_start, p_backward_end;
    END IF;

    INSERT INTO public.campaign_backward_snapshots (version, backward_start, backward_end, param_key, payload)
    VALUES (
        p_version, p_backward_start, p_backward_end,
        public.campaign_backward_param_key(
            p_cond_type, p_cond_op, p_cond_val, p_cond_max, p_tx_type, p_bank,
            p_conditions, p_unique_users_mode, p_nc_mode, p_nc_conditions
        ),
        v_payload
    )
    ON CONFLICT (version, backward_start, backward_end, param_key)
    DO UPDATE SET payload = EXCLUDED.payload, created_at = now();

    RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.save_campaign_backward_snapshot(INT,DATE,DATE,DATE,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,JSONB,TEXT,TEXT,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_campaign_backward_snapshot(INT,DATE,DATE,DATE,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,JSONB,TEXT,TEXT,JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------------------
-- 5. CHECKS: paste these results back
-- first_buy_affected must be 0. Above 0 means a customer who registered after Aug 24
-- had already bought before Jul 1, and one more table is needed before deleting.
-- ------------------------------------------------------------------------------
SELECT 'rollup_rows' AS check_name, COUNT(*)::text AS result FROM public.raw_rollup_daily
UNION ALL
SELECT 'rollup_tx_total', SUM(tx_count)::text FROM public.raw_rollup_daily
UNION ALL
SELECT 'rollup_size_bytes', pg_total_relation_size('public.raw_rollup_daily')::text
UNION ALL
SELECT 'locks_installed', COUNT(*)::text FROM pg_trigger WHERE tgname IN (
    'trg_lock_summary_daily', 'trg_lock_summary_weekly', 'trg_lock_fact_daily_core',
    'trg_lock_dynamic_cache', 'trg_lock_campaign')
UNION ALL
SELECT 'campaign_functions', string_agg(proname || '(' || pronargs || ')', ', ' ORDER BY proname, pronargs)
FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'get_campaign_actual_metrics%'
UNION ALL
SELECT 'first_buy_affected', COUNT(DISTINCT o.phone)::text
FROM public.monthly_data o
WHERE o.transaction_type = 'OPEN_ACCOUNT'
  AND o.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
  AND o.created_at >= '2026-08-24'
  AND EXISTS (
      SELECT 1 FROM public.monthly_data b
      WHERE b.phone = o.phone
        AND b.transaction_type = 'BUY_GOLD'
        AND b.status IN ('ສໍາເລັດ', 'ສຳເລັດ')
        AND b.created_at < '2026-07-01'
  );
