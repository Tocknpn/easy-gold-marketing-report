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
import { CampaignCardItem, formatKipShort, formatEventDateRange } from './CampaignCardItem';
import { CampaignDetailModal } from './CampaignDetailModal';
import { CampaignSetupModal } from './CampaignSetupModal';
import { 
  LayoutGrid, 
  Table2, 
  FileSpreadsheet, 
  SlidersHorizontal, 
  Plus, 
  RefreshCw, 
  FileText, 
  Zap, 
  Edit3, 
  Trash2,
  Calendar,
  MapPin,
  Clock,
  Sparkles
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
  
  // View mode: 'cards' or 'table' matching Image 2
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filter Bar state matching Image 2
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

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
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, [currentUser?.id, activeCampaign]);

  useEffect(() => {
    refreshCampaigns();
  }, [currentUser?.id]);

  // Filtered campaigns according to filter bar dropdowns
  const filteredCampaigns = useMemo(() => {
    return allCampaigns.filter((c) => {
      // Year filter
      if (selectedYear !== 'all') {
        const itemYear = c.year ? String(c.year) : (c.campaign_date_start ? c.campaign_date_start.slice(0, 4) : '2026');
        if (itemYear !== selectedYear) return false;
      }
      // Quarter filter
      if (selectedQuarter !== 'all') {
        if (c.quarter && c.quarter.toLowerCase() !== selectedQuarter.toLowerCase()) return false;
      }
      // Team filter
      if (selectedTeam !== 'all') {
        const itemTeam = (c.team || 'KPV').toLowerCase();
        if (itemTeam !== selectedTeam.toLowerCase()) return false;
      }
      // Status filter
      if (selectedStatus !== 'all') {
        const isComp = c.status === 'completed';
        if (selectedStatus === 'completed' && !isComp) return false;
        if (selectedStatus === 'pending' && isComp) return false;
      }
      return true;
    });
  }, [allCampaigns, selectedYear, selectedQuarter, selectedTeam, selectedStatus]);

  // Compute live analytics payload for active campaign
  const analytics: CampaignAnalyticsPayload = useMemo(() => {
    return computeCampaignAnalytics(activeCampaign || allCampaigns[0], liveData);
  }, [activeCampaign, allCampaigns, liveData]);

  // Execute Live Calculate from Supabase for target campaign
  const handleExecuteRecord = useCallback(async (targetCamp: CampaignSetupConfig) => {
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
    if (confirm('Are you sure you want to delete this event/campaign setup?')) {
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
      const headers = [
        'Scale Category',
        'Campaign Name',
        'Team',
        'Status',
        'Start Date',
        'End Date',
        'Location',
        'Spending Cost (LAK)',
        'Plan Budget (LAK)',
        'Customers Actual',
        'Customers Target',
        'New Cust Actual',
        'New Cust Target',
        'CPO Actual',
        'CPO Target',
        'CPA Actual',
        'CPA Target',
        'Execution Status'
      ];

      const rows = filteredCampaigns.map((c) => [
        `"${c.scale_category || c.category_tag || ''}"`,
        `"${c.campaign_name}"`,
        `"${c.team || 'KPV'}"`,
        `"${c.status || 'Pending'}"`,
        `"${c.campaign_date_start}"`,
        `"${c.campaign_date_end}"`,
        `"${c.location || ''}"`,
        c.total_spending_cost || 0,
        c.plan_budget || 0,
        c.customers_actual || 0,
        c.customers_target || c.ec_target || 0,
        c.new_cust_actual || 0,
        c.new_cust_target || c.nc_target || 0,
        c.cpo_actual || 0,
        c.cpo_target || 0,
        c.cpa_actual || 0,
        c.cpa_target || 0,
        `"${c.execution_status_label || ''}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `easy_gold_campaigns_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Navigation Bar matching Image 2 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left Navigation Buttons: Cards | Table | Export CSV | List Setup */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cards Tab */}
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              viewMode === 'cards'
                ? 'bg-[#0c4ca3] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Cards</span>
          </button>

          {/* Table Tab */}
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              viewMode === 'table'
                ? 'bg-[#0c4ca3] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Table2 className="w-4 h-4" />
            <span>Table</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* List Setup Button */}
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#0c4ca3]" />
            <span>List Setup</span>
          </button>
        </div>

        {/* Right Primary Action: + Set Up Event Plan */}
        <button
          onClick={handleOpenNewModal}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Set Up Event Plan</span>
        </button>
      </div>

      {/* 2. Filter Bar matching Image 2 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="all">All Years</option>
          </select>

          {/* Quarter Dropdown */}
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Quarters</option>
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
            <option value="q3">Q3</option>
            <option value="q4">Q4</option>
          </select>

          {/* Team Dropdown */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Teams</option>
            <option value="kpv">KPV</option>
            <option value="agency">AGENCY</option>
            <option value="marketing">MARKETING</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refreshCampaigns}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all disabled:opacity-50"
          title="Refresh campaigns and live actuals"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0c4ca3]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 3. Main Content: Cards View vs Table View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-200">
          {filteredCampaigns.map((camp) => (
            <CampaignCardItem
              key={camp.id}
              campaign={camp}
              onOpenDetails={handleOpenDetails}
              onRecord={handleExecuteRecord}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteCampaign}
              isRecording={recordingId === camp.id}
            />
          ))}

          {filteredCampaigns.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-3">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">No events found matching your filter criteria</h4>
              <p className="text-xs text-slate-500">Try adjusting the year, quarter, team, or status dropdown above.</p>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Event &amp; Scale</th>
                  <th className="py-3 px-3">Team</th>
                  <th className="py-3 px-3">Dates &amp; Venue</th>
                  <th className="py-3 px-3 text-right">Spending Cost</th>
                  <th className="py-3 px-3 text-right">Plan Budget</th>
                  <th className="py-3 px-3 text-center">Customers</th>
                  <th className="py-3 px-3 text-center">New Cust</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.map((camp) => {
                  const isComp = camp.status === 'completed';
                  const actCust = camp.customers_actual ?? (camp.ec_target ? Math.round(camp.ec_target * 0.42) : 0);
                  const tgtCust = camp.customers_target ?? camp.ec_target ?? 0;

                  return (
                    <tr key={camp.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex flex-col">
                          <span 
                            onClick={() => handleOpenDetails(camp)}
                            className="font-black text-sm text-slate-900 hover:text-[#0c4ca3] cursor-pointer"
                          >
                            {camp.campaign_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            {camp.scale_category || camp.category_tag || 'Event'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-[#1d4ed8]">
                        {camp.team || 'KPV'}
                      </td>

                      <td className="py-3.5 px-3 text-slate-600">
                        <div className="flex flex-col">
                          <span>{formatEventDateRange(camp.campaign_date_start, camp.campaign_date_end)}</span>
                          <span className="text-[11px] text-slate-400">{camp.location || '-'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-slate-900">
                        {formatKipShort(camp.total_spending_cost, true)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-slate-900">
                        {formatKipShort(camp.plan_budget, false)}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold">
                        <span className={tgtCust > 0 && actCust >= tgtCust ? 'text-emerald-600 font-black' : 'text-slate-700'}>
                          {actCust.toLocaleString()} / {tgtCust.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700">
                        {(camp.new_cust_actual || 0).toLocaleString()} / {(camp.new_cust_target || camp.nc_target || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isComp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {isComp ? 'Completed' : 'Pending'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(camp)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs"
                            title="Details"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleExecuteRecord(camp)}
                            disabled={recordingId === camp.id}
                            className="px-2.5 py-1 rounded-lg bg-[#0c4ca3] hover:bg-[#093d84] text-white text-xs font-black shadow-xs flex items-center gap-1 disabled:opacity-50"
                            title="Record live data"
                          >
                            <Zap className={`w-3 h-3 text-amber-300 fill-current ${recordingId === camp.id ? 'animate-spin' : ''}`} />
                            <span>Record</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(camp)}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. More Details Modal (Full Targets & Backward Benchmarks from Handbook) */}
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
