import type { SaleRecord, ExpenseRecord, KpiSet } from '@/types/domain';

function inRange(dateStr: string, start: Date, end: Date) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

/**
 * Computes the headline KPI set for a period, plus the same set for the
 * immediately preceding period of equal length, so the UI can show
 * "↑ 12.4% vs previous period" comparisons.
 */
export function computeKpis(
  sales: SaleRecord[],
  expenses: ExpenseRecord[],
  periodStart: Date,
  periodEnd: Date
): KpiSet {
  const current = computeForRange(sales, expenses, periodStart, periodEnd);

  const periodMs = periodEnd.getTime() - periodStart.getTime();
  const prevEnd = new Date(periodStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodMs);
  const previous = computeForRange(sales, expenses, prevStart, prevEnd);

  return { ...current, previousPeriod: previous };
}

function computeForRange(sales: SaleRecord[], expenses: ExpenseRecord[], start: Date, end: Date) {
  const periodSales = sales.filter((s) => inRange(s.transaction_date, start, end));
  const periodExpenses = expenses.filter((e) => inRange(e.expense_date, start, end));

  const revenue = periodSales.reduce((sum, s) => sum + (s.revenue ?? 0), 0);
  const expensesTotal = periodExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const costOfGoods = periodSales.reduce(
    (sum, s) => sum + (s.cost_price ?? 0) * (s.quantity ?? 0), 0
  );
  const grossProfit = revenue - costOfGoods - expensesTotal;
  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const transactions = periodSales.length;
  const averageOrderValue = transactions > 0 ? revenue / transactions : 0;

  return { revenue, expenses: expensesTotal, grossProfit, profitMargin, transactions, averageOrderValue };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // undefined % change from zero base
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface ProductPerformance {
  productName: string;
  category: string | null;
  revenue: number;
  quantity: number;
  profit: number;
  profitMargin: number;
  transactionCount: number;
  lastSoldDate: string | null;
}

export function computeProductPerformance(sales: SaleRecord[]): ProductPerformance[] {
  const byProduct = new Map<string, ProductPerformance>();

  sales.forEach((s) => {
    const key = s.product_name ?? 'Unspecified';
    const existing = byProduct.get(key) ?? {
      productName: key,
      category: s.category ?? null,
      revenue: 0,
      quantity: 0,
      profit: 0,
      profitMargin: 0,
      transactionCount: 0,
      lastSoldDate: null as string | null
    };
    existing.revenue += s.revenue ?? 0;
    existing.quantity += s.quantity ?? 0;
    const cost = (s.cost_price ?? 0) * (s.quantity ?? 0);
    existing.profit += (s.revenue ?? 0) - cost;
    existing.transactionCount += 1;
    if (!existing.lastSoldDate || new Date(s.transaction_date) > new Date(existing.lastSoldDate)) {
      existing.lastSoldDate = s.transaction_date;
    }
    byProduct.set(key, existing);
  });

  return [...byProduct.values()].map((p) => ({
    ...p,
    profitMargin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0
  }));
}

/** Products with no sales in the last N days relative to the latest transaction date in the dataset. */
export function findSlowMovingProducts(
  sales: SaleRecord[],
  thresholdDays = 30
): { productName: string; daysSinceLastSale: number; totalHistoricalRevenue: number }[] {
  const perf = computeProductPerformance(sales);
  const latestDate = sales.reduce(
    (max, s) => (new Date(s.transaction_date) > max ? new Date(s.transaction_date) : max),
    new Date(0)
  );

  return perf
    .filter((p) => p.lastSoldDate)
    .map((p) => ({
      productName: p.productName,
      daysSinceLastSale: Math.floor(
        (latestDate.getTime() - new Date(p.lastSoldDate!).getTime()) / (1000 * 60 * 60 * 24)
      ),
      totalHistoricalRevenue: p.revenue
    }))
    .filter((p) => p.daysSinceLastSale >= thresholdDays)
    .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale);
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentOfTotal: number;
}

export function computeExpenseBreakdown(expenses: ExpenseRecord[]): ExpenseBreakdown[] {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = new Map<string, number>();
  expenses.forEach((e) => byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount));

  return [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percentOfTotal: total > 0 ? (amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface CustomerPerformance {
  customerName: string;
  totalRevenue: number;
  purchaseCount: number;
  averageOrderValue: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
}

export function computeCustomerPerformance(sales: SaleRecord[]): CustomerPerformance[] {
  const byCustomer = new Map<string, SaleRecord[]>();
  sales.forEach((s) => {
    if (!s.customer_id && !(s as any).customer_name) return;
    const key = (s as any).customer_name ?? s.customer_id!;
    const list = byCustomer.get(key) ?? [];
    list.push(s);
    byCustomer.set(key, list);
  });

  return [...byCustomer.entries()].map(([customerName, records]) => {
    const dates = records.map((r) => r.transaction_date).sort();
    const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
    return {
      customerName,
      totalRevenue,
      purchaseCount: records.length,
      averageOrderValue: totalRevenue / records.length,
      firstPurchaseDate: dates[0]!,
      lastPurchaseDate: dates[dates.length - 1]!
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/** Groups revenue by ISO weekday (0=Sunday) to answer "which days sell best". */
export function salesByDayOfWeek(sales: SaleRecord[]): { day: string; revenue: number }[] {
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const totals = new Array(7).fill(0);
  sales.forEach((s) => {
    const day = new Date(s.transaction_date).getDay();
    totals[day] += s.revenue;
  });
  return labels.map((day, i) => ({ day, revenue: totals[i] }));
}
