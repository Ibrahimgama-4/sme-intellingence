import type { DataMapping, TargetField } from '@/types/domain';

// Synonym dictionary — real-world Nigerian SME spreadsheets use wildly
// inconsistent headers. This is a pragmatic, extend-as-you-go list rather
// than an ML model, which keeps the core analytics free of any paid API
// dependency.
const SYNONYMS: Record<TargetField, string[]> = {
  transaction_date: ['date', 'sale date', 'transaction date', 'txn date', 'day', 'sold on'],
  product: ['product', 'product name', 'item', 'item name', 'description', 'goods'],
  product_id: ['product id', 'sku', 'item code', 'code', 'product code'],
  category: ['category', 'product category', 'type', 'class', 'department'],
  quantity: ['qty', 'quantity', 'units', 'units sold', 'no. sold', 'number sold'],
  unit_price: ['unit price', 'selling price', 'price', 'price per unit', 'rate'],
  revenue: ['revenue', 'sales amount', 'total sales', 'amount', 'total', 'sales', 'total amount'],
  cost_price: ['cost price', 'buying price', 'cost', 'unit cost', 'cogs'],
  profit: ['profit', 'margin', 'gain'],
  expense_category: ['expense category', 'expense type', 'category (expense)'],
  expense_amount: ['expense amount', 'expense', 'cost incurred', 'spend'],
  customer: ['customer', 'customer name', 'client', 'buyer'],
  supplier: ['supplier', 'vendor', 'supplier name'],
  location: ['location', 'branch', 'outlet', 'store', 'shop'],
  ignore: []
};

function normalize(header: string): string {
  return header.trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  // crude token overlap score
  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  const overlap = [...aTokens].filter((t) => bTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : overlap / union;
}

/**
 * Given the raw header row from an uploaded CSV/XLSX, suggest a mapping to
 * our internal schema fields. Returns one suggestion per source column,
 * always including a confidence score so the UI can flag low-confidence
 * guesses for manual review rather than silently mis-mapping financial data.
 */
export function suggestColumnMapping(headers: string[]): DataMapping[] {
  return headers.map((header) => {
    const normalized = normalize(header);
    let best: { field: TargetField; score: number } = { field: 'ignore', score: 0 };

    (Object.keys(SYNONYMS) as TargetField[]).forEach((field) => {
      SYNONYMS[field].forEach((syn) => {
        const score = similarity(normalized, syn);
        if (score > best.score) best = { field, score };
      });
    });

    return {
      source_column: header,
      target_field: best.score >= 0.4 ? best.field : 'ignore',
      confidence: Math.round(best.score * 100) / 100
    };
  });
}

/** Fields we need at minimum to build the dashboard at all. */
export const REQUIRED_FIELDS: TargetField[] = ['transaction_date', 'revenue'];

/** Fields that unlock specific modules if present. */
export const OPTIONAL_MODULE_FIELDS: Record<string, TargetField[]> = {
  productIntelligence: ['product'],
  inventoryIntelligence: ['product'], // + a stock-level source, handled separately
  customerAnalytics: ['customer'],
  expenseAnalytics: ['expense_amount', 'expense_category'],
  profitAnalysis: ['cost_price']
};

export function missingRequiredFields(mapping: DataMapping[]): TargetField[] {
  const mapped = new Set(mapping.map((m) => m.target_field));
  return REQUIRED_FIELDS.filter((f) => !mapped.has(f));
}
