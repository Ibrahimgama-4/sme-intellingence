'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard/settings`
    });
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg font-semibold text-forest-900">SME Intelligence</Link>
        <h1 className="font-display text-2xl font-semibold text-forest-900 mt-8">Reset your password</h1>

        {sent ? (
          <p className="text-sm text-ink/70 mt-6">
            If an account exists for {email}, we&apos;ve sent a password reset link to that address.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-ink/70">Email</label>
              <input
                id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-forest-900/15 px-3.5 py-2.5 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500"
              />
            </div>
            {error && <p className="text-sm text-risk">{error}</p>}
            <button type="submit" className="w-full bg-forest-500 text-paper rounded-lg py-2.5 font-medium hover:bg-forest-600 transition-colors">
              Send reset link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
