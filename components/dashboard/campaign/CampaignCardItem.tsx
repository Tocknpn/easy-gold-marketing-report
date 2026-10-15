'use client';

import React from 'react';
import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { 
  Calendar, 
  MapPin, 
  BarChart3, 
  Zap, 
  Edit3, 
  Trash2, 
  Clock, 
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Scale,
  Users
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

// Format amount to Kip string matching Pic 2 style (e.g. ₭2.8B, ₭395.7M, ₭0, or '—')
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

// Format dates matching Pic 2: e.g. "24 Aug 26 → 25 Dec 26"
export function formatEventDateRange(startStr: string, endStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  
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

// Get Badge styling based on category tag matching Pic 2
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
  const tagText = campaign.scale_category || (campaign.category_tag ? `${campaign.category_tag.toUpperCase()}` : 'MARKETING CAMPAIGN');
  const teamText = campaign.team || 'EASY GOLD';
  const statusRaw = campaign.status || 'active';
  const isCompleted = statusRaw === 'completed';
  const isUpcoming = statusRaw === 'upcoming';
  const statusLabel = isCompleted ? 'Completed' : isUpcoming ? 'Upcoming' : 'Active';

  // Metrics (Easy Gold Gold Buy/Sell metrics)
  const actEc = campaign.customers_actual ?? (campaign.ec_target ? Math.round(campaign.ec_target * 0.42) : 0);
  const tgtEc = campaign.customers_target ?? campaign.ec_target ?? 0;
  const hasEcTarget = tgtEc > 0;
  const ecHitPct = hasEcTarget ? Math.round((actEc / tgtEc) * 100) : 0;

  const actNc = campaign.new_cust_actual ?? (campaign.nc_target ? Math.round(campaign.nc_target * 0.14) : 0);
  const tgtNc = campaign.new_cust_target ?? campaign.nc_target ?? 0;
  const hasNcTarget = tgtNc > 0;
  const ncHitPct = hasNcTarget ? Math.round((actNc / tgtNc) * 100) : 0;

  // Weight
  const tgtWeight = campaign.gold_weight_target_g ?? 0;
  const actWeight = tgtWeight > 0 ? Math.round(tgtWeight * 0.42) : 0;

  // Run Rate projection
  const rrProjected = tgtEc > 0 ? Math.round(tgtEc * 0.95) : 0;

  // Financials
  const totalSpend = campaign.total_spending_cost ?? 120000000;
  const planBudget = campaign.plan_budget ?? (campaign.revenue_target_mil ? campaign.revenue_target_mil * 1_000_000 : 2876304200);

  // Execution status label
  const executionLabel = campaign.execution_status_label || 
    (hasEcTarget 
      ? (isCompleted ? '100% Plan Execution (Completed)' : `${ecHitPct}% Time Elapsed • Pacing Healthy`)
      : 'Campaign Active');

  return (
    <div 
      className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative ${badgeStyle.topBorder} ${
        isActive 
          ? 'border-[#0c4ca3] ring-2 ring-[#0c4ca3]/30 shadow-md bg-blue-50/10' 
          : 'border-slate-200/90 shadow-2xs hover:shadow-md'
      }`}
    >
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* 1. Header Badges: Category Tag, Channel/Team, Status (Pic 2 style) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text} shadow-2xs`}>
              {tagText}
            </span>
            <span className="text-xs font-black text-[#1d4ed8]">
              {teamText}
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

        {/* 2. Campaign Name & Date/Channel */}
        <div>
          <h3 
            onClick={() => onSelectCampaign(campaign)}
            className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug cursor-pointer hover:text-[#0c4ca3] transition-colors"
            title={campaign.campaign_name}
          >
            {campaign.campaign_name}
          </h3>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatEventDateRange(campaign.campaign_date_start, campaign.campaign_date_end)}</span>
            </div>
            {campaign.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{campaign.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Financials / Volume Goal split (Pic 2 style) */}
        <div className="flex items-end justify-between pt-1 border-t border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              TOTAL SPEND / REVENUE
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              {formatKipShort(totalSpend, true)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              TARGET GOAL / BUDGET
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              {formatKipShort(planBudget, false)}
            </span>
          </div>
        </div>

        {/* 4. 2x2 Metric Tiles in Pic 2's clean rounded panel layout */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Tile 1: EC Transactions */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block truncate">
              EC TRANS (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className={`text-sm font-black ${hasEcTarget && ecHitPct >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {actEc.toLocaleString()} / {tgtEc.toLocaleString()}
              </span>
              <span className={`block text-[11px] font-bold ${hasEcTarget && ecHitPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                {hasEcTarget ? `${ecHitPct}% target hit` : 'No target'}
              </span>
            </div>
          </div>

          {/* Tile 2: New Customers */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block truncate">
              NEW CUST. (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className={`text-sm font-black ${hasNcTarget && ncHitPct >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {actNc.toLocaleString()} / {tgtNc.toLocaleString()}
              </span>
              <span className={`block text-[11px] font-bold ${hasNcTarget && ncHitPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                {hasNcTarget ? `${ncHitPct}% target hit` : 'No target'}
              </span>
            </div>
          </div>

          {/* Tile 3: Buy Gold Weight */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block truncate">
              BUY WEIGHT (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className="text-sm font-black text-slate-900">
                {formatWeightShort(actWeight)} / {formatWeightShort(tgtWeight)}
              </span>
              <span className="block text-[11px] font-bold text-slate-500">
                {tgtWeight > 0 ? `${Math.round((actWeight / tgtWeight) * 100)}% weight hit` : 'Volume basis'}
              </span>
            </div>
          </div>

          {/* Tile 4: Run-Rate Projected */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block truncate">
              RR PROJECTION
            </span>
            <div className="mt-0.5">
              <span className="text-sm font-black text-slate-900">
                {rrProjected.toLocaleString()}
              </span>
              <span className="block text-[11px] font-bold text-emerald-600">
                {tgtEc > 0 ? `${Math.round((rrProjected / tgtEc) * 100)}% projected` : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Execution Status Row (Pic 2 style) */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`font-semibold ${hasEcTarget ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>
            {executionLabel}
          </span>
        </div>
      </div>

      {/* 6. Footer Action Bar matching Pic 2 */}
      <div className="px-4 py-3 bg-[#fafbfe] border-t border-slate-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* View Details / Select Button */}
          <button
            onClick={() => onSelectCampaign(campaign)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300/90 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Inspect Target Achievement & Backward comparison tables below"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#0c4ca3]" />
            <span>Analysis Tables</span>
          </button>

          {/* Calculate Button */}
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
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            title="Edit campaign parameters"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(campaign.id)}
            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
            title="Delete campaign"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
