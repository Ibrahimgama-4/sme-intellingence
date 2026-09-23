'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCurrentBusiness } from '@/lib/useBusinessData';
import { NIGERIAN_STATES, BUSINESS_TYPES, BUSINESS_SIZES, CURRENCIES } from '@/lib/constants';

export default function BusinessProfilePage() {
  const { business, loading } = useCurrentBusiness();
  const supabase = createClient();
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (business) setForm(business); }, [business]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    await supabase.from('businesses').update({
      business_name: form.business_name,
      business_type: form.business_type,
      industry: form.industry,
      state: form.state,
      lga: form.lga,
      currency: form.currency,
      business_size: form.business_size,
      employee_count: form.employee_count,
      years_in_operation: form.years_in_operation
    }).eq('id', business.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !form) return <div className="p-8 text-ink/50">Loading…</div>;

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Business Profile</h1>
      <p className="text-sm text-ink/60 mt-1">Update your business details.</p>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        <Field label="Business name">
          <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business type">
            <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} className="input">
              {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Business size">
            <select value={form.business_size ?? 'micro'} onChange={(e) => setForm({ ...form, business_size: e.target.value })} className="input">
              {BUSINESS_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State">
            <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input">
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="LGA">
            <input value={form.lga ?? ''} onChange={(e) => setForm({ ...form, lga: e.target.value })} className="input" />
          </Field>
        </div>
        <Field label="Currency">
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input">
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>

        <button type="submit" className="bg-forest-500 text-paper px-5 py-2.5 rounded-lg font-medium hover:bg-forest-600 transition-colors">
          Save changes
        </button>
        {saved && <span className="ml-3 text-sm text-forest-600">Saved.</span>}
      </form>

      <style jsx global>{`
        .input { width: 100%; margin-top: 0.25rem; border-radius: 0.5rem; border: 1px solid rgba(15,42,30,0.15); padding: 0.6rem 0.85rem; background: white; outline: none; }
        .input:focus { border-color: #1B7A4D; box-shadow: 0 0 0 1px #1B7A4D; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium text-ink/70">{label}</span>{children}</label>;
}
