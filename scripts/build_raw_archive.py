#!/usr/bin/env python3
"""
Save everything that must survive before raw months are removed. DELETES NOTHING.
Run after sql/60_raw_retention_archive_and_locks.sql and after export_raw_month.py.

Usage:
    python scripts/build_raw_archive.py 2026-04 2026-05 2026-06

Steps, in order. Safe to stop and run again; finished work is skipped.
    1. Compare each month's backup manifest with the database, then record it
    2. Update active campaigns and confirm the sync works
    3. Save backward numbers for every remaining day of each active campaign
    4. Save unfiltered Dynamic BI reports for each month, quarter, week and day,
       plus each month by bank, branch and transaction type
"""
import argparse
import calendar
import concurrent.futures
import datetime
import decimal
import gzip
import http.client
import json
import sys
import time
import urllib.error
import urllib.request

from export_raw_month import ARCHIVE_DIR, ExportError, load_credentials, request, say

ARCHIVE_BUDGET_BYTES = 20 * 1024 * 1024
WORKERS = 3
SNAPSHOT_WORKERS = 2
RETRIES = 4


def post(base, key, path, payload, prefer=None, timeout=240):
    """POST JSON with retries. Returns the decoded response, or None if empty."""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    last_error = None
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(f"{base}{path}", data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    body = gzip.decompress(body)
                return json.loads(body) if body else None
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
            time.sleep(5 * attempt)
    raise ExportError(f"{path} failed after {RETRIES} tries: {last_error}")


def fetch_all(base, key, path):
    """Read every row of a query, 1000 at a time."""
    rows, offset = [], 0
    joiner = "&" if "?" in path else "?"
    while True:
        body, _ = request(f"{base}{path}{joiner}limit=1000&offset={offset}", key)
        page = json.loads(body, parse_float=decimal.Decimal)
        rows.extend(page)
        if len(page) < 1000:
            return rows
        offset += len(page)


def month_range(month):
    year, mon = map(int, month.split("-"))
    return datetime.date(year, mon, 1), datetime.date(year, mon, calendar.monthrange(year, mon)[1])


def verify_manifests(base, key, months):
    """The backup, the database and the daily totals must agree exactly before anything else."""
    say("== 1. Checking backups against the database")
    for month in months:
        path = ARCHIVE_DIR / f"manifest_{month}.json"
        if not path.exists():
            raise ExportError(f"{path.name} is missing. Run export_raw_month.py first.")
        manifest = json.loads(path.read_text(encoding="utf-8"))
        start, end = month_range(month)
        rollup = fetch_all(
            base, key,
            f"/rest/v1/raw_rollup_daily?select=tx_count,gold_weight,total_amount"
            f"&tx_date=gte.{start}&tx_date=lte.{end}&order=tx_date.asc,tx_hour.asc,bank.asc,branch.asc,transaction_type.asc,status.asc",
        )
        rows = sum(int(r["tx_count"]) for r in rollup)
        gold = sum(decimal.Decimal(str(r["gold_weight"])) for r in rollup)
        amount = sum(decimal.Decimal(str(r["total_amount"])) for r in rollup)
        if (
            rows != manifest["rows"]
            or gold != decimal.Decimal(manifest["gold_weight"])
            or amount != decimal.Decimal(manifest["total_amount"])
        ):
            raise ExportError(
                f"{month} does not match. Backup: {manifest['rows']} rows, {manifest['gold_weight']} g, "
                f"{manifest['total_amount']} LAK. Database: {rows} rows, {gold} g, {amount} LAK."
            )
        post(
            base, key, "/rest/v1/raw_export_manifest?on_conflict=month",
            {
                "month": month, "row_count": rows, "gold_weight": str(gold),
                "total_amount": str(amount), "sha256": manifest["sha256"],
            },
            prefer="resolution=merge-duplicates,return=minimal",
        )
        say(f"  {month}  OK  {rows:,} rows match")


def rule_type(row):
    """Same rule as sync_active_campaigns_daily."""
    text = f"{row.get('condition_type') or ''}"
    label = f"{row.get('condition_label') or ''}"
    return "weight_gte" if "weight" in text.lower() or "g" in label.lower() else "amount_gte"


def save_campaign_snapshots(base, key):
    say("== 2. Updating active campaigns")
    # The sync can exceed its 60 second limit on the full table. The backward numbers
    # below do not depend on it, so a timeout here is reported and does not stop the run.
    try:
        result = post(base, key, "/rest/v1/rpc/sync_active_campaigns_daily", {"p_target_campaign_id": None})
        say(f"  {json.dumps(result)}")
    except ExportError as err:
        say(f"  Sync did not finish, continuing: {str(err)[:160]}")
    as_of = datetime.date.fromisoformat(post(base, key, "/rest/v1/rpc/get_max_monthly_data_date", {}))

    say("== 3. Saving campaign backward numbers")
    settings = json.loads(request(f"{base}/rest/v1/raw_retention_settings?select=cutoff_date&id=eq.1", key)[0])
    cutoff = datetime.date.fromisoformat(settings[0]["cutoff_date"])
    campaigns = json.loads(request(
        f"{base}/rest/v1/campaign_setups?select=id,campaign_start_date,campaign_end_date,condition_type,"
        "condition_label,condition_operator,condition_value,condition_max_value,conditions,tx_type,bank,"
        "unique_users_filter_mode,nc_qualification_mode,nc_conditions,nc_first_purchase_use_main_condition"
        "&is_frozen=eq.false", key)[0], parse_float=decimal.Decimal)

    for camp in campaigns:
        start = datetime.date.fromisoformat(camp["campaign_start_date"])
        end = datetime.date.fromisoformat(camp["campaign_end_date"])
        backward_end = start - datetime.timedelta(days=1)
        total_days = max(1, (end - start).days + 1)
        first_elapsed = max(1, min(total_days, (min(end, as_of) - start).days + 1)) if as_of >= start else total_days
        windows = [
            backward_end - datetime.timedelta(days=elapsed - 1)
            for elapsed in range(first_elapsed, total_days + 1)
        ]
        windows = [w for w in windows if w < cutoff]
        say(f"  campaign {camp['id']}: {len(windows)} windows, as far back as {min(windows) if windows else 'none'}")
        if not windows:
            continue

        base_args = {
            "p_start_date": camp["campaign_start_date"],
            "p_backward_end": backward_end.isoformat(),
            "p_cond_type": rule_type(camp),
            "p_cond_op": camp.get("condition_operator") or ">=",
            "p_cond_val": float(camp.get("condition_value") or 0),
            "p_cond_max": float(camp["condition_max_value"]) if camp.get("condition_max_value") is not None else None,
            "p_tx_type": camp.get("tx_type") or "BUY_GOLD",
            "p_bank": camp.get("bank") or "all",
        }
        use_custom_nc = (
            camp.get("nc_qualification_mode") == "first_purchase_tier"
            and camp.get("nc_first_purchase_use_main_condition") is False
            and camp.get("nc_conditions")
        )
        versions = [
            {"p_version": 10},
            {
                "p_version": 14,
                "p_conditions": camp.get("conditions"),
                "p_unique_users_mode": camp.get("unique_users_filter_mode") or "condition_tier",
                "p_nc_mode": camp.get("nc_qualification_mode") or "all_registers",
                "p_nc_conditions": camp.get("nc_conditions") if use_custom_nc else None,
            },
        ]

        existing = {
            (r["version"], r["backward_start"], r["backward_end"])
            for r in fetch_all(
                base, key,
                f"/rest/v1/campaign_backward_snapshots?select=version,backward_start,backward_end"
                f"&backward_end=eq.{backward_end}&order=version.asc,backward_start.asc",
            )
        }
        todo = [
            {**base_args, **version, "p_backward_start": window.isoformat()}
            for window in windows
            for version in versions
            if (version["p_version"], window.isoformat(), backward_end.isoformat()) not in existing
        ]
        total = len(windows) * len(versions)
        finished = {"count": total - len(todo)}
        say(f"  {finished['count']} of {total} already saved")

        def save(args):
            post(base, key, "/rest/v1/rpc/save_campaign_backward_snapshot", args)
            finished["count"] += 1
            say(f"    {args['p_backward_start']} v{args['p_version']}  saved ({finished['count']} of {total})")

        with concurrent.futures.ThreadPoolExecutor(max_workers=SNAPSHOT_WORKERS) as pool:
            list(pool.map(save, todo))
        done = finished["count"]
        say(f"  campaign {camp['id']}: all {done} saved")


def report_args(start, end, dimension="all", value=""):
    """All 16 arguments, exactly as worker.js sends them for an unfiltered report.
    Sending fewer is ambiguous, because the database has a 12 and a 16 argument version."""
    return {
        "p_start_date": f"{start}T00:00:00Z",
        "p_end_date": f"{end}T23:59:59Z",
        "p_banks": [value] if dimension == "bank" else None,
        "p_branches": [value] if dimension == "branch" else None,
        "p_tx_types": [value] if dimension == "tx_type" else None,
        "p_min_weight": None,
        "p_max_weight": None,
        "p_min_amount": None,
        "p_max_amount": None,
        "p_start_hour": None,
        "p_end_hour": None,
        "p_status": "ສໍາເລັດ",
        "p_hours": None,
        "p_days_of_week": None,
        "p_customer_segment": "all",
        "p_search_keyword": None,
    }


def plan_reports(months):
    """Most useful first, so the size budget stops at the finest detail."""
    plan = []
    ranges = {m: month_range(m) for m in months}

    # Whole span by quarter, when all three months of a quarter are present.
    by_quarter = {}
    for month, (start, end) in ranges.items():
        quarter = f"{start.year}-Q{(start.month - 1) // 3 + 1}"
        by_quarter.setdefault(quarter, []).append((start, end))
    for quarter, spans in by_quarter.items():
        if len(spans) == 3:
            plan.append((quarter, min(s for s, _ in spans), max(e for _, e in spans), "all", ""))

    for month, (start, end) in ranges.items():
        plan.append((month, start, end, "all", ""))

    if ranges:
        first = min(s for s, _ in ranges.values())
        last = max(e for _, e in ranges.values())
        day = first - datetime.timedelta(days=first.weekday())
        while day <= last:
            week_end = day + datetime.timedelta(days=6)
            start, end = max(day, first), min(week_end, last)
            iso = day.isocalendar()
            plan.append((f"{iso[0]}-W{iso[1]:02d}", start, end, "all", ""))
            day += datetime.timedelta(days=7)

        day = first
        while day <= last:
            plan.append((day.isoformat(), day, day, "all", ""))
            day += datetime.timedelta(days=1)
    return plan


def dimension_reports(base, key, months):
    """Each month by bank, branch and transaction type, using values actually present."""
    plan = []
    for month in months:
        start, end = month_range(month)
        rows = fetch_all(
            base, key,
            f"/rest/v1/raw_rollup_daily?select=bank,branch,transaction_type"
            f"&tx_date=gte.{start}&tx_date=lte.{end}&order=tx_date.asc,tx_hour.asc,bank.asc,branch.asc,transaction_type.asc,status.asc",
        )
        for dimension, column in (("bank", "bank"), ("branch", "branch"), ("tx_type", "transaction_type")):
            for value in sorted({r[column] for r in rows if r[column]}):
                plan.append((month, start, end, dimension, value))
    return plan


def save_reports(base, key, months):
    say("== 4. Saving Dynamic BI reports")
    saved = {
        (r["period_key"], r["dimension"], r["filter_value"])
        for r in fetch_all(
            base, key,
            "/rest/v1/raw_archive_snapshots?select=period_key,dimension,filter_value"
            "&order=period_key.asc,dimension.asc,filter_value.asc",
        )
    }
    plan = plan_reports(months) + dimension_reports(base, key, months)
    todo = [p for p in plan if (p[0], p[3], p[4]) not in saved]
    say(f"  {len(plan)} reports planned, {len(todo)} still to save")

    state = {"bytes": 0, "stopped": False}
    failed = []

    def build(item):
        period, start, end, dimension, value = item
        if state["stopped"]:
            return
        label = f"{period} {dimension} {value}".strip()
        try:
            if state["bytes"] >= ARCHIVE_BUDGET_BYTES:
                state["stopped"] = True
                say(f"  size budget reached, stopping before {label}")
                return
            result = post(
                base, key, "/rest/v1/rpc/archive_dynamic_bi_report",
                {
                    "p_period_key": period, "p_start_date": start.isoformat(), "p_end_date": end.isoformat(),
                    "p_dimension": dimension, "p_filter_value": value,
                },
            )
            size = int(result["bytes"])
            state["bytes"] += size
            say(f"  {label}  saved ({size // 1024}KB, {result['total_transaction']} transactions)")
        except ExportError as err:
            failed.append((label, str(err)[:160]))
            say(f"  {label}  FAILED: {str(err)[:160]}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        list(pool.map(build, todo))

    say(f"  added {state['bytes'] / 1048576:.1f}MB this run")
    if failed:
        say(f"  {len(failed)} reports failed. Run the same command again to retry them.")
    return failed


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("months", nargs="+", help="Months as YYYY-MM")
    parser.add_argument("--reports-only", action="store_true", help="Skip steps 2 and 3, which are already done")
    args = parser.parse_args()

    base, key = load_credentials()
    try:
        verify_manifests(base, key, args.months)
        if not args.reports_only:
            save_campaign_snapshots(base, key)
        failed = save_reports(base, key, args.months)
    except ExportError as err:
        sys.exit(f"STOP: {err}\nNothing was deleted. Finished work is saved. Run the same command again.")

    if failed:
        print("FINISHED WITH MISSING REPORTS: " + "; ".join(label for label, _ in failed))
    else:
        print("OK all saved")


if __name__ == "__main__":
    main()
