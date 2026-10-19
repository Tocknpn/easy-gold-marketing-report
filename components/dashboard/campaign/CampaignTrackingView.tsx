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
import { createClient } from '@/lib/supabase/client';
import { 
  CampaignCardItem, 
  formatKipShort, 
  formatWeightShort, 
  formatTargetRevenue, 
  formatEventDateRange 
} from './CampaignCardItem';
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
  Layers,
  Search,
  CheckCircle2,
  BarChart3,
  Edit3,
  Trash2,
  Landmark,
  Database,
  Terminal,
  Copy,
  Check
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
        const raw = localStorage.getItem('easy_gold_saved_campaign_setups_v6');
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
        const raw = localStorage.getItem('easy_gold_saved_campaign_setups_v6');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        }
      } catch {}
    }
    return null;
  });

  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  
  // Filter & Search state
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignSetupConfig | null>(null);

  // Live Query State
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [liveDataMap, setLiveDataMap] = useState<Record<string, any>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbLatestDate, setDbLatestDate] = useState<string>('2026-10-18');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Dynamically discover true latest data date from Supabase
  useEffect(() => {
    async function fetchLatestDate() {
      try {
        const supabase = createClient();
        const { data: latestRows } = await supabase
          .from('monthly_data')
          .select('created_at')
          .order('id', { ascending: false })
          .limit(50);
        if (latestRows && latestRows.length > 0) {
          const dates: string[] = [];
          for (const row of latestRows) {
            const raw = String(row.created_at || '').split('T')[0].split(' ')[0];
            if (raw.includes('-')) {
              dates.push(raw);
            }
          }
          if (dates.length > 0) {
            dates.sort().reverse();
            setDbLatestDate(dates[0]);
          }
        }
      } catch (err) {
        console.warn('Could not fetch latest monthly_data date:', err);
      }
    }
    fetchLatestDate();
  }, []);

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
      // Search query filter (matches name, condition, bank, or tag)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (c.campaign_name || '').toLowerCase().includes(q);
        const matchCond = (c.condition_label || '').toLowerCase().includes(q);
        const matchTag = (c.category_tag || '').toLowerCase().includes(q);
        const matchBank = (c.bank || '').toLowerCase().includes(q);
        if (!matchName && !matchCond && !matchTag && !matchBank) return false;
      }
      return true;
    });
  }, [allCampaigns, selectedStatus, selectedCategory, searchQuery]);

  // Primary active campaign target
  const currentTargetCampaign = useMemo(() => {
    return activeCampaign || (allCampaigns.length > 0 ? allCampaigns[0] : null);
  }, [activeCampaign, allCampaigns]);

  // Compute live analytics payload for active campaign
  const analytics: CampaignAnalyticsPayload | null = useMemo(() => {
    if (!currentTargetCampaign) return null;
    const campLive = liveDataMap[currentTargetCampaign.id] || (activeCampaign?.id === currentTargetCampaign.id ? liveData : null);
    return computeCampaignAnalytics(currentTargetCampaign, campLive || undefined);
  }, [currentTargetCampaign, liveData, liveDataMap, activeCampaign?.id]);

  // Execute Live Calculate from Supabase for target campaign
  const handleExecuteCalculate = useCallback(async (targetCamp: CampaignSetupConfig) => {
    setActiveCampaign(targetCamp);
    setRecordingId(targetCamp.id);
    try {
      const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_project_url') : null;
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null;
      const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wlufvvawlbyvpyaubzph.supabase.co';
      const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdWZ2dmF3bGJ5dnB5YXVienBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg1MDY0MSwiZXhwIjoyMTA3NDI2NjQxfQ.CN2Omnb-aAuxAW80EqFZubEZhilRdOlwHg8VzPn2AHk';

      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'x-supabase-url': storedUrl || envUrl,
        'x-supabase-key': storedKey || envKey,
      };

      const res = await fetch('/api/dashboard/campaign-analytics', {
        method: 'POST',
        headers,
        body: JSON.stringify(targetCamp),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.targetAchievement) {
          const payload = {
            ec_actual_mtd: data.targetAchievement.ec_actual_mtd,
            nc_actual_mtd: data.targetAchievement.nc_actual_mtd,
            mtd_buy_weight_g: data.targetAchievement.mtd_buy_weight_g,
            mtd_buy_value_mil_lak: data.targetAchievement.mtd_buy_value_mil_lak,
            backward_trans: data.backwardComparison?.buy_trans_backward,
            backward_val_mil: data.backwardComparison?.buy_value_lak_backward,
            backward_weight_g: data.backwardComparison?.buy_weight_g_backward,
            backward_ticket: data.backwardComparison?.ticket_size_g_backward,
            max_db_date: data.config?.data_update_on,
            sql_script: data.sql_script || targetCamp.sql_script,
          };
          setLiveData(payload);
          setLiveDataMap((prev) => ({ ...prev, [targetCamp.id]: payload }));

          // Persist actuals and generated SQL directly back to Supabase and update card view
          if (payload.ec_actual_mtd > 0) {
            const updatedCamp: CampaignSetupConfig = {
              ...targetCamp,
              customers_actual: payload.ec_actual_mtd,
              new_cust_actual: payload.nc_actual_mtd,
              sql_script: payload.sql_script,
              data_update_on: payload.max_db_date || targetCamp.data_update_on,
            };
            setAllCampaigns((prev) => {
              const idx = prev.findIndex((c) => c.id === targetCamp.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updatedCamp;
                return next;
              }
              return prev;
            });
            saveCampaignSetup(updatedCamp, currentUser?.id).catch((err) => {
              console.warn('Silent save campaign evaluation error:', err);
            });
          }
        }
      }
    } catch (err) {
      console.warn('Live campaign calculation query error:', err);
    } finally {
      setTimeout(() => setRecordingId(null), 500);
    }
  }, [currentUser?.id]);

  // Select campaign and immediately trigger live calculation if not cached
  const handleSelectCampaign = useCallback((camp: CampaignSetupConfig) => {
    setActiveCampaign(camp);
    const cached = liveDataMap[camp.id];
    if (cached) {
      setLiveData(cached);
    } else {
      handleExecuteCalculate(camp);
    }
  }, [liveDataMap, handleExecuteCalculate]);

  // Copy SQL script to clipboard
  const handleCopySql = (sql: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  // Format date helper: 2026-10-18 -> 18 Oct 2026
  const formatDisplayDate = (dStr?: string) => {
    const target = dStr || dbLatestDate || '2026-10-18';
    const parts = target.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = parseInt(parts[2], 10);
      const month = months[parseInt(parts[1], 10) - 1] || parts[1];
      return `${day} ${month} ${parts[0]}`;
    }
    return target;
  };

  // Latest data date for report
  const latestDataDate = liveData?.max_db_date || dbLatestDate || currentTargetCampaign?.data_update_on || '2026-10-18';

  // Generate fallback SQL script for target campaign
  const defaultGeneratedSql = useMemo(() => {
    if (!currentTargetCampaign) return '';
    const camp = currentTargetCampaign;
    const condCol = (camp.condition_type || '').includes('weight') ? 'gold_weight' : 'total_amount';
    const condOp = camp.condition_operator || '>=';
    const condVal = camp.condition_value ?? 100000;
    const banks = camp.bank && camp.bank !== 'all' ? camp.bank.split(',').map((b: string) => b.trim()).filter(Boolean) : [];
    const bankFilter = banks.length === 1 
      ? `\n  AND bank ILIKE '%${banks[0]}%'` 
      : banks.length > 1 
      ? `\n  AND (${banks.map((b: string) => `bank ILIKE '%${b}%'`).join(' OR ')})` 
      : '';
    const condFilter = `\n  AND ${condCol} ${condOp} ${condVal}`;

    return `-- 1. Actual MTD Performance Query (${camp.campaign_name})
SELECT 
    COUNT(*) AS ec_actual_mtd,
    COUNT(DISTINCT phone) AS unique_customers_mtd,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS mtd_buy_weight_g,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS mtd_buy_value_mil_lak
FROM public.monthly_data
WHERE created_at >= '${camp.campaign_date_start}'
  AND created_at <= '${latestDataDate} 23:59:59'
  AND status = 'ສໍາເລັດ'
  AND transaction_type = '${camp.tx_type || 'BUY_GOLD'}'${bankFilter}${condFilter};`;
  }, [currentTargetCampaign, latestDataDate]);

  // Automatically execute live calculation for current inspected campaign
  useEffect(() => {
    if (currentTargetCampaign && !liveDataMap[currentTargetCampaign.id] && !recordingId) {
      handleExecuteCalculate(currentTargetCampaign);
    }
  }, [currentTargetCampaign?.id, liveDataMap, recordingId, handleExecuteCalculate]);

  // Save (Create / Update) Campaign
  const handleSaveCampaign = async (config: CampaignSetupConfig) => {
    // 1. Immediately update UI state in memory so edited date displays instantly
    setAllCampaigns((prev) => {
      const idx = prev.findIndex((c) => c.id === config.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = config;
        return next;
      }
      return [config, ...prev];
    });
    setActiveCampaign(config);

    // 2. Persist to Supabase and localStorage
    const saved = await saveCampaignSetup(config, currentUser?.id);
    
    // 3. Clear cached calculation and recalculate with new dates immediately
    setLiveData(null);
    setLiveDataMap((prev) => {
      const next = { ...prev };
      delete next[config.id];
      return next;
    });

    handleExecuteCalculate(saved);
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
          'Buy Transactions',
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

      {/* 2. Enhanced Filter & Control Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3 shadow-2xs flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          {/* Quick Search Input for 30+ Campaigns */}
          <div className="relative min-w-[180px] sm:min-w-[220px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
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
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="volume">Volume Driver</option>
            <option value="sprint">Sprint Promo</option>
            <option value="vip">VIP Retention</option>
            <option value="acquisition">New Acquisition</option>
          </select>

          {/* Campaign Count Badge */}
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 whitespace-nowrap">
            {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'Campaign' : 'Campaigns'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher: Compact Cards vs Dense Table */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards' 
                  ? 'bg-white text-slate-900 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Compact Card Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-white text-slate-900 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="High-Density Table View (up to 30+ campaigns)"
            >
              <Table2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Prominent Latest Data Cutoff Chip in toolbar */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[#0c4ca3] text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-[#0c4ca3]" />
            <span>Data Up To: <strong className="font-mono text-blue-950 font-black">{formatDisplayDate(latestDataDate)}</strong></span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={refreshCampaigns}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            title="Reload campaign list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0c4ca3]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 3. Executive Campaign Deck (Cards or Dense Table for 30+ Campaigns) */}
      {isLoadingCampaigns && allCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center space-y-3 min-h-[220px]">
          <div className="w-8 h-8 border-3 border-[#0c4ca3] border-t-transparent rounded-full animate-spin" />
          <h4 className="text-sm font-black text-slate-800">Loading Campaign Portfolios...</h4>
          <p className="text-xs text-slate-500 font-medium">Synchronizing live profiles, configured targets, and actuals</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Dense Table View for Easy Browsing of 30+ Campaigns */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse select-text">
              <thead className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Campaign &amp; Rule</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Timeline</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Buy Trans (Act / % Hit)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">New Cust (Act / Tgt)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Buy Weight</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">RR Projection</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredCampaigns.map((camp) => {
                  const isSelected = currentTargetCampaign?.id === camp.id;
                  const itemAnalytics = computeCampaignAnalytics(camp, liveDataMap[camp.id]);
                  const { targetAchievement } = itemAnalytics;
                  const isCompleted = targetAchievement.is_ended;
                  const isUpcoming = targetAchievement.is_upcoming;
                  const statusLabel = isCompleted ? 'Completed' : isUpcoming ? 'Upcoming' : 'Active';

                  return (
                    <tr 
                      key={camp.id}
                      onClick={() => handleSelectCampaign(camp)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/80 font-bold border-l-4 border-l-[#0c4ca3]' : ''
                      }`}
                    >
                      {/* Status */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : isUpcoming ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-[#0c4ca3]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted ? 'bg-emerald-500' : isUpcoming ? 'bg-amber-500' : 'bg-sky-500 animate-pulse'
                          }`} />
                          <span>{statusLabel}</span>
                        </span>
                      </td>

                      {/* Name & Rule */}
                      <td className="py-2 px-3 font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 hover:text-[#0c4ca3]">{camp.campaign_name}</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            <span>{camp.condition_label || 'Buy Trans'}</span>
                          </span>
                          {camp.bank && camp.bank !== 'all' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                              <Landmark className="w-2.5 h-2.5 text-indigo-600" />
                              <span>{camp.bank}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Timeline */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                        <span>{formatEventDateRange(camp.campaign_date_start, camp.campaign_date_end)}</span>
                        <span className="text-slate-400 font-sans ml-1">({targetAchievement.total_days}d)</span>
                      </td>

                      {/* EC Target & Actual */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span className="text-slate-900 font-bold">
                          {targetAchievement.ec_actual_mtd.toLocaleString()} / {targetAchievement.ec_target.toLocaleString()}
                        </span>
                        <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          targetAchievement.ec_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {targetAchievement.ec_pct_hit_mtd}%
                        </span>
                      </td>

                      {/* NC Target & Actual */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span className="text-slate-800">
                          {targetAchievement.nc_actual_mtd.toLocaleString()}
                          {targetAchievement.nc_target > 0 && ` / ${targetAchievement.nc_target.toLocaleString()}`}
                        </span>
                        {targetAchievement.nc_target > 0 && (
                          <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            targetAchievement.nc_pct_hit_mtd >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {targetAchievement.nc_pct_hit_mtd}%
                          </span>
                        )}
                      </td>

                      {/* Buy Weight */}
                      <td className="py-2 px-3 text-right whitespace-nowrap text-slate-800 font-bold">
                        {formatWeightShort(targetAchievement.mtd_buy_weight_g)}
                      </td>

                      {/* RR Projection */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span className="text-slate-900 font-bold">{targetAchievement.ec_rr_projected.toLocaleString()}</span>
                        <span className="ml-1 text-[10px] text-emerald-600 font-bold">
                          {targetAchievement.ec_target > 0 ? `(${Math.round((targetAchievement.ec_rr_projected / targetAchievement.ec_target) * 100)}%)` : ''}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectCampaign(camp)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isSelected 
                                ? 'bg-[#0c4ca3] text-white border-[#0c4ca3]' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Inspect'}
                          </button>
                          <button
                            onClick={() => handleExecuteCalculate(camp)}
                            disabled={recordingId === camp.id}
                            className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                            title="Execute live calculation with all condition rules & bank filters"
                          >
                            {recordingId === camp.id ? '...' : 'Calc'}
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(camp)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700"
                            title="Edit"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="p-1 rounded text-rose-400 hover:text-rose-700"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
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
      ) : (
        /* Compact Card Grid for 30+ Campaigns: 4-5 Columns with Low Height */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 animate-in fade-in duration-200">
          {filteredCampaigns.map((camp) => (
            <CampaignCardItem
              key={camp.id}
              campaign={camp}
              isActive={currentTargetCampaign?.id === camp.id}
              liveData={liveDataMap[camp.id]}
              onSelectCampaign={handleSelectCampaign}
              onOpenDetails={handleOpenDetails}
              onRecord={handleExecuteCalculate}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteCampaign}
              isRecording={recordingId === camp.id}
            />
          ))}

          {filteredCampaigns.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-10 text-center border-2 border-dashed border-slate-200 space-y-2">
              <Sparkles className="w-7 h-7 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No campaigns found matching filter</h4>
              <p className="text-xs text-slate-500">Reset the search query, status, or category to see campaigns.</p>
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
                  {currentTargetCampaign.bank && currentTargetCampaign.bank !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200/80">
                      <Landmark className="w-3 h-3 text-indigo-600" />
                      <span>Bank: {currentTargetCampaign.bank}</span>
                    </span>
                  )}
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

          {/* Side-by-Side Detailed Analytics Tables: Content-Sized (No 100% Artificial Stretching) */}
          <div className="flex flex-wrap items-start gap-4 justify-start">
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

          {/* SQL Intelligence & Supabase Query Bridge */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 shadow-sm border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 flex-wrap">
                    <span>Campaign SQL Intelligence &amp; Supabase Query Bridge</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Live Parallel Execution (&lt;700ms)
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Workflow: Campaign Setup ➔ Turn into SQL Script ➔ Ask Supabase Live ➔ Actuals Populated &amp; Saved
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopySql(liveData?.sql_script || defaultGeneratedSql)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  title="Copy generated SQL script"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>

                <button
                  onClick={() => handleExecuteCalculate(currentTargetCampaign)}
                  disabled={recordingId === currentTargetCampaign.id}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-900/30 transition-all disabled:opacity-50 cursor-pointer"
                  title="Send generated SQL to Supabase and update campaign info live"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recordingId === currentTargetCampaign.id ? 'animate-spin' : ''}`} />
                  <span>{recordingId === currentTargetCampaign.id ? 'Asking Supabase...' : '⚡ Ask Supabase (Execute SQL)'}</span>
                </button>
              </div>
            </div>

            {/* SQL Script Display */}
            <div className="relative">
              <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-3.5 rounded-xl overflow-x-auto whitespace-pre border border-slate-800/80 leading-relaxed max-h-56">
                {liveData?.sql_script || defaultGeneratedSql}
              </pre>
            </div>
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
