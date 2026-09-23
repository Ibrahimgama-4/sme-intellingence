'use client';

import { useMemo } from 'react';
import { useBusinessData } from '@/lib/useBusinessData';
import { computeProductPerformance, findSlowMovingProducts } from '@/lib/analytics/kpis';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

export default function ProductsPage() {
  const { business, sales, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const performance = useMemo(() => computeProductPerformance(sales).sort((a, b) => b.revenue - a.revenue), [sales]);
  const slowMovers = useMemo(() => findSlowMovingProducts(sales, 30), [sales]);
  const mostProfitable = useMemo(() => [...performance].filter((p) => p.revenue > 0).sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 5), [performance]);

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (sales.length === 0) return <EmptyState title="No product data yet" text="Upload sales data with a product column to see performance by item." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Product Intelligence</h1>
      <p className="text-sm text-ink/60 mt-1">Revenue, quantity, and profit by product, all time.</p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
          <h2 className="font-display font-semibold text-forest-900">Most profitable products</h2>
          <p className="text-xs text-ink/50 mt-0.5">By profit margin (revenue − cost, as a % of revenue)</p>
          <ul className="mt-4 space-y-3">
            {mostProfitable.map((p) => (
              <li key={p.productName} className="flex justify-between text-sm">
                <span className="text-ink/80">{p.productName}</span>
                <span className="font-medium text-forest-600">{p.profitMargin.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
          <h2 className="font-display font-semibold text-forest-900">Slow-moving products</h2>
          <p className="text-xs text-ink/50 mt-0.5">No sales in 30+ days</p>
          {slowMovers.length === 0 ? (
            <p className="text-sm text-ink/50 mt-4">Nothing has gone quiet — every product has sold recently.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {slowMovers.slice(0, 6).map((p) => (
                <li key={p.productName} className="flex justify-between text-sm">
                  <span className="text-ink/80">{p.productName}</span>
                  <span className="font-medium text-amber-600">{p.daysSinceLastSale} days quiet</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl2 border border-forest-900/8 mt-6 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-ink/50 border-b border-forest-900/8">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium text-right">Revenue</th>
              <th className="px-5 py-3 font-medium text-right">Qty Sold</th>
              <th className="px-5 py-3 font-medium text-right">Profit</th>
              <th className="px-5 py-3 font-medium text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {performance.map((p) => (
              <tr key={p.productName} className="border-b border-forest-900/5 last:border-0">
                <td className="px-5 py-3 text-forest-900 font-medium">{p.productName}</td>
                <td className="px-5 py-3 text-ink/60">{p.category ?? '—'}</td>
                <td className="px-5 py-3 text-right">{fmt(p.revenue)}</td>
                <td className="px-5 py-3 text-right">{p.quantity.toLocaleString()}</td>
                <td className="px-5 py-3 text-right">{fmt(p.profit)}</td>
                <td className={`px-5 py-3 text-right font-medium ${p.profitMargin < 10 ? 'text-risk' : 'text-forest-600'}`}>{p.profitMargin.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {performance.some((p) => p.profitMargin < 15 && p.revenue > 0) && (
        <div className="mt-4 bg-amber-100/50 border border-amber-300/40 rounded-lg p-4 text-sm text-forest-900">
          <strong>So what:</strong> Some high-revenue products are carrying thin margins — worth reviewing pricing or supplier costs on those specifically, rather than across the board.
        </div>
      )}
    </div>
  );
}
