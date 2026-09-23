'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useBusinessData } from '@/lib/useBusinessData';
import { historicalDailySeries } from '@/lib/analytics/forecasting';
import { salesByDayOfWeek, computeProductPerformance } from '@/lib/analytics/kpis';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

export default function SalesAnalyticsPage() {
  const { business, sales, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const daily = useMemo(() => historicalDailySeries(sales), [sales]);
  const byDay = useMemo(() => salesByDayOfWeek(sales), [sales]);
  const byCategory = useMemo(() => {
    const perf = computeProductPerformance(sales);
    const byCat = new Map<string, number>();
    perf.forEach((p) => byCat.set(p.category ?? 'Uncategorized', (byCat.get(p.category ?? 'Uncategorized') ?? 0) + p.revenue));
    return [...byCat.entries()].map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (sales.length === 0) return <EmptyState title="No sales data yet" text="Upload your sales spreadsheet to see analytics here." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;

  const bestDay = [...byDay].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Sales Analytics</h1>
      <p className="text-sm text-ink/60 mt-1">Daily trend, category mix, and weekly patterns across all uploaded data.</p>

      <div className="bg-white rounded-xl2 border border-forest-900/8 p-5 mt-6">
        <h2 className="font-display font-semibold text-forest-900">Daily revenue</h2>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily.slice(-90)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,42,30,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#16211C99' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#16211C99' }} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="revenue" fill="#1B7A4D" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
          <h2 className="font-display font-semibold text-forest-900">Sales by category</h2>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="#E8A33D" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
          <h2 className="font-display font-semibold text-forest-900">Sales by day of week</h2>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(0, 3)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="#1B7A4D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {bestDay && (
            <p className="text-xs text-ink/50 mt-3"><strong className="text-forest-900">So what:</strong> {bestDay.day} is your strongest day — consider staffing and stock levels accordingly.</p>
          )}
        </div>
      </div>
    </div>
  );
}
