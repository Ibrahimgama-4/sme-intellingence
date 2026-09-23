import type { SaleRecord, ExpenseRecord, KpiSet, InsightCard } from '@/types/domain';
import { computeKpis } from './kpis';
import { historicalDailySeries } from './forecasting';
import { generateInsights } from './insights';

export type RangeKey = '7d' | '30d' | '90d' | 'ytd';

export interface DashboardMetricsBundle {
  range: RangeKey;
  periodStart: string;
  periodEnd: string;
  kpis: KpiSet;
  dailySeries: { date: string; revenue: number }[];
  topInsights: InsightCard[];
  generatedAt: string;
}

export function resolvePeriod(sales: SaleRecord[], range: RangeKey): { periodStart: Date; periodEnd: Date } {
  const periodEnd = sales.reduce(
    (max, s) => (new Date(s.transaction_date) > max ? new Date(s.transaction_date) : max),
    new Date(0)
  );
  const periodStart = new Date(periodEnd);
  if (range === '7d') periodStart.setDate(periodStart.getDate() - 6);
  else if (range === '30d') periodStart.setDate(periodStart.getDate() - 29);
  else if (range === '90d') periodStart.setDate(periodStart.getDate() - 89);
  else periodStart.setMonth(0, 1);
  return { periodStart, periodEnd };
}

/**
 * Computes everything the main dashboard page needs in one pass. This is
 * the function that gets cached into analytics_snapshots — intentionally
 * scoped to just the dashboard's needs (KPIs, trend line, top insights)
 * rather than every possible metric, so the cached payload stays small and
 * fast to read back. Pages that need full row-level detail (Products,
 * Customers, the AI Assistant) still read raw rows directly — caching a
 * flattened rollup for those would either lose fidelity or balloon the
 * cached payload back up to raw-data size.
 */
export function buildDashboardBundle(
  sales: SaleRecord[],
  expenses: ExpenseRecord[],
  range: RangeKey,
  currency: string
): DashboardMetricsBundle {
  const { periodStart, periodEnd } = resolvePeriod(sales, range);
  const kpis = computeKpis(sales, expenses, periodStart, periodEnd);
  const dailySeries = historicalDailySeries(sales.filter((s) => new Date(s.transaction_date) >= periodStart));
  const topInsights = generateInsights(sales, expenses, currency).slice(0, 3);

  return {
    range,
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    kpis,
    dailySeries,
    topInsights,
    generatedAt: new Date().toISOString()
  };
}
