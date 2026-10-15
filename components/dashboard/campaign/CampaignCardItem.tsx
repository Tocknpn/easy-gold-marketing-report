'use client';

import React from 'react';
import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { 
  Calendar, 
  MapPin, 
  FileText, 
  Zap, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface CampaignCardItemProps {
  campaign: CampaignSetupConfig;
  onOpenDetails: (campaign: CampaignSetupConfig) => void;
  onRecord: (campaign: CampaignSetupConfig) => void;
  onEdit: (campaign: CampaignSetupConfig) => void;
  onDelete: (campaignId: string) => void;
  isRecording?: boolean;
}

// Format amount to Kip string matching Image 2 (e.g. ₭2.8B, ₭395.7M, ₭0, or '—')
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

// Format dates matching Image 2: e.g. "21 Oct 26 → 27 Oct 26"
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

// Get Badge styling based on scale category matching Image 2
function getScaleBadgeStyle(category?: string) {
  const cat = (category || '').toUpperCase();
  if (cat.includes('LARGE — EVENT') || cat.includes('OUTDOOR')) {
    return {
      bg: 'bg-[#991b1b]', // Crimson/Dark red
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#991b1b]',
    };
  }
  if (cat.includes('NATIONAL') || cat.includes('VOLUME')) {
    return {
      bg: 'bg-[#1d4ed8]', // Royal Blue
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#1d4ed8]',
    };
  }
  if (cat.includes('BOUNDARY') || cat.includes('PURPLE') || cat.includes('MED/LARGE')) {
    return {
      bg: 'bg-[#581c87]', // Purple
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#581c87]',
    };
  }
  if (cat.includes('SPONSORSHIP') || cat.includes('SMALL')) {
    return {
      bg: 'bg-[#15803d]', // Emerald Green
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#15803d]',
    };
  }
  if (cat.includes('COMMUNITY') || cat.includes('PANEL')) {
    return {
      bg: 'bg-[#b45309]', // Warm Amber/Brown
      text: 'text-white',
      topBorder: 'border-t-4 border-t-[#b45309]',
    };
  }
  // Default Medium H2H Booth (Amber/Orange)
  return {
    bg: 'bg-[#b45309]',
    text: 'text-white',
    topBorder: 'border-t-4 border-t-[#b45309]',
  };
}

export function CampaignCardItem({
  campaign,
  onOpenDetails,
  onRecord,
  onEdit,
  onDelete,
  isRecording = false,
}: CampaignCardItemProps) {
  const badgeStyle = getScaleBadgeStyle(campaign.scale_category || campaign.category_tag);
  const scaleText = campaign.scale_category || (campaign.category_tag ? `MEDIUM — ${campaign.category_tag.toUpperCase()}` : 'MEDIUM — H2H BOOTH');
  const teamText = campaign.team || 'KPV';
  const statusRaw = campaign.status || 'draft';
  const isCompleted = statusRaw === 'completed';
  const statusLabel = isCompleted ? 'Completed' : 'Pending';

  // Metrics
  const actCust = campaign.customers_actual ?? campaign.ec_target ? Math.round(campaign.ec_target * 0.42) : 0;
  const tgtCust = campaign.customers_target ?? campaign.ec_target ?? 0;
  const hasCustTarget = tgtCust > 0;
  const custHitPct = hasCustTarget ? Math.round((actCust / tgtCust) * 100) : 0;

  const actNewCust = campaign.new_cust_actual ?? 0;
  const tgtNewCust = campaign.new_cust_target ?? campaign.nc_target ?? 0;
  const hasNewCustTarget = tgtNewCust > 0;
  const newCustHitPct = hasNewCustTarget ? Math.round((actNewCust / tgtNewCust) * 100) : 0;

  const actCpo = campaign.cpo_actual ?? 0;
  const tgtCpo = campaign.cpo_target ?? 0;
  const hasCpoTarget = tgtCpo > 0;

  const actCpa = campaign.cpa_actual ?? 0;
  const tgtCpa = campaign.cpa_target ?? 0;
  const hasCpaTarget = tgtCpa > 0;

  // Plan Execution label
  const executionLabel = campaign.execution_status_label || 
    (hasCustTarget 
      ? (custHitPct >= 100 ? '100% Plan Execution (Auto-Default)' : `${custHitPct}% Plan Execution In Progress`)
      : 'Plan Pending (No Targets Set)');

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative ${badgeStyle.topBorder}`}>
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* 1. Header Badges: Scale Category, Team, Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text} shadow-2xs`}>
              {scaleText}
            </span>
            <span className="text-xs font-black text-[#1d4ed8]">
              {teamText}
            </span>
          </div>

          <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-sky-700'}`}>
            {statusLabel}
          </span>
        </div>

        {/* 2. Campaign Name & Date/Location */}
        <div>
          <h3 
            onClick={() => onOpenDetails(campaign)}
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

        {/* 3. Financials: Total Spending Cost vs Plan Budget */}
        <div className="flex items-end justify-between pt-1 border-t border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              TOTAL SPENDING COST
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              {formatKipShort(campaign.total_spending_cost, true)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              PLAN BUDGET
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              {formatKipShort(campaign.plan_budget, false)}
            </span>
          </div>
        </div>

        {/* 4. 2x2 Metric Tiles */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Tile 1: Customers */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              CUSTOMERS (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className={`text-sm font-black ${hasCustTarget && custHitPct >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {actCust.toLocaleString()} / {tgtCust.toLocaleString()}
              </span>
              <span className={`block text-[11px] font-bold ${hasCustTarget && custHitPct >= 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {hasCustTarget ? `${custHitPct}% target hit` : 'No target'}
              </span>
            </div>
          </div>

          {/* Tile 2: New Customers */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              NEW CUST. (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className={`text-sm font-black ${hasNewCustTarget && newCustHitPct >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {actNewCust.toLocaleString()} / {tgtNewCust.toLocaleString()}
              </span>
              <span className={`block text-[11px] font-bold ${hasNewCustTarget && newCustHitPct >= 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {hasNewCustTarget ? `${newCustHitPct}% target hit` : 'No target'}
              </span>
            </div>
          </div>

          {/* Tile 3: CPO */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              CPO (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className="text-sm font-black text-slate-900">
                {formatKipShort(actCpo)} / {formatKipShort(tgtCpo)}
              </span>
              <span className="block text-[11px] font-bold text-slate-400">
                {hasCpoTarget ? 'Active' : 'No target'}
              </span>
            </div>
          </div>

          {/* Tile 4: CPA */}
          <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-100/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              CPA (ACT/TGT)
            </span>
            <div className="mt-0.5">
              <span className="text-sm font-black text-slate-900">
                {formatKipShort(actCpa)} / {formatKipShort(tgtCpa)}
              </span>
              <span className="block text-[11px] font-bold text-slate-400">
                {hasCpaTarget ? 'Active' : 'No target'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Execution Status Row */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`font-semibold ${hasCustTarget ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>
            {executionLabel}
          </span>
        </div>
      </div>

      {/* 6. Footer Action Bar matching Image 2 */}
      <div className="px-4 py-3 bg-[#fafbfe] border-t border-slate-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Details Button */}
          <button
            onClick={() => onOpenDetails(campaign)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300/90 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all active:scale-95"
            title="View deep-dive targets and calculations"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Details</span>
          </button>

          {/* Record / Calculate Button */}
          <button
            onClick={() => onRecord(campaign)}
            disabled={isRecording}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0c4ca3] hover:bg-[#093d84] text-white text-xs font-black shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Record / Execute live data calculate from Supabase"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-300 fill-current ${isRecording ? 'animate-spin' : ''}`} />
            <span>Record</span>
          </button>
        </div>

        {/* Edit and Delete Icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(campaign)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            title="Edit event parameters"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(campaign.id)}
            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
            title="Delete event"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
