'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useDemoData } from '@/lib/useBusinessData';
import { computeKpis, percentChange } from '@/lib/analytics/kpis';
import { historicalDailySeries } from '@/lib/analytics/forecasting';
import { generateInsights } from '@/lib/analytics/insights';
import { KpiCard } from '@/components/KpiCard';
import { InsightBadge } from '@/components/InsightBadge';

export default function DemoPage() {
  const { business, sales, expenses, loading, error } = useDemoData();

  const { periodStart, periodEnd } = useMemo(() => {
    if (sales.length === 0) return { periodStart: new Date(), periodEnd: new Date() };
    const end = sales.reduce((max, s) => (new Date(s.transaction_date) > max ? new Date(s.transaction_date) : max), new Date(0));
    const start = new Date(end); start.setDate(start.getDate() - 29);
    return { periodStart: start, periodEnd: end };
  }, [sales]);

  const kpis = useMemo(() => computeKpis(sales, expenses, periodStart, periodEnd), [sales, expenses, periodStart, periodEnd]);
  const daily = useMemo(() => historicalDailySeries(sales.filter((s) => new Date(s.transaction_date) >= periodStart)), [sales, periodStart]);
  const insights = useMemo(() => generateInsights(sales, expenses, '₦').slice(0, 4), [sales, expenses]);
  const fmt = (n: number) => `₦${Math.round(n).toLocaleString()}`;

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-forest-900 text-paper px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-semibold">SME Intelligence</Link>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-amber-500 text-forest-900 px-3 py-1 rounded-full font-medium">Demonstration data</span>
          <Link href="/signup" className="text-sm bg-forest-500 px-4 py-2 rounded-lg font-medium hover:bg-forest-600 transition-colors">Start your own</Link>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {loading && <div className="text-ink/50">Loading demo…</div>}
        {error && (
          <div className="bg-amber-100/60 border border-amber-300/40 rounded-xl2 p-6 text-sm text-forest-900">
            {error} Run <code className="bg-white px-1.5 py-0.5 rounded">npm run seed:demo</code> after setting up Supabase to populate it.
          </div>
        )}

        {business && (
          <>
            <h1 className="font-display text-2xl font-semibold text-forest-900">{business.business_name}</h1>
            <p className="text-sm text-ink/50 mt-0.5">{business.state}{business.lga ? `, ${business.lga}` : ''} · Demonstration data, not a real business</p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <KpiCard label="Revenue" value={fmt(kpis.revenue)} changePercent={percentChange(kpis.revenue, kpis.previousPeriod!.revenue)} />
              <KpiCard label="Expenses" value={fmt(kpis.expenses)} changePercent={percentChange(kpis.expenses, kpis.previousPeriod!.expenses)} invertColor />
              <KpiCard label="Gross Profit" value={fmt(kpis.grossProfit)} changePercent={percentChange(kpis.grossProfit, kpis.previousPeriod!.grossProfit)} />
              <KpiCard label="Profit Margin" value={`${kpis.profitMargin.toFixed(1)}%`} changePercent={percentChange(kpis.profitMargin, kpis.previousPeriod!.profitMargin)} />
              <KpiCard label="Transactions" value={kpis.transactions.toLocaleString()} changePercent={percentChange(kpis.transactions, kpis.previousPeriod!.transactions)} />
              <KpiCard label="Avg. Order Value" value={fmt(kpis.averageOrderValue)} changePercent={percentChange(kpis.averageOrderValue, kpis.previousPeriod!.averageOrderValue)} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2 bg-white rounded-xl2 border border-forest-900/8 p-5">
                <h2 className="font-display font-semibold text-forest-900">Revenue trend</h2>
                <div className="h-72 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,42,30,0.08)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Line type="monotone" dataKey="revenue" stroke="#1B7A4D" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
                <h2 className="font-display font-semibold text-forest-900">Insights</h2>
                <div className="mt-4 space-y-3">
                  {insights.map((insight, i) => <InsightBadge key={i} insight={insight} />)}
                </div>
              </div>
            </div>

            <div className="mt-8 text-center bg-forest-900 text-paper rounded-xl2 p-8">
              <h2 className="font-display text-xl font-semibold">This is what your business could look like</h2>
              <p className="text-paper/70 text-sm mt-2">Upload your own data and get a dashboard like this in minutes.</p>
              <Link href="/signup" className="inline-block mt-5 bg-forest-500 px-6 py-3 rounded-lg font-medium hover:bg-forest-600 transition-colors">
                Start Analyzing Your Business
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
