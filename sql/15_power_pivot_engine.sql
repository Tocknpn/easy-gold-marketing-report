-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Module: 15_power_pivot_engine.sql
-- Purpose: Excel "Power Pivot"-style engine for Supabase.
--   * Any ROW dimensions (up to 3) and one COLUMN dimension (cross-tab)
--   * Any VALUE measures (DAX-equivalent catalog + user-defined custom measures)
--   * Power BI style filters:
--       - ROW filters  = CALCULATETABLE / FILTER  (WHERE on raw transactions)
--       - MEASURE filters = HAVING on aggregated measure per row group
--   * Server-side pagination (SQL-editor style: first 500 / 1000 / custom + pages)
--   * Saved pivot report profiles (power_pivot_profiles table)
--
-- RUN THIS WHOLE FILE ONCE in Supabase SQL Editor.
-- Safe: every identifier / operator is whitelisted, every literal goes through %L.
-- ============================================================================

-- STEP 0: Safe date parser (monthly_data.created_at may be TEXT)
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


-- ============================================================================
-- STEP 1: DIMENSION CATALOG  (what can go on ROWS / COLUMNS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.pp_dim_expr(p_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE p_id
        WHEN '__all'           THEN $q$'Total'::text$q$
        WHEN 'date'            THEN $q$COALESCE(to_char(b.tx_ts, 'YYYY-MM-DD'), '(no date)')$q$
        WHEN 'month'           THEN $q$COALESCE(to_char(b.tx_ts, 'YYYY-MM'), '(no date)')$q$
        WHEN 'week'            THEN $q$COALESCE(to_char(b.tx_ts, 'IYYY-"W"IW'), '(no date)')$q$
        WHEN 'weekday'         THEN $q$COALESCE(to_char(b.tx_ts, 'ID-Dy'), '(no date)')$q$
        WHEN 'hour'            THEN $q$COALESCE(to_char(b.tx_ts, 'HH24'), '(no date)')$q$
        WHEN 'bank'            THEN $q$COALESCE(NULLIF(trim(b.bank), ''), '(blank)')$q$
        WHEN 'branch'          THEN $q$COALESCE(NULLIF(NULLIF(trim(b.branch), ''), '-'), '(blank)')$q$
        WHEN 'transaction_type' THEN $q$COALESCE(NULLIF(trim(b.transaction_type), ''), '(blank)')$q$
        WHEN 'status'          THEN $q$COALESCE(NULLIF(trim(b.status), ''), '(blank)')$q$
        WHEN 'phone'           THEN $q$COALESCE(NULLIF(trim(b.phone), ''), '(blank)')$q$
        WHEN 'customer_name'   THEN $q$COALESCE(NULLIF(trim(b.customer_name), ''), '(blank)')$q$
        WHEN 'phone_customer'  THEN $q$COALESCE(NULLIF(trim(b.phone), ''), '(blank)') || ' - ' || COALESCE(NULLIF(trim(b.customer_name), ''), '(blank)')$q$
        WHEN 'amount_band'     THEN $q$CASE WHEN b.total_amount IS NULL THEN '(blank)'
                                          WHEN b.total_amount < 100000 THEN '1) < 100K'
                                          WHEN b.total_amount < 500000 THEN '2) 100K - 499K'
                                          WHEN b.total_amount < 1000000 THEN '3) 500K - 999K'
                                          WHEN b.total_amount < 5000000 THEN '4) 1M - 4.9M'
                                          ELSE '5) >= 5M' END$q$
        WHEN 'weight_band'     THEN $q$CASE WHEN b.gold_weight IS NULL THEN '(blank)'
                                          WHEN b.gold_weight < 1 THEN '1) < 1g'
                                          WHEN b.gold_weight < 2 THEN '2) 1g - 1.99g'
                                          WHEN b.gold_weight < 3.75 THEN '3) 2g - 3.74g'
                                          WHEN b.gold_weight < 15 THEN '4) 3.75g - 14.9g'
                                          ELSE '5) >= 15g' END$q$
        ELSE NULL
    END;
END;
$$;


-- ============================================================================
-- STEP 2: ROW-LEVEL FILTER BUILDER  (CALCULATETABLE / FILTER equivalent)
-- filter = {"field":"gold_weight","op":"between","value":"1","value2":"5"}
-- text fields support: =, <>, in, not_in, contains, not_contains, starts_with
-- numeric/date fields support: >=, <=, >, <, =, <>, between, not_between
-- ============================================================================
CREATE OR REPLACE FUNCTION public.pp_filter_sql(p_f JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    fld  TEXT := p_f->>'field';
    op   TEXT := p_f->>'op';
    v1   TEXT := p_f->>'value';
    v2   TEXT := p_f->>'value2';
    col  TEXT;
    kind TEXT;
    cst  TEXT;
    arr  TEXT[];
BEGIN
    CASE fld
        WHEN 'gold_weight'  THEN col := 'b.gold_weight';  kind := 'num';
        WHEN 'total_amount' THEN col := 'b.total_amount'; kind := 'num';
        WHEN 'date'         THEN col := 'b.tx_ts::date';  kind := 'date';
        WHEN 'bank','branch','transaction_type','status','phone','customer_name'
                            THEN col := format('COALESCE(b.%I, '''')', fld); kind := 'txt';
        ELSE RAISE EXCEPTION 'Unknown filter field: %', fld;
    END CASE;

    IF kind IN ('num', 'date') THEN
        cst := CASE kind WHEN 'num' THEN 'numeric' ELSE 'date' END;
        IF op IN ('>=', '<=', '>', '<', '=', '<>') THEN
            RETURN format('(%s %s %L::%s)', col, op, v1, cst);
        ELSIF op = 'between' THEN
            RETURN format('(%s BETWEEN %L::%s AND %L::%s)', col, v1, cst, v2, cst);
        ELSIF op = 'not_between' THEN
            RETURN format('(%s NOT BETWEEN %L::%s AND %L::%s)', col, v1, cst, v2, cst);
        END IF;
        RAISE EXCEPTION 'Operator % not allowed for field %', op, fld;
    END IF;

    -- text fields
    IF op = '=' THEN
        RETURN format('(%s = %L)', col, v1);
    ELSIF op = '<>' THEN
        RETURN format('(%s <> %L)', col, v1);
    ELSIF op IN ('in', 'not_in') THEN
        SELECT COALESCE(array_agg(x), '{}') INTO arr FROM jsonb_array_elements_text(COALESCE(p_f->'values', '[]'::jsonb)) x;
        IF array_length(arr, 1) IS NULL THEN
            RETURN 'TRUE';
        END IF;
        RETURN format('(%s %s ANY(%L::text[]))', col, CASE WHEN op = 'in' THEN '=' ELSE '<>' END, arr)
               ;
    ELSIF op = 'contains' THEN
        RETURN format('(%s ILIKE %L)', col, '%' || v1 || '%');
    ELSIF op = 'not_contains' THEN
        RETURN format('(%s NOT ILIKE %L)', col, '%' || v1 || '%');
    ELSIF op = 'starts_with' THEN
        RETURN format('(%s ILIKE %L)', col, v1 || '%');
    END IF;
    RAISE EXCEPTION 'Operator % not allowed for field %', op, fld;
END;
$$;


-- ============================================================================
-- STEP 3: MEASURE CATALOG  (DAX measures from your Excel "Manage Measures")
-- Returns an aggregate SQL expression evaluated per group over alias b.
-- Custom measures (p_customs) are resolved first:
--   {"type":"calc","agg":"sum|count|distinct_count|avg|min|max","field":"gold_weight|total_amount|phone|rows",
--    "filters":[...row filters...],"divisor":1000000}      -- CALCULATE(SUM(x), filters) / divisor
--   {"type":"ratio","num":"<measure id>","den":"<measure id>","multiplier":100}  -- DIVIDE(num, den)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.pp_measure_sql(p_id TEXT, p_customs JSONB DEFAULT '{}'::jsonb, p_depth INT DEFAULT 0)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    f_buy  TEXT := $f$FILTER (WHERE b.transaction_type = 'BUY_GOLD')$f$;
    f_sell TEXT := $f$FILTER (WHERE b.transaction_type = 'SALE_GOLD')$f$;
    f_wd   TEXT := $f$FILTER (WHERE b.transaction_type = 'WITHDRAW_GOLD')$f$;
    f_open TEXT := $f$FILTER (WHERE b.transaction_type = 'OPEN_ACCOUNT')$f$;
    u_all  TEXT := $f$COUNT(DISTINCT b.phone) FILTER (WHERE COALESCE(b.phone, '') <> '')$f$;
    c      JSONB := p_customs -> p_id;
    v_expr TEXT;
    v_fld  TEXT;
    v_conds TEXT;
    v_filter TEXT := '';
    v_div  NUMERIC;
    v_mul  NUMERIC;
BEGIN
    IF p_depth > 3 THEN
        RAISE EXCEPTION 'Measure % references are nested too deeply', p_id;
    END IF;

    -- ---------- Custom measures ----------
    IF c IS NOT NULL THEN
        IF c->>'type' = 'ratio' THEN
            v_mul := COALESCE(NULLIF(c->>'multiplier', '')::numeric, 1);
            RETURN format('ROUND((%s)::numeric * %L::numeric / NULLIF((%s)::numeric, 0), 4)',
                          public.pp_measure_sql(c->>'num', p_customs, p_depth + 1),
                          v_mul,
                          public.pp_measure_sql(c->>'den', p_customs, p_depth + 1));
        ELSIF c->>'type' = 'calc' THEN
            v_fld := CASE c->>'field'
                        WHEN 'gold_weight'  THEN 'b.gold_weight'
                        WHEN 'total_amount' THEN 'b.total_amount'
                        WHEN 'phone'        THEN 'b.phone'
                        WHEN 'rows'         THEN '*'
                        ELSE NULL END;
            IF v_fld IS NULL THEN
                RAISE EXCEPTION 'Custom measure % has invalid field', p_id;
            END IF;
            SELECT string_agg(public.pp_filter_sql(x), ' AND ')
              INTO v_conds
              FROM jsonb_array_elements(COALESCE(c->'filters', '[]'::jsonb)) x;
            IF v_conds IS NOT NULL THEN
                v_filter := ' FILTER (WHERE ' || v_conds || ')';
            END IF;
            v_div := COALESCE(NULLIF(c->>'divisor', '')::numeric, 1);
            IF v_div = 0 THEN v_div := 1; END IF;
            v_expr := CASE c->>'agg'
                        WHEN 'sum'            THEN format('SUM(%s)', v_fld)
                        WHEN 'count'          THEN format('COUNT(%s)', v_fld)
                        WHEN 'distinct_count' THEN format('COUNT(DISTINCT %s)', v_fld)
                        WHEN 'avg'            THEN format('AVG(%s)', v_fld)
                        WHEN 'min'            THEN format('MIN(%s)', v_fld)
                        WHEN 'max'            THEN format('MAX(%s)', v_fld)
                        ELSE NULL END;
            IF v_expr IS NULL THEN
                RAISE EXCEPTION 'Custom measure % has invalid aggregation', p_id;
            END IF;
            RETURN format('ROUND(COALESCE(%s%s, 0)::numeric / %L::numeric, 2)', v_expr, v_filter, v_div);
        END IF;
        RAISE EXCEPTION 'Custom measure % has invalid type', p_id;
    END IF;

    -- ---------- Built-in measures (Excel Power Pivot catalog) ----------
    RETURN CASE p_id
        -- Counts
        WHEN 'total_transaction'  THEN 'COUNT(*)'
        WHEN 'total_buy_transac'  THEN 'COUNT(*) ' || f_buy
        WHEN 'total_sell_transac' THEN 'COUNT(*) ' || f_sell
        WHEN 'withdraw_trans'     THEN 'COUNT(*) ' || f_wd
        WHEN 'new_register'       THEN 'COUNT(*) ' || f_open
        -- Users
        WHEN 'total_unique_user'  THEN u_all
        WHEN 'user_buy'           THEN 'COUNT(DISTINCT b.phone) ' || f_buy
        WHEN 'user_sell'          THEN 'COUNT(DISTINCT b.phone) ' || f_sell
        WHEN 'user_withdraw'      THEN 'COUNT(DISTINCT b.phone) ' || f_wd
        -- Revenue (mil LAK)
        WHEN 'revenue_buy_mil'    THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_buy)
        WHEN 'revenue_sell_mil'   THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_sell)
        WHEN 'withdraw_value_mil' THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_wd)
        WHEN 'abs_value_mil'      THEN format('ROUND((COALESCE(SUM(b.total_amount) %s, 0) - COALESCE(SUM(b.total_amount) %s, 0)) / 1000000.0, 2)', f_buy, f_sell)
        -- Gold weight (g)
        WHEN 'gold_weight_buy_g'  THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0), 2)', f_buy)
        WHEN 'gold_weight_sell_g' THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0), 2)', f_sell)
        WHEN 'gold_weight_buy_15g'  THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_buy)
        WHEN 'gold_weight_sell_15g' THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_sell)
        WHEN 'withdraw_gold_15g'  THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_wd)
        -- Ticket sizes
        WHEN 'gold_buy_size_g'    THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / NULLIF(COUNT(*) %s, 0), 2)', f_buy, f_buy)
        WHEN 'gold_sell_size_g'   THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / NULLIF(COUNT(*) %s, 0), 2)', f_sell, f_sell)
        WHEN 'avg_sell_size'      THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0 / NULLIF(COUNT(*) %s, 0), 4)', f_sell, f_sell)
        -- Ratios / net flow (% of total)
        WHEN 'net_flow_trans'     THEN format('ROUND(100.0 * COUNT(*) %s / NULLIF(COUNT(*), 0), 1)', f_buy)
        WHEN 'net_flow_value'     THEN format('ROUND(100.0 * COALESCE(SUM(b.total_amount) %s, 0) / NULLIF(COALESCE(SUM(b.total_amount) %s, 0) + COALESCE(SUM(b.total_amount) %s, 0), 0), 1)', f_buy, f_buy, f_sell)
        -- Frequency per user
        WHEN 'freq_per_user_all'  THEN format('ROUND(COUNT(*)::numeric / NULLIF(%s, 0), 2)', u_all)
        WHEN 'freq_per_user_buy'  THEN format('ROUND(COUNT(*) %s ::numeric / NULLIF(COUNT(DISTINCT b.phone) %s, 0), 2)', f_buy, f_buy)
        WHEN 'freq_per_user_sell' THEN format('ROUND(COUNT(*) %s ::numeric / NULLIF(COUNT(DISTINCT b.phone) %s, 0), 2)', f_sell, f_sell)
        -- Generic sums / averages (Excel "Sum of ..." fields)
        WHEN 'sum_gold_weight'    THEN 'ROUND(COALESCE(SUM(b.gold_weight), 0), 2)'
        WHEN 'sum_amount_lak'     THEN 'ROUND(COALESCE(SUM(b.total_amount), 0), 0)'
        WHEN 'avg_gold_weight'    THEN 'ROUND(COALESCE(AVG(b.gold_weight), 0), 2)'
        WHEN 'avg_amount_lak'     THEN 'ROUND(COALESCE(AVG(b.total_amount), 0), 0)'
        ELSE NULL
    END;
END;
$$;


-- ============================================================================
-- STEP 4: THE POWER PIVOT ENGINE
-- p_config = {
--   "rows":    ["bank","month"],                    -- up to 3 (empty = grand total only)
--   "columns": ["transaction_type"],                -- optional, 1 dimension (max 24 distinct values)
--   "values":  ["total_buy_transac","revenue_buy_mil"],
--   "custom_measures": { "my_big_buy": {...} },
--   "filters": [ {"scope":"row","field":"date","op":"between","value":"2026-09-01","value2":"2026-09-30"},
--                {"scope":"row","field":"gold_weight","op":">=","value":"2"},
--                {"scope":"row","field":"bank","op":"in","values":["BCEL","LDB"]},
--                {"scope":"measure","field":"total_buy_transac","op":">=","value":"100"} ],
--   "sort_by": "total_buy_transac" | "label", "sort_dir": "desc" | "asc",
--   "page": 1, "page_size": 500, "export": false
-- }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_power_pivot(p_config JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
    v_started   TIMESTAMPTZ := clock_timestamp();
    v_customs   JSONB := COALESCE(p_config->'custom_measures', '{}'::jsonb);
    v_rows      TEXT[];
    v_col       TEXT;
    v_vals      TEXT[];
    v_page      INT;
    v_size      INT;
    v_cap       INT;
    v_off       INT;
    v_sort_by   TEXT;
    v_sort_dir  TEXT;
    v_sort_expr TEXT;
    v_where     TEXT := '';
    v_having    TEXT := '';
    v_expr      TEXT;
    f           JSONB;
    i           INT;
    r_sel       TEXT := '';
    r_list      TEXT := '';
    c_sel       TEXT := '';
    m_sel       TEXT := '';
    v_q         TEXT;
    v_cells_cte TEXT;
    v_coltot_cte TEXT;
    v_cols_cte  TEXT;
    v_grand_where TEXT := '';
    v_result    JSONB;
BEGIN
    -- ----- parse structure -----
    SELECT COALESCE(array_agg(x), '{}') INTO v_rows FROM jsonb_array_elements_text(COALESCE(p_config->'rows', '[]'::jsonb)) x;
    SELECT COALESCE(array_agg(x), '{}') INTO v_vals FROM jsonb_array_elements_text(COALESCE(p_config->'values', '[]'::jsonb)) x;
    v_col := NULLIF(COALESCE(p_config->'columns'->>0, ''), '');

    IF array_length(v_vals, 1) IS NULL THEN
        RAISE EXCEPTION 'Select at least one VALUE measure';
    END IF;
    IF array_length(v_vals, 1) > 12 THEN
        v_vals := v_vals[1:12];
    END IF;
    IF array_length(v_rows, 1) IS NULL THEN
        v_rows := ARRAY['__all'];
    ELSIF array_length(v_rows, 1) > 3 THEN
        v_rows := v_rows[1:3];
    END IF;

    -- ----- pagination -----
    v_cap  := CASE WHEN COALESCE((p_config->>'export')::boolean, false) THEN 100000 ELSE 5000 END;
    v_size := LEAST(v_cap, GREATEST(1, COALESCE(NULLIF(p_config->>'page_size', '')::int, 500)));
    v_page := GREATEST(1, COALESCE(NULLIF(p_config->>'page', '')::int, 1));
    v_off  := (v_page - 1) * v_size;

    -- ----- row dimensions / column dimension -----
    FOR i IN 1..array_length(v_rows, 1) LOOP
        v_expr := public.pp_dim_expr(v_rows[i]);
        IF v_expr IS NULL THEN RAISE EXCEPTION 'Unknown row dimension: %', v_rows[i]; END IF;
        r_sel  := r_sel || format(', %s AS r%s', v_expr, i);
        r_list := r_list || CASE WHEN i > 1 THEN ', ' ELSE '' END || 'r' || i;
    END LOOP;

    IF v_col IS NOT NULL THEN
        v_expr := public.pp_dim_expr(v_col);
        IF v_expr IS NULL OR v_col = '__all' THEN RAISE EXCEPTION 'Unknown column dimension: %', v_col; END IF;
        c_sel := format(', %s AS c1', v_expr);
    END IF;

    -- ----- value measures -----
    FOR i IN 1..array_length(v_vals, 1) LOOP
        v_expr := public.pp_measure_sql(v_vals[i], v_customs);
        IF v_expr IS NULL THEN RAISE EXCEPTION 'Unknown measure: %', v_vals[i]; END IF;
        m_sel := m_sel || format(', %s AS m%s', v_expr, i);
    END LOOP;

    -- ----- filters: row-level (WHERE) and measure-level (HAVING) -----
    FOR f IN SELECT * FROM jsonb_array_elements(COALESCE(p_config->'filters', '[]'::jsonb)) LOOP
        IF COALESCE(f->>'scope', 'row') = 'measure' THEN
            v_expr := public.pp_measure_sql(f->>'field', v_customs);
            IF v_expr IS NULL THEN RAISE EXCEPTION 'Unknown measure filter: %', f->>'field'; END IF;
            IF (f->>'op') = 'between' THEN
                v_having := v_having || format(' AND (%s) BETWEEN %L::numeric AND %L::numeric', v_expr, f->>'value', f->>'value2');
            ELSIF (f->>'op') IN ('>=', '<=', '>', '<', '=', '<>') THEN
                v_having := v_having || format(' AND (%s) %s %L::numeric', v_expr, f->>'op', f->>'value');
            ELSE
                RAISE EXCEPTION 'Operator % not allowed for measure filter', f->>'op';
            END IF;
        ELSE
            v_where := v_where || ' AND ' || public.pp_filter_sql(f);
        END IF;
    END LOOP;
    IF v_having <> '' THEN
        v_having := ' HAVING TRUE' || v_having;
        v_grand_where := format(' WHERE (%s) IN (SELECT %s FROM rowtot)', r_list, r_list);
    END IF;

    -- ----- sorting -----
    v_sort_by  := COALESCE(NULLIF(p_config->>'sort_by', ''), v_vals[1]);
    v_sort_dir := CASE WHEN lower(COALESCE(p_config->>'sort_dir', 'desc')) = 'asc' THEN 'ASC' ELSE 'DESC' END;
    IF v_sort_by = 'label' THEN
        v_sort_expr := replace(r_list, ', ', ' ' || v_sort_dir || ', ') || ' ' || v_sort_dir;
    ELSE
        i := array_position(v_vals, v_sort_by);
        IF i IS NULL THEN i := 1; END IF;
        v_sort_expr := format('m%s %s NULLS LAST, %s', i, v_sort_dir, r_list);
    END IF;

    -- ----- cross-tab pieces (only when a COLUMN dimension is set) -----
    IF v_col IS NOT NULL THEN
        v_cells_cte := format(
            ', cells AS (SELECT %s, c1%s FROM f b WHERE (%s) IN (SELECT %s FROM sorted) GROUP BY %s, c1)',
            r_list, m_sel, r_list, r_list, r_list);
        v_coltot_cte := format(', coltot AS (SELECT c1%s FROM f b%s GROUP BY c1)', m_sel, v_grand_where);
        v_cols_cte := ', cols AS (SELECT c1 FROM (SELECT DISTINCT c1 FROM f ORDER BY 1 LIMIT 24) z)';
    ELSE
        v_cells_cte := ', cells AS (SELECT NULL::text AS c1 WHERE FALSE)';
        v_coltot_cte := ', coltot AS (SELECT NULL::text AS c1 WHERE FALSE)';
        v_cols_cte := ', cols AS (SELECT NULL::text AS c1 WHERE FALSE)';
    END IF;

    -- ----- single-pass query (f is materialised once by Postgres) -----
    v_q := format($q$
        WITH base AS (
            SELECT m.phone::text AS phone, m.customer_name::text AS customer_name,
                   m.bank::text AS bank, m.branch::text AS branch,
                   m.transaction_type::text AS transaction_type, m.status::text AS status,
                   m.gold_weight::numeric AS gold_weight, m.total_amount::numeric AS total_amount,
                   public.parse_tx_date(m.created_at::text) AS tx_ts
            FROM public.monthly_data m
        ),
        f AS (
            SELECT b.*%s%s FROM base b WHERE TRUE %s
        ),
        rowtot AS (
            SELECT %s%s FROM f b GROUP BY %s%s
        ),
        sorted AS (
            SELECT t.* FROM rowtot t ORDER BY %s LIMIT %s OFFSET %s
        )
        %s
        %s
        %s,
        grand AS (
            SELECT TRUE AS g%s FROM f b%s
        )
        SELECT jsonb_build_object(
            'total_rows', (SELECT COUNT(*) FROM rowtot),
            'rows',       (SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM sorted s),
            'cells',      (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM cells c),
            'col_totals', (SELECT COALESCE(jsonb_agg(to_jsonb(ct)), '[]'::jsonb) FROM coltot ct),
            'columns',    (SELECT COALESCE(jsonb_agg(c1 ORDER BY c1), '[]'::jsonb) FROM cols),
            'grand',      (SELECT to_jsonb(g) FROM grand g)
        )
    $q$,
        c_sel, r_sel, v_where,
        r_list, m_sel, r_list, v_having,
        v_sort_expr, v_size, v_off,
        v_cells_cte, v_coltot_cte, v_cols_cte,
        m_sel, v_grand_where
    );

    EXECUTE v_q INTO v_result;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'rows_dims', to_jsonb(CASE WHEN v_rows = ARRAY['__all'] THEN '{}'::text[] ELSE v_rows END),
        'column_dim', v_col,
        'values', to_jsonb(v_vals),
        'page', v_page,
        'page_size', v_size,
        'total_rows', (v_result->>'total_rows')::bigint,
        'columns', v_result->'columns',
        'rows', v_result->'rows',
        'cells', v_result->'cells',
        'col_totals', v_result->'col_totals',
        'grand', v_result->'grand',
        'elapsed_ms', ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000),
        'sql_trace', regexp_replace(v_q, '\s+', ' ', 'g')
    );
END;
$$;


-- ============================================================================
-- STEP 5: META  (date range + distinct values for the filter pickers)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_power_pivot_meta()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_rows', (SELECT COUNT(*) FROM public.monthly_data),
        'min_date',   (SELECT MIN(public.parse_tx_date(created_at::text))::date FROM public.monthly_data),
        'max_date',   (SELECT MAX(public.parse_tx_date(created_at::text))::date FROM public.monthly_data),
        'banks',      (SELECT COALESCE(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (SELECT DISTINCT trim(bank) AS v FROM public.monthly_data WHERE COALESCE(trim(bank), '') <> '' LIMIT 100) z),
        'branches',   (SELECT COALESCE(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (SELECT DISTINCT trim(branch) AS v FROM public.monthly_data WHERE COALESCE(trim(branch), '') NOT IN ('', '-') LIMIT 200) z),
        'transaction_types', (SELECT COALESCE(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (SELECT DISTINCT trim(transaction_type) AS v FROM public.monthly_data WHERE COALESCE(trim(transaction_type), '') <> '' LIMIT 50) z),
        'statuses',   (SELECT COALESCE(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (SELECT DISTINCT trim(status) AS v FROM public.monthly_data WHERE COALESCE(trim(status), '') <> '' LIMIT 50) z)
    ) INTO v_result;
    RETURN v_result;
END;
$$;


-- ============================================================================
-- STEP 6: SAVED PIVOT REPORT PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.power_pivot_profiles (
    id            TEXT PRIMARY KEY,
    user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    profile_name  VARCHAR(160) NOT NULL,
    description   TEXT,
    config        JSONB NOT NULL,
    is_favorite   BOOLEAN NOT NULL DEFAULT false,
    last_used_at  TIMESTAMPTZ,
    use_count     INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_power_pivot_profiles_user
    ON public.power_pivot_profiles (user_id, is_favorite DESC, last_used_at DESC);

ALTER TABLE public.power_pivot_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "power_pivot_profiles_access" ON public.power_pivot_profiles;
CREATE POLICY "power_pivot_profiles_access"
ON public.power_pivot_profiles
FOR ALL
TO anon, authenticated
USING (user_id IS NULL OR user_id = auth.uid())
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.power_pivot_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_power_pivot(JSONB)    TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_power_pivot_meta()    TO anon, authenticated, service_role;


-- ============================================================================
-- QUICK SELF-TEST (run after install). Row = bank, Column = transaction_type
-- ============================================================================
-- SELECT public.get_power_pivot('{
--   "rows": ["bank"], "columns": ["transaction_type"],
--   "values": ["total_buy_transac","revenue_buy_mil","gold_weight_buy_g"],
--   "filters": [{"scope":"row","field":"total_amount","op":">=","value":"500000"}],
--   "page": 1, "page_size": 500
-- }'::jsonb) - 'sql_trace';
--
-- OPTIONAL SPEED-UP for 1M+ rows: materialise the parsed date once.
--   ALTER TABLE public.monthly_data ADD COLUMN IF NOT EXISTS tx_ts timestamptz;
--   UPDATE public.monthly_data SET tx_ts = public.parse_tx_date(created_at::text) WHERE tx_ts IS NULL;
--   (then replace public.parse_tx_date(m.created_at::text) with COALESCE(m.tx_ts, public.parse_tx_date(m.created_at::text)))
