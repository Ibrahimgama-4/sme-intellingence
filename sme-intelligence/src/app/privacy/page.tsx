import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="font-display text-lg font-semibold text-forest-900">SME Intelligence</Link>
      <h1 className="font-display text-2xl font-semibold text-forest-900 mt-8">Privacy notice</h1>
      <div className="prose prose-sm mt-6 text-ink/70 space-y-4">
        <p>Your uploaded business data (sales, expenses, products, customers) is stored securely and is only ever accessible to your own account. This is enforced at the database level using Row Level Security, not just in the application code — meaning even a bug in our application cannot expose your data to another user.</p>
        <p>We do not use your business data to generate insights or benchmarks for any other user or business.</p>
        <p>You can export all of your data at any time from Settings, in JSON format.</p>
        <p>To request permanent deletion of your account and all associated data, contact support. This is intentionally not a single in-app click, to prevent accidental irreversible loss of your business records.</p>
        <p>The public demo (Nasser Enterprise) uses entirely synthetic, generated data — it is not a real business.</p>
      </div>
    </main>
  );
}
