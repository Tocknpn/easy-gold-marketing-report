'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyMetricRow } from '@/lib/constants/targetData';

export type LiveStatus = 'loading' | 'live' | 'polling' | 'error';

const POLL_MS = 5 * 60 * 1000;
const PAGE = 1000; // PostgREST default max rows per request

/**
 * Loads summary_daily_metrics and keeps it fresh:
 *  - Supabase Realtime (needs sql/47_enable_realtime_daily_metrics.sql)
 *  - 5 minute polling fallback, so the wall screen never goes stale
 */
export function useLiveDailyMetrics() {
  const [rows, setRows] = useState<DailyMetricRow[]>([]);
  const [status, setStatus] = useState<LiveStatus>('loading');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const realtimeOk = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const all: DailyMetricRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('summary_daily_metrics')
          .select('*')
          .order('date_id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as DailyMetricRow[]));
        if (data.length < PAGE) break;
      }
      if (all.length > 0) {
        setRows(all);
        setUpdatedAt(new Date());
        setStatus(realtimeOk.current ? 'live' : 'polling');
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.warn('Daily Performance: failed to load summary_daily_metrics', e);
      setStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }
  }, []);

  useEffect(() => {
    load();

    const poll = setInterval(load, POLL_MS);

    const supabase = createClient();
    const channel = supabase
      .channel('daily-performance-mkt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'summary_daily_metrics' },
        () => {
          // Debounce bursts (an upload writes many rows)
          if (reloadTimer.current) clearTimeout(reloadTimer.current);
          reloadTimer.current = setTimeout(load, 1500);
        }
      )
      .subscribe((s) => {
        realtimeOk.current = s === 'SUBSCRIBED';
      });

    return () => {
      clearInterval(poll);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { rows, status, updatedAt, reload: load };
}
