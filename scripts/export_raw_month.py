#!/usr/bin/env python3
"""
Back up raw monthly_data rows to local gzip CSV files, one file per month.
READ-ONLY on the database: it never changes or deletes anything.

Usage:
    python scripts/export_raw_month.py 2026-04 2026-05 2026-06
    python scripts/export_raw_month.py --count-only 2026-04

Safe to stop and run again: finished days are kept in archive/parts/ and are
skipped next time, as long as the database row count for that day still matches.

Writes to archive/ (ignored by git):
    raw_YYYY-MM.csv.gz       every column of every row in that month
    manifest_YYYY-MM.json    rows, gold and amount totals per day, plus a SHA-256

In the CSV, \\N means a database NULL, so NULL and an empty value stay different.
The files hold customer names and phone numbers. Keep them private.
"""
import argparse
import calendar
import concurrent.futures
import csv
import datetime
import decimal
import gzip
import hashlib
import http.client
import json
import pathlib
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARCHIVE_DIR = ROOT / "archive"
PARTS_DIR = ARCHIVE_DIR / "parts"
PAGE_SIZE = 1000
RETRIES = 8
WORKERS = 3
NULL_MARKER = "\\N"
PRINT_LOCK = threading.Lock()


class ExportError(Exception):
    """Stops the export. Finished days stay on disk for the next run."""


def say(message):
    with PRINT_LOCK:
        print(message, flush=True)


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
    """GET with retries on timeouts, dropped connections and server errors."""
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Accept-Encoding": "gzip"}
    headers.update(extra_headers or {})
    last_error = None
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=90) as resp:
                body = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    body = gzip.decompress(body)
                return body, resp.headers
        except urllib.error.HTTPError as err:
            error_body = err.read()
            if err.headers.get("Content-Encoding") == "gzip":
                error_body = gzip.decompress(error_body)
            last_error = f"HTTP {err.code}: {error_body.decode(errors='replace')[:300]}"
            if err.code < 500:
                raise ExportError(last_error)
        except (OSError, http.client.HTTPException, EOFError) as err:
            last_error = str(err)
        if attempt < RETRIES:
            time.sleep(min(30, 2 ** attempt))
    raise ExportError(f"Gave up after {RETRIES} tries: {last_error}")


def day_filter(day):
    next_day = day + datetime.timedelta(days=1)
    return f"created_at=gte.{day.isoformat()}&created_at=lt.{next_day.isoformat()}"


def count_day(base, key, day):
    url = f"{base}/rest/v1/monthly_data?select=id&{day_filter(day)}&limit=1"
    _, headers = request(url, key, {"Prefer": "count=exact"})
    total = (headers.get("content-range") or "").split("/")[-1]
    if not total.isdigit():
        raise ExportError(f"Could not read the row count for {day}: {headers.get('content-range')}")
    return int(total)


def fetch_day(base, key, day):
    """Yield every row of one day. Sorting by created_at uses the date index, which stays fast."""
    offset = 0
    while True:
        url = (
            f"{base}/rest/v1/monthly_data?select=*&{day_filter(day)}"
            f"&order=created_at.asc,id.asc&limit={PAGE_SIZE}&offset={offset}"
        )
        body, _ = request(url, key)
        rows = json.loads(body, parse_float=decimal.Decimal)
        yield from rows
        if len(rows) < PAGE_SIZE:
            return
        offset += len(rows)


def month_days(month):
    year, mon = map(int, month.split("-"))
    return [datetime.date(year, mon, d) for d in range(1, calendar.monthrange(year, mon)[1] + 1)]


def part_paths(day):
    return PARTS_DIR / f"{day.isoformat()}.csv.gz", PARTS_DIR / f"{day.isoformat()}.json"


