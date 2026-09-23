# Deploying SME Intelligence — entirely from the cloud

This guide assumes you want to go from the project files to a live app **without running anything
on your own computer**. Every step below happens in a browser, on GitHub, Supabase, or Vercel's own
infrastructure.

The one thing that's unavoidable: the code has to reach GitHub somehow, since that's what Vercel
deploys from. Section 1 covers two fully-browser ways to do that.

---

## 1. Get the code into GitHub (no local git required)

### Option A — GitHub web upload (simplest, one-time)
1. Unzip the project on your machine just to get a folder (this part doesn't require running any
   code — Finder/Explorer's built-in unzip is fine).
2. Go to [github.com/new](https://github.com/new) → create an empty repository (don't initialize
   with a README — you already have one).
3. On the new repo's page, click **uploading an existing file**.
4. Drag the *contents* of the unzipped folder (not the folder itself) into the browser drop zone.
   Modern GitHub's uploader accepts nested folders via drag-and-drop in Chrome/Edge/Firefox.
5. Commit directly to `main`.

This gets you a working repo with zero local commands. The only downside: future changes also have
to go through this same upload flow, or Option B below.

### Option B — GitHub Codespaces (recommended if you'll touch the code again)
A Codespace is a full dev environment (VS Code + terminal) running in your browser, backed by
GitHub's servers — not your computer.

1. Create the empty GitHub repo as in Option A, step 2.
2. On the repo page: **Code → Codespaces → Create codespace on main**.
3. In the Codespace's terminal (still entirely in-browser), upload your zip via the editor's file
   explorer (drag it in, or use the terminal's `unzip` after dragging the zip file into the
   Codespace's file tree), then:
   ```bash
   unzip sme-intelligence.zip -d .
   mv sme-intelligence/* sme-intelligence/.* . 2>/dev/null
   git add .
   git commit -m "Initial commit: SME Intelligence MVP"
   git push
   ```
4. Every future edit can happen the same way — open a Codespace, edit, commit, push — never touching
   your own machine's terminal.

Either way, once `main` has the code, GitHub's part is done.

---

## 2. Supabase (already fully browser-based)

1. [supabase.com](https://supabase.com) → **New project**.
2. **SQL Editor** → paste all of `supabase/schema.sql` → **Run**. Creates every table + Row Level
   Security policy.
3. **Project Settings → API** → note the three values: **Project URL**, **anon key**,
   **service_role key**.
4. **Authentication → Providers** → confirm Email is on (default).

Nothing here ever touches your computer — it's Supabase's own dashboard end to end.

---

## 3. Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select the repo from
   step 1.
2. Before clicking Deploy, expand **Environment Variables** and add:

   | Key | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase | |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase | **Never** prefix with `NEXT_PUBLIC_` |
   | `SEED_SECRET` | any long random string | Used only to authorize the demo-seed endpoint (step 5). Generate one at [random.org/strings](https://www.random.org/strings/) or similar if you don't want to run `openssl` anywhere. |
   | `AI_API_KEY` | leave blank | Optional, for a future LLM phrasing layer |

   Check all three environment boxes (Production / Preview / Development) for each.
3. **Deploy.** Vercel builds and hosts it — this build itself is a Vercel-side compute job, so
   "building the app" never happens on your computer either.

---

## 4. Point Supabase auth at your live domain

Vercel gives you `https://<your-project>.vercel.app`. Back in Supabase:

**Authentication → URL Configuration**
- **Site URL** → `https://<your-project>.vercel.app`
- **Redirect URLs** → `https://<your-project>.vercel.app/**`

Without this, signup-confirmation and password-reset emails link to `localhost`.

---

## 5. Seed the public demo data — entirely from Vercel

This is the step that would otherwise need a local script. Instead, call the protected API route
that's already in the project (`src/app/api/admin/seed-demo/route.ts`), which runs as a Vercel
serverless function:

```bash
curl -X POST https://<your-project>.vercel.app/api/admin/seed-demo \
  -H "x-seed-secret: <the SEED_SECRET value you set in step 3>"
```

You need *something* to send that request from — but it doesn't have to be your computer's
terminal. Any of these work entirely in the cloud:
- **A GitHub Codespace's terminal** (Option B in step 1) — `curl` is preinstalled.
- **A browser REST client** like [Postman's web version](https://www.postman.com) or
  [httpie.io](https://httpie.io) — paste the URL, add the header, send.
- **Your browser's own dev tools console**, on any page (including the deployed app itself):
  ```js
  fetch('https://<your-project>.vercel.app/api/admin/seed-demo', {
    method: 'POST',
    headers: { 'x-seed-secret': '<your SEED_SECRET>' }
  }).then(r => r.json()).then(console.log);
  ```

A successful response looks like:
```json
{ "success": true, "businessId": "...", "productsInserted": 10, "salesInserted": 8000+, "expensesInserted": 108 }
```

Verify at `https://<your-project>.vercel.app/demo`.

**This endpoint is idempotent** — call it again any time to reset the demo data (it deletes the
previous demo business first).

### If this endpoint times out
Seeding inserts several thousand rows in batches. `maxDuration = 60` is set in the route, but:
- **Vercel Hobby (free) plan** caps serverless functions at **10 seconds** regardless of that
  setting — seeding may not finish in time.
- **Vercel Pro plan** allows up to 60s (which `maxDuration` requests), comfortably enough.

If you're on Hobby and it times out, either:
1. Temporarily reduce the demo dataset size — in `src/lib/demoData.ts`, change
   `generateDemoData(12)` (called from `seedDemoBusiness.ts`) to `generateDemoData(3)` for 3 months
   instead of 12, commit, redeploy, seed, then optionally revert. Fewer months means fewer rows to
   insert in the 10-second window.
2. Or upgrade to Pro for this one operation, seed, then downgrade if you don't need it long-term.

---

## 6. Ongoing workflow (fully cloud)

- Edit code in a GitHub Codespace (step 1, Option B) → commit → push → Vercel auto-deploys.
- Every pull request gets its own Vercel preview URL with the same environment variables, so you can
  test against your real Supabase project before merging.
- Roll back anytime: Vercel → **Deployments** → pick a previous one → **Promote to Production**.
- Re-seed demo data anytime by re-calling the endpoint in step 5 — no machine, no script to keep
  around locally.

---

## Troubleshooting

- **Build fails on Vercel** — almost always a missing/misnamed environment variable. Check the build
  log for which one.
- **`/api/admin/seed-demo` returns 500 "SEED_SECRET is not configured"** — you deployed before
  adding that variable, or added it after the last deploy. Add/fix it in **Project Settings →
  Environment Variables**, then **Deployments → ⋯ → Redeploy** (env var changes need a redeploy to
  take effect).
- **401 from the seed endpoint** — the `x-seed-secret` header value doesn't match what's set in
  Vercel. Copy-paste carefully; no quotes around the value in either place.
- **Login redirects to `localhost` in production** — step 4 wasn't completed.
- **Demo page still empty after a successful-looking seed call** — hard-refresh; the dashboard's
  server-side cache (see `README.md` → "Server-side analytics caching") should already handle this
  automatically since the demo business's data is brand new, but a hard refresh rules out any local
  browser cache.

---

## 7. API Reference

Every API route lives under `src/app/api/`. All of them run as Vercel serverless functions once
deployed — nothing here requires a separate backend.

### `GET /api/analytics/dashboard`

Cache-first endpoint backing the main Dashboard page. Requires an authenticated session (the
browser's Supabase auth cookie — this isn't callable with just an API key).

**Query parameters**
| Param | Values | Default |
|---|---|---|
| `range` | `7d` \| `30d` \| `90d` \| `ytd` | `30d` |

**Response — cache hit or fresh compute**
```json
{
  "business": { "id": "...", "business_name": "Nasser Enterprise", "currency": "NGN", "...": "..." },
  "bundle": {
    "range": "30d",
    "periodStart": "2026-08-24",
    "periodEnd": "2026-09-22",
    "kpis": {
      "revenue": 12450000, "expenses": 8200000, "grossProfit": 4250000,
      "profitMargin": 34.1, "transactions": 12430, "averageOrderValue": 18500,
      "previousPeriod": { "...": "same shape, prior period" }
    },
    "dailySeries": [{ "date": "2026-08-24", "revenue": 410000 }, "..."],
    "topInsights": [{ "type": "positive", "title": "...", "detail": "..." }],
    "generatedAt": "2026-09-22T10:15:00.000Z"
  },
  "cacheHit": true
}
```

**Response — no sales data yet**
```json
{ "business": { "...": "..." }, "bundle": null, "cacheHit": false, "reason": "no_sales_data" }
```

**Errors**
| Status | Meaning |
|---|---|
| 401 | Not authenticated |
| 404 | No business found for this account (onboarding not completed) |

---

### `POST /api/analytics/invalidate`

Clears cached snapshots for the caller's business. Called automatically by the upload flow after a
successful import — you generally never need to call this yourself, but it's exposed if you ever
write to `sales`/`expenses` another way (e.g. a future POS integration) and need the dashboard to
reflect it immediately rather than waiting for the next natural cache-miss.

Requires an authenticated session. No body.

```bash
curl -X POST https://<your-app>.vercel.app/api/analytics/invalidate \
  -H "Cookie: <your browser's Supabase session cookie>"
```
(In practice this is always called from client-side JS with `credentials: 'same-origin'`, not curl
— included here for completeness.)

**Response**
```json
{ "invalidated": true }
```

---

### `POST /api/admin/seed-demo`

Seeds (or resets) the public demo business. Protected by a shared secret, **not** by user auth —
this is meant to be called by you, the operator, not by end users.

**Headers**
| Header | Required | Value |
|---|---|---|
| `x-seed-secret` | Yes | Must match the `SEED_SECRET` environment variable set in Vercel |

```bash
curl -X POST https://<your-app>.vercel.app/api/admin/seed-demo \
  -H "x-seed-secret: <your SEED_SECRET>"
```

**Response — success**
```json
{
  "success": true,
  "businessId": "8f2b1c...",
  "productsInserted": 10,
  "salesInserted": 8214,
  "expensesInserted": 108
}
```

**Errors**
| Status | Meaning |
|---|---|
| 401 | `x-seed-secret` header missing or doesn't match |
| 500 | `SEED_SECRET` not configured on this deployment, or the seed itself failed (message included) |

Idempotent — re-running it deletes the previous demo business first, so it's safe to call again to
reset the demo to a clean state.

---

### Endpoints that are Supabase-direct, not custom API routes

The rest of the app (auth, business CRUD, sales/expense upload, products, customers, etc.) talks
directly to Supabase's auto-generated REST API via `@supabase/supabase-js` from the browser —
there's no custom Next.js route for these, by design. Row Level Security (see `supabase/schema.sql`)
is what secures them, not application code. If you need a stable custom API for a future integration
(e.g. a mobile app, or a third-party POS), the pattern to follow is the same one used by the three
routes above: a Next.js Route Handler under `src/app/api/`, using `createServerSupabaseClient()` for
user-scoped requests (respects RLS) or `createServiceRoleClient()` only for operations that must
bypass RLS (like the demo seed) — never expose the service-role key to the browser.
