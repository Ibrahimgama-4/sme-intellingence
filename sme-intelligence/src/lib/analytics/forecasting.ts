import type { SaleRecord, Forecast, ForecastPoint } from '@/types/domain';

interface DailyPoint { date: string; revenue: number; }

function aggregateDaily(sales: SaleRecord[]): DailyPoint[] {
  const byDate = new Map<string, number>();
  sales.forEach((s) => {
    const d = s.transaction_date.slice(0, 10);
    byDate.set(d, (byDate.get(d) ?? 0) + s.revenue);
  });
  return [...byDate.entries()]
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function mean(values: number[]) {
  return values.reduce((s, v) => s + v, 0) / (values.length || 1);
}

function stdDev(values: number[]) {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Simple linear regression: returns slope and intercept for y = a*x + b. */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - xMean) * (values[i]! - yMean);
    den += (xs[i]! - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

/** Exponential smoothing forecast — good for data with a stable level and some noise. */
function exponentialSmoothing(values: number[], alpha = 0.3): number {
  let level = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) {
    level = alpha * values[i]! + (1 - alpha) * level;
  }
  return level;
}

/**
 * Picks a forecasting method based on how much history is available, then
 * produces a forecast series with a naive uncertainty band derived from
 * the residual standard deviation of recent data. This intentionally
 * avoids heavyweight ML dependencies (Prophet, deep learning) — appropriate
 * for typical SME transaction volumes and a free-tier deployment.
 */
export function forecastRevenue(sales: SaleRecord[], horizonDays: 7 | 30 | 90): Forecast | null {
  const daily = aggregateDaily(sales);
  if (daily.length < 7) return null; // not enough history to forecast responsibly

  const values = daily.map((d) => d.revenue);
  const lastDate = daily[daily.length - 1]!.date;
  const recentWindow = values.slice(-Math.min(28, values.length));
  const noise = stdDev(recentWindow);

  let method: string;
  let dailyForecastFn: (stepIndex: number) => number;

  if (daily.length < 21) {
    // Short history — simple moving average is the most defensible choice.
    method = 'Moving average (7-day)';
    const window = values.slice(-7);
    const avg = mean(window);
    dailyForecastFn = () => avg;
  } else if (daily.length < 60) {
    // Medium history — exponential smoothing adapts to recent level shifts.
    method = 'Exponential smoothing';
    const level = exponentialSmoothing(values, 0.3);
    dailyForecastFn = () => level;
  } else {
    // Enough history to fit a trend line responsibly.
    method = 'Linear trend regression';
    const { slope, intercept } = linearRegression(values.slice(-90));
    const offset = values.length - Math.min(90, values.length);
    dailyForecastFn = (stepIndex) => intercept + slope * (offset + values.length - offset + stepIndex);
  }

  const series: ForecastPoint[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const predicted = Math.max(0, dailyForecastFn(i));
    // Confidence band widens with horizon distance — reflects growing uncertainty.
    const widen = 1 + i / horizonDays;
    series.push({
      date: addDays(lastDate, i),
      predicted: Math.round(predicted),
      lower: Math.round(Math.max(0, predicted - noise * widen)),
      upper: Math.round(predicted + noise * widen)
    });
  }

  const horizon = horizonDays === 7 ? '7d' : horizonDays === 30 ? '30d' : '90d';
  return { horizon, method, series };
}

export function historicalDailySeries(sales: SaleRecord[]) {
  return aggregateDaily(sales);
}
