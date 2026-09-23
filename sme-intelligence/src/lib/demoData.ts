import type { SaleRecord, ExpenseRecord, Product, ExpenseCategory } from '@/types/domain';

// Deterministic pseudo-random generator so the demo dataset is stable
// across runs (no external seed dependency).
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260101);

export const DEMO_BUSINESS = {
  business_name: 'Nasser Enterprise',
  business_type: 'supermarket' as const,
  state: 'Kano',
  lga: 'Nassarawa',
  currency: 'NGN'
};

interface DemoProduct {
  name: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  baseVelocity: number; // avg units/day
  seasonality?: 'ramadan' | 'yearend' | 'none';
}

// Realistic-ish Naira pricing for a Kano supermarket, circa 2025/2026.
const DEMO_PRODUCTS: DemoProduct[] = [
  { name: 'Rice 50kg', category: 'Grains', unitCost: 68000, unitPrice: 75000, baseVelocity: 2.5, seasonality: 'ramadan' },
  { name: 'Beans 50kg', category: 'Grains', unitCost: 52000, unitPrice: 58000, baseVelocity: 1.2 },
  { name: 'Sugar 1kg', category: 'Groceries', unitCost: 1450, unitPrice: 1800, baseVelocity: 18 },
  { name: 'Vegetable Oil 5L', category: 'Groceries', unitCost: 9200, unitPrice: 10800, baseVelocity: 6, seasonality: 'ramadan' },
  { name: 'Milk (Tin)', category: 'Dairy', unitCost: 850, unitPrice: 1100, baseVelocity: 22 },
  { name: 'Spaghetti 500g', category: 'Groceries', unitCost: 480, unitPrice: 650, baseVelocity: 30 },
  { name: 'Detergent 1kg', category: 'Household', unitCost: 1100, unitPrice: 1450, baseVelocity: 9 },
  { name: 'Bottled Water (Pack)', category: 'Beverages', unitCost: 900, unitPrice: 1200, baseVelocity: 14, seasonality: 'yearend' },
  { name: 'Soft Drinks (Crate)', category: 'Beverages', unitCost: 2600, unitPrice: 3200, baseVelocity: 8, seasonality: 'yearend' },
  { name: 'Bread (Loaf)', category: 'Bakery', unitCost: 700, unitPrice: 950, baseVelocity: 25 }
];

const CUSTOMER_NAMES = [
  'Amina Yusuf', 'Chidi Okafor', 'Blessing Eze', 'Ibrahim Sani', 'Grace Adeyemi',
  'Musa Abdullahi', 'Ngozi Okonkwo', 'Fatima Bello', 'Emeka Nwosu', 'Halima Garba',
  'Walk-in Customer'
];

function daysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function seasonalMultiplier(product: DemoProduct, date: Date): number {
  const month = date.getMonth(); // 0-indexed
  if (product.seasonality === 'ramadan' && (month === 1 || month === 2)) return 1.6; // approx Ramadan window
  if (product.seasonality === 'yearend' && (month === 10 || month === 11)) return 1.8; // Nov/Dec
  // General weekday pattern: weekends busier for a supermarket
  const weekday = date.getDay();
  const weekendBoost = weekday === 5 || weekday === 6 ? 1.25 : 1;
  return weekendBoost;
}

export function generateDemoData(months = 12): {
  products: Omit<Product, 'id' | 'business_id'>[];
  sales: Omit<SaleRecord, 'business_id' | 'id'>[];
  expenses: Omit<ExpenseRecord, 'business_id' | 'id'>[];
} {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);

  const days = daysBetween(start, end);
  const sales: Omit<SaleRecord, 'business_id' | 'id'>[] = [];

  days.forEach((day) => {
    DEMO_PRODUCTS.forEach((product) => {
      const mult = seasonalMultiplier(product, day);
      // Poisson-ish approximation via rounding a noisy velocity
      const noise = 0.6 + rand() * 0.8;
      const unitsToday = Math.max(0, Math.round(product.baseVelocity * mult * noise));
      if (unitsToday === 0) return;

      // Split into 1-3 transactions rather than one big line, for realism
      const txnCount = unitsToday > 4 ? Math.min(3, Math.ceil(unitsToday / 6)) : 1;
      let remaining = unitsToday;
      for (let t = 0; t < txnCount; t++) {
        const qty = t === txnCount - 1 ? remaining : Math.max(1, Math.round(remaining / (txnCount - t)));
        remaining -= qty;
        if (qty <= 0) continue;
        const customer = CUSTOMER_NAMES[Math.floor(rand() * CUSTOMER_NAMES.length)]!;
        sales.push({
          transaction_date: day.toISOString().slice(0, 10),
          product_name: product.name,
          category: product.category,
          quantity: qty,
          unit_price: product.unitPrice,
          cost_price: product.unitCost,
          revenue: qty * product.unitPrice,
          profit: qty * (product.unitPrice - product.unitCost),
          location: 'Nassarawa, Kano',
          customer_id: null,
          ...( { customer_name: customer } as any )
        });
      }
    });
  });

  // --- monthly recurring + variable expenses ---
  const expenseCategories: { category: ExpenseCategory; base: number; variance: number }[] = [
    { category: 'rent', base: 350000, variance: 0 },
    { category: 'electricity', base: 85000, variance: 25000 },
    { category: 'salaries', base: 420000, variance: 10000 },
    { category: 'transportation', base: 60000, variance: 20000 },
    { category: 'fuel', base: 45000, variance: 18000 },
    { category: 'internet', base: 15000, variance: 0 },
    { category: 'maintenance', base: 20000, variance: 15000 },
    { category: 'procurement', base: 180000, variance: 60000 },
    { category: 'marketing', base: 25000, variance: 10000 }
  ];

  const expenses: Omit<ExpenseRecord, 'business_id' | 'id'>[] = [];
  const monthCursor = new Date(start);
  monthCursor.setDate(1);
  while (monthCursor <= end) {
    expenseCategories.forEach((cat) => {
      const amount = Math.round(cat.base + (rand() * 2 - 1) * cat.variance);
      expenses.push({
        expense_date: new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 5).toISOString().slice(0, 10),
        category: cat.category,
        amount,
        notes: null
      });
    });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  const products: Omit<Product, 'id' | 'business_id'>[] = DEMO_PRODUCTS.map((p) => ({
    name: p.name,
    category: p.category,
    unit_cost: p.unitCost,
    unit_price: p.unitPrice,
    current_stock: Math.round(p.baseVelocity * (10 + rand() * 20)),
    reorder_point: Math.round(p.baseVelocity * 5)
  }));

  return { products, sales, expenses };
}
