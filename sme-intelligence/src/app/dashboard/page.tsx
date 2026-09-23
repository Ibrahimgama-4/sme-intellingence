'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useDashboardSnapshot } from '@/lib/useDashboardSnapshot';
import type { RangeKey } from '@/lib/analytics/snapshotEngine';
import { percentChange } from '@/lib/analytics/kpis';
import { KpiCard } from '@/components/KpiCard';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';
import { InsightBadge } from '@/components/InsightBadge';

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', ytd: 'Year to date'
};

export default function DashboardPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const { business, bundle, loading, error, noData } = useDashboardSnapshot(range);
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  if (loading && !bundle) return <div className="p-8 text-ink/50">Loading your dashboard…</div>;
  if (error || !business) return <EmptyState title="No business found" text={error ?? 'Please complete onboarding first.'} ctaHref="/onboarding" ctaLabel="Set up your business" />;
  if (noData || !bundle) {
    return (
      <EmptyState
        title="Your dashboard is ready — upload data to see it come alive"
        text="Once you upload a sales spreadsheet, this page will show your revenue, profit, and trends automatically."
        ctaHref="/dashboard/upload" ctaLabel="Upload your data"
      />
    );
  }

  const { kpis, dailySeries, topInsights } = bundle;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">{business.business_name}</h1>
          <p className="text-sm text-ink/50 mt-0.5">{business.state}{business.lga ? `, ${business.lga}` : ''}</p>
        </div>
        <div className="flex gap-1.5 bg-white border border-forest-900/10 rounded-lg p-1">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
            <button
              key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${range === r ? 'bg-forest-900 text-paper' : 'text-ink/60 hover:bg-forest-50'}`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

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
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,42,30,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#16211C99' }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#16211C99' }} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(d) => d} />
                <Line type="monotone" dataKey="revenue" stroke="#1B7A4D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl2 border border-forest-900/8 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-forest-900">Latest insights</h2>
            <Link href="/dashboard/insights" className="text-xs text-forest-600 font-medium">See all</Link>
          </div>
          <div className="mt-4 space-y-3">
            {topInsights.length === 0
              ? <p className="text-sm text-ink/50">No notable changes detected yet.</p>
              : topInsights.map((insight, i) => <InsightBadge key={i} insight={insight} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
