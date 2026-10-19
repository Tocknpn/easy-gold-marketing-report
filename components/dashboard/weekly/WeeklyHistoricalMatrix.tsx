'use client';

import React, { useState } from 'react';
import { WeeklyMetricRow } from '@/lib/types/dashboard.types';
import { 
  Table2, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Scale, 
  Coins, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface WeeklyHistoricalMatrixProps {
  history: WeeklyMetricRow[];
  selectedWeek: string;
  onSelectWeek: (weekLabel: string) => void;
  isProrated?: boolean;
}

export function WeeklyHistoricalMatrix({
  history,
  selectedWeek,
  onSelectWeek,
  isProrated = false,
}: WeeklyHistoricalMatrixProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [metricCategory, setMetricCategory] = useState<'all' | 'gold_weight' | 'transactions' | 'users'>('all');

  // Display recent 8 weeks in chronological order (oldest to newest)
  const recentWeeks = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    const sorted = [...history].sort((a, b) => a.year_week.localeCompare(b.year_week));
    return sorted.slice(-8);
  }, [history]);

  // Calculate 4-Week Rolling Moving Average (MA4) for the active week
  const ma4Metrics = React.useMemo(() => {
    if (recentWeeks.length < 4) return null;
    const last4 = recentWeeks.slice(-4);
    const avg = (fn: (w: WeeklyMetricRow) => number) =>
      Math.round(last4.reduce((sum, w) => sum + fn(w), 0) / 4);

    return {
      all_transactions: avg((w) => w.all_transactions),
      active_users: avg((w) => w.active_users),
      new_registers: avg((w) => w.new_registers),
      buy_weight_15g: avg((w) => Number(w.buy_weight_15g)),
      sell_weight_15g: avg((w) => Number(w.sell_weight_15g)),
      net_gold_15g: avg((w) => Number(w.buy_weight_15g) - Number(w.sell_weight_15g)),
      buy_transactions: avg((w) => w.buy_transactions),
      sell_transactions: avg((w) => w.sell_transactions),
    };
  }, [recentWeeks]);

  // Find peak transaction week
  const maxTx = Math.max(...recentWeeks.map((w) => w.all_transactions), 1);
  const maxBuyWeight = Math.max(...recentWeeks.map((w) => Number(w.buy_weight_15g)), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-blue-100 text-[#0c4ca3]">
            <Table2 className="w-5 h-5 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                8-Week Historical Performance Matrix &amp; Moving Average (MA4)
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0c4ca3] border border-blue-200">
                WoW Trajectory
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Multi-week comparison across volume, gold flow, user participation, and 4-week smoothed moving averages.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Category Tabs */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center text-[11px] font-extrabold text-slate-600 shadow-2xs">
            <button
              onClick={() => setMetricCategory('all')}
              className={`px-2 py-1 rounded-lg transition-all ${
                metricCategory === 'all' ? 'bg-[#0c4ca3] text-white shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setMetricCategory('gold_weight')}
              className={`px-2 py-1 rounded-lg transition-all ${
                metricCategory === 'gold_weight' ? 'bg-[#0c4ca3] text-white shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Gold (15g)
            </button>
            <button
              onClick={() => setMetricCategory('transactions')}
              className={`px-2 py-1 rounded-lg transition-all ${
                metricCategory === 'transactions' ? 'bg-[#0c4ca3] text-white shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Transactions
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title={isExpanded ? 'Collapse Matrix' : 'Expand Matrix'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-tight">
                <th className="py-2.5 px-4 sticky left-0 bg-slate-100 z-10">Metric / Dimension</th>
                {recentWeeks.map((w) => {
                  const isCurrent = w.week_label === selectedWeek;
                  const isPartial = w.week_label === 'W43';
                  return (
                    <th 
                      key={w.week_label} 
                      onClick={() => onSelectWeek(w.week_label)}
                      className={`py-2.5 px-3 text-center cursor-pointer transition-colors ${
                        isCurrent 
                          ? 'bg-[#0c4ca3] text-white font-black' 
                          : 'hover:bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black">{w.week_label}</span>
                        <span className={`text-[9.5px] font-medium leading-none ${isCurrent ? 'text-blue-100' : 'text-slate-400'}`}>
                          {w.start_date.substring(5)} - {w.end_date.substring(5)}
                        </span>
                        {isPartial && (
                          <span className={`text-[8.5px] px-1 rounded mt-0.5 font-bold ${
                            isCurrent ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Partial
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {ma4Metrics && (
                  <th className="py-2.5 px-3 text-center bg-blue-50/80 text-[#0c4ca3] font-black border-l border-blue-200">
                    <div className="flex flex-col items-center">
                      <span>MA4 Baseline</span>
                      <span className="text-[9.5px] font-semibold text-blue-600">4-Wk Rolling Avg</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Row 1: All Transactions */}
              {(metricCategory === 'all' || metricCategory === 'transactions') && (
                <tr className="hover:bg-slate-50/80 transition-colors font-medium">
                  <td className="py-2.5 px-4 sticky left-0 bg-white z-10 font-bold text-slate-900 flex items-center justify-between">
                    <span>All Transactions</span>
                    <span className="text-[10px] text-slate-400 font-normal">Count</span>
                  </td>
                  {recentWeeks.map((w, idx) => {
                    const isPeak = w.all_transactions === maxTx;
                    const prev = idx > 0 ? recentWeeks[idx - 1].all_transactions : null;
                    const deltaPct = prev ? Math.round(((w.all_transactions - prev) / prev) * 100) : null;
                    return (
                      <td key={w.week_label} className={`py-2.5 px-3 text-center ${w.week_label === selectedWeek ? 'bg-blue-50/40 font-black' : ''}`}>
                        <div className="text-slate-900 font-extrabold">{w.all_transactions.toLocaleString()}</div>
                        {deltaPct !== null && (
                          <div className={`text-[10px] font-black flex items-center justify-center ${deltaPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {deltaPct >= 0 ? '+' : ''}{deltaPct}%
                          </div>
                        )}
                        {isPeak && (
                          <span className="inline-block text-[8.5px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-black uppercase mt-0.5">
                            ATH Peak
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {ma4Metrics && (
                    <td className="py-2.5 px-3 text-center font-black text-[#0c4ca3] bg-blue-50/30 border-l border-blue-100">
                      {ma4Metrics.all_transactions.toLocaleString()}
                    </td>
                  )}
                </tr>
              )}

              {/* Row 2: Buy Transactions */}
              {(metricCategory === 'all' || metricCategory === 'transactions') && (
                <tr className="hover:bg-slate-50/80 transition-colors font-medium">
                  <td className="py-2.5 px-4 sticky left-0 bg-white z-10 font-bold text-slate-800 flex items-center justify-between">
                    <span className="text-emerald-800">Buy Transactions</span>
                    <span className="text-[10px] text-emerald-600 font-normal">Count</span>
                  </td>
                  {recentWeeks.map((w) => (
                    <td key={w.week_label} className={`py-2.5 px-3 text-center ${w.week_label === selectedWeek ? 'bg-blue-50/40 font-black' : ''}`}>
                      <span className="font-extrabold text-emerald-900">{w.buy_transactions.toLocaleString()}</span>
                    </td>
                  ))}
                  {ma4Metrics && (
                    <td className="py-2.5 px-3 text-center font-black text-emerald-800 bg-blue-50/30 border-l border-blue-100">
                      {ma4Metrics.buy_transactions.toLocaleString()}
                    </td>
                  )}
                </tr>
              )}

              {/* Row 3: Sell Transactions */}
              {(metricCategory === 'all' || metricCategory === 'transactions') && (
                <tr className="hover:bg-slate-50/80 transition-colors font-medium">
                  <td className="py-2.5 px-4 sticky left-0 bg-white z-10 font-bold text-slate-800 flex items-center justify-between">
                    <span className="text-rose-800">Sell Transactions</span>
                    <span className="text-[10px] text-rose-600 font-normal">Count</span>
                  </td>
                  {recentWeeks.map((w) => (
                    <td key={w.week_label} className={`py-2.5 px-3 text-center ${w.week_label === selectedWeek ? 'bg-blue-50/40 font-black' : ''}`}>
                      <span className="font-extrabold text-rose-900">{w.sell_transactions.toLocaleString()}</span>
                    </td>
                  ))}
                  {ma4Metrics && (
                    <td className="py-2.5 px-3 text-center font-black text-rose-800 bg-blue-50/30 border-l border-blue-100">
                      {ma4Metrics.sell_transactions.toLocaleString()}
                    </td>
                  )}
                </tr>
              )}

              {/* Row 4: Buy Gold Weight (15g) */}
              {(metricCategory === 'all' || metricCategory === 'gold_weight') && (
                <tr className="hover:bg-slate-50/80 transition-colors font-medium bg-emerald-50/20">
                  <td className="py-2.5 px-4 sticky left-0 bg-[#fbfdfb] z-10 font-bold text-emerald-900 flex items-center justify-between">
                    <span>Buy Weight (15g Baht)</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Inflow</span>
                  </td>
                  {recentWeeks.map((w) => (
                    <td key={w.week_label} className={`py-2.5 px-3 text-center ${w.week_label === selectedWeek ? 'bg-blue-50/40 font-black' : ''}`}>
                      <span className="font-black text-emerald-900">{Number(w.buy_weight_15g).toLocaleString()}</span>
                    </td>
                  ))}
                  {ma4Metrics && (
                    <td className="py-2.5 px-3 text-center font-black text-emerald-900 bg-blue-50/30 border-l border-blue-100">
                      {ma4Metrics.buy_weight_15g.toLocaleString()}
                    </td>
                  )}
                </tr>
              )}

              {/* Row 5: Sell Gold Weight (15g) */}
              {(metricCategory === 'all' || metricCategory === 'gold_weight') && (
                <tr className="hover:bg-slate-50/80 transition-colors font-medium bg-rose-50/20">
                  <td className="py-2.5 px-4 sticky left-0 bg-[#fdfbfb] z-10 font-bold text-rose-900 flex items-center justify-between">
                    <span>Sell Weight (15g Baht)</span>
                    <span className="text-[10px] text-rose-600 font-semibold">Outflow</span>
                  </td>
                  {recentWeeks.map((w) => (
                    <td key={w.week_label} className={`py-2.5 px-3 text-center ${w.week_label === selectedWeek ? 'bg-blue-50/40 font-black' : ''}`}>
                      <span className="font-black text-rose-900">{Number(w.sell_weight_15g).toLocaleString()}</span>
                    </td>
                  ))}
                  {ma4Metrics && (
                    <td className="py-2.5 px-3 text-center font-black text-rose-900 bg-blue-50/30 border-l border-blue-100">
                      {ma4Metrics.sell_weight_15g.toLocaleString()}
                    </td>
                  )}
                </tr>
              )}

              {/* Row 6: Net Platform Gold Flow (15g) */}
              {(metricCategory === 'all' || metricCategory === 'gold_weight') && (
                <tr className="hover:bg-slate-50/80 transition-colors font-black bg-blue-50/40 border-t border-b border-blue-100">
                  <td className="py-2.5 px-4 sticky left-0 bg-[#f5f8fd] z-10 text-[#0c4ca3] flex items-center justify-between">
                    <span>Net Gold Flow (15g Baht)</span>
                    <span className="text-[10px] text-blue-700 font-black">Buy - Sell</span>
                  </td>
                  {recentWeeks.map((w) => {
                    const net = Number(w.buy_weight_15g) - Number(w.sell_weight_15g);
                    return (
                      <td key={w.week_label} className={`py-2.5 px-3 text-center ${w.week_label === selectedWeek ? 'bg-blue-100/50 font-black' : ''}`}>
                        <span className={`font-black ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {net >= 0 ? '+' : ''}{net.toLocaleString()}
                        </span>
                      </td>
                    );
                  })}
                  {ma4Metrics && (
                    <td className="py-2.5 px-3 text-center font-black text-[#0c4ca3] bg-blue-100/40 border-l border-blue-200">
                      {ma4Metrics.net_gold_15g >= 0 ? '+' : ''}{ma4Metrics.net_gold_15g.toLocaleString()}
                    </td>
                  )}
                </tr>
              )}

              {/* Row 7: Active Users & Engagement */}
              {(metricCategory === 'all' || metricCategory === 'users') && (
                <tr className="hover:bg-slate-50/80 transition-colors font-medium">
                  <td className="py-2.5 px-4 sticky left-0 bg-white z-10 font-bold text-slate-800 flex items-center justify-between">
                    <span>Active Users Participate</span>
                    <span className="text-[10px] text-slate-400 font-normal">Unique</span>
                  </td>
                  {recentWeeks.map((w) => (
                    <td key={w.week_label} className={`py-2.5 px-3 text-center ${w.week_label === selectedWeek ? 'bg-blue-50/40 font-black' : ''}`}>
                      <span className="font-extrabold text-slate-800">{w.active_users.toLocaleString()}</span>
                    </td>
                  ))}
                  {ma4Metrics && (
                    <td className="py-2.5 px-3 text-center font-black text-slate-800 bg-blue-50/30 border-l border-blue-100">
                      {ma4Metrics.active_users.toLocaleString()}
                    </td>
                  )}
                </tr>
              )}

              {/* Row 8: New Registers */}
              {(metricCategory === 'all' || metricCategory === 'users') && (
                <tr className="hover:bg-slate-50/80 transition-colors font-medium">
                  <td className="py-2.5 px-4 sticky left-0 bg-white z-10 font-bold text-slate-800 flex items-center justify-between">
                    <span>New Registers</span>
                    <span className="text-[10px] text-slate-400 font-normal">Signups</span>
                  </td>
                  {recentWeeks.map((w) => (
                    <td key={w.week_label} className={`py-2.5 px-3 text-center ${w.week_label === selectedWeek ? 'bg-blue-50/40 font-black' : ''}`}>
                      <span className="font-extrabold text-emerald-700">+{w.new_registers.toLocaleString()}</span>
                    </td>
                  ))}
                  {ma4Metrics && (
                    <td className="py-2.5 px-3 text-center font-black text-emerald-700 bg-blue-50/30 border-l border-blue-100">
                      +{ma4Metrics.new_registers.toLocaleString()}
                    </td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
