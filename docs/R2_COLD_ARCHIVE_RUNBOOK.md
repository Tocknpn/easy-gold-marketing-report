# Runbook: Cloudflare R2 Cold Archival for Easy Gold Reporting

## Context
- **Supabase Free Tier Limit**: 500 MB.
- **Current Raw Footprint (`monthly_data`)**: ~370 MB (~1.4M rows).
- **Core Architecture Rule**: Reports read from pre-aggregated summary tables (`fact_daily_core`, `fact_daily_wide`, `fact_hourly`, `fact_customer_daily`), which only take a few megabytes. Raw data older than 12 months is only used for rare row-level drill-throughs and can be safely moved to cold storage.

---

## When to Run This Runbook
Run this process whenever database storage reaches **$\ge$ 400 MB** (or every 6 months during maintenance).

---

## Step 1: Verify Summary Tables are Fully Reconciled
Before trimming any raw rows, verify that all historical dates have been aggregated into the summary fact tables:

```sql
-- In Supabase SQL Editor:
SELECT 
    MIN(date_id) AS earliest_summary_date,
    MAX(date_id) AS latest_summary_date,
    SUM(trans_count) AS total_summary_transactions
FROM public.fact_daily_core;
```
Ensure the date range covers your entire historical transaction window.

---

## Step 2: Export Old Raw Slice to CSV or Parquet
Export records older than 12 months from `monthly_data`.

```sql
-- Generate archive dataset (e.g. transactions older than 1 year)
COPY (
    SELECT * 
    FROM public.stg_clean_transactions
    WHERE tx_date < CURRENT_DATE - interval '12 months'
) TO STDOUT WITH CSV HEADER;
```
Save the file as `easy_gold_raw_archive_pre_<YYYYMMDD>.csv` (or compress with gzip / parquet).

---

## Step 3: Upload to Cloudflare R2
Using `wrangler` CLI or Cloudflare Dashboard:

```bash
# Upload to your R2 storage bucket
wrangler r2 object put easy-gold-cold-archive/2024-2025/raw_tx_archive.csv.gz --file=easy_gold_raw_archive_pre_<YYYYMMDD>.csv.gz
```

*Cloudflare R2 provides 10 GB free monthly storage with zero egress fees, making it the ideal cold archival vault.*

---

## Step 4: Truncate Archived Slice & Reclaim Storage in Supabase
Once upload to R2 is verified:

```sql
-- 1. Delete archived raw records
DELETE FROM public.monthly_data
WHERE public.parse_tx_date(created_at::text)::date < CURRENT_DATE - interval '12 months';

-- 2. Reclaim disk space
VACUUM FULL public.monthly_data;
```

---

## Verification
1. Check Supabase Dashboard $\to$ **Database** $\to$ **Storage**: Disk usage should drop back down to ~100–150 MB, leaving plentiful headroom on the free tier.
2. Open the Executive Dashboard: All historical charts, weekly trends, and MTD figures continue to render seamlessly because they query `fact_daily_core`!
