import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { seedDemoBusiness } from '@/lib/seedDemoBusiness';

// This inserts thousands of rows in batches, which can take longer than the
// default serverless timeout. 60s covers it comfortably on a Vercel Pro plan;
// on the Hobby plan, functions are capped at 10s regardless of this setting —
// see the "If this endpoint times out" note in the deployment guide.
export const maxDuration = 60;
export const runtime = 'nodejs'; // supabase-js's admin/auth APIs need the Node runtime, not Edge.

/**
 * POST /api/admin/seed-demo
 *
 * Seeds (or re-seeds) the public demo business, runnable entirely from
 * Vercel's infrastructure — no local machine, no CLI script required.
 *
 * Protected by a shared secret (SEED_SECRET, set only in Vercel's
 * environment variables, never NEXT_PUBLIC_) so this expensive,
 * data-deleting endpoint can't be triggered by a stranger who finds the URL.
 * Call it with:
 *
 *   curl -X POST https://<your-app>.vercel.app/api/admin/seed-demo \
 *     -H "x-seed-secret: <the value you set for SEED_SECRET>"
 *
 * or from any browser-based terminal (GitHub Codespaces, Vercel's own
 * "Functions" tab doesn't support this, so use curl/Postman/browser fetch).
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.SEED_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'SEED_SECRET is not configured on this deployment. Set it in Vercel → Project Settings → Environment Variables, then redeploy.' },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get('x-seed-secret');
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid or missing x-seed-secret header.' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const result = await seedDemoBusiness(supabase);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Seeding failed.' }, { status: 500 });
  }
}
