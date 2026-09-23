// Core domain types mirroring supabase/schema.sql.
// Keep these in sync with the SQL schema when either changes.

export type BusinessType =
  | 'supermarket' | 'retail' | 'wholesale' | 'restaurant' | 'pharmacy'
  | 'fashion' | 'electronics' | 'agriculture' | 'manufacturing' | 'services' | 'other';

export type BusinessSize = 'micro' | 'small' | 'medium';

export interface Business {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: BusinessType;
  industry: string | null;
  state: string;
  lga: string | null;
  currency: string;
  business_size: BusinessSize | null;
  employee_count: number | null;
  years_in_operation: number | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export type TargetField =
  | 'transaction_date' | 'product' | 'product_id' | 'category' | 'quantity'
  | 'unit_price' | 'revenue' | 'cost_price' | 'profit' | 'expense_category'
  | 'expense_amount' | 'customer' | 'supplier' | 'location' | 'ignore';

export interface DataMapping {
  source_column: string;
  target_field: TargetField;
  confidence?: number; // 0-1, how sure the auto-mapper was
}

export interface UploadRecord {
  id: string;
  business_id: string;
  file_name: string;
  file_type: 'csv' | 'xlsx';
  row_count: number | null;
  status: 'pending' | 'mapped' | 'validated' | 'processed' | 'failed';
  data_quality_score: number | null;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  category: string | null;
  unit_cost: number | null;
  unit_price: number | null;
  current_stock: number | null;
  reorder_point: number | null;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  first_seen: string | null;
}

export interface SaleRecord {
  id?: string;
  business_id: string;
  upload_id?: string | null;
  transaction_date: string; // ISO date
  product_id?: string | null;
  product_name?: string | null;
  category?: string | null;
  customer_id?: string | null;
  quantity: number;
  unit_price: number;
  cost_price?: number | null;
  revenue: number;
  profit?: number | null;
  location?: string | null;
}

export type ExpenseCategory =
  | 'rent' | 'electricity' | 'fuel' | 'salaries' | 'transportation'
  | 'internet' | 'marketing' | 'maintenance' | 'procurement' | 'other';

export interface ExpenseRecord {
  id?: string;
  business_id: string;
  upload_id?: string | null;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  notes?: string | null;
}

export interface InventorySnapshot {
  id?: string;
  business_id: string;
  product_id: string;
  snapshot_date: string;
  stock_level: number;
}

export interface KpiSet {
  revenue: number;
  expenses: number;
  grossProfit: number;
  profitMargin: number; // percent
  transactions: number;
  averageOrderValue: number;
  previousPeriod?: {
    revenue: number;
    expenses: number;
    grossProfit: number;
    profitMargin: number;
    transactions: number;
    averageOrderValue: number;
  };
}

export interface InsightCard {
  id?: string;
  type: 'positive' | 'negative' | 'anomaly' | 'neutral';
  title: string;
  detail: string;
  metricRef?: Record<string, unknown>;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface Forecast {
  horizon: '7d' | '30d' | '90d';
  method: string;
  series: ForecastPoint[];
}

export interface HealthScoreComponent {
  key: string;
  label: string;
  score: number; // 0-100
  explanation: string;
}

export interface HealthScore {
  overall: number;
  components: HealthScoreComponent[];
}

export interface DataQualityIssue {
  type: 'missing_value' | 'duplicate' | 'invalid_date' | 'negative_quantity'
      | 'impossible_price' | 'missing_product' | 'missing_category'
      | 'currency_inconsistency' | 'outlier';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedRows: number;
}

export interface DataQualityReport {
  score: number; // 0-100
  totalRows: number;
  issues: DataQualityIssue[];
  detectedFields: TargetField[];
}
