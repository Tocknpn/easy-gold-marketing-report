import openpyxl
import datetime
from collections import defaultdict

def main():
    print("Loading Excel file...")
    wb = openpyxl.load_workbook('whole 2025 summarize daily data.xlsx', read_only=True)
    ws = wb.active

    daily = defaultdict(lambda: {
        'total_tx': 0, 'buy_tx': 0, 'sell_tx': 0, 'new_reg': 0,
        'buy_val': 0.0, 'sell_val': 0.0, 'buy_wt': 0.0, 'sell_wt': 0.0,
        'withdraw_wt_15g': 0.0, 'withdraw_tx': 0
    })

    weekly = defaultdict(lambda: {
        'dates': [], 'all_tx': 0, 'active_users': 0, 'new_reg': 0,
        'buy_wt_g': 0.0, 'buy_tx': 0, 'sell_wt_g': 0.0, 'sell_tx': 0,
        'withdraw_15g': 0.0, 'week_num': 1
    })

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        d_val = row[0]
        if isinstance(d_val, (int, float)):
            dt = datetime.date(1899, 12, 30) + datetime.timedelta(days=int(d_val))
        elif isinstance(d_val, datetime.date):
            dt = d_val
        else:
            continue
        
        d_str = dt.isoformat()
        tot_tx = int(row[8] or 0)
        buy_tx = int(row[9] or 0)
        sell_tx = int(row[10] or 0)
        new_reg = int(row[11] or 0)
        buy_val = float(row[12] or 0)
        sell_val = float(row[13] or 0)
        buy_wt = float(row[14] or 0)
        sell_wt = float(row[15] or 0)
        w_wt_15g = float(row[19] or 0)
        w_tx = int(row[20] or 0)
        u_all = int(row[16] or 0)
        
        # Daily aggregation
        d = daily[d_str]
        d['total_tx'] += tot_tx
        d['buy_tx'] += buy_tx
        d['sell_tx'] += sell_tx
        d['new_reg'] += new_reg
        d['buy_val'] += buy_val
        d['sell_val'] += sell_val
        d['buy_wt'] += buy_wt
        d['sell_wt'] += sell_wt
        d['withdraw_wt_15g'] += w_wt_15g
        d['withdraw_tx'] += w_tx
        
        # Weekly aggregation
        w_num = int(row[6] or 1)
        w_key = f'2025-W{w_num:02d}'
        w = weekly[w_key]
        w['week_num'] = w_num
        w['dates'].append(dt)
        w['all_tx'] += tot_tx
        w['buy_tx'] += buy_tx
        w['sell_tx'] += sell_tx
        w['new_reg'] += new_reg
        w['active_users'] += u_all
        w['buy_wt_g'] += buy_wt
        w['sell_wt_g'] += sell_wt
        w['withdraw_15g'] += w_wt_15g

    print(f"Aggregated {len(daily)} daily rows and {len(weekly)} weekly rows.")

    sql_lines = []
    sql_lines.append("-- ==============================================================================")
    sql_lines.append("-- 44. EASY GOLD - BACKFILL 2025 SUMMARY DAILY & WEEKLY METRICS")
    sql_lines.append("-- File: 44_backfill_2025_summary_daily_and_weekly.sql")
    sql_lines.append("-- Source: whole 2025 summarize daily data.xlsx (34,965 raw rows pre-aggregated)")
    sql_lines.append("-- Storage impact: ~0.065 MB total (365 daily rows + 53 weekly rows)")
    sql_lines.append("-- ==============================================================================\n")

    sql_lines.append("-- 1. BATCH UPSERT: 365 DAYS OF 2025 INTO public.summary_daily_metrics")
    sql_lines.append("INSERT INTO public.summary_daily_metrics (")
    sql_lines.append("    date_id, buy_weight_15g, buy_weight_g, buy_transactions, buy_value_mil_lak,")
    sql_lines.append("    sell_weight_15g, sell_weight_g, sell_transactions, sell_value_mil_lak,")
    sql_lines.append("    withdraw_15g, withdraw_refund_trans, new_customers, total_transactions,")
    sql_lines.append("    source, updated_at")
    sql_lines.append(") VALUES")

    daily_val_rows = []
    for d_str in sorted(daily.keys()):
        d = daily[d_str]
        buy_wt_15g = round(d['buy_wt'] / 15.0, 2)
        buy_wt_g = round(d['buy_wt'], 2)
        sell_wt_15g = round(d['sell_wt'] / 15.0, 2)
        sell_wt_g = round(d['sell_wt'], 2)
        buy_val = round(d['buy_val'], 2)
        sell_val = round(d['sell_val'], 2)
        w_15g = round(d['withdraw_wt_15g'], 2)
        
        row_str = (
            f"('{d_str}', {buy_wt_15g}, {buy_wt_g}, {d['buy_tx']}, {buy_val}, "
            f"{sell_wt_15g}, {sell_wt_g}, {d['sell_tx']}, {sell_val}, "
            f"{w_15g}, {d['withdraw_tx']}, {d['new_reg']}, {d['total_tx']}, "
            f"'2025_excel_summary_backfill', now())"
        )
        daily_val_rows.append(row_str)

    sql_lines.append(',\n'.join(daily_val_rows))
    sql_lines.append("ON CONFLICT (date_id) DO UPDATE SET")
    sql_lines.append("    buy_weight_15g = EXCLUDED.buy_weight_15g,")
    sql_lines.append("    buy_weight_g = EXCLUDED.buy_weight_g,")
    sql_lines.append("    buy_transactions = EXCLUDED.buy_transactions,")
    sql_lines.append("    buy_value_mil_lak = EXCLUDED.buy_value_mil_lak,")
    sql_lines.append("    sell_weight_15g = EXCLUDED.sell_weight_15g,")
    sql_lines.append("    sell_weight_g = EXCLUDED.sell_weight_g,")
    sql_lines.append("    sell_transactions = EXCLUDED.sell_transactions,")
    sql_lines.append("    sell_value_mil_lak = EXCLUDED.sell_value_mil_lak,")
    sql_lines.append("    withdraw_15g = EXCLUDED.withdraw_15g,")
    sql_lines.append("    withdraw_refund_trans = EXCLUDED.withdraw_refund_trans,")
    sql_lines.append("    new_customers = EXCLUDED.new_customers,")
    sql_lines.append("    total_transactions = EXCLUDED.total_transactions,")
    sql_lines.append("    source = EXCLUDED.source,")
    sql_lines.append("    updated_at = now();\n")

    sql_lines.append("-- 2. BATCH UPSERT: 53 WEEKS OF 2025 INTO public.summary_weekly_metrics")
    sql_lines.append("INSERT INTO public.summary_weekly_metrics (")
    sql_lines.append("    year_week, week_label, week_number, year, start_date, end_date,")
    sql_lines.append("    all_transactions, active_users, new_registers, withdraw_gold_grams,")
    sql_lines.append("    buy_weight_15g, buy_transactions, buy_ticket_size_g,")
    sql_lines.append("    sell_weight_15g, sell_transactions, sell_ticket_size_g,")
    sql_lines.append("    updated_at")
    sql_lines.append(") VALUES")

    weekly_val_rows = []
    for w_key in sorted(weekly.keys()):
        w = weekly[w_key]
        start_d = min(w['dates']).isoformat()
        end_d = max(w['dates']).isoformat()
        w_label = f"W{w['week_num']:02d}"
        buy_wt_15g = round(w['buy_wt_g'] / 15.0, 2)
        sell_wt_15g = round(w['sell_wt_g'] / 15.0, 2)
        w_g = round(w['withdraw_15g'] * 15.0, 2)
        buy_ticket_size = round(w['buy_wt_g'] / max(1, w['buy_tx']), 2)
        sell_ticket_size = round(w['sell_wt_g'] / max(1, w['sell_tx']), 2)
        
        row_str = (
            f"('{w_key}', '{w_label}', {w['week_num']}, 2025, '{start_d}', '{end_d}', "
            f"{w['all_tx']}, {w['active_users']}, {w['new_reg']}, {w_g}, "
            f"{buy_wt_15g}, {w['buy_tx']}, {buy_ticket_size}, "
            f"{sell_wt_15g}, {w['sell_tx']}, {sell_ticket_size}, "
            f"now())"
        )
        weekly_val_rows.append(row_str)

    sql_lines.append(',\n'.join(weekly_val_rows))
    sql_lines.append("ON CONFLICT (year_week) DO UPDATE SET")
    sql_lines.append("    week_label = EXCLUDED.week_label,")
    sql_lines.append("    week_number = EXCLUDED.week_number,")
    sql_lines.append("    year = EXCLUDED.year,")
    sql_lines.append("    start_date = EXCLUDED.start_date,")
    sql_lines.append("    end_date = EXCLUDED.end_date,")
    sql_lines.append("    all_transactions = EXCLUDED.all_transactions,")
    sql_lines.append("    active_users = EXCLUDED.active_users,")
    sql_lines.append("    new_registers = EXCLUDED.new_registers,")
    sql_lines.append("    withdraw_gold_grams = EXCLUDED.withdraw_gold_grams,")
    sql_lines.append("    buy_weight_15g = EXCLUDED.buy_weight_15g,")
    sql_lines.append("    buy_transactions = EXCLUDED.buy_transactions,")
    sql_lines.append("    buy_ticket_size_g = EXCLUDED.buy_ticket_size_g,")
    sql_lines.append("    sell_weight_15g = EXCLUDED.sell_weight_15g,")
    sql_lines.append("    sell_transactions = EXCLUDED.sell_transactions,")
    sql_lines.append("    sell_ticket_size_g = EXCLUDED.sell_ticket_size_g,")
    sql_lines.append("    updated_at = now();\n")

    sql_lines.append("-- 3. VERIFICATION QUERIES")
    sql_lines.append("SELECT 'summary_daily_metrics (2025)' AS table_name, count(*) AS total_rows, min(date_id) AS min_date, max(date_id) AS max_date FROM public.summary_daily_metrics WHERE date_id >= '2025-01-01' AND date_id <= '2025-12-31';")
    sql_lines.append("SELECT 'summary_weekly_metrics (2025)' AS table_name, count(*) AS total_rows, min(year_week) AS min_week, max(year_week) AS max_week FROM public.summary_weekly_metrics WHERE year = 2025;\n")

    output_path = 'sql/44_backfill_2025_summary_daily_and_weekly.sql'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))

    print(f"Successfully generated {output_path}!")

if __name__ == '__main__':
    main()
