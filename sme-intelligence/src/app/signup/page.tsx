'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` }
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push('/onboarding');
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg font-semibold text-forest-900">SME Intelligence</Link>
        <h1 className="font-display text-2xl font-semibold text-forest-900 mt-8">Create your account</h1>
        <p className="text-sm text-ink/60 mt-1">Start understanding your business in a few minutes.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink/70">Email</label>
            <input
              id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3.5 py-2.5 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500"
              placeholder="you@business.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-ink/70">Password</label>
            <input
              id="password" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3.5 py-2.5 outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-500"
              placeholder="At least 8 characters"
            />
          </div>
          {error && <p className="text-sm text-risk">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-forest-500 text-paper rounded-lg py-2.5 font-medium hover:bg-forest-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-6 text-center">
          Already have an account? <Link href="/login" className="text-forest-600 font-medium">Log in</Link>
        </p>
      </div>
    </main>
  );
}
