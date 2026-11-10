#!/usr/bin/env python3
"""
Monthly raw-data rollover: keeps 5 calendar months of raw rows in monthly_data.

Runs daily from .github/workflows/monthly-raw-rollover.yml. On most days it finds
nothing to do and exits. Once a new month starts (for example early December), it:

    1. checks the previous month is fully uploaded and no active campaign needs the month
    2. makes the oldest month's WoW, MTD, Target and Daily numbers final
    3. captures the before copy for the before/after check
    4. saves the month's daily totals and Dynamic BI reports, and campaign backward numbers
    5. moves the lock past the month, so its saved numbers can never change
    6. deletes the month (delete_raw_month runs its own 7 checks first)
    7. vacuums, compares before/after, and emails the result

There is no backup file: deleted raw rows cannot be restored.

Needs SUPABASE_DB_URL (direct connection) and psql for steps 2, 4, 5, 6 and the vacuum.

Usage:
    python scripts/roll_raw_month.py            # do the rollover if one is due
    python scripts/roll_raw_month.py --dry-run  # only report what would happen, change nothing
"""
import argparse
import calendar
import datetime
import json
import os
import subprocess
import sys
import traceback
import urllib.request

from build_raw_archive import fetch_all, post, save_campaign_snapshots, save_reports
from capture_report_baseline import capture, find_differences
from export_raw_month import ExportError, load_credentials, request, say

KEEP_MONTHS = 5


def month_key(day):
    return f"{day.year}-{day.month:02d}"


