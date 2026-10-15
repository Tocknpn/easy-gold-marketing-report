'use client';

import React from 'react';
import { CampaignSetupConfig } from '@/lib/types/campaign.types';
import { 
  Target, 
  Calendar, 
  Clock, 
  Plus, 
  Edit3, 
  FileSpreadsheet, 
  ChevronDown,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface CampaignProgressRibbonProps {
  activeCampaign: CampaignSetupConfig;
  allCampaigns: CampaignSetupConfig[];
  onSelectCampaign: (campaign: CampaignSetupConfig) => void;
  onOpenNewCampaignModal: () => void;
  onOpenEditModal: () => void;
  onExportReport: () => void;
  isExporting: boolean;
  totalDays: number;
  elapsedDays: number;
  pctTimeGone: number;
}

export function CampaignProgressRibbon({
  activeCampaign,
  allCampaigns,
  onSelectCampaign,
  onOpenNewCampaignModal,
  onOpenEditModal,
  onExportReport,
  isExporting,
  totalDays,
  elapsedDays,
  pctTimeGone,
}: CampaignProgressRibbonProps) {
  // Format Date to DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] p-4 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Target className="w-5 h-5 text-[#e5a812]" />
            <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
              Campaign Tracking & Target Intelligence
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#e5a812] text-slate-950">
              Run-Rate & Baseline
            </span>
          </div>
          <p className="text-xs text-white/80 mt-1 font-medium">
            Measure campaign pace against targets (EC/NC) and analyze real growth variance versus equal backward timeframes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Campaign Selector */}
          <div className="relative">
            <select
              value={activeCampaign.id}
              onChange={(e) => {
                const found = allCampaigns.find((c) => c.id === e.target.value);
                if (found) onSelectCampaign(found);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs font-bold rounded-xl px-3 py-2 pr-8 focus:ring-2 focus:ring-[#e5a812] focus:outline-hidden appearance-none cursor-pointer max-w-[240px] truncate"
            >
              {allCampaigns.map((c) => (
                <option key={c.id} value={c.id} className="text-slate-900 bg-white">
                  🎯 {c.campaign_name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-white/70 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Edit Active Campaign */}
          <button
            onClick={onOpenEditModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
            title="Edit Campaign Parameters"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Create New Campaign */}
          <button
            onClick={onOpenNewCampaignModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#e5a812] hover:bg-[#d4970b] text-slate-950 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>New Campaign</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={onExportReport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* 2. Timeline Metadata Cards matching Excel Image 3 & Image 4 top section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Same period backward */}
        <div className="bg-[#fce4ec]/40 border border-[#f8bbd0] p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-pink-900">
            Backward Start
          </span>
          <span className="text-xs font-mono font-bold text-slate-800 mt-1">
            {formatDate(activeCampaign.same_period_backward_start)}
          </span>
          <span className="text-[10px] text-pink-800/80">Same period backward</span>
        </div>

        <div className="bg-[#fce4ec]/40 border border-[#f8bbd0] p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-pink-900">
            Backward End
          </span>
          <span className="text-xs font-mono font-bold text-slate-800 mt-1">
            {formatDate(activeCampaign.same_period_backward_end)}
          </span>
          <span className="text-[10px] text-pink-800/80">{elapsedDays} Days duration</span>
        </div>

        {/* Campaign start */}
        <div className="bg-[#ede7f6]/50 border border-[#d1c4e9] p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
            Campaign Start
          </span>
          <span className="text-xs font-mono font-bold text-slate-800 mt-1">
            {formatDate(activeCampaign.campaign_date_start)}
          </span>
          <span className="text-[10px] text-purple-800/80">Launch date</span>
        </div>

        {/* Campaign end */}
        <div className="bg-[#ede7f6]/50 border border-[#d1c4e9] p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
            Campaign End
          </span>
          <span className="text-xs font-mono font-bold text-slate-800 mt-1">
            {formatDate(activeCampaign.campaign_date_end)}
          </span>
          <span className="text-[10px] text-purple-800/80">Total: {totalDays} Days</span>
        </div>

        {/* Data Update on */}
        <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-900">
            Data Update On
          </span>
          <span className="text-xs font-mono font-bold text-[#0c4ca3] mt-1">
            {formatDate(activeCampaign.data_update_on)}
          </span>
          <span className="text-[10px] text-blue-700 font-semibold">
            Day gone: {elapsedDays} Days
          </span>
        </div>

        {/* %time gone */}
        <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
            % Time Gone
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black text-amber-900 font-mono">
              {pctTimeGone}%
            </span>
            <span className="text-[10px] text-amber-800/80">of timeline</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-amber-200/60 rounded-full h-1.5 mt-1 overflow-hidden">
            <div 
              className="bg-amber-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, pctTimeGone)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
