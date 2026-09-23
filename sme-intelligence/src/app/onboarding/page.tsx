'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NIGERIAN_STATES, BUSINESS_TYPES, BUSINESS_SIZES, CURRENCIES } from '@/lib/constants';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    business_name: '',
    business_type: 'retail',
    industry: '',
    state: 'Lagos',
    lga: '',
    currency: 'NGN',
    business_size: 'micro',
    employee_count: '',
    years_in_operation: ''
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
    });
  }, [router, supabase]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push('/login'); return; }

    const { error: insertError } = await supabase.from('businesses').insert({
      owner_id: userData.user.id,
      business_name: form.business_name,
      business_type: form.business_type,
      industry: form.industry || null,
      state: form.state,
      lga: form.lga || null,
      currency: form.currency,
      business_size: form.business_size,
      employee_count: form.employee_count ? Number(form.employee_count) : null,
      years_in_operation: form.years_in_operation ? Number(form.years_in_operation) : null
    });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    router.push('/dashboard/upload');
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-ink/50 mb-2">
          <span className="text-forest-600 font-medium">Step 1 of 3</span> · Create your business
        </div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Tell us about your business</h1>
        <p className="text-sm text-ink/60 mt-1">This helps us tailor the dashboard to how your business actually runs.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Field label="Business name">
            <input required value={form.business_name} onChange={(e) => update('business_name', e.target.value)}
              className="input" placeholder="e.g. Nasser Enterprise" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Business type">
              <select value={form.business_type} onChange={(e) => update('business_type', e.target.value)} className="input">
                {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Business size">
              <select value={form.business_size} onChange={(e) => update('business_size', e.target.value)} className="input">
                {BUSINESS_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Industry (optional)">
            <input value={form.industry} onChange={(e) => update('industry', e.target.value)} className="input" placeholder="e.g. FMCG, Groceries" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="State">
              <select value={form.state} onChange={(e) => update('state', e.target.value)} className="input">
                {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="LGA (optional)">
              <input value={form.lga} onChange={(e) => update('lga', e.target.value)} className="input" placeholder="e.g. Nassarawa" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Currency">
              <select value={form.currency} onChange={(e) => update('currency', e.target.value)} className="input">
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
            <Field label="Employees">
              <input type="number" min={0} value={form.employee_count} onChange={(e) => update('employee_count', e.target.value)} className="input" />
            </Field>
            <Field label="Years operating">
              <input type="number" min={0} step="0.5" value={form.years_in_operation} onChange={(e) => update('years_in_operation', e.target.value)} className="input" />
            </Field>
          </div>

          {error && <p className="text-sm text-risk">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-forest-500 text-paper rounded-lg py-2.5 font-medium hover:bg-forest-600 transition-colors disabled:opacity-60">
            {loading ? 'Saving…' : 'Continue to data upload'}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%; margin-top: 0.25rem; border-radius: 0.5rem;
          border: 1px solid rgba(15,42,30,0.15); padding: 0.6rem 0.85rem;
          background: white; outline: none;
        }
        .input:focus { border-color: #1B7A4D; box-shadow: 0 0 0 1px #1B7A4D; }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      {children}
    </label>
  );
}
