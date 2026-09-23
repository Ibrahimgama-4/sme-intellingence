import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/analytics/invalidate
 *
 * Clears all cached analytics_snapshots rows for the caller's business.
 * Called right after a successful data import so the dashboard's very next
 * load recomputes fresh rather than relying solely on the created_at
 * freshness check in /api/analytics/dashboard (belt-and-suspenders: it
 * saves that one lookup query and guarantees immediacy for the user who
 * just uploaded data and is about to look at their dashboard).
 */
export async function POST() {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: businesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id).limit(1);
  const businessId = businesses?.[0]?.id;
  if (!businessId) return NextResponse.json({ error: 'No business found.' }, { status: 404 });

  const { error } = await supabase.from('analytics_snapshots').delete().eq('business_id', businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invalidated: true });
}
