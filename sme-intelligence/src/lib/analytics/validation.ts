import type { DataMapping, DataQualityIssue, DataQualityReport, TargetField } from '@/types/domain';

type RawRow = Record<string, string | number | null | undefined>;

function getMappedValue(row: RawRow, mapping: DataMapping[], field: TargetField) {
  const col = mapping.find((m) => m.target_field === field)?.source_column;
  return col ? row[col] : undefined;
}

function isBlank(v: unknown) {
  return v === null || v === undefined || String(v).trim() === '';
}

/**
 * Runs a battery of data-quality checks over parsed spreadsheet rows.
 * Never mutates data — validation is read-only. Fixes (e.g. dropping
 * duplicates) are applied only after explicit user confirmation elsewhere.
 */
export function validateRows(rows: RawRow[], mapping: DataMapping[]): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  const totalRows = rows.length;

  if (totalRows === 0) {
    return { score: 0, totalRows: 0, issues: [{
      type: 'missing_value', severity: 'high', message: 'The file has no data rows.', affectedRows: 0
    }], detectedFields: [] };
  }

  const dateCol = mapping.find((m) => m.target_field === 'transaction_date');
  const revenueCol = mapping.find((m) => m.target_field === 'revenue');
  const qtyCol = mapping.find((m) => m.target_field === 'quantity');
  const priceCol = mapping.find((m) => m.target_field === 'unit_price');
  const productCol = mapping.find((m) => m.target_field === 'product');
  const categoryCol = mapping.find((m) => m.target_field === 'category');

  // --- missing dates / invalid dates ---
  if (dateCol) {
    let missing = 0;
    let invalid = 0;
    rows.forEach((r) => {
      const v = r[dateCol.source_column];
      if (isBlank(v)) missing++;
      else if (isNaN(new Date(String(v)).getTime())) invalid++;
    });
    if (missing > 0) issues.push({
      type: 'missing_value', severity: missing / totalRows > 0.1 ? 'high' : 'medium',
      message: `${missing} row(s) are missing a transaction date.`, affectedRows: missing
    });
    if (invalid > 0) issues.push({
      type: 'invalid_date', severity: 'medium',
      message: `${invalid} row(s) have a date that could not be parsed.`, affectedRows: invalid
    });
  }

  // --- missing revenue ---
  if (revenueCol) {
    const missing = rows.filter((r) => isBlank(r[revenueCol.source_column])).length;
    if (missing > 0) issues.push({
      type: 'missing_value', severity: 'medium',
      message: `${missing} row(s) are missing a revenue/sales amount.`, affectedRows: missing
    });
  }

  // --- negative quantities ---
  if (qtyCol) {
    const negative = rows.filter((r) => {
      const v = Number(r[qtyCol.source_column]);
      return !isNaN(v) && v < 0;
    }).length;
    if (negative > 0) issues.push({
      type: 'negative_quantity', severity: 'medium',
      message: `${negative} row(s) have a negative quantity.`, affectedRows: negative
    });
  }

  // --- impossible prices (zero or absurdly high relative to median) ---
  if (priceCol) {
    const prices = rows
      .map((r) => Number(r[priceCol.source_column]))
      .filter((v) => !isNaN(v) && v > 0)
      .sort((a, b) => a - b);
    if (prices.length > 5) {
      const median = prices[Math.floor(prices.length / 2)] ?? 0;
      const impossible = rows.filter((r) => {
        const v = Number(r[priceCol.source_column]);
        return !isNaN(v) && (v <= 0 || v > median * 50);
      }).length;
      if (impossible > 0) issues.push({
        type: 'impossible_price', severity: 'low',
        message: `${impossible} row(s) have a unit price of zero or far outside the normal range — worth a manual check.`,
        affectedRows: impossible
      });
    }
  }

  // --- missing product names ---
  if (productCol) {
    const missing = rows.filter((r) => isBlank(r[productCol.source_column])).length;
    if (missing > 0) issues.push({
      type: 'missing_product', severity: 'low',
      message: `${missing} row(s) are missing a product name.`, affectedRows: missing
    });
  }

  // --- missing categories ---
  if (categoryCol) {
    const missing = rows.filter((r) => isBlank(r[categoryCol.source_column])).length;
    if (missing > 0) issues.push({
      type: 'missing_category', severity: 'low',
      message: `${missing} row(s) are missing a category.`, affectedRows: missing
    });
  }

  // --- duplicate rows (same date + product + revenue) ---
  if (dateCol && revenueCol) {
    const seen = new Map<string, number>();
    rows.forEach((r) => {
      const key = [
        r[dateCol.source_column],
        productCol ? r[productCol.source_column] : '',
        r[revenueCol.source_column]
      ].join('|');
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    const duplicates = [...seen.values()].filter((c) => c > 1).reduce((a, c) => a + (c - 1), 0);
    if (duplicates > 0) issues.push({
      type: 'duplicate', severity: duplicates / totalRows > 0.05 ? 'medium' : 'low',
      message: `${duplicates} row(s) look like duplicate transactions (same date, product and amount).`,
      affectedRows: duplicates
    });
  }

  // --- outliers in revenue (>5x the 95th percentile) ---
  if (revenueCol) {
    const values = rows
      .map((r) => Number(r[revenueCol.source_column]))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);
    if (values.length > 10) {
      const p95 = values[Math.floor(values.length * 0.95)] ?? 0;
      const outliers = values.filter((v) => v > p95 * 5).length;
      if (outliers > 0) issues.push({
        type: 'outlier', severity: 'low',
        message: `${outliers} transaction(s) are unusually large compared with the rest of the data — worth a manual check.`,
        affectedRows: outliers
      });
    }
  }

  // --- score: start at 100, deduct weighted penalties ---
  const weights = { high: 15, medium: 6, low: 2 };
  const penalty = issues.reduce((sum, i) => {
    const affectedRatio = Math.min(1, i.affectedRows / totalRows);
    return sum + weights[i.severity] * (0.4 + 0.6 * affectedRatio);
  }, 0);
  const score = Math.max(0, Math.round(100 - penalty));

  return {
    score,
    totalRows,
    issues,
    detectedFields: mapping.filter((m) => m.target_field !== 'ignore').map((m) => m.target_field)
  };
}
