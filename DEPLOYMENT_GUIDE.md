# Cloudflare Pages + Supabase Deployment Guide

This step-by-step guide walks you through deploying **Easy Gold Marketing Report** to **Cloudflare Pages** using **GitHub**, and linking it to your **Supabase** backend.

---

## Part 1: Supabase Setup (Database & Backend)

### Step 1.1: Create or Open Your Supabase Project
1. Log in to [Supabase](https://supabase.com/).
2. Click **New Project**, choose a region close to your users (e.g. `Singapore` / `Southeast Asia`), and set a secure database password.
3. Once the database is provisioned, go to **Project Settings** -> **API**:
   - Copy **Project URL** (e.g., `https://xyzcompany.supabase.co`).
   - Copy **anon public key** (`eyJhbGciOi...`).
   - Copy **service_role secret key** (keep this confidential!).

### Step 1.2: Execute the SQL Migrations
In your Supabase project dashboard, navigate to the **SQL Editor** and execute the 4 SQL scripts located in the `sql/` folder in sequence:

1. **`sql/01_schema_and_indexes.sql`**:
   - Creates the `monthly_data` table matching your Excel structure.
   - Creates the high-performance composite index `idx_monthly_data_perf_composite`.
   - Creates the `profiles` table and Row Level Security (RLS) policies.
2. **`sql/02_summary_table_and_triggers.sql`**:
   - Creates `summary_weekly_metrics` (the pre-aggregated table).
   - Creates the rollup calculation procedure `refresh_weekly_summary_metric(year, week)`.
3. **`sql/03_rpc_functions.sql`**:
   - Creates the sub-10ms stored procedure `get_executive_weekly_dashboard()`.
   - Creates `get_adhoc_filtered_metrics()` and branch analytics procedures.
4. **`sql/04_seed_sample_data.sql`**:
   - Populates W37 through W41 historical metrics matching your mock-ups.

---

## Part 2: Push Repository to GitHub

The local Git repository is initialized and committed on the `main` branch.

### Step 2.1: Create a Repository on GitHub
1. Open [GitHub](https://github.com/new).
2. Create a new repository named `easy-gold-marketing-report`.
3. Keep it **Private** (or Public, depending on your team's policy).
4. Do **NOT** initialize with README, .gitignore, or license (they are already created locally).

### Step 2.2: Push from Terminal
Run the following commands in your terminal:

```powershell
# Link your local repo to GitHub (replace USERNAME with your GitHub account)
git remote add origin https://github.com/USERNAME/easy-gold-marketing-report.git

# Push to main branch
git push -u origin main
```

*(If prompted, authenticate using your GitHub personal access token or browser login.)*

---

## Part 3: Deploy on Cloudflare Pages via GitHub

### Step 3.1: Connect GitHub in Cloudflare
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, click **Workers & Pages**.
3. Click **Create Application** -> Select the **Pages** tab.
4. Click **Connect to Git** and authorize your GitHub account.
5. Select the repository: `easy-gold-marketing-report`.

### Step 3.2: Configure Build Settings
Fill in the deployment configuration:

| Setting Field | Value |
| :--- | :--- |
| **Project Name** | `easy-gold-marketing-report` |
| **Production Branch** | `main` |
| **Framework Preset** | **Next.js** |
| **Build Command** | `npx @cloudflare/next-on-pages` |
| **Build Output Directory** | `.vercel/output/static` |

> **Note on Alternative Build (Standard Static / OpenNext)**:  
> If using Cloudflare's OpenNext or static export:  
> - Build Command: `npm run build`  
> - Build Output Directory: `.next`

### Step 3.3: Set Environment Variables
In the **Environment Variables** section on the Cloudflare Pages setup screen, add:

| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-id.supabase.co` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Your Supabase public anon key |
| `NODE_VERSION` | `20` | Node.js version for Cloudflare build |

### Step 3.4: Configure Compatibility Flags
Under **Settings** -> **Functions** (or in the setup advanced options):
- **Compatibility flag**: `nodejs_compat`
- **Compatibility date**: `2024-09-23` (or recent)

Click **Save and Deploy**.

Cloudflare will clone your repository from GitHub, run the build, optimize edge assets, and deploy the application to their global edge network.

---

## Part 4: Verification & Continuous Deployment

1. **Verify Edge Deployment**:
   - Access the `.pages.dev` URL assigned by Cloudflare (e.g., `https://easy-gold-marketing-report.pages.dev`).
   - Check that the W37-W41 metric cards (Platform Overview, Buy Activity, Sell Activity) render with the dual bar/line trend charts.
2. **Edge Cache Verification**:
   - Open browser DevTools -> Network Tab -> click `/api/dashboard/summary`.
   - Check response headers: `cf-cache-status: HIT` or `MISS`, `cache-control: public, s-maxage=300`.
3. **Automated CI/CD**:
   - Any future commit pushed to your GitHub `main` branch will automatically trigger a new deployment on Cloudflare Pages within 60 seconds!
