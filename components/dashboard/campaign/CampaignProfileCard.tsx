'use client';

import React from 'react';
import { CampaignSetupConfig, CampaignAnalyticsPayload } from '@/lib/types/campaign.types';
import { 
  Target, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Zap, 
  Edit3, 
  Plus, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Award,
  BarChart3,
  Flame,
  ChevronRight
} from 'lucide-react';

interface CampaignProfileCardProps {
  activeCampaign: CampaignSetupConfig;
  allCampaigns: CampaignSetupConfig[];
  analytics: CampaignAnalyticsPayload;
  onSelectCampaign: (campaign: CampaignSetupConfig) => void;
  onOpenEditModal: () => void;
  onOpenNewCampaignModal: () => void;
  onOpenDetailModal: () => void;
  onExecuteCalculate: () => void;
  isCalculating: boolean;
  hasCalculated: boolean;
}

export function CampaignProfileCard({
  activeCampaign,
  allCampaigns,
  analytics,
  onSelectCampaign,
  onOpenEditModal,
  onOpenNewCampaignModal,
  onOpenDetailModal,
  onExecuteCalculate,
  isCalculating,
  hasCalculated,
}: CampaignProfileCardProps) {
  const { targetAchievement: t1, backwardComparison: t2 } = analytics;
  const isEnded = t1.is_ended;
  const isUpcoming = t1.is_upcoming;

  // Format Date Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden transition-all">
      {/* 1. Profile Banner & Identity Header */}
      <div className="bg-gradient-to-r from-[#0c4ca3] via-[#083b80] to-[#062c60] p-5 text-white relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Avatar & Campaign Name & Status */}
          <div className="flex items-center gap-4">
            {/* Profile Avatar / Logo */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg bg-blue-950 flex items-center justify-center">
                {activeCampaign.image_url ? (
                  <img
                    src={activeCampaign.image_url}
                    alt={activeCampaign.campaign_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#e5a812] to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl">
                    {activeCampaign.campaign_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={onOpenEditModal}
                className="absolute -bottom-1 -right-1 p-1 bg-white text-blue-900 rounded-lg shadow-md hover:bg-amber-100 transition-colors"
                title="Change Image / Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Campaign Titles & Badges */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/15 text-blue-100 border border-white/20">
                  {activeCampaign.category_tag || 'Campaign Profile'}
                </span>

                {/* Status Badge */}
                {isEnded ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-200 border border-slate-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Completed / Ended (ສິ້ນສຸດແລ້ວ)</span>
                  </span>
                ) : isUpcoming ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-200 border border-amber-400/30">
                    <Clock className="w-3 h-3 text-amber-300" />
                    <span>Upcoming (ລໍຖ້າເລີ່ມ)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active In Progress (ກຳລັງດຳເນີນ)</span>
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{activeCampaign.campaign_name}</span>
              </h2>

              <p className="text-xs text-blue-100/80 max-w-2xl line-clamp-2">
                {activeCampaign.description || 'Custom campaign intelligence tracking rule, baseline comparison and run-rate projections.'}
              </p>
            </div>
          </div>

          {/* Right: Campaign Switcher & Primary Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap lg:justify-end">
            {/* Campaign Select Dropdown */}
            <select
              value={activeCampaign.id}
              onChange={(e) => {
                const found = allCampaigns.find((c) => c.id === e.target.value);
                if (found) onSelectCampaign(found);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs font-bold rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#e5a812] focus:outline-hidden appearance-none cursor-pointer max-w-[220px] truncate"
            >
              {allCampaigns.map((c) => (
                <option key={c.id} value={c.id} className="text-slate-900 bg-white">
                  🎯 {c.campaign_name}
                </option>
              ))}
            </select>

            {/* Click for More Details Button */}
            <button
              onClick={onOpenDetailModal}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-all shadow-xs"
              title="Click for deep-dive breakdown & raw transaction audit"
            >
              <Info className="w-4 h-4 text-[#e5a812]" />
              <span>More Details (ລາຍລະອຽດ)</span>
            </button>

            {/* Edit Button */}
            <button
              onClick={onOpenEditModal}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-all"
              title="Edit Campaign Parameters"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            {/* Create New Campaign Button */}
            <button
              onClick={onOpenNewCampaignModal}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black bg-[#e5a812] hover:bg-[#d4970b] text-slate-950 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ New</span>
            </button>

            {/* GO! Calculate Button */}
            <button
              onClick={onExecuteCalculate}
              disabled={isCalculating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-[#e5a812] text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 text-slate-950 fill-current ${isCalculating ? 'animate-spin' : ''}`} />
              <span>{isCalculating ? 'CALCULATING...' : '⚡ GO! CALCULATE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Summary KPI Cards Deck */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-50/70 border-b border-slate-200">
        
        {/* Card 1: Time Elapsed & % Time Gone */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Time Gone
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800 font-mono">
                {t1.pct_time_gone}%
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                ({t1.elapsed_days}/{t1.total_days}d)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div 
                className="bg-amber-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, t1.pct_time_gone)}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-500">
            {isEnded ? 'Final Finished' : `${t1.remaining_days} days remaining`}
          </span>
        </div>

        {/* Card 2: EC Target Achievement */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              EC Target (Tx)
            </span>
            <Target className="w-3.5 h-3.5 text-[#0c4ca3]" />
          </div>
          <div className="my-1">
            <div className="text-xl font-black text-slate-800 font-mono">
              {t1.ec_pct_hit_mtd}%
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-bold truncate">
              {t1.ec_actual_mtd.toLocaleString()} / {t1.ec_target.toLocaleString()}
            </div>
          </div>
          <span className="text-[10px] font-bold text-blue-700">
            {isEnded ? `Ended at ${t1.ec_pct_hit_mtd}%` : `Projected RR: ${t1.ec_pct_hit_rr}%`}
          </span>
        </div>

        {/* Card 3: NC Target Achievement */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              NC Target (Users)
            </span>
            <Award className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="my-1">
            <div className="text-xl font-black text-purple-900 font-mono">
              {t1.nc_pct_hit_mtd}%
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-bold truncate">
              {t1.nc_actual_mtd.toLocaleString()} / {t1.nc_target.toLocaleString()}
            </div>
          </div>
          <span className="text-[10px] font-bold text-purple-700">
            {isEnded ? `Ended at ${t1.nc_pct_hit_mtd}%` : `Projected RR: ${t1.nc_pct_hit_rr}%`}
          </span>
        </div>

        {/* Card 4: Buy Volume (Revenue MTD) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Revenue MTD
            </span>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="my-1">
            <div className="text-lg font-black text-slate-800 font-mono truncate">
              {t1.mtd_buy_value_mil_lak.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 font-bold">
              Million LAK
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700">
            Vs Backward: {t2.buy_value_pct_compare > 0 ? `+${t2.buy_value_pct_compare}%` : `${t2.buy_value_pct_compare}%`}
          </span>
        </div>

        {/* Card 5: Gold Weight MTD */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Gold Weight
            </span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="my-1">
            <div className="text-lg font-black text-amber-900 font-mono truncate">
              {t1.mtd_buy_weight_g.toLocaleString()} g
            </div>
            <span className="text-[10px] text-slate-500 font-bold">
              Ticket: {t1.mtd_ticket_size_g} g/tx
            </span>
          </div>
          <span className="text-[10px] font-bold text-amber-700">
            Vs Backward: {t2.buy_weight_pct_compare > 0 ? `+${t2.buy_weight_pct_compare}%` : `${t2.buy_weight_pct_compare}%`}
          </span>
        </div>

        {/* Card 6: Daily Pacing (Run-Rate) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Daily Run-Rate
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-[#0c4ca3]" />
          </div>
          <div className="my-1">
            <div className="text-lg font-black text-slate-800 font-mono">
              {t1.act_buy_trans_per_day.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 font-bold">
              Target: {t1.avg_buy_trans_target_per_day}/day
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
              t1.daily_compare_pct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {t1.daily_compare_pct >= 0 ? `+${t1.daily_compare_pct}%` : `${t1.daily_compare_pct}%`}
            </span>
            <span className="text-[9px] text-slate-400">vs target</span>
          </div>
        </div>

      </div>

      {/* 3. Bottom Date Ribbon (Campaign Dates vs Backward Range) */}
      <div className="px-5 py-2.5 bg-slate-100/60 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#0c4ca3]" />
            <span className="font-bold text-slate-700">Campaign Timeline:</span>
            <span className="font-mono text-slate-800">{formatDate(activeCampaign.campaign_date_start)}</span>
            <span>→</span>
            <span className="font-mono text-slate-800">{formatDate(activeCampaign.campaign_date_end)}</span>
            <span className="text-[11px] text-slate-500">({t1.total_days} Days)</span>
          </span>

          <span className="text-slate-300">|</span>

          <span className="flex items-center gap-1 font-medium">
            <span className="font-bold text-pink-800">Backward Baseline:</span>
            <span className="font-mono text-slate-800">{formatDate(activeCampaign.same_period_backward_start)}</span>
            <span>→</span>
            <span className="font-mono text-slate-800">{formatDate(activeCampaign.same_period_backward_end)}</span>
            <span className="text-[11px] text-pink-700 font-bold">({t2.backward_days} Days reverse)</span>
          </span>
        </div>

        <button
          onClick={onOpenDetailModal}
          className="text-[11px] font-black text-[#0c4ca3] hover:underline flex items-center gap-1"
        >
          <span>View Detailed Breakdown</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
