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
  Clock,
  Calendar,
  Layers
} from 'lucide-react';

interface CampaignTrackingViewProps {
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
}

export function CampaignTrackingView({
  currentUser,
  onOpenAuthModal,
}: CampaignTrackingViewProps) {
  // Initialize from localStorage if present to prevent any flash of mock presets
  const [allCampaigns, setAllCampaigns] = useState<CampaignSetupConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('easy_gold_saved_campaign_setups_v4');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [activeCampaign, setActiveCampaign] = useState<CampaignSetupConfig | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('easy_gold_saved_campaign_setups_v4');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        }
      } catch {}
    }
    return null;
  });

  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  
  // Filter state
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
      setActiveCampaign((prev) => {
        if (prev) {
          const matched = list.find((c) => c.id === prev.id);
          if (matched) return matched;
        }
        return list.length > 0 ? list[0] : null;
      });
    } finally {
      setIsLoadingCampaigns(false);
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    refreshCampaigns();
  }, [currentUser?.id, refreshCampaigns]);

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

  // Primary active campaign target
  const currentTargetCampaign = useMemo(() => {
    return activeCampaign || (allCampaigns.length > 0 ? allCampaigns[0] : null);
  }, [activeCampaign, allCampaigns]);

  // Compute live analytics payload for active campaign
  const analytics: CampaignAnalyticsPayload | null = useMemo(() => {
    if (!currentTargetCampaign) return null;
    return computeCampaignAnalytics(currentTargetCampaign, liveData);
  }, [currentTargetCampaign, liveData]);

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
      } else {
        setActiveCampaign(null);
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

  // Format date helper: 2026-10-14 -> 14 Oct 2026
  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return '14 Oct 2026';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = parseInt(parts[2], 10);
      const month = months[parseInt(parts[1], 10) - 1] || parts[1];
      return `${day} ${month} ${parts[0]}`;
    }
    return dStr;
  };

  // Latest data date for report
  const latestDataDate = liveData?.max_db_date || currentTargetCampaign?.data_update_on || '2026-10-14';

  // Export report to CSV
  const handleExportCsv = () => {
    if (!analytics || !currentTargetCampaign) return;
    setIsExporting(true);
    try {
      const csvRows = [
        ['Campaign Intelligence Report', currentTargetCampaign.campaign_name],
        ['Category Tag', currentTargetCampaign.category_tag || 'Standard'],
        ['Condition Threshold', currentTargetCampaign.condition_label],
        ['Timeline Range', `${currentTargetCampaign.campaign_date_start} to ${currentTargetCampaign.campaign_date_end}`],
        ['Report Data Up To', latestDataDate],
        ['Elapsed Days', `${analytics.targetAchievement.elapsed_days} of ${analytics.targetAchievement.total_days}`],
        [],
        ['Metric', 'MTD Volume', 'RR Projection', 'Target Goal', '% Hit MTD', '% Hit RR'],
        [
          'EC Transactions',
          analytics.targetAchievement.ec_actual_mtd,
          analytics.targetAchievement.ec_rr_projected,
          analytics.targetAchievement.ec_target,
          `${analytics.targetAchievement.ec_pct_hit_mtd}%`,
          `${analytics.targetAchievement.ec_pct_hit_rr}%`,
        ],
        [
          'New Customers (NC)',
          analytics.targetAchievement.nc_actual_mtd,
          analytics.targetAchievement.nc_rr_projected,
          analytics.targetAchievement.nc_target,
          `${analytics.targetAchievement.nc_pct_hit_mtd}%`,
          `${analytics.targetAchievement.nc_pct_hit_rr}%`,
        ],
        [
          'Buy Value (Mil LAK)',
          analytics.targetAchievement.mtd_buy_value_mil_lak,
          analytics.targetAchievement.rr_buy_value_mil_lak,
          analytics.targetAchievement.revenue_target_mil || 'N/A',
          `${analytics.targetAchievement.revenue_pct_hit_mtd || 0}%`,
          `${analytics.targetAchievement.revenue_pct_hit_rr || 0}%`,
        ],
        [
          'Buy Weight (Grams)',
          analytics.targetAchievement.mtd_buy_weight_g,
          analytics.targetAchievement.rr_buy_weight_g,
          analytics.targetAchievement.gold_weight_target_g || 'N/A',
          `${analytics.targetAchievement.weight_pct_hit_mtd || 0}%`,
          `${analytics.targetAchievement.weight_pct_hit_rr || 0}%`,
        ],
        [],
        ['Comparison vs Backward Benchmark (Equal Days)', 'MTD Volume', 'Backward Benchmark', '% Growth Focus'],
        [
          'Buy Transactions',
          analytics.backwardComparison.buy_trans_mtd,
          analytics.backwardComparison.buy_trans_backward,
          `${analytics.backwardComparison.buy_trans_pct_compare}%`,
        ],
        [
          'Buy Value (Mil LAK)',
          analytics.backwardComparison.buy_value_lak_mtd,
          analytics.backwardComparison.buy_value_lak_backward,
          `${analytics.backwardComparison.buy_value_pct_compare}%`,
        ],
        [
          'Buy Weight (Grams)',
          analytics.backwardComparison.buy_weight_g_mtd,
          analytics.backwardComparison.buy_weight_g_backward,
          `${analytics.backwardComparison.buy_weight_pct_compare}%`,
        ],
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Campaign_Report_${currentTargetCampaign.campaign_name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Failed to export CSV:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar: Executive Title, Summary & Global Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Campaign Tracking &amp; Target Intelligence
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Live Evaluation
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitor campaign planned targets, actual MTD volume, Run-Rate projections, and reverse backward baseline growth.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={isExporting || !analytics}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
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

      {/* 2. Filter Bar with Fresh Data Up To Indicator */}
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

          {/* Prominent Latest Data Cutoff Chip in toolbar */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[#0c4ca3] text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-[#0c4ca3]" />
            <span>Data Up To: <strong className="font-mono text-blue-950 font-black">{formatDisplayDate(latestDataDate)}</strong></span>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refreshCampaigns}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          title="Reload campaign list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0c4ca3]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 3. Executive Campaign Cards Deck or Loading Spinner */}
      {isLoadingCampaigns && allCampaigns.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center space-y-3 min-h-[320px]">
          <div className="w-9 h-9 border-3 border-[#0c4ca3] border-t-transparent rounded-full animate-spin" />
          <h4 className="text-sm font-black text-slate-800">Loading Campaign Portfolios...</h4>
          <p className="text-xs text-slate-500 font-medium">Synchronizing live profiles, configured targets, and actuals</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-200">
          {filteredCampaigns.map((camp) => (
            <CampaignCardItem
              key={camp.id}
              campaign={camp}
              isActive={currentTargetCampaign?.id === camp.id}
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
      )}

      {/* 4. Active Campaign Deep-Dive Analytics (Tightened Size & Latest Data Display) */}
      {analytics && currentTargetCampaign && (
        <div className="space-y-3 pt-2">
          {/* Deep-Dive Header with Prominent "Latest Data Up To" Indicator */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-2xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Selected Deep-Dive:
                  </span>
                  <span className="text-sm sm:text-base font-black text-[#0c4ca3]">
                    {currentTargetCampaign.campaign_name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>{currentTargetCampaign.condition_label}</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Timeline: <strong className="font-mono text-slate-700">{currentTargetCampaign.campaign_date_start} to {currentTargetCampaign.campaign_date_end}</strong></span>
                  <span>&bull;</span>
                  <span>{analytics.targetAchievement.total_days} Days Horizon</span>
                </div>
              </div>
            </div>

            {/* Prominent Latest Data Cutoff Date Badge */}
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-blue-50 border border-blue-200/90 px-3 py-1.5 rounded-xl shadow-2xs">
              <Clock className="w-4 h-4 text-[#0c4ca3] shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Report Data Up To:
                  </span>
                  <span className="text-xs font-black text-[#0c4ca3] font-mono">
                    {formatDisplayDate(latestDataDate)}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-blue-700 block">
                  Day {analytics.targetAchievement.elapsed_days} of {analytics.targetAchievement.total_days} ({analytics.targetAchievement.pct_time_gone}% Elapsed)
                </span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Detailed Analytics Tables with Compact Density & Clean Hierarchy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Table 1: Target Achievement & Run Rate Projections */}
            <CampaignTargetTable 
              data={analytics.targetAchievement} 
              asOfDate={latestDataDate}
            />

            {/* Table 2: Comparison vs Same Period Backward (Past Baseline Benchmark) */}
            <CampaignBackwardCompareTable 
              data={analytics.backwardComparison} 
              asOfDate={latestDataDate}
            />
          </div>

          {/* Export and Telemetry Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#0c4ca3]" />
              <span>
                Engine: <strong className="font-mono text-slate-800">{analytics.dataSource || 'computed_cache'}</strong> | Evaluated at: {new Date().toLocaleTimeString()}
              </span>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors disabled:opacity-50 cursor-pointer text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Campaign Analysis CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. More Details Modal */}
      {currentTargetCampaign && analytics && (
        <CampaignDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          campaign={currentTargetCampaign}
          analytics={analytics}
          onOpenEditModal={() => {
            setIsDetailModalOpen(false);
            handleOpenEditModal(currentTargetCampaign);
          }}
        />
      )}

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
