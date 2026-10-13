# Cloudflare Workers + Supabase Deployment Guide

> **Architecture Switch: Cloudflare Workers instead of Pages.dev**  
> **Why Workers?** Cloudflare Pages has strict 25MB asset and function bundle limits that frequently cause `Error 1101: Worker exceeded resource limits` or build failures. Deploying as a **Cloudflare Worker with Static Assets** eliminates this entirely. The Next.js frontend is exported into a lightweight `out/` bundle, and all API/Edge Caching logic runs inside a dedicated `worker.js` script (< 10 KB).

---

## Architecture Overview

```
[ Git Push to GitHub (main) ]
               │
               ▼
[ GitHub Actions Workflow ]
    ├── npm ci
    ├── npm run build (creates /out)
    └── wrangler deploy (via CLOUDFLARE_API_TOKEN)
               │
               ▼
[ Cloudflare Workers Global Edge Network ]
    ├── Static Assets (HTML/CSS/JS) served via Workers Static Assets
    └── /api/dashboard/summary handled by worker.js with Cloudflare Edge Cache
               │
               ▼
[ Supabase PostgreSQL ] (Reads pre-aggregated rollups in < 10ms)
```

---

## Part 1: Supabase Setup (Database & Migrations)

### 1.1 Retrieve Supabase API Credentials
1. Go to your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings** ➔ **API**.
3. Copy:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **`anon` public key** (`eyJhbGciOi...`)

### 1.2 Run SQL Scripts in SQL Editor
Execute the files in `sql/` in sequence:
1. `sql/01_schema_and_indexes.sql` — Schema, covering indexes, RLS.
2. `sql/02_summary_table_and_triggers.sql` — `summary_weekly_metrics` rollup table.
3. `sql/03_rpc_functions.sql` — Fast RPC procedure `get_executive_weekly_dashboard()`.
4. `sql/04_seed_sample_data.sql` — Historical data for Weeks 37 through 41.

---

## Part 2: Cloudflare API Credentials Setup

To allow GitHub (or your local terminal) to deploy directly to your Cloudflare Workers:

### 2.1 Get Your Cloudflare Account ID
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Click **Workers & Pages** in the left sidebar.
3. On the right side of the page, copy your **Account ID**.

### 2.2 Create a Cloudflare API Token
1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens).
2. Click **Create Token**.
3. Select the **Edit Cloudflare Workers** template (or create custom token with `Workers Scripts: Edit` and `Account Settings: Read`).
4. Click **Continue to summary** ➔ **Create Token**.
5. Copy the generated API token (it will only be shown once!).

---

## Part 3: Configure GitHub Secrets (for Automatic CI/CD)

1. Open your repository on GitHub: `https://github.com/Tocknpn/easy-gold-marketing-report`.
2. Go to **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Click **New repository secret** and add:
   - **`CLOUDFLARE_API_TOKEN`**: Paste your Cloudflare API token.
   - **`CLOUDFLARE_ACCOUNT_ID`**: Paste your Cloudflare Account ID.

Now, whenever you push code to GitHub:
```powershell
git push origin main
```
GitHub Actions will automatically build and deploy your site to Cloudflare Workers!

---

## Part 4: Direct CLI Deployment (Instant Alternative)

You can also deploy directly from your local terminal right now:

### 4.1 Login & Configure
```powershell
# 1. Login to Cloudflare in terminal
npx wrangler login

# 2. Add your Supabase credentials as Worker secrets
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Build & Deploy
npm run build
npx wrangler deploy
```

Once deployed, Wrangler will output your live URL:
```
Published easy-gold-marketing-report (x.xx sec)
  https://easy-gold-marketing-report.<your-subdomain>.workers.dev
```

---

## Part 5: Custom Domain Setup (Optional)

If you have a domain managed in Cloudflare (e.g. `report.yourdomain.com`):
1. In Cloudflare Dashboard, go to **Workers & Pages** ➔ click `easy-gold-marketing-report`.
2. Click the **Settings** tab ➔ **Domains & Routes**.
3. Click **Add Custom Domain** and enter your desired subdomain (e.g., `report.yourcompany.com`).
4. Cloudflare will automatically provision SSL certificates and route traffic to your Worker.
