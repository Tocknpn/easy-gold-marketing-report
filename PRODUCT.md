# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Executive Leadership (CEO, CMO, VP, Marketing Directors):** Need high-level, board-ready visibility into real-time gold trading volume, marketing ROI, 2025/2026 target achievement, week-over-week pacing, and MTD performance without waiting for slow report queries.
- **BI & Marketing Operations (Analysts, Operations Managers):** Perform daily data verification, transaction log audits, ad-hoc cohort/channel filtering, marketing campaign tracking, budget attribution, and multi-dimensional analysis in Power Pivot Studio.

## Product Purpose

A high-performance Business Intelligence and Executive Reporting web platform for Easy Gold's physical and digital gold trading operations. It transforms 1.4M+ raw transactional records into actionable marketing, trading, and target metrics with sub-10ms response times, bridging strategic executive decision-making with operational-level precision.

## Positioning

Unlike traditional bloated BI software that requires heavyweight server clusters or suffers query timeouts over millions of transaction rows, Easy Gold Marketing Report uses a dual-tier query model (pre-aggregated rollups + indexed RPC scans) backed by Cloudflare edge caching to deliver sub-10ms executive reports on zero-maintenance serverless infrastructure.

## Operating Context

- **Environment:** Desktop web browsers and executive presentation displays during weekly marketing standups, monthly budget reviews, and executive board presentations.
- **Workflow & Tools:** Synchronized with Supabase PostgreSQL database, Cloudflare Workers edge deployment, and Python/Excel ingestion workflows (`upload.py`, monthly summary workbooks).
- **Security & Access:** Corporate role-based access control (`admin`, `operations_manager`, `viewer`) with Supabase SSR session handling.

## Capabilities and Constraints

### Capabilities
- **Target Report View:** Tracks marketing and trading targets against actuals across Gold Weight, User Participation, Transactions, and Ticket Sizes with prorated WoW/MoM analysis.
- **Dynamic Report View:** Ad-hoc slicing and filtering across custom date ranges, channels, and product categories.
- **MTD Report View:** Month-to-date tracking with day-by-day pacing, run-rate tracking, and projected month-end outcomes.
- **Weekly Historical Matrix:** Multi-week comparative breakdown (Weeks 37 through 43+) with interactive combo bar/line charts.
- **Power Pivot Studio:** In-browser multi-dimensional pivot grid with real-time SQL validation and custom aggregations.
- **Campaign Tracking View:** Attribution of marketing campaign spend, channel efficiency, and customer acquisition metrics.
- **System Check & Data Audit Modal:** Automated data integrity validator ensuring zero discrepancy between raw logs and rollup tables.

### Technical Constraints & Stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend & Database:** Supabase (PostgreSQL), Edge Functions, Composite B-Tree & BRIN indexes.
- **Deployment:** Cloudflare Workers with Static Assets (`out/` export) and custom edge cache handler (`worker.js`).
- **Core Domain Terminology:** Gold Weight (grams / 15g denomination), Ticket Size (grams per transaction), Buy Activity, Sell Activity, Prorated WoW, User Participation.

## Brand Commitments

- **Product Identity:** "Easy Gold Marketing & BI Executive Report".
- **Functional Color Language:**
  - *Platform Overview:* Professional Deep Blue tones.
  - *Buy Activity:* Forest Green tones.
  - *Sell Activity:* Burgundy / Crimson tones.
  - *Gold Accents:* Warm Amber / Polished Gold highlights.
- **Display Density:** User-selectable Comfortable and Compact modes for high-density analytical screens.

## Evidence on Hand

- **Transaction Data Workbooks:** `whole 2025 summarize daily data.xlsx`, `JantoMar_2026.xlsx`, `data Sample/`.
- **Database Schema & Migrations:** Complete SQL scripts in `sql/` (`01_schema_and_indexes.sql` through `13_pivot_studio_sql_validator.sql`).
- **Deployment & Architecture Guides:** `DEPLOYMENT_GUIDE.md` and `docs/R2_COLD_ARCHIVE_RUNBOOK.md`.
- **Visual Design Mockups:** Mockup assets stored in `Mockup report/`.

## Product Principles

1. **Sub-10ms Executive Speed:** Surface critical gold volume and marketing metrics immediately without cognitive fatigue or loading lag.
2. **Absolute Data Integrity:** Strict mathematical parity between raw transaction records and executive summaries, with clear freshness badges and audit tools.
3. **Strategic to Tactical Continuity:** Enable leadership to see high-level KPI trends at a glance, while allowing analysts to drill down into row-level pivot details in a single click.
4. **Lean Edge Architecture:** Maximum performance and reliability on edge infrastructure without expensive ongoing server overhead.

## Accessibility & Inclusion

- Visual encoding pairs color with explicit directional arrows, numeric signs (+/-), and descriptive labels so financial metrics remain clear under any color perception.
- High-contrast typography and clear visual hierarchy optimized for both standard laptop screens and high-resolution boardroom displays.
