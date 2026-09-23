import type { SaleRecord, ExpenseRecord, InsightCard } from '@/types/domain';
import { computeKpis, percentChange, computeProductPerformance, computeExpenseBreakdown, findSlowMovingProducts } from './kpis';

/**
 * Generates explainable, data-grounded insight cards by comparing the most
 * recent complete period against the one before it, and scanning for
 * product/category-level anomalies. Every insight cites the specific
 * numbers behind it — nothing here is an unsupported AI claim.
 */
export function generateInsights(
  sales: SaleRecord[],
  expenses: ExpenseRecord[],
  currency = '₦'
): InsightCard[] {
  const insights: InsightCard[] = [];
  if (sales.length === 0) return insights;

  const latestDate = sales.reduce(
    (max, s) => (new Date(s.transaction_date) > max ? new Date(s.transaction_date) : max), new Date(0)
  );
  const periodEnd = latestDate;
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 29); // trailing 30-day window

  const kpis = computeKpis(sales, expenses, periodStart, periodEnd);
  const prev = kpis.previousPeriod!;

  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  // --- revenue trend ---
  const revChange = percentChange(kpis.revenue, prev.revenue);
  if (revChange !== null && Math.abs(revChange) >= 5) {
    insights.push({
      type: revChange > 0 ? 'positive' : 'negative',
      title: `Revenue ${revChange > 0 ? 'increased' : 'decreased'} ${Math.abs(revChange).toFixed(1)}%`,
      detail: `Revenue was ${fmt(kpis.revenue)} in the last 30 days, compared with ${fmt(prev.revenue)} in the previous 30 days.`,
      metricRef: { metric: 'revenue', current: kpis.revenue, previous: prev.revenue }
    });
  }

  // --- margin compression ---
  const marginChange = kpis.profitMargin - prev.profitMargin;
  if (Math.abs(marginChange) >= 3) {
    insights.push({
      type: marginChange > 0 ? 'positive' : 'negative',
      title: `Profit margin ${marginChange > 0 ? 'improved' : 'compressed'} by ${Math.abs(marginChange).toFixed(1)} points`,
      detail: `Profit margin moved from ${prev.profitMargin.toFixed(1)}% to ${kpis.profitMargin.toFixed(1)}% over the last 30 days.`,
      metricRef: { metric: 'profitMargin', current: kpis.profitMargin, previous: prev.profitMargin }
    });
  }

  // --- expense spikes by category ---
  const currentExpenses = expenses.filter((e) => new Date(e.expense_date) >= periodStart && new Date(e.expense_date) <= periodEnd);
  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - 30);
  const prevExpenses = expenses.filter((e) => new Date(e.expense_date) >= prevStart && new Date(e.expense_date) < periodStart);

  const currentBreakdown = computeExpenseBreakdown(currentExpenses);
  const prevBreakdown = computeExpenseBreakdown(prevExpenses);
  currentBreakdown.forEach((c) => {
    const prevCat = prevBreakdown.find((p) => p.category === c.category);
    if (!prevCat || prevCat.amount === 0) return;
    const change = percentChange(c.amount, prevCat.amount);
    if (change !== null && change >= 20) {
      insights.push({
        type: 'negative',
        title: `${capitalize(c.category)} expenses increased ${change.toFixed(0)}%`,
        detail: `${capitalize(c.category)} expenses rose from ${fmt(prevCat.amount)} to ${fmt(c.amount)} compared with the previous 30 days.`,
        metricRef: { metric: 'expense', category: c.category, current: c.amount, previous: prevCat.amount }
      });
    }
  });

  // --- product-level swings ---
  const currentSales = sales.filter((s) => new Date(s.transaction_date) >= periodStart && new Date(s.transaction_date) <= periodEnd);
  const prevSales = sales.filter((s) => new Date(s.transaction_date) >= prevStart && new Date(s.transaction_date) < periodStart);
  const currentPerf = computeProductPerformance(currentSales);
  const prevPerf = computeProductPerformance(prevSales);

  currentPerf.forEach((p) => {
    const prevP = prevPerf.find((pp) => pp.productName === p.productName);
    if (!prevP || prevP.revenue < 1000) return; // ignore noise on tiny bases
    const change = percentChange(p.revenue, prevP.revenue);
    if (change !== null && Math.abs(change) >= 25) {
      insights.push({
        type: change > 0 ? 'positive' : 'negative',
        title: `${p.productName} sales ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(0)}%`,
        detail: `${p.productName} generated ${fmt(p.revenue)} in the last 30 days versus ${fmt(prevP.revenue)} previously.`,
        metricRef: { metric: 'product_revenue', product: p.productName, current: p.revenue, previous: prevP.revenue }
      });
    }
  });

  // --- top margin product (positive highlight) ---
  const bestMargin = [...currentPerf].filter((p) => p.revenue > 0).sort((a, b) => b.profitMargin - a.profitMargin)[0];
  if (bestMargin && bestMargin.profitMargin > 0) {
    insights.push({
      type: 'positive',
      title: `${bestMargin.productName} has the highest profit margin`,
      detail: `${bestMargin.productName} is running at a ${bestMargin.profitMargin.toFixed(1)}% margin over the last 30 days, the strongest of any product.`,
      metricRef: { metric: 'best_margin', product: bestMargin.productName, margin: bestMargin.profitMargin }
    });
  }

  // --- slow movers ---
  const slow = findSlowMovingProducts(sales, 30);
  if (slow.length > 0) {
    insights.push({
      type: 'anomaly',
      title: `${slow.length} product${slow.length > 1 ? 's' : ''} haven't sold in 30+ days`,
      detail: `${slow.slice(0, 3).map((s) => s.productName).join(', ')}${slow.length > 3 ? ', and others' : ''} have had no recorded sales in over 30 days.`,
      metricRef: { metric: 'slow_movers', products: slow.map((s) => s.productName) }
    });
  }

  return insights;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
