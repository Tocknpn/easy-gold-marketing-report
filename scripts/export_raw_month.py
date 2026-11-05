#!/usr/bin/env python3
"""
Back up raw monthly_data rows to local gzip CSV files, one file per month.
READ-ONLY on the database: it never changes or deletes anything.

Usage:
    python scripts/export_raw_month.py 2026-04 2026-05 2026-06
    python scripts/export_raw_month.py --count-only 2026-04

Writes to archive/ (ignored by git):
    raw_YYYY-MM.csv.gz       every column of every row in that month
    manifest_YYYY-MM.json    rows, gold and amount totals per day, plus a SHA-256

The files hold customer names and phone numbers. Keep them private.
"""
import argparse
import calendar
import csv
import datetime
import decimal
import gzip
import hashlib
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARCHIVE_DIR = ROOT / "archive"
PAGE_SIZE = 1000
RETRIES = 5


def load_credentials():
    """Read only the two values needed from .env, and never print them."""
    wanted = {"NEXT_PUBLIC_SUPABASE_URL": None, "SUPABASE_SERVICE_ROLE_KEY": None}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        match = re.match(r"^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=(.*)$", line.strip())
        if match:
            wanted[match[1]] = match[2].strip().strip("\"'")
    if not all(wanted.values()):
        sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    return wanted["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"), wanted["SUPABASE_SERVICE_ROLE_KEY"]


def request(url, key, extra_headers=None):
    """GET with retries on timeouts and server errors. Returns (body, headers)."""
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    headers.update(extra_headers or {})
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=90) as resp:
                return resp.read(), resp.headers
        except urllib.error.HTTPError as err:
            if err.code < 500 or attempt == RETRIES:
                sys.exit(f"HTTP {err.code}: {err.read().decode(errors='replace')[:300]}")
        except (urllib.error.URLError, TimeoutError) as err:
            if attempt == RETRIES:
                sys.exit(f"Network error: {err}")
        time.sleep(2 ** attempt)
    raise AssertionError("unreachable")


def day_filter(day):
    next_day = day + datetime.timedelta(days=1)
    return f"created_at=gte.{day.isoformat()}&created_at=lt.{next_day.isoformat()}"


def count_day(base, key, day):
    url = f"{base}/rest/v1/monthly_data?select=id&{day_filter(day)}&limit=1"
    _, headers = request(url, key, {"Prefer": "count=exact"})
    total = (headers.get("content-range") or "").split("/")[-1]
    if not total.isdigit():
        sys.exit(f"Could not read the row count for {day}: {headers.get('content-range')}")
    return int(total)


def fetch_day(base, key, day):
    """Yield every row of one day, paging by id so no row is skipped or repeated."""
    last_id = None
    while True:
        url = f"{base}/rest/v1/monthly_data?select=*&{day_filter(day)}&order=id.asc&limit={PAGE_SIZE}"
        if last_id is not None:
            url += "&id=gt." + urllib.parse.quote(str(last_id))
        body, _ = request(url, key)
        rows = json.loads(body, parse_float=decimal.Decimal)
        if not rows:
            return
        yield from rows
        last_id = rows[-1]["id"]
        if len(rows) < PAGE_SIZE:
            return


def month_days(month):
    year, mon = map(int, month.split("-"))
    return [datetime.date(year, mon, d) for d in range(1, calendar.monthrange(year, mon)[1] + 1)]


def export_month(base, key, month):
    ARCHIVE_DIR.mkdir(exist_ok=True)
    target = ARCHIVE_DIR / f"raw_{month}.csv.gz"
    partial = ARCHIVE_DIR / f"raw_{month}.csv.gz.partial"
    days = {}
    writer = None

    with gzip.open(partial, "wt", encoding="utf-8", newline="") as handle:
        for day in month_days(month):
            expected = count_day(base, key, day)
            rows = 0
            gold, amount = decimal.Decimal(0), decimal.Decimal(0)
            for row in fetch_day(base, key, day):
                if writer is None:
                    writer = csv.DictWriter(handle, fieldnames=list(row.keys()))
                    writer.writeheader()
                writer.writerow(row)
                rows += 1
                gold += decimal.Decimal(str(row.get("gold_weight") or 0))
                amount += decimal.Decimal(str(row.get("total_amount") or 0))
            if rows != expected:
                sys.exit(f"STOP: {day} wrote {rows} rows but the database has {expected}. This month is not complete.")
            days[day.isoformat()] = {"rows": rows, "gold_weight": str(gold), "total_amount": str(amount)}
            print(f"  {day}  {rows:>7,} rows", flush=True)

    # Re-read the finished file to prove it opens and holds every row.
    with gzip.open(partial, "rt", encoding="utf-8", newline="") as handle:
        reread = sum(1 for _ in csv.DictReader(handle))
    total = sum(d["rows"] for d in days.values())
    if reread != total:
        sys.exit(f"STOP: file re-read found {reread} rows, expected {total}.")

    partial.replace(target)
    manifest = {
        "month": month,
        "rows": total,
        "gold_weight": str(sum(decimal.Decimal(d["gold_weight"]) for d in days.values())),
        "total_amount": str(sum(decimal.Decimal(d["total_amount"]) for d in days.values())),
        "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "days": days,
    }
    (ARCHIVE_DIR / f"manifest_{month}.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    size_mb = target.stat().st_size / 1048576
    print(f"OK {month}: {total:,} rows, gold {manifest['gold_weight']}, amount {manifest['total_amount']}, file {size_mb:.1f}MB")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("months", nargs="+", help="Months as YYYY-MM")
    parser.add_argument("--count-only", action="store_true", help="Only print per-day row counts. Writes no files.")
    args = parser.parse_args()

    for month in args.months:
        if not re.fullmatch(r"\d{4}-\d{2}", month):
            sys.exit(f"Bad month '{month}'. Use YYYY-MM.")

    base, key = load_credentials()
    for month in args.months:
        print(f"== {month}", flush=True)
        if args.count_only:
            total = 0
            for day in month_days(month):
                count = count_day(base, key, day)
                total += count
                print(f"  {day}  {count:>7,} rows", flush=True)
            print(f"TOTAL {month}: {total:,} rows")
        else:
            export_month(base, key, month)


if __name__ == "__main__":
    main()
