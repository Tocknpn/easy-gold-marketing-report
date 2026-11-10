import type { MtdForecastMethod } from '@/lib/types/mtd.types';

/** Forecast styles shared by the MTD Forecast and Business Target pages. Linear is the default. */
export const FORECAST_METHOD_ORDER: MtdForecastMethod[] = ['standard', 'ma28', 'hybrid', 'ets'];

export const FORECAST_METHOD_LABEL: Record<MtdForecastMethod, string> = {
  standard: 'Linear Run-Rate (Standard)',
  ma28: 'MA 28-day × Day-of-Week',
  hybrid: 'Hybrid Trend (EMA × Day-of-Week × Payday)',
  ets: 'Holt-Winters ETS (weekly)',
};

export const FORECAST_METHOD_SHORT: Record<MtdForecastMethod, string> = {
  standard: 'Linear',
  ma28: 'MA28×DOW',
  hybrid: 'Hybrid',
  ets: 'ETS',
};

export const FORECAST_METHOD_HELP =
  'Linear: MTD x days in month / days elapsed. MA28 x DOW: 28-day average x day-of-week index x payday factor. ' +
  'Hybrid: 14-day EMA base x day-of-week index (60 days) x payday factor (25th-EOM, last 2 months). ' +
  'ETS: Holt-Winters with weekly season and damped trend (like Excel FORECAST.ETS).';

/** Metric keys returned by mtd_hybrid_forecast / mtd_ets_forecast (sql/65). */
export type ForecastMetricKey =
  | 'buy_weight_g'
  | 'buy_transactions'
  | 'sell_weight_g'
  | 'sell_transactions'
  | 'withdraw_15g'
  | 'new_customers'
  | 'total_transactions';

export interface ForecastEstimate {
  current_mtd: number;
  ma28?: number;
  hybrid?: number;
  ets?: number;
}

export type ForecastEstimates = Partial<Record<ForecastMetricKey, ForecastEstimate>>;

/**
 * Month-end estimate divided by MTD for one metric and method, or undefined for Linear
 * or when the method has no estimate. Multiplying a page's own MTD by it gives that
 * method's month-end in the page's units (grams, baht, counts).
 */
export function forecastMultiplier(
  estimates: ForecastEstimates | null | undefined,
  key: ForecastMetricKey,
  method: MtdForecastMethod
): number | undefined {
  if (method === 'standard' || !estimates) return undefined;
  const e = estimates[key];
  const est = e?.[method];
  if (!e || typeof est !== 'number' || !(e.current_mtd > 0)) return undefined;
  return est / e.current_mtd;
}

/** True when at least one metric has an estimate for this method. */
export function isForecastMethodAvailable(estimates: ForecastEstimates | null | undefined, method: MtdForecastMethod) {
  if (method === 'standard') return true;
  return !!estimates && Object.values(estimates).some((e) => typeof e?.[method] === 'number');
}
