#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Easy Gold - Fix Oct 22 Gold Weights & Recalculate Dashboard Rollups
"""

import sys
import time
import json
import urllib.request
from supabase import create_client

SUPABASE_URL = "https://wlufvvawlbyvpyaubzph.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdWZ2dmF3bGJ5dnB5YXVienBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg1MDY0MSwiZXhwIjoyMTA3NDI2NjQxfQ.CN2Omnb-aAuxAW80EqFZubEZhilRdOlwHg8VzPn2AHk"

GOLD_PRICE_PER_GRAM_OCT22 = 2998000.0  # 44,970,000 LAK per 15g Baht
BAHT_PRICE_OCT22 = 44970000.0

def calculate_weight(row):
    ttype = str(row.get('transaction_type') or '').strip().upper()
    amt = float(row.get('total_amount') or 0)
    current_wt = float(row.get('gold_weight') or 0)

    if current_wt > 0:
        return current_wt

    if ttype in ('BUY_GOLD', 'SALE_GOLD'):
        if amt > 0:
            return round(amt / GOLD_PRICE_PER_GRAM_OCT22, 4)
        return 0.0

    if ttype in ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW'):
        if amt > 0:
            if amt < 4000000:
                return round(amt / GOLD_PRICE_PER_GRAM_OCT22, 4)
            # Standard physical gold increments (1/16 Baht = 0.9375g increments)
            baht = round(amt / BAHT_PRICE_OCT22 * 16) / 16.0
            return round(baht * 15.0, 4)
        return 0.0

    return 0.0

def main():
    print("[*] Connecting to Supabase...")
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("[*] Fetching all monthly_data records for 2026-10-22...")
    all_rows = []
    page_size = 1000
    offset = 0

    while True:
        res = (
            sb.table('monthly_data')
            .select('*')
            .gte('created_at', '2026-10-22 00:00:00')
            .lte('created_at', '2026-10-22 23:59:59')
            .order('id', desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = res.data or []
        if not batch:
            break
        all_rows.extend(batch)
        offset += len(batch)
        print(f"    Loaded {len(all_rows):,} rows so far...")
        if len(batch) < page_size:
            break

    total_rows = len(all_rows)
    print(f"\n[+] Total rows loaded for 2026-10-22: {total_rows:,}")

    # Process and calculate gold weights
    to_update = []
    buy_g = 0.0
    sell_g = 0.0
    withdraw_g = 0.0
    buy_tx = 0
    sell_tx = 0
    withdraw_tx = 0

    for r in all_rows:
        new_wt = calculate_weight(r)
        if new_wt != float(r.get('gold_weight') or 0):
            r['gold_weight'] = new_wt
            to_update.append(r)

        ttype = str(r.get('transaction_type') or '').strip().upper()
        if ttype == 'BUY_GOLD':
            buy_g += new_wt
            buy_tx += 1
        elif ttype == 'SALE_GOLD':
            sell_g += new_wt
            sell_tx += 1
        elif ttype in ('WITHDRAW_GOLD', 'MARKETHUB_WITHDRAW'):
            withdraw_g += new_wt
            withdraw_tx += 1

    print(f"[*] Rows needing gold_weight update: {len(to_update):,}")
    print(f"    • Buy Gold Weight       : {buy_g:,.2f} g ({buy_g/15.0:,.2f} Baht) across {buy_tx:,} tx")
    print(f"    • Sell Gold Weight      : {sell_g:,.2f} g ({sell_g/15.0:,.2f} Baht) across {sell_tx:,} tx")
    print(f"    • Withdraw Gold Weight  : {withdraw_g:,.2f} g ({withdraw_g/15.0:,.2f} Baht) across {withdraw_tx:,} tx")

    # Upsert in batches of 500
    batch_size = 500
    print(f"\n[*] Upserting updated rows in batches of {batch_size}...")
    for i in range(0, len(to_update), batch_size):
        chunk = to_update[i : i + batch_size]
        sb.table('monthly_data').upsert(chunk).execute()
        pct = int(min(len(to_update), i + batch_size) / len(to_update) * 100)
        print(f"\r    Progress: [{pct:3d}%] {min(len(to_update), i + batch_size):,}/{len(to_update):,} rows updated", end="", flush=True)
        time.sleep(0.05)

    print("\n[+] monthly_data updated successfully!")

    # Trigger rollups
    print("\n[*] Triggering summary rollup functions...")
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    # 1. refresh_summary_daily
    try:
        url = f"{SUPABASE_URL}/rest/v1/rpc/refresh_summary_daily"
        payload = json.dumps({'p_start': '2026-10-18', 'p_end': '2026-10-24'}).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
        with urllib.request.urlopen(req) as resp:
            print("    [+] refresh_summary_daily completed:", resp.read().decode())
    except Exception as e:
        print("    [!] refresh_summary_daily:", e)

    # 2. sync_active_week_summary
    try:
        url = f"{SUPABASE_URL}/rest/v1/rpc/sync_active_week_summary"
        payload = json.dumps({'p_as_of': '2026-10-22'}).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
        with urllib.request.urlopen(req) as resp:
            print("    [+] sync_active_week_summary completed:", resp.read().decode())
    except Exception as e:
        print("    [!] sync_active_week_summary:", e)

    # 3. sync_all_weekly_summaries
    try:
        url = f"{SUPABASE_URL}/rest/v1/rpc/sync_all_weekly_summaries"
        req = urllib.request.Request(url, data=b'{}', headers=headers, method='POST')
        with urllib.request.urlopen(req) as resp:
            print("    [+] sync_all_weekly_summaries completed:", resp.read().decode())
    except Exception as e:
        print("    [!] sync_all_weekly_summaries:", e)

    print("\n[+] ALL ROLLUPS SYNCHRONIZED SUCCESSFULLY!")

if __name__ == '__main__':
    main()
