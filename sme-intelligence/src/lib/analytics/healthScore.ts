import type { SaleRecord, ExpenseRecord, HealthScore, Product, InventorySnapshot } from '@/types/domain';
import { computeKpis, percentChange, computeExpenseBreakdown, computeCustomerPerformance } from './kpis';

/**
 * Every component score is derived from a plain, stated calculation —
 * never an opaque model output. This is deliberate: SME owners need to
 * trust and act on this number, so each piece must be explainable in one
 * sentence.
 */
export function computeHealthScore(
  sales: SaleRecord[],
  expenses: ExpenseRecord[],
  inventory: InventorySnapshot[] = [],
  products: Product[] = []
): HealthScore {
  if (sales.length === 0) {
    return {
      overall: 0,
      components: [
        { key: 'revenue', label: 'Revenue Health', score: 0, explanation: 'No sales data uploaded yet.' }
      ]
    };
  }

  const latestDate = sales.reduce(
    (max, s) => (new Date(s.transaction_date) > max ? new Date(s.transaction_date) : max), new Date(0)
  );
  const periodStart = new Date(latestDate);
  periodStart.setDate(periodStart.getDate() - 29);
  const kpis = computeKpis(sales, expenses, periodStart, latestDate);
  const prev = kpis.previousPeriod!;

  // 1. Revenue Health — based on 30-day revenue trend direction and magnitude
  const revChange = percentChange(kpis.revenue, prev.revenue) ?? 0;
  const revenueHealth = clamp(50 + revChange * 1.5, 0, 100);

  // 2. Profitability — based on gross margin level (bands tuned for retail/SME norms)
  const marginScore = clamp(kpis.profitMargin * 2.5, 0, 100); // 40% margin -> 100

  // 3. Expense Control — penalize expenses growing faster than revenue
  const expChange = percentChange(kpis.expenses, prev.expenses) ?? 0;
  const expenseControl = clamp(80 - (expChange - revChange), 0, 100);

  // 4. Inventory Health — % of products with healthy stock coverage (only if inventory data exists)
  let inventoryHealth = 70; // neutral default when no inventory data
  let inventoryExplanation = 'No stock-level data uploaded — using a neutral default.';
  if (inventory.length > 0 && products.length > 0) {
    const daily = averageDailySalesByProduct(sales);
    let healthy = 0;
    let total = 0;
    products.forEach((p) => {
      const stock = inventory.filter((i) => i.product_id === p.id).slice(-1)[0]?.stock_level;
      if (stock === undefined) return;
      total++;
      const avgSales = daily.get(p.name) ?? 0;
      const coverage = avgSales > 0 ? stock / avgSales : 999;
      if (coverage >= 3 && coverage <= 45) healthy++; // not critically low, not wildly overstocked
    });
    if (total > 0) {
      inventoryHealth = Math.round((healthy / total) * 100);
      inventoryExplanation = `${healthy} of ${total} products have healthy stock coverage (neither critically low nor overstocked).`;
    }
  }

  // 5. Customer Activity — based on count of distinct customers active in the period (only if customer data exists)
  const customerPerf = computeCustomerPerformance(sales);
  let customerActivity = 70;
  let customerExplanation = 'No customer-level data uploaded — using a neutral default.';
  if (customerPerf.length > 0) {
    const activeRecently = customerPerf.filter(
      (c) => new Date(c.lastPurchaseDate) >= periodStart
    ).length;
    const activityRatio = activeRecently / customerPerf.length;
    customerActivity = clamp(activityRatio * 100, 0, 100);
    customerExplanation = `${activeRecently} of ${customerPerf.length} known customers purchased in the last 30 days.`;
  }

  // 6. Sales Consistency — inverse of coefficient of variation in daily revenue
  const consistency = computeSalesConsistency(sales, periodStart, latestDate);

  const components = [
    { key: 'revenue', label: 'Revenue Health', score: Math.round(revenueHealth),
      explanation: `Revenue ${revChange >= 0 ? 'grew' : 'declined'} ${Math.abs(revChange).toFixed(1)}% versus the previous 30 days.` },
    { key: 'profitability', label: 'Profitability', score: Math.round(marginScore),
      explanation: `Gross margin is ${kpis.profitMargin.toFixed(1)}% over the last 30 days.` },
    { key: 'expenseControl', label: 'Expense Control', score: Math.round(expenseControl),
      explanation: `Expenses changed ${expChange.toFixed(1)}% while revenue changed ${revChange.toFixed(1)}%.` },
    { key: 'inventory', label: 'Inventory', score: Math.round(inventoryHealth), explanation: inventoryExplanation },
    { key: 'customerActivity', label: 'Customer Activity', score: Math.round(customerActivity), explanation: customerExplanation },
    { key: 'consistency', label: 'Sales Consistency', score: Math.round(consistency),
      explanation: 'Measures how stable daily sales are — large unpredictable swings lower this score.' }
  ];

  const overall = Math.round(components.reduce((sum, c) => sum + c.score, 0) / components.length);

  return { overall, components };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function averageDailySalesByProduct(sales: SaleRecord[]): Map<string, number> {
  const byProduct = new Map<string, { total: number; days: Set<string> }>();
  sales.forEach((s) => {
    const key = s.product_name ?? 'Unspecified';
    const entry = byProduct.get(key) ?? { total: 0, days: new Set<string>() };
    entry.total += s.quantity;
    entry.days.add(s.transaction_date.slice(0, 10));
    byProduct.set(key, entry);
  });
  const result = new Map<string, number>();
  byProduct.forEach((v, k) => result.set(k, v.total / Math.max(1, v.days.size)));
  return result;
}

function computeSalesConsistency(sales: SaleRecord[], start: Date, end: Date): number {
  const byDate = new Map<string, number>();
  sales
    .filter((s) => new Date(s.transaction_date) >= start && new Date(s.transaction_date) <= end)
    .forEach((s) => byDate.set(s.transaction_date.slice(0, 10), (byDate.get(s.transaction_date.slice(0, 10)) ?? 0) + s.revenue));

  const values = [...byDate.values()];
  if (values.length < 3) return 60;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 50;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const cv = Math.sqrt(variance) / mean; // coefficient of variation
  return clamp(100 - cv * 60, 0, 100);
}
