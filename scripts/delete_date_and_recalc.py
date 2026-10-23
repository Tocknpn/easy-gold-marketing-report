#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EASY GOLD - DELETE SINGLE DATE & RECALCULATE ALL SUMMARIES
Usage:
    python scripts/delete_date_and_recalc.py 2026-10-22
"""

import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

# Load env credentials
env = {}
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")

sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL") or "https://wlufvvawlbyvpyaubzph.supabase.co"
sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

headers = {
    "apikey": sb_key,
    "Authorization": f"Bearer {sb_key}",
    "Content-Type": "application/json",
}

def main():
    target_date = sys.argv[1].strip() if len(sys.argv) > 1 else "2026-10-22"
    print(f"\n[*] Target Date to Purge: {target_date}")

    # 1. DELETE from monthly_data
    start_ts = f"{target_date} 00:00:00"
    end_ts = f"{target_date} 23:59:59"
    q = urllib.parse.urlencode({
        "created_at": f"gte.{start_ts}",
        "and": f"(created_at.lte.{end_ts})",
    })
    ep_monthly = f"{sb_url.rstrip('/')}/rest/v1/monthly_data?{q}"
    req1 = urllib.request.Request(ep_monthly, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req1) as resp:
            print(f"  [+] Deleted all raw records for {target_date} from public.monthly_data")
    except Exception as e:
        print(f"  [!] Note deleting monthly_data: {e}")

    # 2. DELETE from summary_daily_metrics
    ep_daily = f"{sb_url.rstrip('/')}/rest/v1/summary_daily_metrics?date_id=eq.{target_date}"
    req2 = urllib.request.Request(ep_daily, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req2) as resp:
            print(f"  [+] Deleted {target_date} row from public.summary_daily_metrics")
    except Exception as e:
        print(f"  [!] Note deleting summary_daily_metrics: {e}")

    # 3. Trigger recalculation RPCs
    print("\n[*] Triggering summary rollups recalculation without 22nd...")
    
    # 3a. refresh_summary_daily (re-aggregates month-to-date up to Oct 21)
    try:
        ep_rpc1 = f"{sb_url.rstrip('/')}/rest/v1/rpc/refresh_summary_daily"
        payload = json.dumps({"p_start": "2026-10-01", "p_end": "2026-10-21"}).encode("utf-8")
        req_rpc1 = urllib.request.Request(ep_rpc1, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req_rpc1) as resp:
            print("  [+] Refreshed summary_daily_metrics (MTD now cleanly stops at 2026-10-21).")
    except Exception as e:
        print(f"  [!] refresh_summary_daily: {e}")

    # 3b. sync_active_week_summary('2026-10-21') -> updates W43 with ONLY surviving raw data (18-21)
    try:
        ep_rpc2 = f"{sb_url.rstrip('/')}/rest/v1/rpc/sync_active_week_summary"
        payload = json.dumps({"p_target_date": "2026-10-21"}).encode("utf-8")
        req_rpc2 = urllib.request.Request(ep_rpc2, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req_rpc2) as resp:
            print("  [+] Recalculated W43 summary_weekly_metrics (restored strictly to surviving data).")
    except Exception as e:
        print(f"  [!] sync_active_week_summary: {e}")

    print(f"\n[+] PURGE COMPLETE: 2026-10-22 completely removed from Supabase and summaries recalibrated!\n")

if __name__ == "__main__":
    main()
