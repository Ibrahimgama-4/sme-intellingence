-- ============================================================================
-- SME Intelligence — Database Schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`) on a fresh
-- project. Safe to re-run: each block is guarded with IF NOT EXISTS / OR REPLACE.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- BUSINESSES
-- One row per registered business. auth.users is Supabase's built-in table;
-- we never create our own users table — profile fields live here, keyed to
-- the authenticated user's id.
-- ----------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  business_type text not null check (business_type in (
    'supermarket','retail','wholesale','restaurant','pharmacy','fashion',
    'electronics','agriculture','manufacturing','services','other'
  )),
  industry text,
  state text not null,
  lga text,
  currency text not null default 'NGN',
  business_size text check (business_size in ('micro','small','medium')),
  employee_count int,
  years_in_operation numeric,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_businesses_owner on public.businesses(owner_id);

-- ----------------------------------------------------------------------------
-- UPLOADS — one row per file a user uploads
-- ----------------------------------------------------------------------------
create table if not exists public.uploads (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('csv','xlsx')),
  row_count int,
  status text not null default 'pending' check (status in (
    'pending','mapped','validated','processed','failed'
  )),
  data_quality_score numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_uploads_business on public.uploads(business_id);

-- ----------------------------------------------------------------------------
-- DATA_MAPPINGS — how a business's raw column headers map to our schema
-- ----------------------------------------------------------------------------
create table if not exists public.data_mappings (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  source_column text not null,
  target_field text not null check (target_field in (
    'transaction_date','product','product_id','category','quantity',
    'unit_price','revenue','cost_price','profit','expense_category',
    'expense_amount','customer','supplier','location','ignore'
  )),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PRODUCTS
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text,
  unit_cost numeric,
  unit_price numeric,
  current_stock numeric,
  reorder_point numeric,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create index if not exists idx_products_business on public.products(business_id);

-- ----------------------------------------------------------------------------
-- CUSTOMERS
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  first_seen date,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

-- ----------------------------------------------------------------------------
-- SALES — the core transaction fact table
-- ----------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  upload_id uuid references public.uploads(id) on delete set null,
  transaction_date date not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  category text,
  customer_id uuid references public.customers(id) on delete set null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  cost_price numeric,
  revenue numeric not null default 0,
  profit numeric,
  location text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_business_date on public.sales(business_id, transaction_date);
create index if not exists idx_sales_business_product on public.sales(business_id, product_id);

-- ----------------------------------------------------------------------------
-- EXPENSES
-- ----------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  upload_id uuid references public.uploads(id) on delete set null,
  expense_date date not null,
  category text not null check (category in (
    'rent','electricity','fuel','salaries','transportation','internet',
    'marketing','maintenance','procurement','other'
  )),
  amount numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_business_date on public.expenses(business_id, expense_date);

-- ----------------------------------------------------------------------------
-- INVENTORY SNAPSHOTS (optional — only populated when stock data is uploaded)
-- ----------------------------------------------------------------------------
create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  snapshot_date date not null default current_date,
  stock_level numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_business on public.inventory(business_id, product_id);

-- ----------------------------------------------------------------------------
-- ANALYTICS SNAPSHOTS — cached computed metrics per period, so the dashboard
-- doesn't recompute from raw rows on every page load.
-- ----------------------------------------------------------------------------
create table if not exists public.analytics_snapshots (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null, -- { revenue, expenses, grossProfit, margin, transactions, aov, ... }
  created_at timestamptz not null default now()
);

create index if not exists idx_snapshots_business on public.analytics_snapshots(business_id, period_start);

-- ----------------------------------------------------------------------------
-- INSIGHTS — generated insight cards (positive/negative/anomaly)
-- ----------------------------------------------------------------------------
create table if not exists public.insights (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null check (type in ('positive','negative','anomaly','neutral')),
  title text not null,
  detail text not null,
  metric_ref jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_insights_business on public.insights(business_id, created_at desc);

-- ----------------------------------------------------------------------------
-- FORECASTS
-- ----------------------------------------------------------------------------
create table if not exists public.forecasts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  horizon text not null check (horizon in ('7d','30d','90d')),
  method text not null,
  generated_at timestamptz not null default now(),
  series jsonb not null -- [{date, predicted, lower, upper}]
);

create index if not exists idx_forecasts_business on public.forecasts(business_id, generated_at desc);

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS — placeholder for future monetization
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','business','professional','enterprise')),
  status text not null default 'active' check (status in ('active','cancelled','past_due')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Every business-scoped table: a user may only read/write rows belonging to
-- a business they own. This is the single most important security control
-- in the app — it is what makes cross-user data exposure impossible at the
-- database layer, regardless of application-layer bugs.
-- ============================================================================

alter table public.businesses enable row level security;
alter table public.uploads enable row level security;
alter table public.data_mappings enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.inventory enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.insights enable row level security;
alter table public.forecasts enable row level security;
alter table public.subscriptions enable row level security;

-- businesses: direct ownership check
drop policy if exists "businesses_owner_all" on public.businesses;
create policy "businesses_owner_all" on public.businesses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- helper pattern for every business-scoped child table:
-- the row's business_id must belong to a business owned by the caller.

drop policy if exists "uploads_owner_all" on public.uploads;
create policy "uploads_owner_all" on public.uploads
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "mappings_owner_all" on public.data_mappings;
create policy "mappings_owner_all" on public.data_mappings
  for all using (
    exists (
      select 1 from public.uploads u join public.businesses b on b.id = u.business_id
      where u.id = upload_id and b.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.uploads u join public.businesses b on b.id = u.business_id
      where u.id = upload_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "products_owner_all" on public.products;
create policy "products_owner_all" on public.products
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "customers_owner_all" on public.customers;
create policy "customers_owner_all" on public.customers
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "sales_owner_all" on public.sales;
create policy "sales_owner_all" on public.sales
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "expenses_owner_all" on public.expenses;
create policy "expenses_owner_all" on public.expenses
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "inventory_owner_all" on public.inventory;
create policy "inventory_owner_all" on public.inventory
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "snapshots_owner_all" on public.analytics_snapshots;
create policy "snapshots_owner_all" on public.analytics_snapshots
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "insights_owner_all" on public.insights;
create policy "insights_owner_all" on public.insights
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "forecasts_owner_all" on public.forecasts;
create policy "forecasts_owner_all" on public.forecasts
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "subscriptions_owner_all" on public.subscriptions;
create policy "subscriptions_owner_all" on public.subscriptions
  for all using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

-- ============================================================================
-- Public read policy for demo business only (lets the unauthenticated
-- /demo route show data without requiring login). The demo business is
-- flagged is_demo = true and seeded by the service role, never by users.
-- ============================================================================
drop policy if exists "businesses_public_demo_read" on public.businesses;
create policy "businesses_public_demo_read" on public.businesses
  for select using (is_demo = true);

drop policy if exists "sales_public_demo_read" on public.sales;
create policy "sales_public_demo_read" on public.sales
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_demo = true)
  );

drop policy if exists "products_public_demo_read" on public.products;
create policy "products_public_demo_read" on public.products
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_demo = true)
  );

drop policy if exists "expenses_public_demo_read" on public.expenses;
create policy "expenses_public_demo_read" on public.expenses
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_demo = true)
  );

drop policy if exists "customers_public_demo_read" on public.customers;
create policy "customers_public_demo_read" on public.customers
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_demo = true)
  );

drop policy if exists "inventory_public_demo_read" on public.inventory;
create policy "inventory_public_demo_read" on public.inventory
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.is_demo = true)
  );

-- ============================================================================
-- updated_at trigger for businesses
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();
