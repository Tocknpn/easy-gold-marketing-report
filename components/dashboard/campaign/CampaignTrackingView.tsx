'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CampaignSetupConfig, CampaignAnalyticsPayload } from '@/lib/types/campaign.types';
import { UserProfile } from '@/lib/types/auth.types';
import { 
  loadCampaignSetups, 
  saveCampaignSetup, 
  deleteCampaignSetup,
  INITIAL_PRESET_CAMPAIGNS 
} from '@/lib/storage/campaignStorage';
import { computeCampaignAnalytics } from '@/lib/campaign/campaignEngine';
import { CampaignCardItem, formatKipShort } from './CampaignCardItem';
import { CampaignDetailModal } from './CampaignDetailModal';
import { CampaignSetupModal } from './CampaignSetupModal';
import { CampaignTargetTable } from './CampaignTargetTable';
import { CampaignBackwardCompareTable } from './CampaignBackwardCompareTable';
import { 
  LayoutGrid, 
  Table2, 
  FileSpreadsheet, 
  Plus, 
  RefreshCw, 
  SlidersHorizontal,
  Info,
  Sparkles,
  Target,
  ArrowRight
} from 'lucide-react';

interface CampaignTrackingViewProps {
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
}

export function CampaignTrackingView({
  currentUser,
  onOpenAuthModal,
}: CampaignTrackingViewProps) {
  const [allCampaigns, setAllCampaigns] = useState<CampaignSetupConfig[]>(INITIAL_PRESET_CAMPAIGNS);
  const [activeCampaign, setActiveCampaign] = useState<CampaignSetupConfig>(INITIAL_PRESET_CAMPAIGNS[0]);
  
  // Filter state (Pic 2 style)
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignSetupConfig | null>(null);

  // Live Query State
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load campaigns from Supabase / localStorage on mount
  const refreshCampaigns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const list = await loadCampaignSetups(currentUser?.id);
      setAllCampaigns(list);
      if (list.length > 0 && !activeCampaign) {
        setActiveCampaign(list[0]);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, [currentUser?.id, activeCampaign]);

  useEffect(() => {
    refreshCampaigns();
  }, [currentUser?.id]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return allCampaigns.filter((c) => {
      // Status filter
      if (selectedStatus !== 'all') {
        const itemStatus = c.status || 'active';
        if (selectedStatus !== itemStatus) return false;
      }
      // Category filter
      if (selectedCategory !== 'all') {
        const itemCat = (c.category_tag || '').toLowerCase();
        if (!itemCat.includes(selectedCategory.toLowerCase())) return false;
      }
      return true;
    });
  }, [allCampaigns, selectedStatus, selectedCategory]);

  // Compute live analytics payload for active campaign
  const analytics: CampaignAnalyticsPayload = useMemo(() => {
    const target = activeCampaign || allCampaigns[0];
    return computeCampaignAnalytics(target, liveData);
  }, [activeCampaign, allCampaigns, liveData]);

  // Execute Live Calculate from Supabase for target campaign
  const handleExecuteCalculate = useCallback(async (targetCamp: CampaignSetupConfig) => {
    setActiveCampaign(targetCamp);
    setRecordingId(targetCamp.id);
    try {
      const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_project_url') : null;
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedUrl) headers['x-supabase-url'] = storedUrl;
      if (storedKey) headers['x-supabase-key'] = storedKey;

      const res = await fetch('/api/dashboard/campaign-analytics', {
        method: 'POST',
        headers,
        body: JSON.stringify(targetCamp),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.targetAchievement) {
          setLiveData({
            ec_actual_mtd: data.targetAchievement.ec_actual_mtd,
            nc_actual_mtd: data.targetAchievement.nc_actual_mtd,
            mtd_buy_weight_g: data.targetAchievement.mtd_buy_weight_g,
            mtd_buy_value_mil_lak: data.targetAchievement.mtd_buy_value_mil_lak,
            backward_trans: data.backwardComparison.buy_trans_backward,
            backward_val_mil: data.backwardComparison.buy_value_lak_backward,
            backward_weight_g: data.backwardComparison.buy_weight_g_backward,
            backward_ticket: data.backwardComparison.ticket_size_g_backward,
            max_db_date: data.config?.data_update_on,
          });
        }
      }
    } catch (err) {
      console.warn('Live campaign calculation query error:', err);
    } finally {
      setTimeout(() => setRecordingId(null), 500);
    }
  }, []);

  // Save (Create / Update) Campaign
  const handleSaveCampaign = async (config: CampaignSetupConfig) => {
    const saved = await saveCampaignSetup(config, currentUser?.id);
    const updatedList = await loadCampaignSetups(currentUser?.id);
    setAllCampaigns(updatedList);
    setActiveCampaign(saved);
    setLiveData(null);
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign setup?')) {
      await deleteCampaignSetup(campaignId, currentUser?.id);
      const updatedList = await loadCampaignSetups(currentUser?.id);
      setAllCampaigns(updatedList);
      if (updatedList.length > 0) {
        setActiveCampaign(updatedList[0]);
      }
      setLiveData(null);
    }
  };

  const handleOpenNewModal = () => {
    setEditingCampaign(null);
    setIsSetupModalOpen(true);
  };

  const handleOpenEditModal = (camp: CampaignSetupConfig) => {
    setEditingCampaign(camp);
    setIsSetupModalOpen(true);
  };

  const handleOpenDetails = (camp: CampaignSetupConfig) => {
    setActiveCampaign(camp);
    setIsDetailModalOpen(true);
  };

  // Export report to CSV
  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const t1 = analytics.targetAchievement;
      const t2 = analytics.backwardComparison;

      const lines = [
        `Easy Gold Campaign Tracking Report: ${activeCampaign.campaign_name}`,
        `Start: ${activeCampaign.campaign_date_start}, End: ${activeCampaign.campaign_date_end}, As-Of: ${activeCampaign.data_update_on}`,
        `Total Days: ${t1.total_days}, Elapsed Days: ${t1.elapsed_days}, %Time Gone: ${t1.pct_time_gone}%`,
        `Status: ${t1.is_ended ? 'Completed' : t1.is_upcoming ? 'Upcoming' : 'Active In Progress'}`,
        '',
        '--- TABLE 1: TARGET ACHIEVEMENT & RUN-RATE PROJECTION ---',
        `Metric,Target,MTD (${t1.elapsed_days} Days),% Target Hit,RR Projection (${t1.total_days} Days),Projected % Hit`,
        `%Time Gone,-,${t1.pct_time_gone}%,-,100%,-`,
        `"${t1.condition_label}",${t1.ec_target},${t1.ec_actual_mtd},${t1.ec_pct_hit_mtd}%,${t1.ec_rr_projected},${t1.ec_pct_hit_rr}%`,
        `Total NC,${t1.nc_target},${t1.nc_actual_mtd},${t1.nc_pct_hit_mtd}%,${t1.nc_rr_projected},${t1.nc_pct_hit_rr}%`,
        `MTD Buy weight (g),-,${t1.mtd_buy_weight_g},-,${t1.rr_buy_weight_g},-`,
        `MTD Buy Value (mil LAK),-,${t1.mtd_buy_value_mil_lak},-,${t1.rr_buy_value_mil_lak},-`,
        `MTD Ticket Size (g),-,${t1.mtd_ticket_size_g},-,${t1.rr_ticket_size_g},-`,
        `Avg. Buy Trans Target per day,-,-,-,${t1.avg_buy_trans_target_per_day},-`,
        `Act. Buy Trans per day,-,-,-,${t1.act_buy_trans_per_day},-`,
        `Daily Compare,-,-,-,${t1.daily_compare_pct}%,-`,
        '',
        '--- TABLE 2: COMPARISON VS SAME PERIOD BACKWARD ---',
        `Category,Metric,MTD (${t2.mtd_days} Days),Backward (${t2.backward_days} Days),%Compare`,
        `Buy Transaction,"${t2.buy_trans_condition_label}",${t2.buy_trans_mtd},${t2.buy_trans_backward},${t2.buy_trans_pct_compare}%`,
        `Buy value (LAK),MTD Buy Value (mil LAK),${t2.buy_value_lak_mtd},${t2.buy_value_lak_backward},${t2.buy_value_pct_compare}%`,
        `Buy weight (g),MTD Buy Weight (g),${t2.buy_weight_g_mtd},${t2.buy_weight_g_backward},${t2.buy_weight_pct_compare}%`,
        `Buy Ticket size (g),MTD Ticket Size (g),${t2.ticket_size_g_mtd},${t2.ticket_size_g_backward},${t2.ticket_size_pct_compare}%`,
      ];

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `easy_gold_campaign_${activeCampaign.id}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Actions & Pic 2 Style Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#0c4ca3]" />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
              Campaign Tracking &amp; Target Performance
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#0c4ca3] text-white">
              {allCampaigns.length} Campaigns
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Select any campaign card below to inspect live target pacing, run-rate projections, and same-period backward benchmarks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New Campaign</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar (Pic 2 Clean Filter Style) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">
            Filter:
          </span>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="completed">Completed</option>
            <option value="upcoming">Upcoming</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="volume">Volume Driver</option>
            <option value="sprint">Sprint Promo</option>
            <option value="vip">VIP Retention</option>
            <option value="acquisition">New Acquisition</option>
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refreshCampaigns}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all disabled:opacity-50"
          title="Reload campaign list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0c4ca3]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 3. Executive Campaign Cards Deck (Pic 2 Design Aesthetics for Easy Gold Campaigns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in duration-200">
        {filteredCampaigns.map((camp) => (
          <CampaignCardItem
            key={camp.id}
            campaign={camp}
            isActive={activeCampaign?.id === camp.id}
            onSelectCampaign={(c) => {
              setActiveCampaign(c);
              setLiveData(null); // Recalibrate live data
            }}
            onOpenDetails={handleOpenDetails}
            onRecord={handleExecuteCalculate}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteCampaign}
            isRecording={recordingId === camp.id}
          />
        ))}

        {filteredCampaigns.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-3">
            <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No campaigns found matching filter</h4>
            <p className="text-xs text-slate-500">Reset the status or category dropdown to see all campaigns.</p>
          </div>
        )}
      </div>

      {/* 4. Active Campaign Deep-Dive Analytics (The Essential Easy Gold Handbook Tables!) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Selected Campaign Deep-Dive: <span className="text-[#0c4ca3]">{activeCampaign?.campaign_name}</span>
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Condition: <strong className="text-slate-800">{activeCampaign?.condition_label}</strong></span>
            <span>&bull;</span>
            <span>Timeline: <strong>{activeCampaign?.campaign_date_start} to {activeCampaign?.campaign_date_end}</strong></span>
          </div>
        </div>

        {/* Side-by-Side Detailed Analytics Tables matching Excel Image 3 & 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Table 1: Target Achievement & Run Rate Projections */}
          <CampaignTargetTable data={analytics.targetAchievement} />

          {/* Table 2: Comparison vs Same Period Backward (Past Baseline Benchmark) */}
          <CampaignBackwardCompareTable data={analytics.backwardComparison} />
        </div>

        {/* Export and Telemetry Bar */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0c4ca3]" />
            <span>
              Engine: <strong className="font-mono text-slate-800">{analytics.dataSource || 'computed_cache'}</strong> | Evaluated at: {new Date().toLocaleTimeString()}
            </span>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Campaign Analysis CSV</span>
          </button>
        </div>
      </div>

      {/* 5. More Details Modal */}
      <CampaignDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        campaign={activeCampaign}
        analytics={analytics}
        onOpenEditModal={() => {
          setIsDetailModalOpen(false);
          handleOpenEditModal(activeCampaign);
        }}
      />

      {/* 6. Campaign Add / Edit / Adjust Modal */}
      <CampaignSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        campaignToEdit={editingCampaign}
        onSave={handleSaveCampaign}
        onDelete={handleDeleteCampaign}
      />
    </div>
  );
}
