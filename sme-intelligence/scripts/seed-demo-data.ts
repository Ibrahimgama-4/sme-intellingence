/**
 * OPTIONAL local/CLI path for seeding demo data. If you're running
 * everything from Vercel (no local machine), you don't need this file —
 * use POST /api/admin/seed-demo instead. See README.md → "Seeding demo
 * data entirely from Vercel".
 *
 * Run with: npm run seed:demo
 * Requires SUPABASE_SERVICE_ROLE_KEY in your environment.
 */
import { createClient } from '@supabase/supabase-js';
import { seedDemoBusiness } from '../src/lib/seedDemoBusiness';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

seedDemoBusiness(supabase)
  .then((result) => {
    console.log('Demo data seeded:', result);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
