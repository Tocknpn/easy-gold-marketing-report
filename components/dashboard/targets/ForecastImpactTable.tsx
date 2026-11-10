'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import type { MtdForecastMethod } from '@/lib/types/mtd.types';
import type { RunRateComparisonPayload } from '@/lib/types/target.types';
import {
  FORECAST_METHOD_ORDER,
  FORECAST_METHOD_SHORT,
  ForecastEstimates,
  ForecastMetricKey,
  forecastMultiplier,
  isForecastMethodAvailable,
} from '@/lib/forecast/methods';

/** Business Target tracking ids -> sql/65 forecast keys. */
const TRACKING_KEY: Record<string, ForecastMetricKey> = {
  nc: 'new_customers',
  buy_tx: 'buy_transactions',
  buy_wt: 'buy_weight_g',
  sell_tx: 'sell_transactions',
  sell_wt: 'sell_weight_g',
};

const tone = (pct: number) =>
  pct >= 100 ? 'text-emerald-700 bg-emerald-50' : pct >= 90 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50';

interface ForecastImpactTableProps {
  data: RunRateComparisonPayload;
  estimates: ForecastEstimates | null;
  selected: MtdForecastMethod;
}

/** Est. Target Hit % for every forecast style side by side, so the effect of the choice is visible. */
export function ForecastImpactTable({ data, estimates, selected }: ForecastImpactTableProps) {
  const linear = data.total_days_in_month / Math.max(1, data.days_elapsed);
  const methods = FORECAST_METHOD_ORDER.filter((m) => isForecastMethodAvailable(estimates, m));

  const hitPct = (actual: number, target: number, id: string, method: MtdForecastMethod) => {
    const key = TRACKING_KEY[id];
    const m = (key && forecastMultiplier(estimates, key, method)) || linear;
    return target > 0 ? Math.round(((actual * m) / target) * 100) : 0;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300/80 shadow-xs p-3.5 sm:p-4 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Scale className="w-4 h-4 text-[#0c4ca3]" />
          <span>Forecast style impact: Est. Target Hit %</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          {data.current_month_label} {data.current_year}, as of day {data.days_elapsed}
          {methods.length === 1 && ' · other styles appear once sql/65 is deployed'}
        </span>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[520px]">
          <thead>
            <tr className="text-slate-500 uppercase tracking-wider text-[10px]">
              <th className="text-left font-black px-2 py-1.5">Metric</th>
              {methods.map((m) => (
                <th
                  key={m}
                  className={`text-right font-black px-2 py-1.5 ${m === selected ? 'text-[#0c4ca3]' : ''}`}
                >
                  {FORECAST_METHOD_SHORT[m]}
                  {m === selected && ' ●'}
                </th>
              ))}
              {methods.length > 1 && <th className="text-right font-black px-2 py-1.5">Spread</th>}
            </tr>
          </thead>
          <tbody>
            {data.monthly_tracking.metrics.map((metric) => {
              const values = methods.map((m) => hitPct(metric.actual, metric.target, metric.id, m));
              const spread = values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;
              return (
                <tr key={metric.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-bold text-slate-800 whitespace-nowrap">{metric.label}</td>
                  {methods.map((m, i) => (
                    <td key={m} className="px-2 py-1 text-right">
                      <span
                        className={`inline-block min-w-[3.25rem] px-1.5 py-0.5 rounded-md font-black tabular-nums ${tone(values[i])} ${
                          m === selected ? 'ring-1 ring-[#0c4ca3]' : ''
                        }`}
                      >
                        {values[i]}%
                      </span>
                    </td>
                  ))}
                  {methods.length > 1 && (
                    <td className="px-2 py-1.5 text-right font-bold text-slate-500 tabular-nums">{spread} pts</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 font-medium">
        Green ≥ 100% · Amber 90–99% · Red &lt; 90%. Spread = how far the styles disagree; a big spread means the
        month-end call is uncertain.
      </p>
    </div>
  );
}
