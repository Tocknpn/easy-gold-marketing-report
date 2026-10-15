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
import { CampaignProfileCard } from './CampaignProfileCard';
import { CampaignDetailModal } from './CampaignDetailModal';
import { CampaignSetupModal } from './CampaignSetupModal';
import { CampaignTargetTable } from './CampaignTargetTable';
import { CampaignBackwardCompareTable } from './CampaignBackwardCompareTable';
import { 
  Target, 
  TrendingUp, 
  Layers, 
  FileSpreadsheet, 
  Zap, 
  Sparkles,
  Info
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
  
  // Modals
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignSetupConfig | null>(null);

  // Live Query State
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(true);
  const [liveData, setLiveData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load campaigns from Supabase / localStorage on mount
  useEffect(() => {
    async function load() {
      const list = await loadCampaignSetups(currentUser?.id);
      setAllCampaigns(list);
      if (list.length > 0) {
        setActiveCampaign(list[0]);
      }
    }
    load();
  }, [currentUser?.id]);

  // Compute live analytics payload
  const analytics: CampaignAnalyticsPayload = useMemo(() => {
    return computeCampaignAnalytics(activeCampaign, liveData);
  }, [activeCampaign, liveData]);

  // Execute Live Calculate from Supabase
  const handleExecuteCalculate = useCallback(async () => {
    setIsCalculating(true);
    try {
      const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_project_url') : null;
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedUrl) headers['x-supabase-url'] = storedUrl;
      if (storedKey) headers['x-supabase-key'] = storedKey;

      const res = await fetch('/api/dashboard/campaign-analytics', {
        method: 'POST',
        headers,
        body: JSON.stringify(activeCampaign),
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
      console.warn('Live campaign calculation query error, using calibrated analytics:', err);
    } finally {
      setIsCalculating(false);
      setHasCalculated(true);
    }
  }, [activeCampaign]);

  // Save (Create / Update) Campaign
  const handleSaveCampaign = async (config: CampaignSetupConfig) => {
    const saved = await saveCampaignSetup(config, currentUser?.id);
    const updatedList = await loadCampaignSetups(currentUser?.id);
    setAllCampaigns(updatedList);
    setActiveCampaign(saved);
    setLiveData(null); // Reset live data to recalibrate for new campaign
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    await deleteCampaignSetup(campaignId, currentUser?.id);
    const updatedList = await loadCampaignSetups(currentUser?.id);
    setAllCampaigns(updatedList);
    if (updatedList.length > 0) {
      setActiveCampaign(updatedList[0]);
    }
    setLiveData(null);
  };

  const handleOpenNewModal = () => {
    setEditingCampaign(null);
    setIsSetupModalOpen(true);
  };

  const handleOpenEditModal = () => {
    setEditingCampaign(activeCampaign);
    setIsSetupModalOpen(true);
  };

  // Export report to CSV
  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const t1 = analytics.targetAchievement;
      const t2 = analytics.backwardComparison;

      const lines = [
        `Campaign Tracking Report: ${activeCampaign.campaign_name}`,
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
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Campaign Profile Card & Quick Summarize Deck */}
      <CampaignProfileCard
        activeCampaign={activeCampaign}
        allCampaigns={allCampaigns}
        analytics={analytics}
        onSelectCampaign={(c) => {
          setActiveCampaign(c);
          setLiveData(null); // Recalculate for selected campaign
        }}
        onOpenEditModal={handleOpenEditModal}
        onOpenNewCampaignModal={handleOpenNewModal}
        onOpenDetailModal={() => setIsDetailModalOpen(true)}
        onExecuteCalculate={handleExecuteCalculate}
        isCalculating={isCalculating}
        hasCalculated={hasCalculated}
      />

      {/* 2. Side-by-Side Detailed Analytics Tables matching Excel Image 3 & 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Table 1: Target Achievement & Run Rate Projections */}
        <CampaignTargetTable data={analytics.targetAchievement} />

        {/* Table 2: Comparison vs Same Period Backward (Past Baseline Benchmark) */}
        <CampaignBackwardCompareTable data={analytics.backwardComparison} />
      </div>

      {/* 3. Export Bar */}
      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#0c4ca3]" />
          <span>
            Data Source: <strong className="font-mono text-slate-800">{analytics.dataSource || 'computed_cache'}</strong> | Evaluated at: {new Date().toLocaleTimeString()}
          </span>
        </div>

        <button
          onClick={handleExportReport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors disabled:opacity-50"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isExporting ? 'Exporting...' : 'Export Full Campaign CSV'}</span>
        </button>
      </div>

      {/* 4. More Details Modal */}
      <CampaignDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        campaign={activeCampaign}
        analytics={analytics}
        onOpenEditModal={handleOpenEditModal}
      />

      {/* 5. Campaign Add / Edit / Adjust Modal */}
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
