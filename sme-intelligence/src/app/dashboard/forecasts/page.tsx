'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, ComposedChart } from 'recharts';
import { useBusinessData } from '@/lib/useBusinessData';
import { forecastRevenue, historicalDailySeries } from '@/lib/analytics/forecasting';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';

const HORIZONS = [
  { key: 7 as const, label: 'Next 7 days' },
  { key: 30 as const, label: 'Next 30 days' },
  { key: 90 as const, label: 'Next 3 months' }
];

export default function ForecastsPage() {
  const { business, sales, loading } = useBusinessData();
  const currency = CURRENCY_SYMBOLS[business?.currency ?? 'NGN'] ?? '₦';
  const [horizon, setHorizon] = useState<7 | 30 | 90>(30);
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  const forecast = useMemo(() => forecastRevenue(sales, horizon), [sales, horizon]);
  const history = useMemo(() => historicalDailySeries(sales).slice(-60), [sales]);

  if (loading) return <div className="p-8 text-ink/50">Loading…</div>;
  if (sales.length === 0) return <EmptyState title="No sales data yet" text="Upload your sales data to generate a forecast." ctaHref="/dashboard/upload" ctaLabel="Upload data" />;

  if (!forecast) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <h1 className="font-display text-2xl font-semibold text-forest-900">Forecasts</h1>
        <div className="mt-6 bg-amber-100/50 border border-amber-300/40 rounded-xl2 p-6 text-sm text-forest-900">
          You need at least 7 days of sales history to generate a responsible forecast. Keep uploading data and check back soon.
        </div>
      </div>
    );
  }

  const combined = [
    ...history.map((h) => ({ date: h.date, actual: h.revenue })),
    ...forecast.series.map((f) => ({ date: f.date, predicted: f.predicted, lower: f.lower, upper: f.upper }))
  ];

  const totalPredicted = forecast.series.reduce((s, f) => s + f.predicted, 0);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">Sales Forecast</h1>
          <p className="text-sm text-ink/60 mt-1">Method: {forecast.method}. Forecasts are estimates based on historical patterns, not guarantees.</p>
        </div>
        <div className="flex gap-1.5 bg-white border border-forest-900/10 rounded-lg p-1">
          {HORIZONS.map((h) => (
            <button key={h.key} onClick={() => setHorizon(h.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${horizon === h.key ? 'bg-forest-900 text-paper' : 'text-ink/60 hover:bg-forest-50'}`}>
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl2 border border-forest-900/8 p-5 mt-6">
        <div className="text-sm text-ink/50">Projected revenue over the next {horizon} days</div>
        <div className="font-display text-3xl font-semibold text-forest-900 mt-1">{fmt(totalPredicted)}</div>

        <div className="h-80 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,42,30,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#16211C99' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#16211C99' }} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#E8A33D" fillOpacity={0.15} name="Upper bound" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#FAF8F3" fillOpacity={1} name="Lower bound" />
              <Line type="monotone" dataKey="actual" stroke="#1B7A4D" strokeWidth={2} dot={false} name="Actual" />
              <Line type="monotone" dataKey="predicted" stroke="#E8A33D" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Forecast" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-ink/50 mt-4">
          The shaded band shows a naive uncertainty range based on recent volatility — treat it as a rough guide for planning stock and cash flow, not a precise prediction.
        </p>
      </div>
    </div>
  );
}
