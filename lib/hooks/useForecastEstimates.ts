'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ForecastEstimates, ForecastMetricKey } from '@/lib/forecast/methods';

const num = (v: unknown) => (v != null && Number.isFinite(Number(v)) ? Number(v) : undefined);

/**
 * Month-end estimates for every forecast method as of one date, from the sql/65 functions.
 * Returns null while loading or when the functions are not deployed (the page then stays Linear).
 * Results are cached per date, and slider moves are debounced.
 */
export function useForecastEstimates(asOfDate: string | null, enabled = true): ForecastEstimates | null {
  // Keyed by date so a result for an older date is never shown for a newer one.
  const [state, setState] = useState<{ date: string; data: ForecastEstimates | null } | null>(null);
  const cache = useRef(new Map<string, ForecastEstimates | null>());

  useEffect(() => {
    if (!enabled || !asOfDate) return;
    if (cache.current.has(asOfDate)) {
      setState({ date: asOfDate, data: cache.current.get(asOfDate) ?? null });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const [hyb, ets] = await Promise.all([
          supabase.rpc('mtd_hybrid_forecast', { p_as_of: asOfDate }),
          supabase.rpc('mtd_ets_forecast', { p_as_of: asOfDate }),
        ]);
        const h = (!hyb.error && hyb.data && typeof hyb.data === 'object' ? hyb.data : {}) as Record<string, any>;
        const e = (!ets.error && ets.data && typeof ets.data === 'object' ? ets.data : {}) as Record<string, any>;
        const out: ForecastEstimates = {};
        const keys = Object.keys(h).concat(Object.keys(e).filter((k) => !(k in h)));
        for (const key of keys) {
          const cur = num(h[key]?.current_mtd) ?? num(e[key]?.current_mtd);
          if (cur === undefined) continue;
          out[key as ForecastMetricKey] = {
            current_mtd: cur,
            ma28: num(h[key]?.est_month_end_ma28),
            hybrid: num(h[key]?.est_month_end_hybrid),
            ets: num(e[key]?.est_month_end_ets),
          };
        }
        const result = Object.keys(out).length > 0 ? out : null;
        cache.current.set(asOfDate, result);
        if (!cancelled) setState({ date: asOfDate, data: result });
      } catch (err) {
        console.warn('Forecast estimates unavailable:', err);
        if (!cancelled) setState({ date: asOfDate, data: null });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [asOfDate, enabled]);

  return enabled && state?.date === asOfDate ? state.data : null;
}
