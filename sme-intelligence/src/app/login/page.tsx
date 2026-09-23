'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError('Incorrect email or password.');
      return;
    }
    router.push(searchParams.get('redirectTo') ?? '/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg font-semibold text-forest-900">SME Intelligence</Link>
        <h1 className="font-display text-2xl font-semibold text-forest-900 mt-8">Welcome back</h1>
        <p className="text-sm text-ink/60 mt-1">Log in to see your business dashboard.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink/70">Email</label>
            <input
              id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3.5 py-2.5 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500"
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-sm font-medium text-ink/70">Password</label>
              <Link href="/reset-password" className="text-xs text-forest-600">Forgot password?</Link>
            </div>
            <input
              id="password" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3.5 py-2.5 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500"
            />
          </div>
          {error && <p className="text-sm text-risk">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-forest-500 text-paper rounded-lg py-2.5 font-medium hover:bg-forest-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-6 text-center">
          Don&apos;t have an account? <Link href="/signup" className="text-forest-600 font-medium">Sign up</Link>
        </p>
        <p className="text-sm text-ink/60 mt-2 text-center">
          Just exploring? <Link href="/demo" className="text-forest-600 font-medium">View the demo</Link>
        </p>
      </div>
    </main>
  );
}
