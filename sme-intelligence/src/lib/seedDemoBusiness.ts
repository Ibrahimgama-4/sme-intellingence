import type { SupabaseClient } from '@supabase/supabase-js';
import { generateDemoData, DEMO_BUSINESS } from './demoData';

export interface SeedResult {
  businessId: string;
  productsInserted: number;
  salesInserted: number;
  expensesInserted: number;
}

/**
 * Seeds (or re-seeds) the public "Nasser Enterprise" demo business.
 * SERVER-ONLY — must be called with a service-role Supabase client, since it
 * deliberately bypasses RLS to write a business owned by a dedicated,
 * unused demo auth account. Idempotent: any previous demo business is
 * removed first, so this is safe to re-run.
 *
 * Used by both scripts/seed-demo-data.ts (CLI, for local/dev use) and
 * src/app/api/admin/seed-demo/route.ts (for triggering entirely from
 * Vercel, with no local machine involved).
 */
export async function seedDemoBusiness(supabase: SupabaseClient): Promise<SeedResult> {
  const { data: existing } = await supabase.from('businesses').select('id').eq('is_demo', true);
  if (existing && existing.length > 0) {
    await supabase.from('businesses').delete().eq('is_demo', true);
  }

  const demoEmail = 'demo@sme-intelligence.local';
  let ownerId: string;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const found = existingUsers?.users.find((u) => u.email === demoEmail);
  if (found) {
    ownerId = found.id;
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: demoEmail,
      email_confirm: true,
      password: crypto.randomUUID(),
      user_metadata: { role: 'demo-account' }
    });
    if (error || !created.user) throw error ?? new Error('Failed to create demo auth user.');
    ownerId = created.user.id;
  }

  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .insert({ ...DEMO_BUSINESS, owner_id: ownerId, is_demo: true })
    .select()
    .single();
  if (bizErr || !business) throw bizErr ?? new Error('Failed to insert demo business.');

  const { products, sales, expenses } = generateDemoData(12);

  const { data: insertedProducts, error: prodErr } = await supabase
    .from('products')
    .insert(products.map((p) => ({ ...p, business_id: business.id })))
    .select();
  if (prodErr) throw prodErr;

  const productIdByName = new Map<string, string>();
  (insertedProducts ?? []).forEach((p: any) => productIdByName.set(p.name, p.id));

  const salesRows = sales.map((s: any) => ({
    business_id: business.id,
    transaction_date: s.transaction_date,
    product_id: productIdByName.get(s.product_name) ?? null,
    product_name: s.product_name,
    category: s.category,
    quantity: s.quantity,
    unit_price: s.unit_price,
    cost_price: s.cost_price,
    revenue: s.revenue,
    profit: s.profit,
    location: s.location
  }));
  await insertInBatches(supabase, 'sales', salesRows, 500);
  await insertInBatches(supabase, 'expenses', expenses.map((e) => ({ ...e, business_id: business.id })), 500);

  return {
    businessId: business.id,
    productsInserted: insertedProducts?.length ?? 0,
    salesInserted: salesRows.length,
    expensesInserted: expenses.length
  };
}

async function insertInBatches(supabase: SupabaseClient, table: string, rows: any[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw error;
  }
}
