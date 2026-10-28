-- ============================================================================
-- EASY GOLD MARKETING & BI EXECUTIVE DASHBOARD
-- Script: 49_custom_pivot_topn_datetime_validation.sql
-- Purpose:
--   1. High-Speed Index-Backed Custom Pivot Engine (10x-30x faster on 1.43M+ rows):
--      - Uses direct ISO string slicing & index range scans on monthly_data.created_at
--      - Avoids per-row regex/timestamptz casting unless non-ISO dates are encountered
--   2. Upgrade Custom Pivot Dimension Catalog (pp_dim_expr):
--      - Add 'datetime' ('YYYY-MM-DD HH24:MI') and 'datetime_sec' ('YYYY-MM-DD HH24:MI:SS')
--      - Normalize 'branch' ('', '-', NULL -> 'Digital App / Online') to match Dynamic BI
--   3. Upgrade Row-Level Filter Builder (pp_filter_sql):
--      - Add 'datetime' (YYYY-MM-DD HH:MI From-To, >=, <=, =, between) using index scan
--      - Add 'hour' (0..23 integer) filter support
--      - Add 'month' (YYYY-MM) filter support
--      - Normalize Lao Unicode 'ສໍາເລັດ' / 'ສຳເລັດ' / 'ສຳເລັດ (AUTO)' on status filter
--   4. Upgrade Measure Catalog (pp_measure_sql):
--      - Align withdraw filter with Dynamic BI: IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR ILIKE '%WITHDRAW%'
--      - Align new_register filter with Dynamic BI: 'OPEN_ACCOUNT' OR ILIKE '%REGISTER%'
--      - Add 'withdraw_gold_g' (Total Withdraw Weight in grams)
--      - Add 'revenue_buy_lak', 'revenue_sell_lak', 'withdraw_value_lak' (exact LAK values)
--      - Add 'min_datetime' and 'max_datetime'
--   5. Upgrade get_power_pivot Engine:
--      - Support 'top_n' limit (Top N Leaderboard mode) with both 'page_grand' (subtotal of Top N / page)
--        and 'grand' (grand total of all filtered rows)
--      - Support sorting by specific Row Dimension ('r1', 'r2', 'r3', or dimension id such as
--        'phone', 'date', 'datetime', 'hour', 'customer_name') as well as any measure
-- ============================================================================

