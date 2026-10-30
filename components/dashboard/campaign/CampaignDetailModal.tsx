'use client';

import React from 'react';
import { CampaignSetupConfig, CampaignAnalyticsPayload } from '@/lib/types/campaign.types';
import { 
  X, 
  Target, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award, 
  BarChart3, 
  Flame, 
  FileCode2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface CampaignDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignSetupConfig;
  analytics: CampaignAnalyticsPayload;
  onOpenEditModal: () => void;
}

export function CampaignDetailModal({
  isOpen,
  onClose,
  campaign,
  analytics,
  onOpenEditModal,
}: CampaignDetailModalProps) {
  if (!isOpen) return null;

  const { targetAchievement: t1, backwardComparison: t2 } = analytics;
  const isEnded = t1.is_ended;
  const isUpcoming = t1.is_upcoming;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-brand-navy text-white p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/30 shadow-md bg-blue-950 shrink-0">
              {campaign.image_url ? (
                <img src={campaign.image_url} alt={campaign.campaign_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-brand-gold text-slate-950 font-black text-xl flex items-center justify-center">
                  {campaign.campaign_name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-brand-gold text-slate-950">
                  {campaign.category_tag || 'Marketing Campaign'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                  isEnded ? 'bg-slate-800 text-slate-200' : isUpcoming ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/30 text-emerald-200'
                }`}>
                  {isEnded ? '🏁 Completed' : isUpcoming ? '⏳ Upcoming' : '🟢 Active In Progress'}
                </span>
              </div>
              <h2 className="text-xl font-black text-white">{campaign.campaign_name}</h2>
              <p className="text-xs text-blue-100/80">{campaign.description || 'Comprehensive campaign performance audit'}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Section 1: Campaign Rules & Timeline Specs */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#0c4ca3]" />
              <span>Campaign Specification & Rules Engine</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Filter Condition</span>
                <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                  {campaign.condition_label}
                </span>
                <span className="text-[10px] text-slate-500">
                  {campaign.bank && campaign.bank !== 'all' ? `Bank: ${campaign.bank} • ` : ''}
                  Op: {campaign.condition_operator || '>='} {campaign.condition_value?.toLocaleString()}
                  {campaign.condition_max_value ? ` to ${campaign.condition_max_value.toLocaleString()}` : ''}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Campaign Timeline</span>
                <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                  {formatDate(campaign.campaign_date_start)} - {formatDate(campaign.campaign_date_end)}
                </span>
                <span className="text-[10px] text-slate-500">
                  Total: {t1.total_days} Days ({t1.elapsed_days}d elapsed)
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Backward Benchmark</span>
                <span className="text-xs font-bold text-pink-900 font-mono mt-0.5 block">
                  {formatDate(campaign.same_period_backward_start)} - {formatDate(campaign.same_period_backward_end)}
                </span>
                <span className="text-[10px] text-pink-700">
                  Exact reverse duration ({t2.backward_days} Days)
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">As-Of Data Point</span>
                <span className="text-xs font-bold text-[#0c4ca3] font-mono mt-0.5 block">
                  {formatDate(campaign.data_update_on)}
                </span>
                <span className="text-[10px] text-blue-700 font-semibold">
                  {isEnded ? 'Campaign 100% Final' : `% Time Gone: ${t1.pct_time_gone}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Target Achievement & Run-Rate Projections Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#0c4ca3]" />
                <span>Target Achievement & Run-Rate (RR) Forecast</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                Pacing: {t1.act_buy_trans_per_day} actual/day vs {t1.avg_buy_trans_target_per_day} target/day
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0c4ca3]/10 text-slate-700 font-black text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Metric</th>
                    <th className="py-2.5 px-3 text-right">Target</th>
                    <th className="py-2.5 px-3 text-right">MTD Actual ({t1.elapsed_days}d)</th>
                    <th className="py-2.5 px-3 text-right">% Target Hit</th>
                    <th className="py-2.5 px-3 text-right">RR Full Projection</th>
                    <th className="py-2.5 px-3 text-right">Projected % Hit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {/* EC Target */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">
                      Buy Transactions ({campaign.condition_label})
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700">
                      {t1.ec_target.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#0c4ca3]">
                      {t1.ec_actual_mtd.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        t1.ec_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-800'
                      }`}>
                        {t1.ec_pct_hit_mtd}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {t1.ec_rr_projected.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        t1.ec_pct_hit_rr >= 100 ? 'bg-emerald-100 text-emerald-800' : t1.ec_pct_hit_rr >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {t1.ec_pct_hit_rr}%
                      </span>
                    </td>
                  </tr>

                  {/* Unique Users */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold text-cyan-900">
                      Unique Users ({t1.unique_users_mode_label || 'Within Tier'})
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700 font-mono tabular-nums">
                      {t1.unique_users_target > 0 ? t1.unique_users_target.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-cyan-800 font-mono tabular-nums">
                      {t1.unique_users_actual_mtd.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {t1.unique_users_target > 0 ? (
                        <span className={`px-2 py-0.5 rounded-md font-bold font-mono tabular-nums ${
                          t1.unique_users_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-cyan-50 text-cyan-900'
                        }`}>
                          {t1.unique_users_pct_hit_mtd}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono tabular-nums">
                      {t1.unique_users_rr_projected.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {t1.unique_users_target > 0 ? (
                        <span className={`px-2 py-0.5 rounded-md font-bold font-mono tabular-nums ${
                          t1.unique_users_pct_hit_rr >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t1.unique_users_pct_hit_rr}%
                        </span>
                      ) : '-'}
                    </td>
                  </tr>

                  {/* NC Target */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold text-brand-navy">
                      NC: New Customers ({t1.nc_mode_label || 'All Registers'})
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700 font-mono tabular-nums">
                      {t1.nc_target.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-brand-navy font-mono tabular-nums">
                      {t1.nc_actual_mtd.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-md font-bold font-mono tabular-nums ${
                        t1.nc_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-brand-navy'
                      }`}>
                        {t1.nc_pct_hit_mtd}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono tabular-nums">
                      {t1.nc_rr_projected.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-md font-bold font-mono tabular-nums ${
                        t1.nc_pct_hit_rr >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {t1.nc_pct_hit_rr}%
                      </span>
                    </td>
                  </tr>

                  {/* Revenue */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">
                      Buy Revenue (Million LAK)
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700">
                      {campaign.revenue_target_mil ? campaign.revenue_target_mil.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {t1.mtd_buy_value_mil_lak.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {t1.revenue_pct_hit_mtd ? `${t1.revenue_pct_hit_mtd}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {t1.rr_buy_value_mil_lak.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {t1.revenue_pct_hit_rr ? `${t1.revenue_pct_hit_rr}%` : '-'}
                    </td>
                  </tr>

                  {/* Gold Weight */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">
                      Gold Weight (Grams)
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700">
                      {campaign.gold_weight_target_g ? campaign.gold_weight_target_g.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700">
                      {t1.mtd_buy_weight_g.toLocaleString()} g
                    </td>
                    <td className="py-3 px-3 text-right">
                      {t1.weight_pct_hit_mtd ? `${t1.weight_pct_hit_mtd}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {t1.rr_buy_weight_g.toLocaleString()} g
                    </td>
                    <td className="py-3 px-3 text-right">
                      {t1.weight_pct_hit_rr ? `${t1.weight_pct_hit_rr}%` : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Backward Benchmark Comparison */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Same Period Backward Comparison (Baseline Growth Delta)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Buy Transactions</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-950 font-mono">
                    {t2.buy_trans_pct_compare > 0 ? `+${t2.buy_trans_pct_compare}%` : `${t2.buy_trans_pct_compare}%`}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-900/80 font-mono mt-1">
                  {t2.buy_trans_mtd.toLocaleString()} vs {t2.buy_trans_backward.toLocaleString()}
                </div>
              </div>

              <div className="bg-cyan-50/60 border border-cyan-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-cyan-800 uppercase">Unique Users</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-cyan-950 font-mono">
                    {t2.unique_users_pct_compare > 0 ? `+${t2.unique_users_pct_compare}%` : `${t2.unique_users_pct_compare}%`}
                  </span>
                </div>
                <div className="text-[11px] text-cyan-900/80 font-mono mt-1">
                  {t2.unique_users_mtd.toLocaleString()} vs {t2.unique_users_backward.toLocaleString()}
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-blue-800 uppercase">Buy Revenue (LAK)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-blue-950 font-mono">
                    {t2.buy_value_pct_compare > 0 ? `+${t2.buy_value_pct_compare}%` : `${t2.buy_value_pct_compare}%`}
                  </span>
                </div>
                <div className="text-[11px] text-blue-900/80 font-mono mt-1">
                  {t2.buy_value_lak_mtd.toLocaleString()} vs {t2.buy_value_lak_backward.toLocaleString()}
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Gold Weight (G)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-amber-950 font-mono">
                    {t2.buy_weight_pct_compare > 0 ? `+${t2.buy_weight_pct_compare}%` : `${t2.buy_weight_pct_compare}%`}
                  </span>
                </div>
                <div className="text-[11px] text-amber-900/80 font-mono mt-1">
                  {t2.buy_weight_g_mtd.toLocaleString()}g vs {t2.buy_weight_g_backward.toLocaleString()}g
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4">
                <span className="text-xs font-bold text-brand-navy uppercase">Ticket Size (g/tx)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                    {t2.ticket_size_pct_compare > 0 ? `+${t2.ticket_size_pct_compare}%` : `${t2.ticket_size_pct_compare}%`}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-mono tabular-nums mt-1">
                  {t2.ticket_size_g_mtd}g vs {t2.ticket_size_g_backward}g
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Required Run-Rate Pacing Advice */}
          {!isEnded && t1.remaining_days > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h4 className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5 mb-1">
                <span>Executive Pacing Recommendation</span>
              </h4>
              <p className="text-xs text-amber-950/80">
                To achieve 100% of the EC target ({t1.ec_target.toLocaleString()} transactions) within the remaining <strong>{t1.remaining_days} days</strong>, the campaign needs an average of <strong>{t1.required_daily_trans_remaining.toLocaleString()} transactions/day</strong>. Current velocity is <strong>{t1.act_buy_trans_per_day.toLocaleString()} trans/day</strong>.
              </p>
            </div>
          )}

          {/* Section 5: Database Query Audit Inspector & SQL Script */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-amber-400">
                <FileCode2 className="w-4 h-4" />
                <span>Generated SQL Query for Supabase</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400">Data Source: {analytics.dataSource || 'supabase_live'}</span>
            </div>
            <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950/80 p-3 rounded-xl overflow-x-auto whitespace-pre">
{analytics.sql_script || `-- 1. Actual MTD Performance (${campaign.campaign_date_start} to ${campaign.data_update_on || '2026-10-21'})
SELECT 
    COUNT(*) AS ec_actual_mtd,
    COUNT(DISTINCT phone) AS unique_customers_mtd,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS mtd_buy_weight_g,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS mtd_buy_value_mil_lak
FROM public.monthly_data
WHERE created_at >= '${campaign.campaign_date_start}'
  AND created_at <= '${campaign.data_update_on || '2026-10-21'} 23:59:59'
  AND status = 'ສໍາເລັດ'
  AND transaction_type = '${campaign.tx_type || 'BUY_GOLD'}'${(() => {
    if (!campaign.bank || campaign.bank === 'all') return '';
    const banks = campaign.bank.split(',').map((b: string) => b.trim()).filter(Boolean);
    if (banks.length === 1) return `\n  AND bank ILIKE '%${banks[0]}%'`;
    if (banks.length > 1) return `\n  AND (${banks.map((b: string) => `bank ILIKE '%${b}%'`).join(' OR ')})`;
    return '';
  })()}${campaign.condition_value ? `\n  AND ${(campaign.condition_type || '').includes('weight') ? 'gold_weight' : 'total_amount'} ${campaign.condition_operator || '>='} ${campaign.condition_value}` : ''};`}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onOpenEditModal}
            className="text-xs font-bold text-[#0c4ca3] hover:underline"
          >
            Adjust / Edit Campaign Parameters
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white shadow-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
