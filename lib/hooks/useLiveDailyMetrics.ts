'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyMetricRow } from '@/lib/constants/targetData';

export type LiveStatus = 'loading' | 'live' | 'polling' | 'error';

const POLL_MS = 5 * 60 * 1000;
const PAGE = 1000;
const CACHE_KEY = 'easy_gold_summary_daily_metrics_cache';
let memoryRowsCache: DailyMetricRow[] = [];

function getInitialRows(): DailyMetricRow[] {
  if (memoryRowsCache.length > 0) return memoryRowsCache;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryRowsCache = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore JSON errors
    }
  }
  return [];
}

/**
 * Loads summary_daily_metrics and keeps it fresh:
 *  - Instant hydration from memory / localStorage cache (0ms waiting screen)
 *  - Supabase Realtime (needs sql/47_enable_realtime_daily_metrics.sql)
 *  - 5 minute polling fallback, so the wall screen never goes stale
 */
export function useLiveDailyMetrics() {
  const [rows, setRows] = useState<DailyMetricRow[]>(getInitialRows);
  const [status, setStatus] = useState<LiveStatus>(() => (memoryRowsCache.length > 0 ? 'live' : 'loading'));
  const [updatedAt, setUpdatedAt] = useState<Date | null>(() => (memoryRowsCache.length > 0 ? new Date() : null));
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
        memoryRowsCache = all;
        setRows(all);
        setUpdatedAt(new Date());
        setStatus(realtimeOk.current ? 'live' : 'polling');
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(all));
          } catch {
            // ignore storage quota errors
          }
        }
      } else {
        setStatus((prev) => (memoryRowsCache.length > 0 ? prev : 'error'));
      }
    } catch (e) {
      console.warn('Daily Performance: failed to load summary_daily_metrics', e);
      setStatus((prev) => (memoryRowsCache.length > 0 ? prev : 'error'));
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
