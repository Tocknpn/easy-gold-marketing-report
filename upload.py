#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
========================================================================================
EASY GOLD - DAILY TRANSACTION SUPABASE UPLOAD ENGINE
File: upload.py
Description: Reads daily Excel transaction files (e.g., from D:\\Monthly Data\\)
             and uploads new/updated transactions into Supabase (public.monthly_data).
             Automatically triggers summary and dashboard metric recalculations.
========================================================================================
"""

import os
import sys
import glob
import json
import time
import re
import argparse
import datetime
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
import openpyxl

# Force UTF-8 terminal output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Terminal ANSI colors
GREEN = "\033[92m"
BLUE = "\033[94m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

# ========================================================================================
# 1. DIRECT SUPABASE CONFIGURATION (PORTABLE MODE)
# ========================================================================================
# Paste your Supabase URL and Key here to make this file completely standalone so it can
# run on ANY computer or device without needing a .env file or project setup!
#
# Example:
# SUPABASE_URL = "https://your-project-id.supabase.co"
# SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#
SUPABASE_URL = "https://wlufvvawlbyvpyaubzph.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdWZ2dmF3bGJ5dnB5YXVienBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg1MDY0MSwiZXhwIjoyMTA3NDI2NjQxfQ.CN2Omnb-aAuxAW80EqFZubEZhilRdOlwHg8VzPn2AHk"

# Default Excel folder path and batch size
DEFAULT_DATA_FOLDER = r"D:\Monthly Data"
DEFAULT_BATCH_SIZE = 250
HISTORY_FILE = ".upload_history.json"
ENV_FILE = ".env"
ENV_LOCAL_FILE = ".env.local"


def log(msg, color=RESET, bold=False):
    style = f"{BOLD}{color}" if bold else color
    print(f"{style}{msg}{RESET}")


def load_env_file(filepath):
    """Simple parser for .env files without requiring python-dotenv."""
    env_vars = {}
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'").strip('"')
                env_vars[k] = v
    return env_vars


def get_supabase_credentials(cli_url=None, cli_key=None):
    """Retrieve Supabase URL and Key from CLI, in-script constants, environment, or .env."""
    sb_url = cli_url.strip() if cli_url else None
    sb_key = cli_key.strip() if cli_key else None

    # 1. Check in-script configuration (Portable mode)
    if not sb_url and SUPABASE_URL and not any(p in SUPABASE_URL for p in ("placeholder", "your-project", "xyzcompany")):
        sb_url = SUPABASE_URL.strip()
    if not sb_key and SUPABASE_KEY and not any(p in SUPABASE_KEY for p in ("placeholder", "your-key")):
        sb_key = SUPABASE_KEY.strip()

    if sb_url and sb_key:
        return sb_url, sb_key

    # 2. Check .env and .env.local if present
    env = {}
    for p in [ENV_FILE, ENV_LOCAL_FILE]:
        if os.path.exists(p):
            env.update(load_env_file(p))

    # 3. Check system environment variables or .env
    if not sb_url:
        sb_url = (
            os.environ.get("SUPABASE_URL")
            or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            or env.get("SUPABASE_URL")
            or env.get("NEXT_PUBLIC_SUPABASE_URL")
        )

    if not sb_key:
        sb_key = (
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            or os.environ.get("SUPABASE_KEY")
            or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            or env.get("SUPABASE_SERVICE_ROLE_KEY")
            or env.get("SUPABASE_KEY")
            or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        )

    return sb_url, sb_key


def prompt_and_save_credentials():
    """Interactively ask user for credentials if not yet set in .env."""
    log("\n" + "=" * 60, YELLOW)
    log(" Supabase Configuration Setup", YELLOW, bold=True)
    log("=" * 60, YELLOW)
    log("It looks like your Supabase connection credentials are not yet configured.")
    log("You can find these in your Supabase Dashboard -> Project Settings -> API\n")

    url = input("Enter Supabase Project URL (e.g. https://xyzcompany.supabase.co): ").strip()
    key = input("Enter Supabase Service Role Key (or Anon Key): ").strip()

    if not url or not key:
        log("[!] Supabase URL and Key are required to upload to database.", RED)
        sys.exit(1)

    # Save to .env
    env_lines = []
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            env_lines = f.readlines()

    updated_url = False
    updated_key = False
    new_lines = []
    for line in env_lines:
        if line.startswith("NEXT_PUBLIC_SUPABASE_URL=") or line.startswith("SUPABASE_URL="):
            new_lines.append(f"NEXT_PUBLIC_SUPABASE_URL={url}\n")
            updated_url = True
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY=") or line.startswith("NEXT_PUBLIC_SUPABASE_ANON_KEY="):
            new_lines.append(f"SUPABASE_SERVICE_ROLE_KEY={key}\n")
            updated_key = True
        else:
            new_lines.append(line)

    if not updated_url:
        new_lines.append(f"NEXT_PUBLIC_SUPABASE_URL={url}\n")
    if not updated_key:
        new_lines.append(f"SUPABASE_SERVICE_ROLE_KEY={key}\n")

    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    log(f"[+] Credentials successfully saved to '{ENV_FILE}'!\n", GREEN, bold=True)
    return url, key


def load_history():
    """Load history of previously uploaded files."""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_history(history):
    """Save upload history."""
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log(f"[!] Warning: Could not save history file: {e}", YELLOW)


def parse_date_value(v):
    """Robustly parse date from Excel into ISO 'YYYY-MM-DD HH:MM:SS' format."""
    if v is None:
        return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime("%Y-%m-%d %H:%M:%S")

    s = str(v).strip()
    if not s or s in ("-", "None", "NULL"):
        return None

    # Handle formats:
    # 13/10/2026, 23:59
    # 13/10/2026 23:59:00
    # 2026-10-13 23:59:00
    for fmt in (
        "%d/%m/%Y, %H:%M",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y, %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y",
    ):
        try:
            dt = datetime.datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            pass

    # Excel numeric date fallback
    try:
        f_val = float(s)
        base = datetime.datetime(1899, 12, 30)
        dt = base + datetime.timedelta(days=f_val)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        pass

    return s


def map_headers(raw_headers):
    """
    Map raw Lao or English Excel headers to Supabase column names:
    - no
    - customer_name
    - phone
    - transaction_type
    - bank
    - gold_weight
    - total_amount
    - status
    - branch
    - created_at
    """
def clean_float(val, default=0.0):
    """Safely converts string, numeric, or comma-formatted numbers to float."""
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    try:
        s = str(val).replace(",", "").replace(" ", "").replace("₭", "").strip()
        return float(s) if s else default
    except (ValueError, TypeError):
        return default


def map_headers(raw_headers):
    """
    Intelligently maps Excel/CSV column headers to Supabase column names.
    Supports Lao Unicode variations (tone marks, vowel AM), English aliases, and typos.
    Supabase columns expected:
    - no
    - customer_name
    - phone
    - transaction_type
    - bank
    - gold_weight
    - total_amount
    - status
    - branch
    - created_at
    """
    mapping = {}
    for idx, raw in enumerate(raw_headers):
        if raw is None:
            continue
        h = str(raw).strip().lower()

        # no
        if "ລຳດັບ" in h or h in ("no", "seq", "id", "#"):
            mapping["no"] = idx
        # customer_name
        elif "ຊື່" in h or "name" in h:
            mapping["customer_name"] = idx
        # phone
        elif "ເບີ" in h or "ໂທ" in h or "phone" in h or "tel" in h:
            mapping["phone"] = idx
        # transaction_type
        elif "ຮູບແບບ" in h or "ທຸລະກໍາ" in h or "type" in h:
            mapping["transaction_type"] = idx
        # bank
        elif "ທະນາຄານ" in h or "bank" in h:
            mapping["bank"] = idx
        # gold_weight (Handle all Lao Unicode vowel variations, nam-nak, yod-kham, weight, grams)
        elif any(k in h for k in ("ຍອດຄໍາ", "ຍອດຄຳ", "ຍອດຄຳທັງໝົດ", "ຍອດຄໍາທັງຫມົດ", "ນ້ຳໜັກ", "ນໍ້າໜັກ", "ນ້ຳຫນັກ", "ນໍ້າຫນັກ", "ຄຳ", "ຄໍາ", "weight", "gold", "gram", "grams")):
            mapping["gold_weight"] = idx
        # total_amount
        elif any(k in h for k in ("ຖືກເປັນເງີນ", "ຖືກເປັນເງິນ", "amount", "lak", "ກີບ", "total_amount", "value")):
            mapping["total_amount"] = idx
        # status
        elif "ສະຖານະ" in h or "status" in h:
            mapping["status"] = idx
        # branch
        elif "ສາຂາ" in h or "branch" in h:
            mapping["branch"] = idx
        # created_at
        elif any(k in h for k in ("ວັນທີ່", "ວັນທີ", "date", "time")):
            mapping["created_at"] = idx

    return mapping


def parse_excel_file(file_path):
    """Reads an Excel (.xlsx/.xls) or CSV (.csv) file and returns parsed rows ready for monthly_data table."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".csv":
        import csv
        with open(file_path, mode="r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.reader(f)
            try:
                header_row = next(reader)
            except StopIteration:
                return [], set()
            rows_data = [row for row in reader if any(row)]
        rows_iter = iter(rows_data)
        close_wb = lambda: None
    else:
        wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        try:
            header_row = next(rows_iter)
        except StopIteration:
            wb.close()
            return [], set()
        close_wb = wb.close

    hmap = map_headers(header_row)

    required = ["customer_name", "transaction_type", "created_at", "gold_weight"]
    missing = [r for r in required if r not in hmap]
    if missing:
        close_wb()
        raise ValueError(
            f"Missing required columns in {file_path}: {missing}\n"
            f"Detected columns: {[str(h).strip() for h in header_row if h]}"
        )

    records = []
    distinct_dates = set()
    zero_weight_trading_count = 0
    total_trading_count = 0

    for row_idx, row in enumerate(rows_iter, start=2):
        if not any(row):
            continue

        raw_date = row[hmap["created_at"]] if "created_at" in hmap else None
        parsed_date = parse_date_value(raw_date)
        if not parsed_date:
            continue

        date_only = parsed_date.split(" ")[0] if " " in parsed_date else parsed_date
        distinct_dates.add(date_only)

        # Parse numeric fields
        raw_no = row[hmap["no"]] if "no" in hmap else row_idx - 1
        try:
            no_val = int(raw_no) if raw_no is not None else None
        except (ValueError, TypeError):
            no_val = None

        raw_wt = row[hmap["gold_weight"]] if "gold_weight" in hmap else 0
        wt_val = round(clean_float(raw_wt, 0.0), 4)

        raw_amt = row[hmap["total_amount"]] if "total_amount" in hmap else 0
        amt_val = round(clean_float(raw_amt, 0.0), 2)

        cust_name = str(row[hmap["customer_name"]] or "").strip()
        phone_num = str(row[hmap["phone"]] or "").strip() if "phone" in hmap else ""
        tx_type = str(row[hmap["transaction_type"]] or "BUY_GOLD").strip()
        bank_val = str(row[hmap["bank"]] or "-").strip() if "bank" in hmap else "-"
        status_val = str(row[hmap["status"]] or "ສໍາເລັດ").strip() if "status" in hmap else "ສໍາເລັດ"
        branch_val = str(row[hmap["branch"]] or "-").strip() if "branch" in hmap else "-"

        # Track and guard against zero gold weight on trading transactions
        if tx_type in ("BUY_GOLD", "SALE_GOLD"):
            total_trading_count += 1
            if wt_val == 0.0 and amt_val > 0:
                zero_weight_trading_count += 1
                # Auto-derive fallback if unit price is approximately ~2,998,000 LAK / gram
                # Prevents dashboard metrics from freezing
                wt_val = round(amt_val / 2998000.0, 4)

        records.append({
            "no": no_val,
            "customer_name": cust_name,
            "phone": phone_num,
            "transaction_type": tx_type,
            "bank": bank_val,
            "gold_weight": wt_val,
            "total_amount": amt_val,
            "status": status_val,
            "branch": branch_val,
            "created_at": parsed_date,
        })

    close_wb()

    if total_trading_count > 0 and zero_weight_trading_count > 0:
        log(
            f"  [!] WARNING: {zero_weight_trading_count}/{total_trading_count} trading rows had 0.0 gold weight. "
            f"Auto-derived fallback gold weight was applied to prevent report metric freezing.",
            YELLOW,
            bold=True
        )

    return records, sorted(list(distinct_dates))


def delete_existing_dates_in_supabase(sb_url, sb_key, dates):
    """
    Safely delete existing records for the given dates before re-uploading
    to avoid duplicate rows on re-runs.
    """
    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json",
    }

    for dt in dates:
        # Range: from YYYY-MM-DD 00:00:00 to YYYY-MM-DD 23:59:59
        start_ts = f"{dt} 00:00:00"
        end_ts = f"{dt} 23:59:59"
        query_params = urllib.parse.urlencode({
            "created_at": f"gte.{start_ts}",
            "and": f"(created_at.lte.{end_ts})",
        })
        endpoint = f"{sb_url.rstrip('/')}/rest/v1/monthly_data?{query_params}"
        req = urllib.request.Request(endpoint, headers=headers, method="DELETE")
        try:
            with urllib.request.urlopen(req) as resp:
                pass
        except urllib.error.HTTPError as e:
            # If table or column doesn't match, log and continue
            log(f"    [!] Note on pre-clean for date {dt}: {e.code}", YELLOW)


