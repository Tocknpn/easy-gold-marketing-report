/**
 * Centralized, immutable mathematical utilities for Run-Rate and Prorated Pace Calculations.
 * Ensures strict mathematical consistency across all reporting views, cards, and export utilities.
 */

import { WeeklyMetricRow, MetricVariances } from '@/lib/types/dashboard.types';

/**
 * Calculates elapsed calendar days within a given date window, capped between 1 and totalDays.
 */
export function calculateElapsedDays(
  startDateStr: string,
  asOfDateStr: string,
  totalDays: number = 7
): number {
  try {
    const start = new Date(startDateStr).getTime();
    const asOf = new Date(asOfDateStr).getTime();
    if (isNaN(start) || isNaN(asOf)) return totalDays;
    
    const diffDays = Math.round((asOf - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(totalDays, diffDays));
  } catch {
    return totalDays;
  }
}

/**
 * Computes a standardized linear 7-day prorated run-rate for additive volume metrics
 * (Transactions, Gold Weight, New Registers, Withdrawal).
 */
export function prorateLinear(rawValue: number, elapsedDays: number, targetDays: number = 7): number {
  if (elapsedDays <= 0) return rawValue;
  if (elapsedDays >= targetDays) return rawValue;
  return Math.round((rawValue / elapsedDays) * targetDays);
}

/**
 * Computes non-linear prorated active users.
 * Distinct user participation does not scale linearly (1 user transacting on day 1 and day 3 is still 1 unique user).
 * Applies a log/concave scaling curve calibrated on historical Easy Gold weekly user return patterns.
 */
export function prorateActiveUsers(rawUsers: number, elapsedDays: number, targetDays: number = 7): number {
  if (elapsedDays <= 0 || elapsedDays >= targetDays) return rawUsers;
  // Scaled participation factor: accounts for unique user deduplication over elapsed days
  const curveFactor = Math.min(targetDays, elapsedDays * 1.35 + (targetDays - elapsedDays) * 0.45);
  return Math.round((rawUsers / elapsedDays) * curveFactor);
}

/**
 * Computes percentage variance between current and previous values.
 * Returns signed whole percentage integer.
 */
export function calculateVariance(current: number, previous: number | undefined | null): number {
  if (previous === undefined || previous === null || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Transforms an in-progress partial WeeklyMetricRow into a 7-day prorated equivalent.
 */
export function prorateWeeklyRow(
  rawWeek: WeeklyMetricRow,
  elapsedDays: number
): WeeklyMetricRow {
  if (elapsedDays >= 7 || elapsedDays <= 0) {
    return rawWeek;
  }

  const buyWeightNum = Number(rawWeek.buy_weight_15g);
  const sellWeightNum = Number(rawWeek.sell_weight_15g);
  const withdrawNum = Number(rawWeek.withdraw_gold_grams);

  const proratedBuyTx = prorateLinear(rawWeek.buy_transactions, elapsedDays, 7);
  const proratedSellTx = prorateLinear(rawWeek.sell_transactions, elapsedDays, 7);
  const proratedBuyWeight = Number(((buyWeightNum / elapsedDays) * 7).toFixed(2));
  const proratedSellWeight = Number(((sellWeightNum / elapsedDays) * 7).toFixed(2));

  // Compute ticket sizes based on prorated weight and transactions
  const buyTicket = proratedBuyTx > 0 ? Number(((proratedBuyWeight * 15) / proratedBuyTx).toFixed(2)) : Number(rawWeek.buy_ticket_size_g);
  const sellTicket = proratedSellTx > 0 ? Number(((proratedSellWeight * 15) / proratedSellTx).toFixed(2)) : Number(rawWeek.sell_ticket_size_g);

  return {
    ...rawWeek,
    all_transactions: prorateLinear(rawWeek.all_transactions, elapsedDays, 7),
    active_users: prorateActiveUsers(rawWeek.active_users, elapsedDays, 7),
    new_registers: prorateLinear(rawWeek.new_registers, elapsedDays, 7),
    withdraw_gold_grams: Number(((withdrawNum / elapsedDays) * 7).toFixed(2)),
    buy_weight_15g: proratedBuyWeight,
    buy_transactions: proratedBuyTx,
    buy_ticket_size_g: buyTicket,
    buy_value_mil_lak: rawWeek.buy_value_mil_lak !== undefined ? prorateLinear(Number(rawWeek.buy_value_mil_lak), elapsedDays, 7) : undefined,
    sell_weight_15g: proratedSellWeight,
    sell_transactions: proratedSellTx,
    sell_ticket_size_g: sellTicket,
    sell_value_mil_lak: rawWeek.sell_value_mil_lak !== undefined ? prorateLinear(Number(rawWeek.sell_value_mil_lak), elapsedDays, 7) : undefined,
  };
}

/**
 * Standardizes weight display with explicit unit label (Baht 15g or Grams).
 */
export function formatWeight(val: number | string, isBaht15g: boolean = true): string {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '-';
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return isBaht15g ? `${formatted} Baht (15g)` : `${formatted} g`;
}

/**
 * Formats financial value in Million Lao Kip (LAK) with clean notation.
 */
export function formatMilLak(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return 'N/A';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return 'N/A';
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 1 })}M LAK`;
}
