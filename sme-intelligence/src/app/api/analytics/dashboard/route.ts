import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildDashboardBundle, resolvePeriod, type RangeKey } from '@/lib/analytics/snapshotEngine';
import type { SaleRecord, ExpenseRecord } from '@/types/domain';

const VALID_RANGES: RangeKey[] = ['7d', '30d', '90d', 'ytd'];

/**
 * GET /api/analytics/dashboard?range=30d
 *
 * Cache-first dashboard metrics endpoint, backed by the analytics_snapshots
 * table. This replaces having the browser fetch every raw sales/expense row
 * just to compute KPIs — instead, computation happens once server-side and
 * the small aggregated bundle is cached and reused until new data arrives.
 *
 * Freshness rule: a cached snapshot is valid only if it was generated AFTER
 * the most recently inserted sales row for this business. Since sales rows
 * are effectively append-only (created via upload import), a new upload
 * naturally produces a later `created_at` than any existing snapshot,
 * which invalidates the cache without needing an explicit "dirty" flag.
 * The upload flow also proactively clears snapshots on import completion
 * (see /api/analytics/invalidate) so the very next dashboard load doesn't
 * even pay the one freshness-check query.
 *
 * Runs with the caller's own session (not the service role) — Row Level
 * Security still governs every read and write here, so this endpoint can
 * only ever see and cache the signed-in user's own business.
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const rangeParam = request.nextUrl.searchParams.get('range') ?? '30d';
  const range: RangeKey = VALID_RANGES.includes(rangeParam as RangeKey) ? (rangeParam as RangeKey) : '30d';

  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (bizError || !businesses || businesses.length === 0) {
    return NextResponse.json({ error: 'No business found for this account.' }, { status: 404 });
  }
  const business = businesses[0];

  // Cheap fingerprint of "current data version": the most recent sales insert.
  const { data: latestSale } = await supabase
    .from('sales')
    .select('created_at, transaction_date')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestSale) {
    return NextResponse.json({ business, bundle: null, cacheHit: false, reason: 'no_sales_data' });
  }

  const { periodStart, periodEnd } = await resolvePeriodFromDb(supabase, business.id, range);

  const { data: existingSnapshot } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('business_id', business.id)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isFresh = existingSnapshot && new Date(existingSnapshot.created_at) >= new Date(latestSale.created_at)
    && (existingSnapshot.metrics as any)?.range === range;

  if (isFresh) {
    return NextResponse.json({ business, bundle: existingSnapshot.metrics, cacheHit: true });
  }

  // Cache miss or stale — recompute from raw rows, then cache the result.
  const [salesRes, expensesRes] = await Promise.all([
    supabase.from('sales').select('*').eq('business_id', business.id).order('transaction_date', { ascending: true }),
    supabase.from('expenses').select('*').eq('business_id', business.id).order('expense_date', { ascending: true })
  ]);

  const sales = (salesRes.data ?? []) as SaleRecord[];
  const expenses = (expensesRes.data ?? []) as ExpenseRecord[];

  const bundle = buildDashboardBundle(sales, expenses, range, currencySymbol(business.currency));

  // Replace any prior snapshot for this exact period so the table doesn't
  // accumulate stale rows for the same window.
  await supabase
    .from('analytics_snapshots')
    .delete()
    .eq('business_id', business.id)
    .eq('period_start', bundle.periodStart)
    .eq('period_end', bundle.periodEnd);

  await supabase.from('analytics_snapshots').insert({
    business_id: business.id,
    period_start: bundle.periodStart,
    period_end: bundle.periodEnd,
    metrics: bundle
  });

  return NextResponse.json({ business, bundle, cacheHit: false });
}

async function resolvePeriodFromDb(supabase: ReturnType<typeof createServerSupabaseClient>, businessId: string, range: RangeKey) {
  // We only need the latest transaction date to anchor the period — pulling
  // every row just for this would defeat the point of caching.
  const { data: latest } = await supabase
    .from('sales')
    .select('transaction_date')
    .eq('business_id', businessId)
    .order('transaction_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const anchor = latest ? new Date(latest.transaction_date) : new Date();
  const { periodStart, periodEnd } = resolvePeriod([{ transaction_date: anchor.toISOString() } as SaleRecord], range);
  return { periodStart: periodStart.toISOString().slice(0, 10), periodEnd: periodEnd.toISOString().slice(0, 10) };
}

function currencySymbol(code: string) {
  const map: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', GHS: '₵' };
  return map[code] ?? '₦';
}