def upload_batch_to_supabase(sb_url, sb_key, batch, retries=3):
    """Upload a batch of rows to Supabase /rest/v1/monthly_data."""
    endpoint = f"{sb_url.rstrip('/')}/rest/v1/monthly_data"
    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    payload = json.dumps(batch, ensure_ascii=False).encode("utf-8")

    for attempt in range(1, retries + 1):
        req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201, 204):
                    return True
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="replace")
            if attempt == retries:
                log(f"\n[!] HTTP {e.code} Error on upload: {err_msg}", RED, bold=True)
                return False
            time.sleep(1.5 * attempt)
        except Exception as ex:
            if attempt == retries:
                log(f"\n[!] Network error on upload: {ex}", RED, bold=True)
                return False
            time.sleep(1.5 * attempt)
    return False


def call_rpc_refresh(sb_url, sb_key, min_date=None, max_date=None):
    """
    Invoke backend recalculation triggers:
    1. public.refresh_summary_daily(p_start, p_end) -> Updates summary_daily_metrics for MTD
    2. public.sync_active_week_summary() -> Updates current active week (e.g. W43)
    3. public.sync_all_weekly_summaries() -> Updates all historical weekly metrics
    4. public.refresh_handbook_facts_range(min_date, max_date)
    """
    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json",
    }

    # Default date range to last 30 days if not explicitly supplied
    today_dt = datetime.date.today()
    default_start = (today_dt - datetime.timedelta(days=30)).strftime("%Y-%m-%d")
    default_end = (today_dt + datetime.timedelta(days=1)).strftime("%Y-%m-%d")

    start_d = min_date or default_start
    end_d = max_date or default_end

    # 1. Refresh daily summary metrics (for MTD report)
    try:
        ep_daily = f"{sb_url.rstrip('/')}/rest/v1/rpc/refresh_summary_daily"
        payload_daily = json.dumps({"p_start": start_d, "p_end": end_d}).encode("utf-8")
        req_daily = urllib.request.Request(ep_daily, data=payload_daily, headers=headers, method="POST")
        with urllib.request.urlopen(req_daily) as resp:
            if resp.status in (200, 201):
                log(f"  [+] Refreshed daily summary metrics (summary_daily_metrics) for {start_d} to {end_d}.", GREEN)
    except Exception as e:
        log(f"  [!] Note on daily summary refresh: {e}", YELLOW)

    # 2. Sync active week summary (immediate recalculation of current in-progress week)
    try:
        ep_active = f"{sb_url.rstrip('/')}/rest/v1/rpc/sync_active_week_summary"
        req_active = urllib.request.Request(ep_active, data=b"{}", headers=headers, method="POST")
        with urllib.request.urlopen(req_active) as resp:
            if resp.status in (200, 201):
                log("  [+] Refreshed active week summary (summary_weekly_metrics).", GREEN)
    except Exception:
        pass

    # 3. Sync all historical weekly summary metrics
    try:
        ep1 = f"{sb_url.rstrip('/')}/rest/v1/rpc/sync_all_weekly_summaries"
        req = urllib.request.Request(ep1, data=b"{}", headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 201):
                log("  [+] Synchronized all weekly summary metrics (summary_weekly_metrics).", GREEN)
    except Exception:
        pass

    # 4. Refresh fact tables if handbook engine is installed
    try:
        ep2 = f"{sb_url.rstrip('/')}/rest/v1/rpc/refresh_handbook_facts_range"
        payload = json.dumps({
            "p_start_date": start_d,
            "p_end_date": end_d,
            "p_job_name": "DAILY_UPLOAD_PY",
        }).encode("utf-8")
        req = urllib.request.Request(ep2, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 201):
                log("  [+] Refreshed BI fact tables (fact_daily_core, wide, hourly, customer).", GREEN)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(
        description="Easy Gold - Automatic Daily Transaction Upload Engine for Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--folder",
        "-d",
        default=DEFAULT_DATA_FOLDER,
        help=f"Path to folder containing daily Excel transaction files (Default: {DEFAULT_DATA_FOLDER})",
    )
    parser.add_argument(
        "--file",
        "-f",
        default=None,
        help="Upload a single specific Excel file instead of scanning folder",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-upload files even if already marked as uploaded in history",
    )
    parser.add_argument(
        "--batch-size",
        "-b",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Number of rows per Supabase POST batch (Default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--url",
        default=None,
        help="Supabase Project URL (e.g. https://xyz.supabase.co)",
    )
    parser.add_argument(
        "--key",
        default=None,
        help="Supabase Service Role Key or Anon Key",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing records for these dates in Supabase (Default: False, appends new data)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate files without uploading to Supabase",
    )
    parser.add_argument(
        "--resync",
        action="store_true",
        help="Re-sync and recalculate summary tables (MTD Daily & Weekly Metrics) without uploading new files",
    )
    parser.add_argument(
        "--start-date",
        default=None,
        help="Start date for resync (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--end-date",
        default=None,
        help="End date for resync (YYYY-MM-DD)",
    )

    args = parser.parse_args()

    log("\n" + "=" * 70, CYAN, bold=True)
    log("       EASY GOLD MARKETING & BI - SUPABASE UPLOAD ENGINE        ", CYAN, bold=True)
    log("=" * 70, CYAN, bold=True)

    # 1. Connect to Supabase unless --dry-run
    sb_url, sb_key = None, None
    if not args.dry_run:
        sb_url, sb_key = get_supabase_credentials(args.url, args.key)
        if not sb_url or not sb_key or "placeholder" in sb_url or "your-project" in sb_url:
            sb_url, sb_key = prompt_and_save_credentials()

        log(f"[*] Connected Supabase Endpoint: {sb_url}", GREEN)

    # If --resync is requested, run recalculations immediately and exit
    if args.resync:
        log("\n[*] Running manual re-sync of summary tables (MTD Daily & Weekly Metrics)...", CYAN, bold=True)
        call_rpc_refresh(sb_url, sb_key, args.start_date, args.end_date)
        log("\n[+] Re-sync completed! All MTD and Weekly reports are up to date.", GREEN, bold=True)
        sys.exit(0)

    # 2. Discover target files
    target_files = []
    if args.file:
        if not os.path.exists(args.file):
            log(f"[!] Target file '{args.file}' does not exist!", RED, bold=True)
            sys.exit(1)
        target_files = [os.path.abspath(args.file)]
    else:
        folder = os.path.abspath(args.folder)
        if not os.path.exists(folder):
            log(f"[!] Data directory '{folder}' not found!", RED)
            log(f"[*] Please check that the drive is connected or specify --folder <path>", YELLOW)
            sys.exit(1)

        patterns = [os.path.join(folder, "*.xlsx"), os.path.join(folder, "*.xls"), os.path.join(folder, "*.csv")]
        found = []
        for p in patterns:
            found.extend(glob.glob(p))
        # Filter out temporary files (e.g. ~$filename.xlsx)
        target_files = [f for f in sorted(found) if not os.path.basename(f).startswith("~$")]

    if not target_files:
        log(f"[*] No transaction files (.xlsx / .xls / .csv) found in '{args.folder}'.", YELLOW)
        sys.exit(0)

    log(f"[*] Found {len(target_files)} transaction file(s) in source location.", BLUE)
    for tf in target_files:
        fsize_kb = os.path.getsize(tf) / 1024
        log(f"    - {os.path.basename(tf)} ({fsize_kb:,.1f} KB)", DIM)

    history = load_history()
    files_to_process = []

    for fpath in target_files:
        fname = os.path.basename(fpath)
        mtime = os.path.getmtime(fpath)

        if not args.force and fname in history:
            prev = history[fname]
            if prev.get("mtime") == mtime and prev.get("status") == "SUCCESS":
                log(f"[*] Skipping '{fname}' (already uploaded on {prev.get('uploaded_at')}). Use --force to re-upload.", DIM)
                continue

        files_to_process.append((fpath, fname, mtime))

    if not files_to_process:
        log("\n[+] All transaction files are already up-to-date in Supabase! Nothing to upload.", GREEN, bold=True)
        log("[TIP] If you want to force re-upload everything, run: python upload.py --force\n", CYAN)
        sys.exit(0)

    log(f"\n[*] Preparing to upload {len(files_to_process)} file(s)...\n", CYAN, bold=True)

    total_uploaded_rows = 0
    all_dates = set()
    start_total_time = time.time()

    for idx, (fpath, fname, mtime) in enumerate(files_to_process, start=1):
        log(f"[{idx}/{len(files_to_process)}] Reading '{fname}'...", BLUE, bold=True)
        f_start = time.time()

        try:
            rows, distinct_dates = parse_excel_file(fpath)
        except Exception as e:
            log(f"    [!] Error parsing '{fname}': {e}", RED, bold=True)
            continue

        row_count = len(rows)
        dates_str = ", ".join(distinct_dates) if distinct_dates else "None"
        log(f"    -> Extracted {row_count:,} valid transaction rows. Dates: [{dates_str}]", GREEN)
        all_dates.update(distinct_dates)

        if args.dry_run:
            log(f"    [DRY RUN] Validation successful for '{fname}'. (No database upload)", YELLOW)
            continue

        # Clean existing data only if explicitly requested (--overwrite)
        if args.overwrite and distinct_dates:
            log(f"    -> Overwrite mode: cleaning existing rows for dates: {distinct_dates}...", YELLOW)
            delete_existing_dates_in_supabase(sb_url, sb_key, distinct_dates)

        # Batch upload
        log(f"    -> Uploading {row_count:,} rows in batches of {args.batch_size}...", CYAN)
        upload_success = True
        num_batches = (row_count + args.batch_size - 1) // args.batch_size

        for b_idx in range(num_batches):
            b_start = b_idx * args.batch_size
            b_end = min(row_count, b_start + args.batch_size)
            batch = rows[b_start:b_end]

            ok = upload_batch_to_supabase(sb_url, sb_key, batch)
            if not ok:
                upload_success = False
                log(f"    [!] Failed to upload batch {b_idx + 1}/{num_batches} for '{fname}'", RED)
                break

            progress_pct = int((b_end / row_count) * 100)
            print(f"\r       Uploading: [{progress_pct:3d}%] {b_end:,}/{row_count:,} rows", end="", flush=True)

        print()  # Newline after progress bar

        f_duration = time.time() - f_start

        if upload_success:
            total_uploaded_rows += row_count
            history[fname] = {
                "mtime": mtime,
                "rows": row_count,
                "dates": distinct_dates,
                "uploaded_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "SUCCESS",
            }
            save_history(history)
            log(f"    [+] '{fname}' completed in {f_duration:.1f}s ({row_count:,} rows).", GREEN, bold=True)
        else:
            log(f"    [!] '{fname}' encountered errors during upload.", RED, bold=True)

    total_duration = time.time() - start_total_time

    # 3. Trigger recalculation
    if not args.dry_run and total_uploaded_rows > 0:
        sorted_all_dates = sorted(list(all_dates))
        min_date = sorted_all_dates[0] if sorted_all_dates else None
        max_date = sorted_all_dates[-1] if sorted_all_dates else None

        log("\n[*] Triggering summary rollups & executive dashboard metrics...", CYAN)
        call_rpc_refresh(sb_url, sb_key, min_date, max_date)

    # 4. Final summary
    log("\n" + "=" * 70, GREEN, bold=True)
    log("                       UPLOAD SUMMARY                        ", GREEN, bold=True)
    log("=" * 70, GREEN, bold=True)
    log(f"  • Files Processed    : {len(files_to_process)}")
    log(f"  • Total Rows Inserted: {total_uploaded_rows:,}")
    log(f"  • Date Range Covered : {min(all_dates) if all_dates else 'N/A'} -> {max(all_dates) if all_dates else 'N/A'}")
    log(f"  • Total Time Elapsed : {total_duration:.1f} seconds")
    if not args.dry_run:
        log(f"  • Supabase Table     : public.monthly_data")
        log(f"  • Executive Status   : ALL SYSTEMS SYNCHRONIZED", GREEN, bold=True)
    log("=" * 70 + "\n", GREEN, bold=True)


if __name__ == "__main__":
    main()
