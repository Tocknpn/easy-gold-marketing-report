#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EASY GOLD - DEDICATED RE-UPLOAD TOOL
Usage:
    python scripts/reupload_single_file.py "C:\path\to\your\file.csv"
    or
    python scripts/reupload_single_file.py "C:\path\to\your\file.xlsx"
"""

import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from upload import (
    parse_excel_file,
    delete_existing_dates_in_supabase,
    upload_batch_to_supabase,
    call_rpc_refresh,
    get_supabase_credentials,
    log, GREEN, RED, CYAN, YELLOW, BOLD
)

def main():
    if len(sys.argv) < 2:
        log("\n[!] Please specify the file path to upload!", RED, bold=True)
        log("Usage: python scripts/reupload_single_file.py \"path/to/your/file.csv\" or .xlsx\n", YELLOW)
        sys.exit(1)

    file_path = os.path.abspath(sys.argv[1].strip('"').strip("'"))
    if not os.path.exists(file_path):
        log(f"\n[!] File not found: {file_path}", RED, bold=True)
        sys.exit(1)

    sb_url, sb_key = get_supabase_credentials()
    if not sb_url or not sb_key:
        log("[!] Supabase credentials not found in .env!", RED, bold=True)
        sys.exit(1)

    log(f"\n{'=' * 65}", CYAN, bold=True)
    log(f"   RE-UPLOADING FILE: {os.path.basename(file_path)}", CYAN, bold=True)
    log(f"{'=' * 65}", CYAN, bold=True)

    # 1. Parse rows
    log(f"[*] Reading and validating '{os.path.basename(file_path)}'...", CYAN)
    try:
        rows, dates = parse_excel_file(file_path)
    except Exception as e:
        log(f"[!] Parsing error: {e}", RED, bold=True)
        sys.exit(1)

    row_count = len(rows)
    dates_str = ", ".join(dates) if dates else "None"
    log(f"[+] Successfully extracted {row_count:,} rows. Dates detected: [{dates_str}]", GREEN, bold=True)

    if not dates:
        log("[!] No valid dates found in file. Aborting.", RED)
        sys.exit(1)

    # 2. Delete existing data for these dates
    log(f"\n[*] Deleting existing Supabase rows for dates: {dates_str}...", YELLOW, bold=True)
    delete_existing_dates_in_supabase(sb_url, sb_key, dates)
    log("[+] Existing old rows deleted cleanly from Supabase.", GREEN)

    # 3. Upload new rows
    log(f"\n[*] Uploading {row_count:,} new rows to Supabase in batches of 250...", CYAN)
    batch_size = 250
    num_batches = (row_count + batch_size - 1) // batch_size

    for b_idx in range(num_batches):
        b_start = b_idx * batch_size
        b_end = min(row_count, b_start + batch_size)
        batch = rows[b_start:b_end]

        ok = upload_batch_to_supabase(sb_url, sb_key, batch)
        if not ok:
            log(f"\n[!] Upload failed at batch {b_idx + 1}/{num_batches}", RED, bold=True)
            sys.exit(1)

        pct = int((b_end / row_count) * 100)
        print(f"\r    Uploading: [{pct:3d}%] {b_end:,}/{row_count:,} rows", end="", flush=True)

    print()
    log("[+] All rows uploaded successfully to public.monthly_data!", GREEN, bold=True)

    # 4. Trigger rollups
    log("\n[*] Triggering summary recalculations...", CYAN)
    sorted_dates = sorted(list(dates))
    call_rpc_refresh(sb_url, sb_key, sorted_dates[0], sorted_dates[-1])

    log(f"\n{'=' * 65}", GREEN, bold=True)
    log("   RE-UPLOAD COMPLETE: DATA & ROLLUPS FULLY SYNCHRONIZED!   ", GREEN, bold=True)
    log(f"{'=' * 65}\n", GREEN, bold=True)

if __name__ == "__main__":
    main()
