'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBusinessData } from '@/lib/useBusinessData';

export default function SettingsPage() {
  const supabase = createClient();
  const { business, sales, expenses } = useBusinessData();
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) { setPasswordMsg('Password must be at least 8 characters.'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordMsg(error ? error.message : 'Password updated.');
    if (!error) setNewPassword('');
  }

  function exportData() {
    const payload = { business, sales, expenses, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sme-intelligence-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Settings</h1>
      </div>

      <section>
        <h2 className="font-display font-semibold text-forest-900">Change password</h2>
        <form onSubmit={handlePasswordChange} className="mt-3 flex gap-2">
          <input
            type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password" className="flex-1 rounded-lg border border-forest-900/15 px-3.5 py-2.5 outline-none focus:border-forest-500"
          />
          <button type="submit" className="bg-forest-500 text-paper px-4 py-2.5 rounded-lg font-medium hover:bg-forest-600 transition-colors">Update</button>
        </form>
        {passwordMsg && <p className="text-sm text-ink/60 mt-2">{passwordMsg}</p>}
      </section>

      <section>
        <h2 className="font-display font-semibold text-forest-900">Your data</h2>
        <p className="text-sm text-ink/60 mt-1">Uploaded business data is only ever visible to your account, enforced at the database level.</p>
        <button onClick={exportData} className="mt-3 border border-forest-900/15 px-4 py-2.5 rounded-lg font-medium hover:bg-forest-50 transition-colors text-sm">
          Export all my data (JSON)
        </button>
      </section>

      <section>
        <h2 className="font-display font-semibold text-risk">Danger zone</h2>
        <p className="text-sm text-ink/60 mt-1">To permanently delete your account and all business data, contact support — this action cannot be undone and is intentionally not a single click.</p>
      </section>
    </div>
  );
}
