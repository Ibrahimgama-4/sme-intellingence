'use client';

import { useMemo } from 'react';
import { useBusinessData } from '@/lib/useBusinessData';
import { generateInsights } from '@/lib/analytics/insights';
import { computeHealthScore } from '@/lib/analytics/healthScore';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';
import { InsightBadge } from '@/components/InsightBadge';
import { HealthScoreCard } from '@/components/HealthScoreCard';

export default function InsightsPage() {
  const { business, sales, expenses, inventory, products, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const insights = useMemo(() => generateInsights(sales, expenses, currency), [sales, expenses, currency]);
  const healthScore = useMemo(() => computeHealthScore(sales, expenses, inventory, products), [sales, expenses, inventory, products]);

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (sales.length === 0) return <EmptyState title="No insights yet" text="Upload data and we'll automatically surface trends, anomalies, and changes worth your attention." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;

  const positive = insights.filter((i) => i.type === 'positive');
  const negative = insights.filter((i) => i.type === 'negative');
  const anomalies = insights.filter((i) => i.type === 'anomaly');

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Business Insights</h1>
      <p className="text-sm text-ink/60 mt-1">Automatically detected from your last 30 days of data, compared with the 30 days before that.</p>

      <div className="mt-6">
        <HealthScoreCard score={healthScore} />
      </div>

      {insights.length === 0 ? (
        <div className="mt-8 text-sm text-ink/50">Nothing notable to report — your numbers are steady.</div>
      ) : (
        <div className="mt-8 space-y-8">
          {positive.length > 0 && (
            <Section title="Positive trends" items={positive} />
          )}
          {negative.length > 0 && (
            <Section title="Needs attention" items={negative} />
          )}
          {anomalies.length > 0 && (
            <Section title="Anomalies" items={anomalies} />
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: ReturnType<typeof generateInsights> }) {
  return (
    <div>
      <h2 className="font-display font-semibold text-forest-900 text-base mb-3">{title}</h2>
      <div className="space-y-3">
        {items.map((insight, i) => <InsightBadge key={i} insight={insight} />)}
      </div>
    </div>
  );
}
