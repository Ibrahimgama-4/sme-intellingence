'use client';

import { useMemo } from 'react';
import { useBusinessData } from '@/lib/useBusinessData';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

export default function InventoryPage() {
  const { business, sales, products, inventory, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const dailySalesByProduct = useMemo(() => {
    const byProduct = new Map<string, { qty: number; days: Set<string> }>();
    sales.forEach((s) => {
      const key = s.product_name ?? 'Unspecified';
      const entry = byProduct.get(key) ?? { qty: 0, days: new Set<string>() };
      entry.qty += s.quantity;
      entry.days.add(s.transaction_date.slice(0, 10));
      byProduct.set(key, entry);
    });
    const result = new Map<string, number>();
    byProduct.forEach((v, k) => result.set(k, v.qty / Math.max(1, v.days.size)));
    return result;
  }, [sales]);

  const rows = useMemo(() => {
    return products.map((p) => {
      const latestStock = inventory.filter((i) => i.product_id === p.id).sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0]?.stock_level
        ?? p.current_stock ?? null;
      const avgDaily = dailySalesByProduct.get(p.name) ?? 0;
      const coverageDays = latestStock !== null && avgDaily > 0 ? latestStock / avgDaily : null;
      return {
        name: p.name,
        stock: latestStock,
        stockValue: latestStock !== null && p.unit_cost ? latestStock * p.unit_cost : null,
        avgDaily,
        coverageDays
      };
    });
  }, [products, inventory, dailySalesByProduct]);

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (products.length === 0) {
    return <EmptyState title="Inventory analysis requires stock-level data" text="No product or stock information has been uploaded yet. Upload a file with a product and stock column to unlock this page." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;
  }

  const hasStockData = rows.some((r) => r.stock !== null);
  if (!hasStockData) {
    return <EmptyState title="Inventory analysis requires stock-level data" text="We found products in your data, but no current stock quantities. Include a stock/quantity-on-hand column and re-upload to see restocking recommendations." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Inventory Intelligence</h1>
      <p className="text-sm text-ink/60 mt-1">Stock coverage estimated from average daily sales over your uploaded history.</p>

      <div className="grid gap-4 mt-6">
        {rows.filter((r) => r.stock !== null).map((r) => (
          <div key={r.name} className="bg-white rounded-xl2 border border-forest-900/8 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-display font-semibold text-forest-900">{r.name}</div>
              <div className="text-xs text-ink/50 mt-0.5">
                Current stock: {r.stock} {r.stockValue !== null && <>· Value: {fmt(r.stockValue)}</>}
              </div>
            </div>
            <div className="text-right">
              {r.coverageDays !== null ? (
                <>
                  <div className="text-sm font-medium text-forest-900">{r.coverageDays.toFixed(1)} days of stock left</div>
                  <div className={`text-xs mt-0.5 ${r.coverageDays < 5 ? 'text-risk' : r.coverageDays > 45 ? 'text-amber-600' : 'text-forest-600'}`}>
                    {r.coverageDays < 5 ? 'Consider restocking soon' : r.coverageDays > 45 ? 'Possibly overstocked' : 'Healthy coverage'}
                  </div>
                </>
              ) : (
                <div className="text-xs text-ink/40">No recent sales to estimate coverage</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
