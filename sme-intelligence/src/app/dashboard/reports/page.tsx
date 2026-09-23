'use client';

import { useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { useBusinessData } from '@/lib/useBusinessData';
import { computeKpis, computeProductPerformance, computeExpenseBreakdown, findSlowMovingProducts } from '@/lib/analytics/kpis';
import { generateInsights } from '@/lib/analytics/insights';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

export default function ReportsPage() {
  const { business, sales, expenses, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const latestDate = useMemo(() => sales.reduce((max, s) => (new Date(s.transaction_date) > max ? new Date(s.transaction_date) : max), new Date(0)), [sales]);
  const periodStart = useMemo(() => { const d = new Date(latestDate); d.setDate(d.getDate() - 29); return d; }, [latestDate]);

  const kpis = useMemo(() => computeKpis(sales, expenses, periodStart, latestDate), [sales, expenses, periodStart, latestDate]);
  const topProducts = useMemo(() => computeProductPerformance(sales.filter((s) => new Date(s.transaction_date) >= periodStart)).sort((a, b) => b.revenue - a.revenue).slice(0, 10), [sales, periodStart]);
  const slowProducts = useMemo(() => findSlowMovingProducts(sales, 30), [sales]);
  const expenseBreakdown = useMemo(() => computeExpenseBreakdown(expenses.filter((e) => new Date(e.expense_date) >= periodStart)), [expenses, periodStart]);
  const insights = useMemo(() => generateInsights(sales, expenses, currency), [sales, expenses, currency]);

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (sales.length === 0) return <EmptyState title="No data to report on yet" text="Upload your business data to generate downloadable reports." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;

  function downloadCsv() {
    const lines: string[] = [];
    lines.push(`SME Intelligence Report — ${business?.business_name ?? ''}`);
    lines.push(`Period: ${periodStart.toISOString().slice(0, 10)} to ${latestDate.toISOString().slice(0, 10)}`);
    lines.push('');
    lines.push('Metric,Value');
    lines.push(`Revenue,${kpis.revenue}`);
    lines.push(`Expenses,${kpis.expenses}`);
    lines.push(`Gross Profit,${kpis.grossProfit}`);
    lines.push(`Profit Margin %,${kpis.profitMargin.toFixed(1)}`);
    lines.push(`Transactions,${kpis.transactions}`);
    lines.push(`Average Order Value,${kpis.averageOrderValue.toFixed(0)}`);
    lines.push('');
    lines.push('Top Products,Revenue,Quantity,Profit Margin %');
    topProducts.forEach((p) => lines.push(`${csvSafe(p.productName)},${p.revenue},${p.quantity},${p.profitMargin.toFixed(1)}`));
    lines.push('');
    lines.push('Expense Category,Amount,% of Total');
    expenseBreakdown.forEach((e) => lines.push(`${csvSafe(e.category)},${e.amount},${e.percentOfTotal.toFixed(1)}`));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sme-intelligence-report-${latestDate.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">Monthly Report</h1>
          <p className="text-sm text-ink/60 mt-1">Executive summary covering the last 30 days of activity.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCsv} className="flex items-center gap-2 text-sm border border-forest-900/15 px-4 py-2 rounded-lg hover:bg-forest-50 transition-colors">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm bg-forest-500 text-paper px-4 py-2 rounded-lg hover:bg-forest-600 transition-colors">
            <Printer size={15} /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Printable report body */}
      <div className="bg-white rounded-xl2 border border-forest-900/8 p-8 mt-6 print:border-0 print:shadow-none">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-display text-xl font-semibold text-forest-900">{business?.business_name}</h2>
            <p className="text-xs text-ink/50">{business?.state}{business?.lga ? `, ${business.lga}` : ''}</p>
          </div>
          <div className="text-right text-xs text-ink/50">
            {periodStart.toISOString().slice(0, 10)} – {latestDate.toISOString().slice(0, 10)}
          </div>
        </div>

        <h3 className="font-display font-semibold text-forest-900 mt-6">Executive summary</h3>
        <p className="text-sm text-ink/70 mt-2">
          Revenue of {fmt(kpis.revenue)} against {fmt(kpis.expenses)} in expenses, leaving a gross profit of {fmt(kpis.grossProfit)}
          {' '}({kpis.profitMargin.toFixed(1)}% margin) across {kpis.transactions.toLocaleString()} transactions.
        </p>

        <h3 className="font-display font-semibold text-forest-900 mt-6">Top products</h3>
        <table className="w-full text-sm mt-2">
          <thead><tr className="text-left text-ink/50 border-b border-forest-900/8"><th className="py-1.5">Product</th><th className="text-right">Revenue</th><th className="text-right">Margin</th></tr></thead>
          <tbody>{topProducts.map((p) => (
            <tr key={p.productName} className="border-b border-forest-900/5"><td className="py-1.5">{p.productName}</td><td className="text-right">{fmt(p.revenue)}</td><td className="text-right">{p.profitMargin.toFixed(1)}%</td></tr>
          ))}</tbody>
        </table>

        {slowProducts.length > 0 && (
          <>
            <h3 className="font-display font-semibold text-forest-900 mt-6">Slow-moving products</h3>
            <p className="text-sm text-ink/70 mt-2">{slowProducts.map((s) => s.productName).join(', ')}</p>
          </>
        )}

        <h3 className="font-display font-semibold text-forest-900 mt-6">Expense breakdown</h3>
        <table className="w-full text-sm mt-2">
          <thead><tr className="text-left text-ink/50 border-b border-forest-900/8"><th className="py-1.5">Category</th><th className="text-right">Amount</th><th className="text-right">%</th></tr></thead>
          <tbody>{expenseBreakdown.map((e) => (
            <tr key={e.category} className="border-b border-forest-900/5"><td className="py-1.5 capitalize">{e.category}</td><td className="text-right">{fmt(e.amount)}</td><td className="text-right">{e.percentOfTotal.toFixed(0)}%</td></tr>
          ))}</tbody>
        </table>

        <h3 className="font-display font-semibold text-forest-900 mt-6">Recommendations</h3>
        <ul className="text-sm text-ink/70 mt-2 space-y-1.5 list-disc pl-5">
          {insights.filter((i) => i.type !== 'positive').slice(0, 5).map((i, idx) => <li key={idx}>{i.detail}</li>)}
          {insights.filter((i) => i.type !== 'positive').length === 0 && <li>No urgent issues detected this period.</li>}
        </ul>
      </div>
    </div>
  );
}

function csvSafe(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}