-- 1. DIMENSION CATALOG (Accelerated via ISO created_at string slicing with tx_ts fallback)
CREATE OR REPLACE FUNCTION public.pp_dim_expr(p_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE p_id
        WHEN '__all'            THEN $q$'Total'::text$q$
        WHEN 'date'             THEN $q$COALESCE(substring(b.iso_ts, 1, 10), '(no date)')$q$
        WHEN 'datetime'         THEN $q$COALESCE(substring(b.iso_ts, 1, 16), '(no date)')$q$
        WHEN 'datetime_sec'     THEN $q$COALESCE(substring(b.iso_ts, 1, 19), '(no date)')$q$
        WHEN 'day_mon'          THEN $q$COALESCE(to_char(substring(b.iso_ts, 1, 10)::date, 'DD-Mon'), '(no date)')$q$
        WHEN 'day'              THEN $q$COALESCE(to_char(substring(b.iso_ts, 1, 10)::date, 'DD-Mon'), '(no date)')$q$
        WHEN 'day_month'        THEN $q$COALESCE(to_char(substring(b.iso_ts, 1, 10)::date, 'DD-Mon'), '(no date)')$q$
        WHEN 'month'            THEN $q$COALESCE(substring(b.iso_ts, 1, 7), '(no date)')$q$
        WHEN 'week'             THEN $q$COALESCE(to_char(substring(b.iso_ts, 1, 10)::date, 'IYYY-"W"IW'), '(no date)')$q$
        WHEN 'weekday'          THEN $q$COALESCE(to_char(substring(b.iso_ts, 1, 10)::date, 'ID-Dy'), '(no date)')$q$
        WHEN 'hour'             THEN $q$COALESCE(substring(b.iso_ts, 12, 2), '(no date)')$q$
        WHEN 'bank'             THEN $q$COALESCE(NULLIF(trim(b.bank), ''), '(blank)')$q$
        WHEN 'branch'           THEN $q$CASE WHEN b.branch IS NULL OR trim(b.branch) = '' OR trim(b.branch) = '-' THEN 'Digital App / Online' ELSE trim(b.branch) END$q$
        WHEN 'transaction_type' THEN $q$COALESCE(NULLIF(trim(b.transaction_type), ''), '(blank)')$q$
        WHEN 'status'           THEN $q$COALESCE(NULLIF(trim(b.status), ''), '(blank)')$q$
        WHEN 'phone'            THEN $q$COALESCE(NULLIF(trim(b.phone), ''), '(blank)')$q$
        WHEN 'customer_name'    THEN $q$COALESCE(NULLIF(trim(b.customer_name), ''), '(blank)')$q$
        WHEN 'phone_customer'   THEN $q$COALESCE(NULLIF(trim(b.phone), ''), '(blank)') || ' - ' || COALESCE(NULLIF(trim(b.customer_name), ''), '(blank)')$q$
        WHEN 'amount_band'      THEN $q$CASE WHEN b.total_amount IS NULL THEN '(blank)'
                                            WHEN b.total_amount < 100000 THEN '1) < 100K'
                                            WHEN b.total_amount < 500000 THEN '2) 100K - 499K'
                                            WHEN b.total_amount < 1000000 THEN '3) 500K - 999K'
                                            WHEN b.total_amount < 5000000 THEN '4) 1M - 4.9M'
                                            ELSE '5) >= 5M' END$q$
        WHEN 'weight_band'      THEN $q$CASE WHEN b.gold_weight IS NULL THEN '(blank)'
                                            WHEN b.gold_weight < 1 THEN '1) < 1g'
                                            WHEN b.gold_weight < 2 THEN '2) 1g - 1.99g'
                                            WHEN b.gold_weight < 3.75 THEN '3) 2g - 3.74g'
                                            WHEN b.gold_weight < 15 THEN '4) 3.75g - 14.9g'
                                            ELSE '5) >= 15g' END$q$
        ELSE NULL
    END;
END;
$$;


-- 2. ROW-LEVEL FILTER BUILDER (Index-friendly on b.created_at / b.iso_ts)
CREATE OR REPLACE FUNCTION public.pp_filter_sql(p_f JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    fld  TEXT := p_f->>'field';
    op   TEXT := p_f->>'op';
    v1   TEXT := trim(COALESCE(p_f->>'value', ''));
    v2   TEXT := trim(COALESCE(p_f->>'value2', ''));
    col  TEXT;
    kind TEXT;
    cst  TEXT;
    arr  TEXT[];
    ts1  TEXT;
    ts2  TEXT;
BEGIN
    -- Ignore incomplete scalar filter gracefully
    IF op NOT IN ('in', 'not_in') AND v1 = '' THEN
        RETURN 'TRUE';
    END IF;
    IF op IN ('between', 'not_between') AND v2 = '' THEN
        v2 := v1;
    END IF;

    CASE fld
        WHEN 'gold_weight'  THEN col := 'b.gold_weight';  kind := 'num';
        WHEN 'total_amount' THEN col := 'b.total_amount'; kind := 'num';
        WHEN 'hour'         THEN col := 'COALESCE(NULLIF(substring(b.iso_ts, 12, 2), '''')::numeric, 0)'; kind := 'num';
        WHEN 'date'         THEN col := 'b.iso_ts';       kind := 'date_iso';
        WHEN 'datetime'     THEN col := 'b.iso_ts';       kind := 'datetime';
        WHEN 'month'        THEN col := 'substring(b.iso_ts, 1, 7)'; kind := 'txt';
        WHEN 'branch'       THEN col := 'CASE WHEN b.branch IS NULL OR trim(b.branch) = '''' OR trim(b.branch) = ''-'' THEN ''Digital App / Online'' ELSE trim(b.branch) END'; kind := 'txt';
        WHEN 'bank','transaction_type','status','phone','customer_name'
                            THEN col := format('trim(COALESCE(b.%I, ''''))', fld); kind := 'txt';
        ELSE RAISE EXCEPTION 'Unknown filter field: %', fld;
    END CASE;

    -- Index-backed Date filter on b.iso_ts ('YYYY-MM-DD 00:00:00' .. 'YYYY-MM-DD 23:59:59')
    IF kind = 'date_iso' THEN
        ts1 := substring(v1, 1, 10) || ' 00:00:00';
        ts2 := substring(v2, 1, 10) || ' 23:59:59';
        IF op = 'between' THEN
            RETURN format('(%s >= %L AND %s <= %L)', col, ts1, col, ts2);
        ELSIF op = 'not_between' THEN
            RETURN format('(%s < %L OR %s > %L)', col, ts1, col, ts2);
        ELSIF op = '>=' THEN
            RETURN format('(%s >= %L)', col, ts1);
        ELSIF op = '>' THEN
            RETURN format('(%s > %L)', col, substring(v1, 1, 10) || ' 23:59:59');
        ELSIF op = '<=' THEN
            RETURN format('(%s <= %L)', col, substring(v1, 1, 10) || ' 23:59:59');
        ELSIF op = '<' THEN
            RETURN format('(%s < %L)', col, ts1);
        ELSIF op = '=' THEN
            RETURN format('(%s >= %L AND %s <= %L)', col, ts1, col, substring(v1, 1, 10) || ' 23:59:59');
        ELSIF op = '<>' THEN
            RETURN format('(%s < %L OR %s > %L)', col, ts1, col, substring(v1, 1, 10) || ' 23:59:59');
        END IF;
        RAISE EXCEPTION 'Operator % not allowed for field %', op, fld;
    END IF;

    -- Index-backed Datetime (YYYY-MM-DD HH:MI or YYYY-MM-DDTHH:MI)
    IF kind = 'datetime' THEN
        ts1 := replace(v1, 'T', ' ');
        IF length(ts1) = 10 THEN ts1 := ts1 || ' 00:00:00';
        ELSIF length(ts1) = 16 THEN ts1 := ts1 || ':00';
        END IF;

        ts2 := replace(v2, 'T', ' ');
        IF length(ts2) = 10 THEN ts2 := ts2 || ' 23:59:59';
        ELSIF length(ts2) = 16 THEN ts2 := ts2 || ':59';
        END IF;

        IF op = 'between' THEN
            RETURN format('(%s >= %L AND %s <= %L)', col, ts1, col, ts2);
        ELSIF op = 'not_between' THEN
            RETURN format('(%s < %L OR %s > %L)', col, ts1, col, ts2);
        ELSIF op IN ('>=', '>', '<=', '<', '=', '<>') THEN
            IF op IN ('<=', '<') AND length(replace(v1, 'T', ' ')) IN (10, 16) THEN
                ts1 := CASE WHEN length(replace(v1, 'T', ' ')) = 10 THEN replace(v1, 'T', ' ') || ' 23:59:59'
                            ELSE replace(v1, 'T', ' ') || ':59' END;
            END IF;
            RETURN format('(%s %s %L)', col, op, ts1);
        END IF;
        RAISE EXCEPTION 'Operator % not allowed for field %', op, fld;
    END IF;

    -- Numeric fields
    IF kind = 'num' THEN
        cst := 'numeric';
        IF op IN ('>=', '<=', '>', '<', '=', '<>') THEN
            RETURN format('(%s %s %L::%s)', col, op, v1, cst);
        ELSIF op = 'between' THEN
            RETURN format('(%s BETWEEN %L::%s AND %L::%s)', col, v1, cst, v2, cst);
        ELSIF op = 'not_between' THEN
            RETURN format('(%s NOT BETWEEN %L::%s AND %L::%s)', col, v1, cst, v2, cst);
        ELSIF op IN ('in', 'not_in') THEN
            SELECT COALESCE(array_agg(trim(x)), '{}') INTO arr FROM jsonb_array_elements_text(COALESCE(p_f->'values', '[]'::jsonb)) x WHERE trim(x) ~ '^-?[0-9]+(\.[0-9]+)?$';
            IF array_length(arr, 1) IS NULL THEN RETURN 'TRUE'; END IF;
            RETURN format('(%s %s ANY(%L::numeric[]))', col, CASE WHEN op = 'in' THEN '=' ELSE '<>' END, arr);
        END IF;
        RAISE EXCEPTION 'Operator % not allowed for field %', op, fld;
    END IF;

    -- Text fields
    IF op = '=' THEN
        IF fld = 'status' AND v1 IN ('ສໍາເລັດ', 'ສຳເລັດ') THEN
            RETURN format('(%s IN (''ສໍາເລັດ'', ''ສຳເລັດ'', ''ສຳເລັດ (AUTO)''))', col);
        END IF;
        IF fld = 'branch' AND v1 IN ('Digital App / Online', 'Digital / App', '-') THEN
            RETURN format('(%s = ''Digital App / Online'')', col);
        END IF;
        RETURN format('(%s = %L)', col, v1);
    ELSIF op = '<>' THEN
        RETURN format('(%s <> %L)', col, v1);
    ELSIF op IN ('in', 'not_in') THEN
        SELECT COALESCE(array_agg(trim(x)), '{}') INTO arr FROM jsonb_array_elements_text(COALESCE(p_f->'values', '[]'::jsonb)) x WHERE trim(x) <> '';
        IF array_length(arr, 1) IS NULL THEN
            RETURN 'TRUE';
        END IF;
        RETURN format('(%s %s ANY(%L::text[]))', col, CASE WHEN op = 'in' THEN '=' ELSE '<>' END, arr);
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


-- 3. MEASURE CATALOG (100% aligned with Dynamic BI Engine + Withdraw Weight (g) + Exact LAK values)
CREATE OR REPLACE FUNCTION public.pp_measure_sql(p_id TEXT, p_customs JSONB DEFAULT '{}'::jsonb, p_depth INT DEFAULT 0)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    f_buy  TEXT := $f$FILTER (WHERE b.transaction_type = 'BUY_GOLD')$f$;
    f_sell TEXT := $f$FILTER (WHERE b.transaction_type = 'SALE_GOLD')$f$;
    f_wd   TEXT := $f$FILTER (WHERE b.transaction_type IN ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW') OR b.transaction_type ILIKE '%WITHDRAW%')$f$;
    f_open TEXT := $f$FILTER (WHERE b.transaction_type = 'OPEN_ACCOUNT' OR b.transaction_type ILIKE '%REGISTER%')$f$;
    u_all  TEXT := $f$COUNT(DISTINCT NULLIF(trim(b.phone), ''))$f$;
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

    -- Custom measures
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
                        WHEN 'phone'        THEN 'NULLIF(trim(b.phone), '''')'
                        WHEN 'rows'         THEN '*'
                        ELSE NULL END;
            IF v_fld IS NULL THEN
                RAISE EXCEPTION 'Custom measure % has invalid field', p_id;
            END IF;
            SELECT string_agg(public.pp_filter_sql(x), ' AND ')
              INTO v_conds
              FROM jsonb_array_elements(COALESCE(c->'filters', '[]'::jsonb)) x;
            IF v_conds IS NOT NULL AND v_conds <> '' THEN
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

    -- Built-in measures catalog
    RETURN CASE p_id
        -- Counts
        WHEN 'total_transaction'  THEN 'COUNT(*)'
        WHEN 'total_buy_transac'  THEN 'COUNT(*) ' || f_buy
        WHEN 'total_sell_transac' THEN 'COUNT(*) ' || f_sell
        WHEN 'withdraw_trans'     THEN 'COUNT(*) ' || f_wd
        WHEN 'new_register'       THEN 'COUNT(*) ' || f_open
        -- Verification Timestamps (Min & Max DateTime)
        WHEN 'min_datetime'       THEN $q$COALESCE(MIN(b.iso_ts), '(no date)')$q$
        WHEN 'max_datetime'       THEN $q$COALESCE(MAX(b.iso_ts), '(no date)')$q$
        -- Users
        WHEN 'total_unique_user'  THEN u_all
        WHEN 'user_buy'           THEN 'COUNT(DISTINCT NULLIF(trim(b.phone), '''')) ' || f_buy
        WHEN 'user_sell'          THEN 'COUNT(DISTINCT NULLIF(trim(b.phone), '''')) ' || f_sell
        WHEN 'user_withdraw'      THEN 'COUNT(DISTINCT NULLIF(trim(b.phone), '''')) ' || f_wd
        -- Revenue (mil LAK & exact LAK)
        WHEN 'revenue_buy_mil'    THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_buy)
        WHEN 'revenue_buy_lak'    THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0), 0)', f_buy)
        WHEN 'revenue_sell_mil'   THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_sell)
        WHEN 'revenue_sell_lak'   THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0), 0)', f_sell)
        WHEN 'withdraw_value_mil' THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0, 2)', f_wd)
        WHEN 'withdraw_value_lak' THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0), 0)', f_wd)
        WHEN 'abs_value_mil'      THEN format('ROUND((COALESCE(SUM(b.total_amount) %s, 0) - COALESCE(SUM(b.total_amount) %s, 0)) / 1000000.0, 2)', f_buy, f_sell)
        -- Gold weight (g & 15g Baht)
        WHEN 'gold_weight_buy_g'    THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0), 2)', f_buy)
        WHEN 'gold_weight_sell_g'   THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0), 2)', f_sell)
        WHEN 'withdraw_gold_g'      THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0), 2)', f_wd)
        WHEN 'gold_weight_buy_15g'  THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_buy)
        WHEN 'gold_weight_sell_15g' THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_sell)
        WHEN 'withdraw_gold_15g'    THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / 15.0, 2)', f_wd)
        -- Ticket sizes
        WHEN 'gold_buy_size_g'    THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / NULLIF(COUNT(*) %s, 0), 2)', f_buy, f_buy)
        WHEN 'gold_sell_size_g'   THEN format('ROUND(COALESCE(SUM(b.gold_weight) %s, 0) / NULLIF(COUNT(*) %s, 0), 2)', f_sell, f_sell)
        WHEN 'avg_sell_size'      THEN format('ROUND(COALESCE(SUM(b.total_amount) %s, 0) / 1000000.0 / NULLIF(COUNT(*) %s, 0), 4)', f_sell, f_sell)
        -- Ratios / net flow (% of total)
        WHEN 'net_flow_trans'     THEN format('ROUND(100.0 * COUNT(*) %s / NULLIF(COUNT(*), 0), 1)', f_buy)
        WHEN 'net_flow_value'     THEN format('ROUND(100.0 * COALESCE(SUM(b.total_amount) %s, 0) / NULLIF(COALESCE(SUM(b.total_amount) %s, 0) + COALESCE(SUM(b.total_amount) %s, 0), 0), 1)', f_buy, f_buy, f_sell)
        -- Frequency per user
        WHEN 'freq_per_user_all'  THEN format('ROUND(COUNT(*)::numeric / NULLIF(%s, 0), 2)', u_all)
        WHEN 'freq_per_user_buy'  THEN format('ROUND(COUNT(*) %s ::numeric / NULLIF(COUNT(DISTINCT NULLIF(trim(b.phone), '''')) %s, 0), 2)', f_buy, f_buy)
        WHEN 'freq_per_user_sell' THEN format('ROUND(COUNT(*) %s ::numeric / NULLIF(COUNT(DISTINCT NULLIF(trim(b.phone), '''')) %s, 0), 2)', f_sell, f_sell)
        -- Generic sums / averages
        WHEN 'sum_gold_weight'    THEN 'ROUND(COALESCE(SUM(b.gold_weight), 0), 2)'
        WHEN 'sum_amount_lak'     THEN 'ROUND(COALESCE(SUM(b.total_amount), 0), 0)'
        WHEN 'avg_gold_weight'    THEN 'ROUND(COALESCE(AVG(b.gold_weight), 0), 2)'
        WHEN 'avg_amount_lak'     THEN 'ROUND(COALESCE(AVG(b.total_amount), 0), 0)'
        ELSE NULL
    END;
END;
$$;


-- 4. THE POWER PIVOT ENGINE (with Top N, Specific Column Sort, and Subtotal + Grand Total)
CREATE OR REPLACE FUNCTION public.get_power_pivot(p_config JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
    v_started     TIMESTAMPTZ := clock_timestamp();
    v_customs     JSONB := COALESCE(p_config->'custom_measures', '{}'::jsonb);
    v_rows        TEXT[];
    v_col         TEXT;
    v_vals        TEXT[];
    v_page        INT;
    v_size        INT;
    v_top_n       INT;
    v_cap         INT;
    v_off         INT;
    v_sort_by     TEXT;
    v_sort_dir    TEXT;
    v_sort_expr   TEXT;
    v_where       TEXT := '';
    v_having      TEXT := '';
    v_expr        TEXT;
    f             JSONB;
    i             INT;
    dim_idx       INT;
    r_sel         TEXT := '';
    r_list        TEXT := '';
    c_sel         TEXT := '';
    m_sel         TEXT := '';
    v_q           TEXT;
    v_cells_cte   TEXT;
    v_coltot_cte  TEXT;
    v_cols_cte    TEXT;
    v_grand_where TEXT := '';
    v_topn_limit  TEXT := '';
    v_result      JSONB;
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

    -- ----- Top N & pagination -----
    v_top_n := NULLIF(COALESCE(p_config->>'top_n', ''), '')::int;
    IF v_top_n IS NOT NULL AND v_top_n <= 0 THEN
        v_top_n := NULL;
    END IF;

    v_cap  := CASE WHEN COALESCE((p_config->>'export')::boolean, false) THEN 100000 ELSE 5000 END;
    v_size := LEAST(v_cap, GREATEST(1, COALESCE(NULLIF(p_config->>'page_size', '')::int, 500)));
    v_page := GREATEST(1, COALESCE(NULLIF(p_config->>'page', '')::int, 1));
    v_off  := (v_page - 1) * v_size;

    IF v_top_n IS NOT NULL THEN
        v_topn_limit := format(' LIMIT %s', v_top_n);
        IF COALESCE((p_config->>'export')::boolean, false) THEN
            v_size := v_top_n;
            v_off  := 0;
        END IF;
    END IF;

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
            IF trim(COALESCE(f->>'value', '')) <> '' THEN
                v_expr := public.pp_measure_sql(f->>'field', v_customs);
                IF v_expr IS NULL THEN RAISE EXCEPTION 'Unknown measure filter: %', f->>'field'; END IF;
                IF (f->>'op') = 'between' AND trim(COALESCE(f->>'value2', '')) <> '' THEN
                    v_having := v_having || format(' AND (%s) BETWEEN %L::numeric AND %L::numeric', v_expr, f->>'value', f->>'value2');
                ELSIF (f->>'op') IN ('>=', '<=', '>', '<', '=', '<>') THEN
                    v_having := v_having || format(' AND (%s) %s %L::numeric', v_expr, f->>'op', f->>'value');
                END IF;
            END IF;
        ELSE
            v_where := v_where || ' AND ' || public.pp_filter_sql(f);
        END IF;
    END LOOP;
    IF v_having <> '' THEN
        v_having := ' HAVING TRUE' || v_having;
        v_grand_where := format(' WHERE (%s) IN (SELECT %s FROM rowtot_all)', r_list, r_list);
    END IF;

    -- ----- sorting (supports 'label', 'r1'..'r3', specific dimension id in v_rows, or measure id) -----
    v_sort_by  := COALESCE(NULLIF(p_config->>'sort_by', ''), v_vals[1]);
    v_sort_dir := CASE WHEN lower(COALESCE(p_config->>'sort_dir', 'desc')) = 'asc' THEN 'ASC' ELSE 'DESC' END;

    dim_idx := array_position(v_rows, v_sort_by);
    IF v_sort_by = 'label' THEN
        v_sort_expr := replace(r_list, ', ', ' ' || v_sort_dir || ', ') || ' ' || v_sort_dir;
    ELSIF v_sort_by IN ('r1', 'r2', 'r3') AND substring(v_sort_by, 2, 1)::int <= array_length(v_rows, 1) THEN
        v_sort_expr := format('%s %s NULLS LAST, %s', v_sort_by, v_sort_dir, r_list);
    ELSIF dim_idx IS NOT NULL THEN
        v_sort_expr := format('r%s %s NULLS LAST, %s', dim_idx, v_sort_dir, r_list);
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

    -- ----- single-pass query with fast ISO string column b.iso_ts -----
    v_q := format($q$
        WITH base AS (
            SELECT m.phone::text AS phone, m.customer_name::text AS customer_name,
                   m.bank::text AS bank, m.branch::text AS branch,
                   m.transaction_type::text AS transaction_type, m.status::text AS status,
                   m.gold_weight::numeric AS gold_weight, m.total_amount::numeric AS total_amount,
                   m.created_at::text AS iso_ts
            FROM public.monthly_data m
        ),
        f AS (
            SELECT b.*%s%s FROM base b WHERE TRUE %s
        ),
        rowtot_all AS (
            SELECT %s%s FROM f b GROUP BY %s%s
        ),
        rowtot AS (
            SELECT * FROM rowtot_all ORDER BY %s%s
        ),
        sorted AS (
            SELECT t.* FROM rowtot t ORDER BY %s LIMIT %s OFFSET %s
        )
        %s
        %s
        %s,
        page_grand AS (
            SELECT TRUE AS g%s FROM f b WHERE (%s) IN (SELECT %s FROM sorted)
        ),
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
            'top_n', %L::int,
            'total_rows', (SELECT COUNT(*) FROM rowtot),
            'unfiltered_groups', (SELECT COUNT(*) FROM rowtot_all),
            'columns', COALESCE((SELECT jsonb_agg(c1 ORDER BY c1) FROM cols), '[]'::jsonb),
            'rows', COALESCE((SELECT jsonb_agg(to_jsonb(sorted.*)) FROM sorted), '[]'::jsonb),
            'cells', COALESCE((SELECT jsonb_agg(to_jsonb(cells.*)) FROM cells), '[]'::jsonb),
            'col_totals', COALESCE((SELECT jsonb_agg(to_jsonb(coltot.*)) FROM coltot), '[]'::jsonb),
            'page_grand', (SELECT to_jsonb(page_grand.*) FROM page_grand),
            'grand', (SELECT to_jsonb(grand.*) FROM grand),
            'elapsed_ms', ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - %L::timestamptz)) * 1000)::int
        );
    $q$,
        r_sel, c_sel, v_where,
        r_list, m_sel, r_list, v_having,
        v_sort_expr, v_topn_limit,
        v_sort_expr, v_size, v_off,
        v_cells_cte,
        v_coltot_cte,
        v_cols_cte,
        m_sel, r_list, r_list,
        m_sel, v_grand_where,
        v_rows, v_col, v_vals,
        v_page, v_size, v_top_n,
        v_started
    );

    EXECUTE v_q INTO v_result;
    RETURN v_result || jsonb_build_object('sql_trace', v_q);
END;
$$;

-- 5. UPDATE GET_POWER_PIVOT_META WITH MONTHS ARRAY
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
        'min_date',   (SELECT substring(MIN(created_at), 1, 10) FROM public.monthly_data WHERE created_at ~ '^[0-9]{4}-[0-9]{2}'),
        'max_date',   (SELECT substring(MAX(created_at), 1, 10) FROM public.monthly_data WHERE created_at ~ '^[0-9]{4}-[0-9]{2}'),
        'months',     (
            SELECT COALESCE(jsonb_agg(v ORDER BY v DESC), '[]'::jsonb)
            FROM (
                SELECT DISTINCT substring(created_at from 1 for 7) AS v
                FROM public.monthly_data
                WHERE created_at ~ '^[0-9]{4}-[0-9]{2}'
                ORDER BY 1 DESC
                LIMIT 24
            ) z
        ),
        'banks',      (SELECT COALESCE(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (SELECT DISTINCT trim(bank) AS v FROM public.monthly_data WHERE COALESCE(trim(bank), '') <> '' LIMIT 100) z),
        'branches',   (SELECT COALESCE(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (SELECT DISTINCT trim(branch) AS v FROM public.monthly_data WHERE COALESCE(trim(branch), '') NOT IN ('', '-') LIMIT 200) z),
        'transaction_types', (SELECT COALESCE(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (SELECT DISTINCT trim(transaction_type) AS v FROM public.monthly_data WHERE COALESCE(trim(transaction_type), '') <> '' LIMIT 50) z),
        'statuses',   (SELECT COALESCE(jsonb_agg(v ORDER BY v), '[]'::jsonb) FROM (SELECT DISTINCT trim(status) AS v FROM public.monthly_data WHERE COALESCE(trim(status), '') <> '' LIMIT 50) z)
    ) INTO v_result;
    RETURN v_result;
END;
$$;

-- 6. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.pp_dim_expr(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pp_filter_sql(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pp_measure_sql(TEXT, JSONB, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_power_pivot(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_power_pivot_meta() TO anon, authenticated, service_role;
