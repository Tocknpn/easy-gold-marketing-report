/**
 * Merge the extra forecast methods (sql/65_mtd_hybrid_forecast.sql) into each metric of a
 * get_mtd_forecast_report payload. Used by the API route and by the page's direct-RPC fallback
 * (the static export used for the daily email has no /api routes).
 * Mutates and returns `data`. Missing or failed results leave a metric unchanged.
 */
export function mergeExtraForecasts<T extends { metrics?: Record<string, any> }>(
  data: T,
  hybridData: unknown,
  etsData: unknown
): T {
  if (!data?.metrics) return data;
  const hybrid = (hybridData && typeof hybridData === 'object' ? hybridData : {}) as Record<string, any>;
  const ets = (etsData && typeof etsData === 'object' ? etsData : {}) as Record<string, any>;
  const num = (v: unknown) => (v != null && Number.isFinite(Number(v)) ? Number(v) : undefined);

  for (const key of Object.keys(data.metrics)) {
    const h = hybrid[key];
    const e = ets[key];
    data.metrics[key] = {
      ...data.metrics[key],
      ...(h ? { est_month_end_hybrid: num(h.est_month_end_hybrid), est_month_end_ma28: num(h.est_month_end_ma28), hybrid: h } : {}),
      ...(e ? { est_month_end_ets: num(e.est_month_end_ets), ets: e } : {}),
    };
  }
  return data;
}
