# SME Intelligence

AI-powered business analytics for Nigerian SMEs. Upload a sales/expense spreadsheet and get an
instant dashboard, forecasts, automatic insights, a transparent business health score, and an
AI assistant that answers questions using your real numbers — never invented ones.

> **Status:** This is an MVP foundation, built incrementally per the original product brief. See
> **"What's built vs. what's next"** below for exactly what's wired up end-to-end versus scaffolded.

---

## 1. Features

- **Landing page** — hero, problem statement, how-it-works, features, pricing, FAQ
- **Auth** — signup, login, password reset, powered by Supabase Auth
- **Business onboarding** — Nigerian states/LGAs, business types, NGN-default currency
- **Data upload** — CSV/XLSX upload → automatic column-mapping suggestions → manual correction →
  data-quality report → import
- **Dashboard** — revenue, expenses, gross profit, margin, transactions, AOV, with period-over-period
  comparisons and date range filters
- **Sales Analytics** — daily/category/day-of-week breakdowns
- **Product Intelligence** — top products, most profitable products, slow-moving products
- **Inventory Intelligence** — stock coverage estimates and restock flags (only where stock data exists)
- **Expense Analytics** — category breakdown, largest expenses
- **Customer Analytics** — segmentation (high-value / frequent / occasional), top customers
- **Forecasting** — 7/30/90-day revenue forecast; method (moving average / exponential smoothing /
  linear regression) auto-selected by how much history is available — no paid ML API required
- **Automatic Insights** — rule-based, explainable positive/negative/anomaly detection
- **Business Health Score** — six measurable, explainable components (never an opaque AI number)
- **AI Assistant** — answers common business questions by retrieving your real computed metrics and
  templating a response — it can never invent a figure, because it never touches raw unrestricted
  data or free-form generation for facts
- **Reports** — CSV export and print-to-PDF monthly report
- **Demo mode** — public, unauthenticated `/demo` route showing a synthetic "Nasser Enterprise"
  (Kano supermarket) dataset with 12 months of realistic transactions

---

## 2. What's built vs. what's next

**Fully wired (real Supabase reads/writes, real calculations):**
Auth, onboarding, upload → mapping → validation → import, dashboard, sales analytics, products,
inventory, expenses, customers, forecasts, insights, health score, AI assistant (rule-based),
reports (CSV + print), settings (password change, data export), business profile editing, demo page.

**Intentionally simple / next iteration:**
- The AI Assistant is fully functional and grounded in real data, but only via rule-based intent
  matching (see `src/lib/analytics/assistant.ts`). The code is structured so an LLM can be dropped
  in later as a *phrasing* layer on top of the same retrieved metrics (set `AI_API_KEY`), without
  ever letting a model see raw, unrestricted data.
- PDF export currently uses the browser's print dialog ("Save as PDF") rather than a server-generated
  PDF library — this keeps the stack dependency-free and works on any free hosting tier.
- Multi-branch/team accounts, WhatsApp/POS/bank integrations, and paid subscriptions are deliberately
  not implemented (see brief section 34) but the schema (`subscriptions` table) and modular structure
  leave room for them.
