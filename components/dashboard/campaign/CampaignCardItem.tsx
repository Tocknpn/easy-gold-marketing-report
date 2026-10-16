'use client';

import React, { useMemo } from 'react';
import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { computeCampaignAnalytics } from '@/lib/campaign/campaignEngine';
import { 
  Calendar, 
  BarChart3, 
  Edit3, 
  Trash2, 
  Clock, 
  Sparkles,
  Target,
  CheckCircle2,
  TrendingUp,
  Scale,
  Users,
  Coins
} from 'lucide-react';

interface CampaignCardItemProps {
  campaign: CampaignSetupConfig;
  isActive?: boolean;
  onSelectCampaign: (campaign: CampaignSetupConfig) => void;
  onOpenDetails: (campaign: CampaignSetupConfig) => void;
  onRecord: (campaign: CampaignSetupConfig) => void;
  onEdit: (campaign: CampaignSetupConfig) => void;
  onDelete: (campaignId: string) => void;
  isRecording?: boolean;
}

// Format amount to Kip string (e.g. ₭2.8B, ₭395.7M, ₭0, or '—')
export function formatKipShort(amount?: number, isCost: boolean = false): string {
  if (amount === undefined || amount === null || amount === 0) {
    return isCost ? '—' : '₭0';
  }
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    const val = (amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `₭${val}B`;
  }
  if (abs >= 1_000_000) {
    const val = (amount / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `₭${val}M`;
  }
  if (abs >= 1_000) {
    const val = (amount / 1_000).toFixed(1).replace(/\.0$/, '');
    return `₭${val}K`;
  }
  return `₭${amount.toLocaleString()}`;
}

// Format weight to grams or kg
export function formatWeightShort(grams?: number): string {
  if (!grams || grams === 0) return '0g';
  if (grams >= 1_000) {
    return `${(grams / 1_000).toFixed(1).replace(/\.0$/, '')}kg`;
  }
  return `${grams.toLocaleString()}g`;
}

// Format revenue target in Kip cleanly (Mil, Bil, Trillion)
export function formatTargetRevenue(milLak?: number): string {
  if (!milLak || milLak === 0) return '—';
  if (milLak >= 1_000_000) {
    return `₭${(milLak / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}T`;
  }
  if (milLak >= 1_000) {
    return `₭${(milLak / 1_000).toFixed(1).replace(/\.?0+$/, '')}B`;
  }
  return `₭${milLak.toFixed(1).replace(/\.?0+$/, '')}M`;
}

// Format dates matching clean executive style: e.g. "24 Aug 26 → 25 Dec 26"
export function formatEventDateRange(startStr: string, endStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const parsePart = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year2 = parts[0].slice(-2);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${months[monthIdx] || parts[1]} ${year2}`;
    }
    return dStr;
  };

  return `${parsePart(startStr)} → ${parsePart(endStr)}`;
}

// Get Badge styling based on category tag
function getCategoryBadgeStyle(category?: string) {
  const cat = (category || '').toUpperCase();
  if (cat.includes('SPRINT') || cat.includes('WEIGHT')) {
    return {
      bg: 'bg-[#b45309]', // Warm Amber
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#b45309]',
    };
  }
  if (cat.includes('VOLUME') || cat.includes('500K')) {
    return {
      bg: 'bg-[#1d4ed8]', // Royal Blue
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#1d4ed8]',
    };
  }
  if (cat.includes('VIP') || cat.includes('RETENTION')) {
    return {
      bg: 'bg-[#581c87]', // Purple
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#581c87]',
    };
  }
  if (cat.includes('ACQUISITION') || cat.includes('NEW')) {
    return {
      bg: 'bg-[#15803d]', // Emerald Green
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#15803d]',
    };
  }
  return {
    bg: 'bg-[#0f766e]', // Teal
    text: 'text-white',
    topBorder: 'border-t-4 border-t-[#0f766e]',
  };
}

export function CampaignCardItem({
  campaign,
  isActive = false,
  onSelectCampaign,
  onOpenDetails,
  onRecord,
  onEdit,
  onDelete,
  isRecording = false,
}: CampaignCardItemProps) {
  const badgeStyle = getCategoryBadgeStyle(campaign.category_tag || campaign.scale_category);
  const tagText = campaign.category_tag || 'Marketing Campaign';

  // Compute live analytics based on configured campaign plan
  const analytics = useMemo(() => {
    return computeCampaignAnalytics(campaign);
  }, [campaign]);

  const { targetAchievement, backwardComparison } = analytics;
  const isCompleted = targetAchievement.is_ended;
  const isUpcoming = targetAchievement.is_upcoming;
  const statusLabel = isCompleted ? 'Completed' : isUpcoming ? 'Upcoming' : 'Active';

  // Core metrics derived from Campaign Plan Setup
  const actEc = targetAchievement.ec_actual_mtd;
  const tgtEc = targetAchievement.ec_target;
  const ecHitPct = targetAchievement.ec_pct_hit_mtd;

  const actNc = targetAchievement.nc_actual_mtd;
  const tgtNc = targetAchievement.nc_target;
  const hasNcTarget = tgtNc > 0;
  const ncHitPct = targetAchievement.nc_pct_hit_mtd;

  const tgtWeight = targetAchievement.gold_weight_target_g ?? 0;
  const actWeight = targetAchievement.mtd_buy_weight_g;
  const hasWeightTarget = tgtWeight > 0;
  const weightHitPct = targetAchievement.weight_pct_hit_mtd ?? 0;

  const tgtRevenue = targetAchievement.revenue_target_mil;
  const actRevenue = targetAchievement.mtd_buy_value_mil_lak;
  const hasRevenueTarget = tgtRevenue !== undefined && tgtRevenue > 0;

  const rrProjected = targetAchievement.ec_rr_projected;

  return (
    <div 
      className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative ${badgeStyle.topBorder} ${
        isActive 
          ? 'border-[#0c4ca3] ring-2 ring-[#0c4ca3]/30 shadow-md bg-blue-50/10' 
          : 'border-slate-200/90 shadow-2xs hover:shadow-md'
      }`}
    >
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        {/* 1. Header Badges: Category Tag, Condition Rule Pill, Lifecycle Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text} shadow-2xs`}>
              {tagText}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
              <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate max-w-[130px]">{campaign.condition_label || 'Buy Trans'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-[#0c4ca3] border border-blue-200">
                Active in View
              </span>
            )}
            <span className={`text-xs font-bold ${
              isCompleted ? 'text-emerald-600' : isUpcoming ? 'text-amber-600' : 'text-sky-700'
            }`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* 2. Campaign Name & Date Horizon */}
        <div>
          <h3 
            onClick={() => onSelectCampaign(campaign)}
            className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug cursor-pointer hover:text-[#0c4ca3] transition-colors"
            title={campaign.campaign_name}
          >
            {campaign.campaign_name}
          </h3>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-[11px]">{formatEventDateRange(campaign.campaign_date_start, campaign.campaign_date_end)}</span>
            </div>
            <span>&bull;</span>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
              {targetAchievement.total_days}d Horizon
            </span>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
              {targetAchievement.pct_time_gone}% Elapsed
            </span>
          </div>
        </div>

        {/* 3. Campaign Plan Targets Overview (Directly from Plan Input) */}
        <div className="flex items-end justify-between pt-2 pb-1 border-t border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              PLANNED TRANSACTIONS (EC)
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
              {tgtEc.toLocaleString()} <span className="text-xs font-bold text-slate-500 font-sans">trans</span>
            </span>
            <span className="text-[11px] text-blue-700 font-semibold block">
              MTD: {actEc.toLocaleString()} ({ecHitPct}%)
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              PLANNED VALUE / WEIGHT GOAL
            </span>
            <span className="text-base sm:text-lg font-black text-[#0c4ca3] font-mono">
              {hasRevenueTarget 
                ? formatTargetRevenue(tgtRevenue) 
                : hasWeightTarget 
                  ? formatWeightShort(tgtWeight) 
                  : 'Condition Basis'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              {hasRevenueTarget
                ? `MTD: ${formatTargetRevenue(actRevenue)}`
                : hasWeightTarget
                  ? `MTD: ${formatWeightShort(actWeight)}`
                  : 'Active Tracking'}
            </span>
          </div>
        </div>

        {/* 4. 2x2 Metric Tiles based on data input on the Plan */}
        <div className="grid grid-cols-2 gap-2">
          {/* Tile 1: EC Transactions (Act / Target) */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/90">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate">
                EC TRANS (ACT/TGT)
              </span>
            </div>
            <div className="mt-0.5">
              <span className={`text-sm font-black font-mono ${ecHitPct >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {actEc.toLocaleString()} / {tgtEc.toLocaleString()}
              </span>
              <span className={`block text-[11px] font-bold ${ecHitPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                {ecHitPct}% target hit
              </span>
            </div>
          </div>

          {/* Tile 2: New Customers Target (Act / Target) */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/90">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate block">
              NEW CUST. (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className={`text-sm font-black font-mono ${hasNcTarget && ncHitPct >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {hasNcTarget ? `${actNc.toLocaleString()} / ${tgtNc.toLocaleString()}` : `${actNc.toLocaleString()} MTD`}
              </span>
              <span className={`block text-[11px] font-bold ${hasNcTarget ? (ncHitPct >= 100 ? 'text-emerald-600' : 'text-slate-500') : 'text-slate-400'}`}>
                {hasNcTarget ? `${ncHitPct}% target hit` : 'No NC target set'}
              </span>
            </div>
          </div>

          {/* Tile 3: Buy Gold Weight */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/90">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate block">
              BUY WEIGHT (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className="text-sm font-black text-slate-900 font-mono">
                {hasWeightTarget ? `${formatWeightShort(actWeight)} / ${formatWeightShort(tgtWeight)}` : formatWeightShort(actWeight)}
              </span>
              <span className="block text-[11px] font-bold text-slate-500">
                {hasWeightTarget ? `${weightHitPct}% weight hit` : 'Volume basis'}
              </span>
            </div>
          </div>

          {/* Tile 4: Run-Rate Projection */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/90">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate block">
              RR PROJECTION
            </span>
            <div className="mt-0.5">
              <span className="text-sm font-black text-slate-900 font-mono">
                {rrProjected.toLocaleString()}
              </span>
              <span className="block text-[11px] font-bold text-emerald-600">
                {tgtEc > 0 ? `${Math.round((rrProjected / tgtEc) * 100)}% projected pace` : 'Pacing healthy'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Timeline & Benchmark Ribbon */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {targetAchievement.elapsed_days}/{targetAchievement.total_days}d active ({targetAchievement.pct_time_gone}%)
            </span>
          </div>
          <span className="text-slate-400 font-medium text-[10px]">
            Baseline: Equal {backwardComparison.backward_days}d Backward
          </span>
        </div>
      </div>

      {/* 6. Footer Action Bar */}
      <div className="px-4 py-2.5 bg-[#fafbfe] border-t border-slate-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Select for Analysis Button */}
          <button
            onClick={() => onSelectCampaign(campaign)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300/90 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Inspect Target Achievement & Backward comparison tables below"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#0c4ca3]" />
            <span>Analysis Tables</span>
          </button>

          {/* Live Supabase Calculate Button */}
          <button
            onClick={() => onRecord(campaign)}
            disabled={isRecording}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-xs ring-1 ring-emerald-400/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Execute live Supabase calculation for this campaign"
          >
            {isRecording ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Calculate</span>
          </button>
        </div>

        {/* Edit and Delete Icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(campaign)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Edit campaign parameters"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(campaign.id)}
            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete campaign"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
