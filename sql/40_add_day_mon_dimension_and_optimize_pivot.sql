-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Script: 40_add_day_mon_dimension_and_optimize_pivot.sql
-- Purpose:
--   1. Add 'day_mon' dimension ('DD-Mon' format e.g. '18-Oct') to pp_dim_expr
--   2. Optimize get_power_pivot execution speed with streamlined timestamp parsing
--   3. Create recommended performance indexes on monthly_data
-- ============================================================================

-- 1. UPDATE DIMENSION CATALOG TO INCLUDE DAY (DD-Mon, e.g. 18-Oct)
CREATE OR REPLACE FUNCTION public.pp_dim_expr(p_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE p_id
        WHEN '__all'           THEN $q$'Total'::text$q$
        WHEN 'date'            THEN $q$COALESCE(to_char(b.tx_ts, 'YYYY-MM-DD'), '(no date)')$q$
        WHEN 'day_mon', 'day', 'day_month' THEN $q$COALESCE(to_char(b.tx_ts, 'DD-Mon'), '(no date)')$q$
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


-- 2. UPDATE GET_POWER_PIVOT WITH PERFORMANCE OPTIMIZATIONS
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

    -- ----- single-pass query with accelerated ISO timestamp cast -----
    v_q := format($q$
        WITH base AS (
            SELECT m.phone::text AS phone, m.customer_name::text AS customer_name,
                   m.bank::text AS bank, m.branch::text AS branch,
                   m.transaction_type::text AS transaction_type, m.status::text AS status,
                   m.gold_weight::numeric AS gold_weight, m.total_amount::numeric AS total_amount,
                   CASE 
                       WHEN m.created_at IS NULL THEN NULL
                       WHEN length(m.created_at) >= 10 AND substring(m.created_at, 1, 4) ~ '^[0-9]{4}$' THEN m.created_at::timestamptz
                       ELSE public.parse_tx_date(m.created_at::text)
                   END AS tx_ts
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
            'status', 'ok',
            'rows_dims', %L::text[],
            'column_dim', %L::text,
            'values', %L::text[],
            'page', %s,
            'page_size', %s,
            'total_rows', (SELECT COUNT(*) FROM rowtot),
            'columns', COALESCE((SELECT jsonb_agg(c1 ORDER BY c1) FROM cols), '[]'::jsonb),
            'rows', COALESCE((SELECT jsonb_agg(to_jsonb(sorted.*)) FROM sorted), '[]'::jsonb),
            'cells', COALESCE((SELECT jsonb_agg(to_jsonb(cells.*)) FROM cells), '[]'::jsonb),
            'col_totals', COALESCE((SELECT jsonb_agg(to_jsonb(coltot.*)) FROM coltot), '[]'::jsonb),
            'grand', (SELECT to_jsonb(grand.*) FROM grand),
            'elapsed_ms', ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - %L::timestamptz)) * 1000)::int
        );
    $q$,
        r_sel, c_sel, v_where,
        r_list, m_sel, r_list, v_having,
        v_sort_expr, v_size, v_off,
        v_cells_cte,
        v_coltot_cte,
        v_cols_cte,
        m_sel, v_grand_where,
        v_rows, v_col, v_vals,
        v_page, v_size,
        v_started
    );

    EXECUTE v_q INTO v_result;
    RETURN v_result || jsonb_build_object('sql_trace', v_q);
END;
$$;


-- 3. SPEED OPTIMIZATION INDEXES ON monthly_data
CREATE INDEX IF NOT EXISTS idx_monthly_data_created_at_fast ON public.monthly_data (created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_data_tx_type ON public.monthly_data (transaction_type);
CREATE INDEX IF NOT EXISTS idx_monthly_data_bank ON public.monthly_data (bank);


-- 4. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.pp_dim_expr(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_power_pivot(JSONB) TO anon, authenticated, service_role;