- The main Dashboard page is now server-cached via `analytics_snapshots` (see "Server-side analytics
  caching" below). Other pages (Products, Customers, Sales Analytics, Inventory, the AI Assistant)
  still compute client-side from raw rows fetched directly — appropriate for their row-level detail
  needs and fine at SME data volumes, but a candidate for the same caching pattern if datasets grow
  large enough that the raw fetch itself becomes the bottleneck.

---

## 3. Architecture

```
Raw spreadsheet (CSV/XLSX)
       ↓  src/lib/analytics/fileParsing.ts
Parsed rows + headers
       ↓  src/lib/analytics/columnMapping.ts   (synonym-matching, confidence-scored)
Suggested field mapping  →  user confirms/corrects in the UI
       ↓  src/lib/analytics/validation.ts       (data-quality report, never silently mutates)
Validated rows
       ↓  Supabase insert (sales / expenses tables, RLS-protected)
       ↓
   ┌───────────────────────────────────────────────┐
   │  src/lib/analytics/*.ts  — the analytics engine │
   │  kpis.ts        → revenue/profit/margin/etc.    │
   │  forecasting.ts → 7/30/90-day forecast           │
   │  insights.ts    → explainable trend/anomaly cards│
   │  healthScore.ts → 6-component transparent score  │
   │  assistant.ts   → Q&A grounded in the above       │
   └───────────────────────────────────────────────┘
       ↓
   Dashboard pages (src/app/dashboard/**) — client components reading via useBusinessData()
```

Every analytics function in `src/lib/analytics/` is pure TypeScript with no external service
dependency — the core product works with zero paid API calls, satisfying the free-tier requirement.

### Server-side analytics caching

The main Dashboard page (`/dashboard`) does **not** fetch raw sales/expense rows into the browser.
Instead:

```
Browser                         Next.js Route Handler                  Postgres
   │  GET /api/analytics/           │                                       │
   │  dashboard?range=30d           │                                       │
   ├────────────────────────────────►                                      │
   │                                 │  1. Look up latest sale's created_at │
   │                                 │     (cheap, indexed)                 │
   │                                 ├───────────────────────────────────────►
   │                                 │  2. Look up cached snapshot for      │
   │                                 │     this exact period                │
   │                                 ├───────────────────────────────────────►
   │                                 │                                       │
   │                                 │  Cache hit (snapshot newer than      │
   │                                 │  latest sale)?                       │
   │                                 │    → return cached metrics JSON      │
   │                                 │  Cache miss/stale?                   │
   │                                 │    → fetch raw rows, recompute via   │
   │                                 │      buildDashboardBundle(), write   │
   │                                 │      the result back to              │
   │                                 │      analytics_snapshots, return it  │
   │  ◄────────────────────────────── │                                     │
   │  { business, bundle, cacheHit } │                                       │
```

- `src/lib/analytics/snapshotEngine.ts` — `buildDashboardBundle()` computes exactly what the
  dashboard needs (KPIs, the trend line, top 3 insights) and nothing more, so the cached JSON payload
  stays small.
- `src/app/api/analytics/dashboard/route.ts` — the cache-first Route Handler described above. It runs
  with the caller's own Supabase session (not the service role), so Row Level Security still governs
  every read and write here — this endpoint can only ever see and cache the signed-in user's own
  business.
- `src/app/api/analytics/invalidate/route.ts` — called by the upload flow immediately after a
  successful import, clearing that business's cached snapshots so the very next dashboard load
  recomputes fresh. (Even without this, the freshness check in the dashboard endpoint would catch it
  automatically — sales rows are append-only, so a new upload always produces a later `created_at`
  than any existing snapshot. The explicit invalidation just saves that one lookup and guarantees
  immediacy.)
- `src/lib/useDashboardSnapshot.ts` — the client hook the Dashboard page uses instead of
  `useBusinessData()`.
- The dashboard **layout** (sidebar) also no longer pulls the full transactional dataset just to show
  the business name — it uses the new lightweight `useCurrentBusiness()` hook instead.

This means: the first person to load a given date range after new data lands pays the full
computation cost once; every subsequent load (by them or, in a future multi-seat account, a
teammate) of that same range is a single indexed row lookup until the data changes again.

### Tech stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js server (API routes/server actions) + Supabase
- **Database:** Supabase Postgres with Row Level Security
- **Auth:** Supabase Auth
- **Charts:** Recharts
- **File parsing:** PapaParse (CSV), SheetJS/xlsx (Excel)
- **Forecasting/analytics:** Hand-written TypeScript (moving average, exponential smoothing, linear
  regression) — no scikit-learn/Prophet dependency, so no Python runtime is required in production
- **Hosting:** Designed for Vercel (frontend) + Supabase (DB/Auth), both free-tier eligible

### Folder structure
```
src/
  app/                  Next.js App Router pages (landing, auth, onboarding, dashboard/*, demo)
  components/           Shared UI (Sidebar, KpiCard, EmptyState, InsightBadge, HealthScoreCard)
  lib/
    analytics/          The analytics engine (kpis, forecasting, insights, healthScore, assistant,
                         columnMapping, validation, fileParsing)
    supabase/            Browser + server Supabase clients
    constants.ts          Nigerian states, business types, currencies
    demoData.ts            Synthetic Nasser Enterprise dataset generator
    useBusinessData.ts       Data-fetching hooks
  types/domain.ts        Shared TypeScript types mirroring the SQL schema
supabase/schema.sql      Full DB schema + RLS policies
scripts/seed-demo-data.ts  Seeds the public demo business
```

---

## 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=       # Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Project Settings → API → anon/public key
SUPABASE_SERVICE_ROLE_KEY=      # Project Settings → API → service_role key (SERVER-ONLY, never expose to the client)
AI_API_KEY=                     # Optional — only needed if you later add an LLM phrasing layer
SEED_SECRET=                    # Only needed to seed demo data via /api/admin/seed-demo (see DEPLOYMENT.md)
```

---

## 5. Local development

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase credentials
npm run dev
```

Visit http://localhost:3000.

---

## 6. Supabase setup

1. Create a project at https://supabase.com (free tier is sufficient for an MVP).
2. In the SQL Editor, paste and run the full contents of `supabase/schema.sql`. This creates every
   table and Row Level Security policy in one pass and is safe to re-run.
3. In **Authentication → Providers**, ensure Email is enabled (it is by default).
4. In **Authentication → URL Configuration**, set your Site URL (e.g. `http://localhost:3000` for
   local dev, your production URL once deployed) so password-reset and confirmation emails link
   back correctly.
5. Copy your Project URL, anon key, and service_role key into `.env.local` (see above).

### Row Level Security — how it enforces data isolation
Every business-scoped table's policy checks that the row's `business_id` belongs to a business
where `owner_id = auth.uid()`. This means even if application code had a bug that fetched the wrong
`business_id`, Postgres itself would refuse to return another user's rows. The only exception is a
narrow `SELECT`-only public policy on businesses flagged `is_demo = true`, which is what powers the
unauthenticated `/demo` page.

---

## 7. Demo data

The synthetic "Nasser Enterprise" dataset (a Kano supermarket, 12 months of transactions across 10
realistic product lines, with Ramadan and year-end seasonality) is generated deterministically by
`src/lib/demoData.ts`.

To seed it into your Supabase project:

```bash
npm run seed:demo
```

This requires `SUPABASE_SERVICE_ROLE_KEY` in your environment (it bypasses RLS deliberately, since
seeding a *public* demo business is the one legitimate use of the service role outside of admin
tooling). The script is idempotent — re-running it replaces the previous demo data.

---

## 8. Deployment

**Want to deploy without touching your own computer at all — GitHub upload/Codespaces, Vercel, and
seeding the demo data all from the browser?** See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the
complete walkthrough, including the protected `/api/admin/seed-demo` endpoint that seeds demo data
as a Vercel serverless function instead of a local script.

The condensed version, if you are working locally:

### GitHub
```bash
git init
git add .
git commit -m "Initial commit: SME Intelligence MVP"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### Supabase
Follow section 6 above against your production project (or reuse the same project for MVP purposes).

### Hosting (Vercel, free tier)
1. Import the GitHub repo at https://vercel.com/new.
2. Add the same environment variables from `.env.local` in the Vercel project settings
   (Environment Variables tab) — **do not** commit `.env.local`.
3. Deploy. Vercel auto-detects Next.js.
4. Back in Supabase → Authentication → URL Configuration, update the Site URL to your Vercel domain.

No paid infrastructure is required to run this MVP end-to-end.

---

## 9. Testing

There is no automated test suite yet (out of scope for this MVP pass). To manually verify the core
flow:
1. Sign up → complete onboarding → land on `/dashboard/upload`.
2. Upload a CSV with at least `date` and `amount`-style columns — confirm the mapping UI suggests
   reasonable matches, and that unmapped required fields block progression.
3. Confirm the data-quality report reflects issues you deliberately introduce (e.g. a blank date, a
   negative quantity).
4. After import, confirm `/dashboard`, `/dashboard/products`, `/dashboard/forecasts`,
   `/dashboard/insights`, and `/dashboard/assistant` all reflect the uploaded numbers.
5. Visit `/demo` (no login) after running `npm run seed:demo` — confirm it loads independently of
   your own account's data.

---

## 10. How the analytics are calculated

- **Profit** = Revenue − (Cost Price × Quantity) − Expenses in the period
- **Profit Margin** = Gross Profit ÷ Revenue × 100
- **Forecast method selection** — under 21 days of history: 7-day moving average; 21–60 days:
  exponential smoothing (α = 0.3); 60+ days: linear trend regression over the trailing 90 days.
  Uncertainty bands widen with the forecast horizon, derived from the standard deviation of the
  trailing 28 days.
- **Business Health Score** — the unweighted average of six components, each independently
  explainable (see `src/lib/analytics/healthScore.ts` for exact formulas): Revenue Health,
  Profitability, Expense Control, Inventory, Customer Activity, Sales Consistency. Components with no
  underlying data (e.g. no stock data uploaded) default to a neutral 70 rather than dragging the score
  down for a module the business simply hasn't used yet.
- **Slow-moving products** — no recorded sale in 30+ days relative to the latest transaction date in
  the dataset.

---

## 11. AI architecture & safeguards

```
Raw Business Data → Cleaning/Validation → Analytics Engine → Structured Metrics
                                                                  ↓
                                                          Insight Detection
                                                                  ↓
                                                             Forecasting
                                                                  ↓
                                                          AI Assistant (retrieval + templating)
```

- The assistant (`src/lib/analytics/assistant.ts`) matches question intent, retrieves the relevant
  pre-computed metric (via the same functions the dashboard uses), and templates a response. It
  never receives raw, unrestricted database access, and it never free-form-generates a number.
- Every business's data is isolated by Row Level Security — the assistant (and every other page)
  can only ever query the signed-in user's own `business_id`.
- If you later add `AI_API_KEY` to use an LLM for more natural phrasing, wire it as a layer that
  receives the already-retrieved `supportingMetrics` object and rephrases — never as something that
  receives raw table access or is asked to compute numbers itself.

---

## 12. Troubleshooting

- **"No business found" after signup** — onboarding wasn't completed; visit `/onboarding`.
- **Upload succeeds but dashboard is empty** — check that your file's revenue and date columns were
  mapped correctly (not left as "Ignore this column") in the mapping step.
- **RLS errors ("new row violates row-level security policy")** — confirm you're inserting with
  `business_id` set to a business your authenticated user owns; the anon key never bypasses RLS.
- **Demo page shows a seeding message** — run `npm run seed:demo` with `SUPABASE_SERVICE_ROLE_KEY` set.

---

## 13. Roadmap (not built in this MVP)

WhatsApp integration · native mobile app · POS integration · bank statement analysis · accounting
software integration · barcode/receipt scanning · voice AI assistant · Nigerian payment gateway
integration (Paystack/Flutterwave) · multi-branch businesses · team accounts with roles · automated
SMS/WhatsApp alerts · an LLM-backed phrasing layer for the AI Assistant · paid subscription billing.

The database schema (`subscriptions` table) and modular `src/lib/analytics/` structure are designed
so these can be layered on without a rewrite.
