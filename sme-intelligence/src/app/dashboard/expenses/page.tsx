'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useBusinessData } from '@/lib/useBusinessData';
import { computeExpenseBreakdown } from '@/lib/analytics/kpis';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

const COLORS = ['#1B7A4D', '#E8A33D', '#166640', '#F0C077', '#0F2A1E', '#7FB89A', '#C0392B', '#124F33', '#B87A22'];

export default function ExpensesPage() {
  const { business, expenses, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const breakdown = useMemo(() => computeExpenseBreakdown(expenses), [expenses]);
  const total = breakdown.reduce((s, b) => s + b.amount, 0);

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (expenses.length === 0) {
    return <EmptyState title="No expense data yet" text="Upload a spreadsheet with an expense amount and category column to see this page." ctaHref="/dashboard/upload" ctaLabel="Upload expense data" />;
  }

  const largest = breakdown[0];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Expense Analytics</h1>
      <p className="text-sm text-ink/60 mt-1">Total expenses: <span className="font-medium text-forest-900">{fmt(total)}</span></p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
          <h2 className="font-display font-semibold text-forest-900">By category</h2>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakdown} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={90}>
                  {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
          <h2 className="font-display font-semibold text-forest-900">Breakdown</h2>
          <ul className="mt-4 space-y-3">
            {breakdown.map((b, i) => (
              <li key={b.category} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="capitalize text-ink/80">{b.category}</span>
                </span>
                <span className="text-right">
                  <span className="font-medium text-forest-900">{fmt(b.amount)}</span>
                  <span className="text-ink/40 ml-2 text-xs">{b.percentOfTotal.toFixed(0)}%</span>
                </span>
              </li>
            ))}
          </ul>
          {largest && (
            <p className="text-xs text-ink/50 mt-5 border-t border-forest-900/8 pt-4">
              <strong className="text-forest-900">So what:</strong> {capitalize(largest.category)} is your largest expense at {largest.percentOfTotal.toFixed(0)}% of total spend — review it first if you're looking to cut costs.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
