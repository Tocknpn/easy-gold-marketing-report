'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface FreshnessData {
  last_refreshed_at: string | null;
  refresh_status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';
  minutes_ago: number;
  is_stale: boolean;
}

interface FreshnessBadgeProps {
  onTriggerRefresh?: () => void;
}

export function FreshnessBadge({ onTriggerRefresh }: FreshnessBadgeProps) {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(() => Date.now());
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);
  const [latestDbDate, setLatestDbDate] = useState<string>('2026-10-18');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync latest DB date from Supabase
  const checkDbFreshness = async () => {
    try {
      const res = await fetch('/api/dashboard/health');
      if (res.ok) {
        const json = await res.json();
        if (json.latest_data_date) setLatestDbDate(json.latest_data_date);
      }
    } catch {
      // Fallback
    }
  };

  // Timer to increment elapsed minutes in real time
  useEffect(() => {
    checkDbFreshness();
    const interval = setInterval(() => {
      const mins = Math.floor((Date.now() - lastRefreshedAt) / 60000);
      setElapsedMinutes(mins);
    }, 15000); // update every 15 seconds
    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    setLastRefreshedAt(Date.now());
    setElapsedMinutes(0);
    if (onTriggerRefresh) {
      await onTriggerRefresh();
    }
    await checkDbFreshness();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Determine badge styling based on freshness
  let badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  let dotClasses = 'bg-emerald-500';
  let statusText = elapsedMinutes === 0 ? 'Updated just now' : `Updated ${elapsedMinutes}m ago`;

  if (elapsedMinutes > 60) {
    badgeClasses = 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse';
    dotClasses = 'bg-rose-500';
    statusText = `Delayed (>1h ago)`;
  } else if (elapsedMinutes > 30) {
    badgeClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    dotClasses = 'bg-amber-500';
    statusText = `Updated ${elapsedMinutes}m ago`;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all shadow-2xs select-none ${badgeClasses}`}
      title={`Last sync: ${new Date(lastRefreshedAt).toLocaleTimeString()} • Latest DB Date: ${latestDbDate}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClasses}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClasses}`}></span>
      </span>

      <span className="font-semibold text-[11px] whitespace-nowrap">
        {statusText}
      </span>

      <button
        onClick={handleRefreshClick}
        disabled={isRefreshing}
        className="p-0.5 hover:bg-black/5 rounded-full transition-colors active:scale-95 text-slate-500 hover:text-slate-800"
        title="Refresh reporting data now"
      >
        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#0c4ca3]' : ''}`} />
      </button>
    </div>
  );
}
