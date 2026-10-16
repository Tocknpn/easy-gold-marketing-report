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
      className={`bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden relative ${badgeStyle.topBorder} ${
        isActive 
          ? 'border-[#0c4ca3] ring-2 ring-[#0c4ca3]/30 shadow-md bg-blue-50/15' 
          : 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300'
      }`}
    >
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        {/* 1. Header Badges: Category Tag, Condition Pill, Status */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text} shadow-2xs shrink-0`}>
              {tagText}
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 truncate max-w-[120px]">
              <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
              <span className="truncate">{campaign.condition_label || 'Buy Trans'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isActive && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-[#0c4ca3] border border-blue-200">
                Active in View
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-bold">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isCompleted ? 'bg-emerald-500' : isUpcoming ? 'bg-amber-500' : 'bg-sky-500 animate-pulse'
              }`} />
              <span className={
                isCompleted ? 'text-emerald-700' : isUpcoming ? 'text-amber-700' : 'text-sky-700'
              }>
                {statusLabel}
              </span>
            </span>
          </div>
        </div>

        {/* 2. Campaign Name & Date Horizon */}
        <div>
          <h3 
            onClick={() => onSelectCampaign(campaign)}
            className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-snug cursor-pointer hover:text-[#0c4ca3] transition-colors truncate"
            title={campaign.campaign_name}
          >
            {campaign.campaign_name}
          </h3>

          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-medium flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="font-mono">{formatEventDateRange(campaign.campaign_date_start, campaign.campaign_date_end)}</span>
            </div>
            <span>&bull;</span>
            <span className="text-slate-600 font-semibold">
              {targetAchievement.total_days}d ({targetAchievement.pct_time_gone}% gone)
            </span>
          </div>
        </div>

        {/* 3. Compact Target Progress Bar Strip */}
        <div className="pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-medium">
              Target: <strong className="font-mono text-slate-800">{tgtEc.toLocaleString()}</strong> trans
            </span>
            <span className="font-mono font-bold text-blue-700">
              MTD: {actEc.toLocaleString()} ({ecHitPct}%)
            </span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div 
              className={`h-full rounded-full transition-all ${
                ecHitPct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(ecHitPct, 100)}%` }}
            />
          </div>
        </div>

        {/* 4. 2x2 Micro Metrics Grid - Lightweight & Compact */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Box 1: EC Trans */}
          <div className="bg-[#f8fafc] rounded-lg p-1.5 border border-slate-100">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate block">
              EC TRANS (ACT/TGT)
            </span>
            <div className="text-[11px] font-black font-mono text-slate-900 truncate">
              {actEc.toLocaleString()} / {tgtEc.toLocaleString()}
            </div>
            <span className={`block text-[9px] font-bold ${ecHitPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
              {ecHitPct}% hit
            </span>
          </div>

          {/* Box 2: New Customers */}
          <div className="bg-[#f8fafc] rounded-lg p-1.5 border border-slate-100">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate block">
              NEW CUST (ACT/TGT)
            </span>
            <div className="text-[11px] font-black font-mono text-slate-900 truncate">
              {hasNcTarget ? `${actNc.toLocaleString()} / ${tgtNc.toLocaleString()}` : `${actNc.toLocaleString()} MTD`}
            </div>
            <span className={`block text-[9px] font-bold ${hasNcTarget ? (ncHitPct >= 100 ? 'text-emerald-600' : 'text-slate-500') : 'text-slate-400'}`}>
              {hasNcTarget ? `${ncHitPct}% hit` : 'Volume basis'}
            </span>
          </div>

          {/* Box 3: Weight / Value */}
          <div className="bg-[#f8fafc] rounded-lg p-1.5 border border-slate-100">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate block">
              BUY WEIGHT
            </span>
            <div className="text-[11px] font-black font-mono text-slate-900 truncate">
              {formatWeightShort(actWeight)}
            </div>
            <span className="block text-[9px] font-bold text-slate-500 truncate">
              {hasWeightTarget ? `${formatWeightShort(tgtWeight)} tgt (${weightHitPct}%)` : hasRevenueTarget ? formatTargetRevenue(actRevenue) : 'Volume basis'}
            </span>
          </div>

          {/* Box 4: RR Projection */}
          <div className="bg-[#f8fafc] rounded-lg p-1.5 border border-slate-100">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate block">
              RR PROJECTION
            </span>
            <div className="text-[11px] font-black font-mono text-slate-900 truncate">
              {rrProjected.toLocaleString()}
            </div>
            <span className="block text-[9px] font-bold text-emerald-600 truncate">
              {tgtEc > 0 ? `${Math.round((rrProjected / tgtEc) * 100)}% pace` : 'Healthy pace'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Footer Action Bar - Ultra Compact */}
      <div className="px-2.5 py-1.5 bg-[#fafbfe] border-t border-slate-100 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectCampaign(campaign)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Inspect Target Achievement & Backward comparison tables below"
          >
            <BarChart3 className="w-3 h-3 text-[#0c4ca3]" />
            <span>Analysis</span>
          </button>

          <button
            onClick={() => onRecord(campaign)}
            disabled={isRecording}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Execute live Supabase calculation for this campaign"
          >
            {isRecording ? (
              <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-2.5 h-2.5 text-amber-200" />
            )}
            <span>Calculate</span>
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit(campaign)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Edit campaign parameters"
          >
            <Edit3 className="w-3 h-3" />
          </button>

          <button
            onClick={() => onDelete(campaign.id)}
            className="p-1 rounded-md text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete campaign"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
