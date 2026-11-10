#!/usr/bin/env python3
"""
Proves the raw delete changed no saved number. READ-ONLY on the database.

Usage:
    python scripts/capture_report_baseline.py capture     # before the delete
    python scripts/capture_report_baseline.py compare     # after the delete and one normal upload

capture saves archive/report_baseline.json. compare reads everything again and lists any
difference on a date the baseline already had. New dates added by later uploads are not
differences. It ends with ZERO DIFFERENCES or with the list of what changed.
"""
import argparse
import datetime
import decimal
import json
import sys

from build_raw_archive import fetch_all, post
from export_raw_month import ARCHIVE_DIR, ExportError, load_credentials, request

BASELINE = ARCHIVE_DIR / "report_baseline.json"
VOLATILE = {
    "updated_at", "refreshed_at", "computed_at", "calculated_at", "generated_at",
    "elapsed_ms", "inspected_at", "created_at", "cache_computed_at", "source",
}


def strip(value):
    """Drop timestamps and timings that change on every read."""
    if isinstance(value, dict):
        return {k: strip(v) for k, v in value.items() if k not in VOLATILE}
    if isinstance(value, list):
        return [strip(v) for v in value]
    if isinstance(value, decimal.Decimal):
        return str(value.normalize()) if value == value.to_integral() else str(value)
    return value


def read_tables(base, key):
    return {
        "summary_daily_metrics": fetch_all(base, key, "/rest/v1/summary_daily_metrics?select=*&order=date_id.asc"),
        "summary_weekly_metrics": fetch_all(base, key, "/rest/v1/summary_weekly_metrics?select=*&order=year_week.asc"),
        "fact_daily_core": fetch_all(
            base, key,
            "/rest/v1/fact_daily_core?select=*&order=date_id.asc,branch_code.asc,bank_code.asc,tx_type_code.asc,status_code.asc",
        ),
        "campaign_setups": fetch_all(base, key, "/rest/v1/campaign_setups?select=*&order=id.asc"),
        "dynamic_bi_report_cache": fetch_all(base, key, "/rest/v1/dynamic_bi_report_cache?select=*&order=preset_id.asc"),
    }


def read_reports(base, key):
    reports = {
        "weekly_dashboard": post(base, key, "/rest/v1/rpc/get_executive_weekly_dashboard", {"p_limit": 52}),
        "target_oct_vs_sep": post(
            base, key, "/rest/v1/rpc/get_business_target_report",
            {"p_curr_year": 2026, "p_curr_month": 10, "p_comp_year": 2026, "p_comp_month": 9, "p_cutoff_day": 31},
        ),
    }
    # Fixed past dates, so the report reads only saved daily totals.
    for as_of, comp_year, comp_month in (("2026-10-31", 2026, 9), ("2026-07-31", 2026, 6), ("2026-06-30", 2026, 5)):
        reports[f"mtd_{as_of}"] = post(
            base, key, "/rest/v1/rpc/get_mtd_forecast_report",
            {"p_as_of_date": as_of, "p_comp_year": comp_year, "p_comp_month": comp_month, "p_mode": "calendar_days"},
        )
    return reports


def capture(base, key):
    latest = post(base, key, "/rest/v1/rpc/get_max_monthly_data_date", {})
    data = {
        "captured_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "latest_date": latest,
        "tables": read_tables(base, key),
        "reports": read_reports(base, key),
    }
    ARCHIVE_DIR.mkdir(exist_ok=True)
    BASELINE.write_text(json.dumps(data, default=str, ensure_ascii=False), encoding="utf-8")
    counts = ", ".join(f"{name} {len(rows)}" for name, rows in data["tables"].items())
    print(f"Saved {BASELINE.name}: latest date {latest}. Rows: {counts}")


def row_key(table, row):
    if table == "summary_daily_metrics":
        return row["date_id"]
    if table == "summary_weekly_metrics":
        return row["year_week"]
    if table == "fact_daily_core":
        return "|".join(str(row[c]) for c in ("date_id", "branch_code", "bank_code", "tx_type_code", "status_code"))
    if table == "campaign_setups":
        return row["id"]
    return row["preset_id"]


def row_date(table, row):
    if table in ("summary_daily_metrics", "fact_daily_core"):
        return row["date_id"]
    if table == "summary_weekly_metrics":
        return row["end_date"]
    return None


def compare_tables(old_tables, new_tables, latest):
    problems = []
    for table, old_rows in old_tables.items():
        new_by_key = {row_key(table, r): r for r in new_tables[table]}
        for old in old_rows:
            k = row_key(table, old)
            day = row_date(table, old)
            # The newest day or week can still grow from a same-day upload; everything older is final.
            if day is not None and day >= latest:
                continue
            if table == "campaign_setups" and not old.get("is_frozen"):
                continue  # active campaigns update every night; checked through their saved backward numbers
            if table == "dynamic_bi_report_cache" and not old.get("is_static"):
                continue  # rolling presets such as this_month move on with new data
            new = new_by_key.get(k)
            if new is None:
                problems.append(f"{table} {k}: row is gone")
            elif strip(new) != strip(old):
                changed = sorted(c for c in old if c not in VOLATILE and strip(old.get(c)) != strip(new.get(c)))
                problems.append(f"{table} {k}: changed {', '.join(changed)}")
    return problems


def compare_reports(old_reports, new_reports, latest):
    problems = []
    for name, old in old_reports.items():
        new = new_reports.get(name)
        if name == "weekly_dashboard":
            old_hist = {w["year_week"]: w for w in (old or {}).get("history", []) if w.get("end_date", "") < latest}
            new_hist = {w["year_week"]: w for w in (new or {}).get("history", [])}
            for wk, row in old_hist.items():
                if wk not in new_hist:
                    # The 52-week list moves forward as new weeks arrive.
                    continue
                if strip(new_hist[wk]) != strip(row):
                    problems.append(f"weekly_dashboard {wk}: changed")
        elif strip(new) != strip(old):
            problems.append(f"{name}: changed")
    return problems


def find_differences(base, key):
    """Returns the list of differences against the saved baseline (empty = none)."""
    if not BASELINE.exists():
        raise ExportError(f"{BASELINE.name} is missing. Run 'capture' before the delete.")
    old = json.loads(BASELINE.read_text(encoding="utf-8"), parse_float=decimal.Decimal)
    new_tables = json.loads(json.dumps(read_tables(base, key), default=str), parse_float=decimal.Decimal)
    new_reports = json.loads(json.dumps(read_reports(base, key), default=str), parse_float=decimal.Decimal)

    problems = compare_tables(old["tables"], new_tables, old["latest_date"])
    problems += compare_reports(old["reports"], new_reports, old["latest_date"])
    return old, problems


def compare(base, key):
    old, problems = find_differences(base, key)
    print(f"Baseline from {old['captured_at']} (latest date {old['latest_date']})")
    if problems:
        print(f"{len(problems)} DIFFERENCES:")
        for p in problems[:200]:
            print(f"  {p}")
        sys.exit(1)
    print("ZERO DIFFERENCES: every saved number before the baseline date is unchanged.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("mode", choices=["capture", "compare"])
    args = parser.parse_args()
    base, key = load_credentials()
    try:
        capture(base, key) if args.mode == "capture" else compare(base, key)
    except ExportError as err:
        sys.exit(f"STOP: {err}")


if __name__ == "__main__":
    main()
