import type { SaleRecord, ExpenseRecord } from '@/types/domain';
import {
  computeKpis, percentChange, computeProductPerformance,
  computeExpenseBreakdown, findSlowMovingProducts, salesByDayOfWeek
} from './kpis';

export interface AssistantAnswer {
  answer: string;
  supportingMetrics: Record<string, unknown>;
}

/**
 * Intent-matched Q&A over the business's own computed metrics.
 *
 * DESIGN NOTE — why not just call an LLM for everything: the brief requires
 * core analytics to work with zero paid API dependency, and requires the AI
 * layer to never invent numbers. Retrieving from computed metrics and
 * templating the answer guarantees every figure quoted is real. This
 * function is written so that a future LLM layer (see AI_API_KEY in
 * .env.example) can be dropped in as a *phrasing* layer on top of the same
 * `supportingMetrics` payload — the retrieval logic stays the source of truth
 * either way, so the model is never asked to answer from raw, unrestricted
 * data.
 */
export function answerBusinessQuestion(
  question: string,
  sales: SaleRecord[],
  expenses: ExpenseRecord[],
  currency = '₦'
): AssistantAnswer {
  const q = question.toLowerCase();
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`;

  if (sales.length === 0) {
    return {
      answer: "I don't have any sales data yet for this business. Upload a spreadsheet first and I'll be able to answer questions about it.",
      supportingMetrics: {}
    };
  }

  const latestDate = sales.reduce(
    (max, s) => (new Date(s.transaction_date) > max ? new Date(s.transaction_date) : max), new Date(0)
  );
  const periodStart = new Date(latestDate);
  periodStart.setDate(periodStart.getDate() - 29);

  // --- best-selling products ---
  if (/(best.?sell|top.?product|top.?sell)/.test(q)) {
    const perf = computeProductPerformance(sales.filter((s) => new Date(s.transaction_date) >= periodStart))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const list = perf.map((p, i) => `${i + 1}. ${p.productName} — ${fmt(p.revenue)}`).join('\n');
    return {
      answer: `Your top-selling products (by revenue) over the last 30 days:\n\n${list}`,
      supportingMetrics: { products: perf }
    };
  }

  // --- restocking ---
  if (/(restock|reorder|low.?stock)/.test(q)) {
    const slow = findSlowMovingProducts(sales, 30);
    if (slow.length === 0) {
      return {
        answer: "I don't have stock-level data uploaded, so I can't give precise restocking recommendations. What I can tell you: no products have gone quiet — everything in your catalog has sold within the last 30 days.",
        supportingMetrics: {}
      };
    }
    return {
      answer: `I don't have stock-level data to calculate exact reorder points, but these products haven't sold in 30+ days and are worth reviewing: ${slow.slice(0, 5).map((s) => s.productName).join(', ')}.`,
      supportingMetrics: { slowMovers: slow }
    };
  }

  // --- biggest expenses ---
  if (/(biggest expense|expense|spend|cost)/.test(q)) {
    const recent = expenses.filter((e) => new Date(e.expense_date) >= periodStart);
    const breakdown = computeExpenseBreakdown(recent);
    if (breakdown.length === 0) {
      return { answer: "I don't have expense data uploaded for this business yet.", supportingMetrics: {} };
    }
    const list = breakdown.slice(0, 5).map((b) => `${capitalize(b.category)} — ${fmt(b.amount)} (${b.percentOfTotal.toFixed(0)}%)`).join('\n');
    return {
      answer: `Your biggest expense categories in the last 30 days:\n\n${list}`,
      supportingMetrics: { breakdown }
    };
  }

  // --- profit / loss ---
  if (/(profit|loss|losing money|making money)/.test(q)) {
    const kpis = computeKpis(sales, expenses, periodStart, latestDate);
    const verdict = kpis.grossProfit >= 0 ? 'profitable' : 'operating at a loss';
    return {
      answer: `Over the last 30 days your business was ${verdict}: revenue of ${fmt(kpis.revenue)} against expenses and cost of goods, leaving a gross profit of ${fmt(kpis.grossProfit)} (${kpis.profitMargin.toFixed(1)}% margin).`,
      supportingMetrics: { kpis }
    };
  }

  // --- best day/month ---
  if (/(best day|which day|day of the week)/.test(q)) {
    const byDay = salesByDayOfWeek(sales).sort((a, b) => b.revenue - a.revenue);
    const best = byDay[0]!;
    return {
      answer: `${best.day} generates the highest revenue overall, with ${fmt(best.revenue)} in total sales.`,
      supportingMetrics: { byDay }
    };
  }

  // --- revenue change / why did profit decrease ---
  if (/(why|decrease|decline|drop|down)/.test(q) && /(profit|revenue|sales)/.test(q)) {
    const kpis = computeKpis(sales, expenses, periodStart, latestDate);
    const prev = kpis.previousPeriod!;
    const revChange = percentChange(kpis.revenue, prev.revenue) ?? 0;
    const expChange = percentChange(kpis.expenses, prev.expenses) ?? 0;
    const perf = computeProductPerformance(sales.filter((s) => new Date(s.transaction_date) >= periodStart));
    const prevPerf = computeProductPerformance(sales.filter((s) => {
      const d = new Date(s.transaction_date);
      const prevStart = new Date(periodStart); prevStart.setDate(prevStart.getDate() - 30);
      return d >= prevStart && d < periodStart;
    }));
    const worstMover = perf.map((p) => {
      const prevP = prevPerf.find((pp) => pp.productName === p.productName);
      return { name: p.productName, change: p.revenue - (prevP?.revenue ?? 0) };
    }).sort((a, b) => a.change - b.change)[0];

    let explanation = `Revenue changed ${revChange.toFixed(1)}% and expenses changed ${expChange.toFixed(1)}% versus the previous 30 days.`;
    if (worstMover && worstMover.change < 0) {
      explanation += ` The largest single contributor to the drop was ${worstMover.name}, down ${fmt(Math.abs(worstMover.change))}.`;
    }
    return { answer: explanation, supportingMetrics: { revChange, expChange, worstMover } };
  }

  // --- recommendations ---
  if (/(recommend|action|improve|advice|what should i do)/.test(q)) {
    const kpis = computeKpis(sales, expenses, periodStart, latestDate);
    const perf = computeProductPerformance(sales.filter((s) => new Date(s.transaction_date) >= periodStart));
    const lowMargin = [...perf].filter((p) => p.revenue > 0).sort((a, b) => a.profitMargin - b.profitMargin)[0];
    const slow = findSlowMovingProducts(sales, 30);
    const breakdown = computeExpenseBreakdown(expenses.filter((e) => new Date(e.expense_date) >= periodStart));
    const topExpense = breakdown[0];

    const actions: string[] = [];
    if (kpis.profitMargin < 15) actions.push(`Your overall margin is ${kpis.profitMargin.toFixed(1)}% — review pricing on low-margin products before cutting costs elsewhere.`);
    if (lowMargin) actions.push(`${lowMargin.productName} has your lowest margin at ${lowMargin.profitMargin.toFixed(1)}% — check its cost price and consider a price adjustment.`);
    if (slow.length > 0) actions.push(`${slow.length} product(s) haven't sold in 30+ days (e.g. ${slow[0]!.productName}) — consider a promotion to clear stock or discontinuing.`);
    if (topExpense) actions.push(`${capitalize(topExpense.category)} is your largest expense category at ${fmt(topExpense.amount)} — look for ways to reduce or renegotiate it.`);
    if (actions.length === 0) actions.push('Your numbers look stable — keep monitoring weekly rather than making reactive changes.');

    return {
      answer: `Based on your actual numbers over the last 30 days:\n\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
      supportingMetrics: { kpis, lowMargin, slow, topExpense }
    };
  }

  // --- fallback ---
  const kpis = computeKpis(sales, expenses, periodStart, latestDate);
  return {
    answer: `Here's a snapshot of your business over the last 30 days: revenue of ${fmt(kpis.revenue)}, expenses of ${fmt(kpis.expenses)}, and a gross profit of ${fmt(kpis.grossProfit)} (${kpis.profitMargin.toFixed(1)}% margin). Try asking about your best-selling products, biggest expenses, or what actions you should take.`,
    supportingMetrics: { kpis }
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