def export_day(base, key, day):
    """Write one finished day to archive/parts, or reuse it if it is still valid."""
    part, info_path = part_paths(day)
    expected = count_day(base, key, day)

    if part.exists() and info_path.exists():
        info = json.loads(info_path.read_text(encoding="utf-8"))
        if info["rows"] == expected:
            say(f"  {day}  {expected:>7,} rows  (already saved)")
            return info

    temp = part.with_name(part.name + ".tmp")
    rows = 0
    gold, amount = decimal.Decimal(0), decimal.Decimal(0)
    columns = None
    seen_ids = set()
    with gzip.open(temp, "wt", encoding="utf-8", newline="") as handle:
        writer = None
        for row in fetch_day(base, key, day):
            if writer is None:
                columns = list(row.keys())
                writer = csv.DictWriter(handle, fieldnames=columns)
                writer.writeheader()
            writer.writerow({c: (NULL_MARKER if row[c] is None else row[c]) for c in columns})
            seen_ids.add(row["id"])
            rows += 1
            gold += decimal.Decimal(str(row.get("gold_weight") or 0))
            amount += decimal.Decimal(str(row.get("total_amount") or 0))
            if rows % 5000 == 0:
                say(f"  {day}  ... {rows:,} of {expected:,}")

    if rows != expected or len(seen_ids) != expected:
        temp.unlink()
        raise ExportError(f"{day} returned {rows} rows, {len(seen_ids)} unique, but the database has {expected}.")

    info = {"rows": rows, "gold_weight": str(gold), "total_amount": str(amount), "columns": columns}
    temp.replace(part)
    info_path.write_text(json.dumps(info), encoding="utf-8")
    say(f"  {day}  {rows:>7,} rows  saved")
    return info


def build_month_file(month, days_info):
    """Join the day parts into one month file, then re-read it to prove it is complete."""
    target = ARCHIVE_DIR / f"raw_{month}.csv.gz"
    temp = ARCHIVE_DIR / f"raw_{month}.csv.gz.tmp"
    columns = next(i["columns"] for i in days_info.values() if i["columns"])

    with gzip.open(temp, "wt", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(columns)
        for day_text, info in days_info.items():
            if info["rows"] == 0:
                continue
            if info["columns"] != columns:
                raise ExportError(f"{day_text} has different columns from the rest of {month}.")
            part, _ = part_paths(datetime.date.fromisoformat(day_text))
            with gzip.open(part, "rt", encoding="utf-8", newline="") as source:
                reader = csv.reader(source)
                next(reader)
                writer.writerows(reader)

    total = sum(i["rows"] for i in days_info.values())
    with gzip.open(temp, "rt", encoding="utf-8", newline="") as check:
        reread = sum(1 for _ in csv.DictReader(check))
    if reread != total:
        temp.unlink()
        raise ExportError(f"{month} file re-read found {reread} rows, expected {total}.")

    temp.replace(target)
    return target, total


def export_month(base, key, month):
    PARTS_DIR.mkdir(parents=True, exist_ok=True)
    stale = ARCHIVE_DIR / f"raw_{month}.csv.gz.partial"  # left by the first version of this script
    stale.unlink(missing_ok=True)

    days = month_days(month)
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = list(pool.map(lambda d: export_day(base, key, d), days))
    days_info = {d.isoformat(): info for d, info in zip(days, results)}

    target, total = build_month_file(month, days_info)
    manifest = {
        "month": month,
        "rows": total,
        "gold_weight": str(sum(decimal.Decimal(i["gold_weight"]) for i in days_info.values())),
        "total_amount": str(sum(decimal.Decimal(i["total_amount"]) for i in days_info.values())),
        "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "days": {
            d: {"rows": i["rows"], "gold_weight": i["gold_weight"], "total_amount": i["total_amount"]}
            for d, i in days_info.items()
        },
    }
    (ARCHIVE_DIR / f"manifest_{month}.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    size_mb = target.stat().st_size / 1048576
    say(f"OK {month}: {total:,} rows, gold {manifest['gold_weight']}, amount {manifest['total_amount']}, file {size_mb:.1f}MB")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("months", nargs="+", help="Months as YYYY-MM")
    parser.add_argument("--count-only", action="store_true", help="Only print per-day row counts. Writes no files.")
    args = parser.parse_args()

    for month in args.months:
        if not re.fullmatch(r"\d{4}-\d{2}", month):
            sys.exit(f"Bad month '{month}'. Use YYYY-MM.")

    base, key = load_credentials()
    try:
        for month in args.months:
            say(f"== {month}")
            if args.count_only:
                total = 0
                for day in month_days(month):
                    count = count_day(base, key, day)
                    total += count
                    say(f"  {day}  {count:>7,} rows")
                say(f"TOTAL {month}: {total:,} rows")
            else:
                export_month(base, key, month)
    except ExportError as err:
        sys.exit(f"STOP: {err}\nFinished days are saved. Run the same command again to continue.")


if __name__ == "__main__":
    main()
