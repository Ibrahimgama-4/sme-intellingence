'use client';

import { useMemo } from 'react';
import { useBusinessData } from '@/lib/useBusinessData';
import { computeCustomerPerformance } from '@/lib/analytics/kpis';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

export default function CustomersPage() {
  const { business, sales, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const customers = useMemo(() => computeCustomerPerformance(sales), [sales]);

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (customers.length === 0) {
    return <EmptyState title="No customer data yet" text="Upload a spreadsheet with a customer name column to unlock customer analytics." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;
  }

  const segments = {
    highValue: customers.filter((c) => c.totalRevenue >= percentileValue(customers, 0.8)),
    frequent: customers.filter((c) => c.purchaseCount >= 5),
    occasional: customers.filter((c) => c.purchaseCount < 5 && c.purchaseCount >= 2),
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Customer Analytics</h1>
      <p className="text-sm text-ink/60 mt-1">{customers.length} known customers across your uploaded history.</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <StatCard label="High-value customers" value={segments.highValue.length} sub="Top 20% by total spend" />
        <StatCard label="Frequent customers" value={segments.frequent.length} sub="5+ purchases" />
        <StatCard label="Occasional customers" value={segments.occasional.length} sub="2–4 purchases" />
      </div>

      <div className="bg-white rounded-xl2 border border-forest-900/8 mt-6 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-ink/50 border-b border-forest-900/8">
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium text-right">Total Spend</th>
              <th className="px-5 py-3 font-medium text-right">Purchases</th>
              <th className="px-5 py-3 font-medium text-right">Avg. Order</th>
              <th className="px-5 py-3 font-medium text-right">Last Purchase</th>
            </tr>
          </thead>
          <tbody>
            {customers.slice(0, 25).map((c) => (
              <tr key={c.customerName} className="border-b border-forest-900/5 last:border-0">
                <td className="px-5 py-3 text-forest-900 font-medium">{c.customerName}</td>
                <td className="px-5 py-3 text-right">{fmt(c.totalRevenue)}</td>
                <td className="px-5 py-3 text-right">{c.purchaseCount}</td>
                <td className="px-5 py-3 text-right">{fmt(c.averageOrderValue)}</td>
                <td className="px-5 py-3 text-right text-ink/60">{c.lastPurchaseDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function percentileValue(customers: { totalRevenue: number }[], p: number) {
  const sorted = [...customers].map((c) => c.totalRevenue).sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
      <div className="text-sm text-ink/50">{label}</div>
      <div className="font-display text-2xl font-semibold text-forest-900 mt-1">{value}</div>
      <div className="text-xs text-ink/40 mt-1">{sub}</div>
    </div>
  );
}
