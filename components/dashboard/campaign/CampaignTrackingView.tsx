'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CampaignSetupConfig, CampaignAnalyticsPayload } from '@/lib/types/campaign.types';
import { UserProfile } from '@/lib/types/auth.types';
import { 
  loadCampaignSetups, 
  saveCampaignSetup, 
  deleteCampaignSetup,
  INITIAL_PRESET_CAMPAIGNS 
} from '@/lib/storage/campaignStorage';
import { computeCampaignAnalytics } from '@/lib/campaign/campaignEngine';
import { CampaignProgressRibbon } from './CampaignProgressRibbon';
import { CampaignTargetTable } from './CampaignTargetTable';
import { CampaignBackwardCompareTable } from './CampaignBackwardCompareTable';
import { CampaignSetupModal } from './CampaignSetupModal';
import { Target, TrendingUp, Layers, HelpCircle } from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignSetupConfig | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load campaigns from Supabase or localStorage
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
    return computeCampaignAnalytics(activeCampaign);
  }, [activeCampaign]);

  const handleSaveCampaign = async (config: CampaignSetupConfig) => {
    const saved = await saveCampaignSetup(config, currentUser?.id);
    const updatedList = await loadCampaignSetups(currentUser?.id);
    setAllCampaigns(updatedList);
    setActiveCampaign(saved);
  };

  const handleOpenNewModal = () => {
    setEditingCampaign(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = () => {
    setEditingCampaign(activeCampaign);
    setIsModalOpen(true);
  };

  // Export campaign tables to CSV
  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const t1 = analytics.targetAchievement;
      const t2 = analytics.backwardComparison;

      const lines = [
        `Campaign Tracking Report: ${activeCampaign.campaign_name}`,
        `Start: ${activeCampaign.campaign_date_start}, End: ${activeCampaign.campaign_date_end}, As-Of: ${activeCampaign.data_update_on}`,
        `Total Days: ${t1.total_days}, Elapsed Days: ${t1.elapsed_days}, %Time Gone: ${t1.pct_time_gone}%`,
        '',
        '--- TABLE 1: TARGET ACHIEVEMENT & RUN-RATE PROJECTION ---',
        `Metric,MTD (${t1.elapsed_days} Days),RR (${t1.total_days} Days)`,
        `%Time Gone,${t1.pct_time_gone}%,100%`,
        `"${t1.condition_label}",${t1.ec_actual_mtd},${t1.ec_rr_projected}`,
        `Campaign Target (EC),${t1.ec_target},${t1.ec_target}`,
        `%Target Hit,${t1.ec_pct_hit_mtd}%,${t1.ec_pct_hit_rr}%`,
        `Total NC,${t1.nc_actual_mtd},${t1.nc_rr_projected}`,
        `Campaign Target (NC),${t1.nc_target},${t1.nc_target}`,
        `%Target Hit,${t1.nc_pct_hit_mtd}%,${t1.nc_pct_hit_rr}%`,
        `MTD Buy weight (g),${t1.mtd_buy_weight_g},${t1.rr_buy_weight_g}`,
        `MTD Buy Value (mil LAK),${t1.mtd_buy_value_mil_lak},${t1.rr_buy_value_mil_lak}`,
        `MTD Ticket Size (g),${t1.mtd_ticket_size_g},${t1.rr_ticket_size_g}`,
        `Avg. Buy Trans Target per day,-,${t1.avg_buy_trans_target_per_day}`,
        `Act. Buy Trans per day,-,${t1.act_buy_trans_per_day}`,
        `Daily Compare,-,${t1.daily_compare_pct}%`,
        '',
        '--- TABLE 2: COMPARISON VS SAME PERIOD BACKWARD ---',
        `Category,Metric,MTD (${t2.mtd_days} Days),Backward (${t2.backward_days} Days),%Compare`,
        `Buy Transaction,"${t2.buy_trans_condition_label}",${t2.buy_trans_mtd},${t2.buy_trans_backward},${t2.buy_trans_pct_compare}%`,
        `Buy value (LAK),MTD Buy Value (mil LAK),${t2.buy_value_lak_mtd},${t2.buy_value_lak_backward},${t2.buy_value_pct_compare}%`,
        `Buy weight (g),MTD Buy Weight (g),${t2.buy_weight_g_mtd},${t2.buy_weight_g_backward},${t2.buy_weight_pct_compare}%`,
        `Buy Ticket size (g),MTD Ticket Size (g),${t2.ticket_size_g_mtd},${t2.ticket_size_g_backward},${t2.ticket_size_pct_compare}%`,
      ];

      if (t2.baseline_normal_rr_per_day) {
        lines.push(`Normal Baseline RR,Avg Campaign Daily vs Normal Q3 RR,${t2.avg_campaign_daily_actual},${t2.baseline_normal_rr_per_day},${t2.baseline_pct_compare}%`);
      }

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
      {/* 1. Header Progress Ribbon & Metadata */}
      <CampaignProgressRibbon
        activeCampaign={activeCampaign}
        allCampaigns={allCampaigns}
        onSelectCampaign={setActiveCampaign}
        onOpenNewCampaignModal={handleOpenNewModal}
        onOpenEditModal={handleOpenEditModal}
        onExportReport={handleExportReport}
        isExporting={isExporting}
        totalDays={analytics.targetAchievement.total_days}
        elapsedDays={analytics.targetAchievement.elapsed_days}
        pctTimeGone={analytics.targetAchievement.pct_time_gone}
      />

      {/* 2. Side-by-Side or Stacked Campaign Analytics Tables matching Excel Image 3 & 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Table 1: Target Achievement & Run Rate Projections */}
        <CampaignTargetTable data={analytics.targetAchievement} />

        {/* Table 2: Comparison vs Same Period Backward (Past Baseline Benchmark) */}
        <CampaignBackwardCompareTable data={analytics.backwardComparison} />
      </div>

      {/* Campaign Setup Modal */}
      <CampaignSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        campaignToEdit={editingCampaign}
        onSave={handleSaveCampaign}
      />
    </div>
  );
}