def add_months(day, count):
    total = day.year * 12 + (day.month - 1) + count
    return datetime.date(total // 12, total % 12 + 1, 1)


def month_end(first):
    return datetime.date(first.year, first.month, calendar.monthrange(first.year, first.month)[1])


def psql(query):
    """Run one statement through the direct connection, as postgres. Returns its output."""
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        raise ExportError("SUPABASE_DB_URL is not set, so the database steps cannot run.")
    result = subprocess.run(
        ["psql", db_url, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-A", "-t", "-c", query],
        capture_output=True, text=True, encoding="utf-8",
    )
    if result.returncode != 0:
        raise ExportError((result.stderr or result.stdout).strip()[:500])
    return result.stdout.strip()


def decide(base, key):
    """Returns (oldest month first day, latest date, reason to skip or None)."""
    body, _ = request(
        f"{base}/rest/v1/monthly_data?select=created_at&created_at=gte.2000-01-01&order=created_at.asc&limit=1", key
    )
    rows = json.loads(body)
    if not rows:
        return None, None, "monthly_data is empty"
    oldest = datetime.date.fromisoformat(rows[0]["created_at"][:7] + "-01")
    latest = datetime.date.fromisoformat(post(base, key, "/rest/v1/rpc/get_max_monthly_data_date", {}))
    latest_first = latest.replace(day=1)

    months_apart = (latest_first.year - oldest.year) * 12 + (latest_first.month - oldest.month)
    if months_apart < KEEP_MONTHS:
        return oldest, latest, (
            f"nothing to do: raw data runs {month_key(oldest)} to {latest}, "
            f"which is {months_apart + 1} months. A month is removed once a 6th month starts."
        )

    # The previous month must be complete, so its last days are in the reports before anything is locked.
    prev_first = add_months(latest_first, -1)
    prev_last = month_end(prev_first)
    days = fetch_all(
        base, key,
        f"/rest/v1/summary_daily_metrics?select=date_id&date_id=gte.{prev_first}&date_id=lte.{prev_last}&order=date_id.asc",
    )
    if len(days) < prev_last.day:
        return oldest, latest, (
            f"waiting: {month_key(prev_first)} has daily totals for {len(days)} of {prev_last.day} days. "
            "It runs once the whole month is uploaded."
        )
    return oldest, latest, None


def campaign_guard(base, key, month_first):
    """A campaign whose own dates fall in the month needs that month's raw rows."""
    last = month_end(month_first)
    rows = fetch_all(
        base, key,
        "/rest/v1/campaign_setups?select=id,campaign_name,campaign_start_date,campaign_end_date"
        f"&is_frozen=eq.false&campaign_start_date=lte.{last}&campaign_end_date=gte.{month_first}&order=id.asc",
    )
    if rows:
        names = ", ".join(f"{r.get('campaign_name') or r['id']} ({r['campaign_start_date']} to {r['campaign_end_date']})" for r in rows)
        raise ExportError(f"active campaign still uses {month_key(month_first)}: {names}. Nothing deleted.")


def quarter_entries(month_first, latest):
    """The quarter containing the month, if all its months still have raw data and it has ended."""
    q_first = datetime.date(month_first.year, ((month_first.month - 1) // 3) * 3 + 1, 1)
    q_last = month_end(add_months(q_first, 2))
    if q_first >= month_first and q_last < latest:
        return [(f"{q_first.year}-Q{(q_first.month - 1) // 3 + 1}", q_first, q_last, "all", "")]
    return []


def send_email(base, key, subject, lines):
    url = os.environ.get("GOOGLE_APPS_SCRIPT_URL")
    say(f"EMAIL: {subject}")
    for line in lines:
        say(f"  {line}")
    if not url:
        say("  (no GOOGLE_APPS_SCRIPT_URL set, so no email was sent)")
        return
    try:
        settings = json.loads(request(f"{base}/rest/v1/report_schedule_settings?id=eq.1&select=target_emails", key)[0])
        recipients = settings[0]["target_emails"] if settings else []
        html = "<h3>" + subject + "</h3><ul>" + "".join(f"<li>{line}</li>" for line in lines) + "</ul>"
        payload = json.dumps({"to": recipients, "subject": subject, "html": html, "body": "\n".join(lines)}).encode()
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            say(f"  email sent to {', '.join(recipients)} (HTTP {resp.status})")
    except Exception as err:  # the rollover result matters more than the email
        say(f"  email failed: {err}")


def storage_line(base, key):
    try:
        s = post(base, key, "/rest/v1/rpc/get_raw_storage_status", {})
        return (f"Database {s['database_mb']} MB of {s['limit_mb']} MB (monthly_data {s['monthly_data_mb']} MB). "
                f"Raw data {s['raw_from']} to {s['raw_to']}. Locked before {s['locked_before']}.")
    except ExportError as err:
        return f"Storage status unavailable: {err}"


def rollover(base, key, dry_run):
    oldest, latest, skip = decide(base, key)
    if skip:
        say(skip)
        return 0

    month = month_key(oldest)
    next_first = add_months(oldest, 1)
    say(f"== Rollover due: remove {month}, keep {month_key(next_first)} to {month_key(latest)}")

    campaign_guard(base, key, oldest)
    extra = quarter_entries(oldest, latest)

    if dry_run:
        say("DRY RUN: nothing below is changed")
        save_reports(base, key, [month], extra=extra, dry_run=True)
        save_campaign_snapshots(base, key, before=next_first, run_sync=False, dry_run=True)
        say(f"DRY RUN would then lock before {next_first} and delete {month}.")
        return 0

    step = "make the month's saved numbers final"
    try:
        say(f"== 1. {step}")
        say("  " + psql(f"SELECT public.finalize_month_summaries('{month}')"))

        step = "capture the before copy"
        say(f"== 2. {step}")
        capture(base, key)

        step = "save daily totals"
        say(f"== 3. {step}")
        rollup_total = int(psql(f"SELECT public.build_raw_rollup('{month}')"))
        manifest = json.loads(psql(f"SELECT public.record_raw_month_manifest('{month}')"))
        if rollup_total != int(manifest["rows"]):
            raise ExportError(f"saved daily totals hold {rollup_total} rows, the month has {manifest['rows']}.")
        say(f"  {rollup_total:,} rows covered")

        step = "save Dynamic BI reports"
        failed = save_reports(base, key, [month], extra=extra)
        if failed:
            raise ExportError(f"{len(failed)} reports could not be saved: " + "; ".join(l for l, _ in failed[:10]))

        step = "save campaign backward numbers"
        save_campaign_snapshots(base, key, before=next_first, run_sync=False)

        step = "lock the month"
        say(f"== 4. {step}")
        say("  locked before " + psql(f"SELECT public.advance_raw_cutoff(DATE '{next_first}')"))

        step = "delete the month"
        say(f"== 5. {step}")
        deleted = psql(f"SELECT public.delete_raw_month('{month}')")
        say("  " + deleted)

        step = "vacuum"
        say(f"== 6. {step}")
        psql("VACUUM (ANALYZE) public.monthly_data")

        step = "compare before and after"
        say(f"== 7. {step}")
        _, problems = find_differences(base, key)
    except Exception as err:
        lines = [
            f"Stopped at: {step}.",
            f"Reason: {err}",
            "If the delete had not run yet, nothing was deleted. The rollover tries again tomorrow.",
            storage_line(base, key),
        ]
        send_email(base, key, f"Raw data rollover STOPPED for {month}", lines)
        if not isinstance(err, ExportError):
            traceback.print_exc()
        return 1

    if problems:
        send_email(base, key, f"Raw data rollover: deleted {month}, but {len(problems)} saved numbers changed", [
            deleted,
            "These saved numbers differ from before the delete. Check them:",
            *problems[:50],
            storage_line(base, key),
        ])
        return 1

    send_email(base, key, f"Raw data rollover OK: deleted {month}", [
        deleted,
        "Before/after check: ZERO DIFFERENCES.",
        storage_line(base, key),
    ])
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="Report what would happen and change nothing")
    args = parser.parse_args()
    base, key = load_credentials()
    try:
        sys.exit(rollover(base, key, args.dry_run))
    except ExportError as err:
        say(f"STOP: {err}")
        if not args.dry_run:
            send_email(base, key, "Raw data rollover STOPPED", [str(err), storage_line(base, key)])
        sys.exit(1)


if __name__ == "__main__":
    main()
