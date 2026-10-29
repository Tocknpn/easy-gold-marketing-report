'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CampaignSetupConfig, CampaignAnalyticsPayload } from '@/lib/types/campaign.types';
import { UserProfile } from '@/lib/types/auth.types';
import { 
  loadCampaignSetups, 
  saveCampaignSetup, 
  deleteCampaignSetup,
  loadLiveDataMapCache,
  saveLiveDataMapCache,
  INITIAL_PRESET_CAMPAIGNS 
} from '@/lib/storage/campaignStorage';
import { computeCampaignAnalytics, computeBackwardDates, calculateDateDiffDays } from '@/lib/campaign/campaignEngine';
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
  Check,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
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
        const raw = localStorage.getItem('easy_gold_saved_campaign_setups_v7');
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
        const raw = localStorage.getItem('easy_gold_saved_campaign_setups_v7');
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
  const [selectedStartMonth, setSelectedStartMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Discover all distinct Start Months available across all campaigns (sorted newest to oldest)
  const availableStartMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const c of allCampaigns) {
      if (c.campaign_date_start && c.campaign_date_start.length >= 7) {
        const ym = c.campaign_date_start.substring(0, 7); // e.g. "2026-10"
        monthsSet.add(ym);
      }
    }
    const sorted = Array.from(monthsSet).sort().reverse();
    return sorted.map((ym) => {
      const [y, m] = ym.split('-');
      const mIdx = parseInt(m, 10) - 1;
      const label = `${monthNames[mIdx] || m} ${y}`;
      return { value: ym, label };
    });
  }, [allCampaigns]);

  // Modals
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignSetupConfig | null>(null);

  // Live Query State
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [liveDataMap, setLiveDataMap] = useState<Record<string, any>>(() => {
    return loadLiveDataMapCache();
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbLatestDate, setDbLatestDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('easy_gold_latest_db_date') || '2026-10-21';
    }
    return '2026-10-21';
  });
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSqlScript, setShowSqlScript] = useState<boolean>(true);

  // In-flight background calculation tracker to avoid duplicate queries
  const calculatingIdsRef = useRef<Set<string>>(new Set());
  const [calculatingIds, setCalculatingIds] = useState<Set<string>>(new Set());

  // Reference to current target campaign for background date syncing
  const currentTargetCampaignRef = useRef<CampaignSetupConfig | null>(null);

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
      // Start Month filter
      if (selectedStartMonth !== 'all') {
        if (!c.campaign_date_start || !c.campaign_date_start.startsWith(selectedStartMonth)) {
          return false;
        }
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
  }, [allCampaigns, selectedStatus, selectedCategory, selectedStartMonth, searchQuery]);

  // Page Size: 12 for cards (clean responsive 3x4 / 4x3 grid), 25 for dense table
  const pageSize = viewMode === 'cards' ? 12 : 25;
  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Paginated campaigns
  const paginatedCampaigns = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredCampaigns.slice(startIdx, startIdx + pageSize);
  }, [filteredCampaigns, safeCurrentPage, pageSize]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedCategory, selectedStartMonth, searchQuery, viewMode]);

  // Primary active campaign target
  const currentTargetCampaign = useMemo(() => {
    return activeCampaign || (allCampaigns.length > 0 ? allCampaigns[0] : null);
  }, [activeCampaign, allCampaigns]);

  currentTargetCampaignRef.current = currentTargetCampaign;

  // Compute live analytics payload for active campaign
  const analytics: CampaignAnalyticsPayload | null = useMemo(() => {
    if (!currentTargetCampaign) return null;
    const campLive = liveDataMap[currentTargetCampaign.id] || (activeCampaign?.id === currentTargetCampaign.id ? liveData : null);
    return computeCampaignAnalytics(currentTargetCampaign, campLive || undefined);
  }, [currentTargetCampaign, liveData, liveDataMap, activeCampaign?.id]);

  // Execute Live Calculate from Supabase for target campaign
  const handleExecuteCalculate = useCallback(async (targetCamp: CampaignSetupConfig, overrideAsOfDate?: string, forceRecalc: boolean = false) => {
    // 0ms Instant Recall: If campaign is completed and frozen, load frozen JSON without querying Supabase!
    if (!forceRecalc && targetCamp.is_frozen && targetCamp.frozen_analytics) {
      setLiveDataMap((prev) => {
        const next = { ...prev, [targetCamp.id]: targetCamp.frozen_analytics };
        saveLiveDataMapCache(next);
        return next;
      });
      if (currentTargetCampaignRef.current?.id === targetCamp.id) {
        setLiveData(targetCamp.frozen_analytics);
      }
      return;
    }

    if (calculatingIdsRef.current.has(targetCamp.id)) return;
    calculatingIdsRef.current.add(targetCamp.id);
    setCalculatingIds(new Set(calculatingIdsRef.current));
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

      let payload: any = null;
      const effectiveAsOfDate = overrideAsOfDate 
        || ((targetCamp.auto_sync_max_date !== false && dbLatestDate) 
          ? dbLatestDate 
          : (targetCamp.data_update_on || dbLatestDate || '2026-10-21'));

      try {
        const res = await fetch('/api/dashboard/campaign-analytics', {
          method: 'POST',
          headers: {
            ...headers,
            'x-latest-db-date': effectiveAsOfDate,
          },
          body: JSON.stringify({
            ...targetCamp,
            data_update_on: effectiveAsOfDate,
          }),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data && data.targetAchievement && data.targetAchievement.ec_actual_mtd > 0) {
              payload = {
                ec_actual_mtd: data.targetAchievement.ec_actual_mtd,
                nc_actual_mtd: data.targetAchievement.nc_actual_mtd,
                mtd_buy_weight_g: data.targetAchievement.mtd_buy_weight_g,
                mtd_buy_value_mil_lak: data.targetAchievement.mtd_buy_value_mil_lak,
                backward_trans: data.backwardComparison?.buy_trans_backward,
                backward_val_mil: data.backwardComparison?.buy_value_lak_backward,
                backward_weight_g: data.backwardComparison?.buy_weight_g_backward,
                backward_ticket: data.backwardComparison?.ticket_size_g_backward,
                backward_nc: data.backwardComparison?.nc_backward,
                max_db_date: data.config?.data_update_on || data.config?.max_db_date || effectiveAsOfDate,
                sql_script: data.sql_script || targetCamp.sql_script,
              };
            }
          }
        }
      } catch (err) {
        console.warn('API route campaign calculate error, falling back to direct Supabase:', err);
      }

      // If API route failed or returned empty, execute direct Supabase client queries
      if (!payload) {
        try {
          const supabase = createClient();
          const rules = Array.isArray(targetCamp.conditions) && targetCamp.conditions.length > 0
            ? targetCamp.conditions
            : [{
                metric: ((targetCamp.condition_type || '').includes('weight') || (targetCamp.condition_label || '').toLowerCase().includes('g')) ? ('weight' as const) : ('amount' as const),
                operator: targetCamp.condition_operator || '>=',
                value: Number(targetCamp.condition_value) || 0,
                max_value: targetCamp.condition_max_value ? Number(targetCamp.condition_max_value) : undefined,
              }];
          const firstRule = rules[0];
          const isWeight = firstRule ? firstRule.metric === 'weight' : false;
          const condOp = firstRule ? firstRule.operator : '>=';
          const condVal = firstRule ? Number(firstRule.value) : 0;
          const condMax = firstRule && firstRule.max_value ? Number(firstRule.max_value) : null;
          const asOf = effectiveAsOfDate;
          const totalDays = calculateDateDiffDays(targetCamp.campaign_date_start, targetCamp.campaign_date_end);
          const isEnded = new Date(asOf).getTime() >= new Date(targetCamp.campaign_date_end).getTime();
          const effectiveCutoff = isEnded ? targetCamp.campaign_date_end : asOf;
          const elapsedDays = isEnded ? totalDays : calculateDateDiffDays(targetCamp.campaign_date_start, effectiveCutoff);
          const backwardWindow = computeBackwardDates(targetCamp.campaign_date_start, elapsedDays, totalDays);

          const { data: rpcData } = await supabase.rpc('get_campaign_actual_metrics', {
            p_start_date: targetCamp.campaign_date_start,
            p_as_of_date: effectiveCutoff,
            p_backward_start: backwardWindow.start,
            p_backward_end: backwardWindow.end,
            p_cond_type: isWeight ? 'weight_gte' : 'amount_gte',
            p_cond_op: condOp,
            p_cond_val: condVal > 0 ? condVal : (rules.length === 0 ? 0 : 100000),
            p_cond_max: condMax,
            p_tx_type: targetCamp.tx_type || 'BUY_GOLD',
            p_bank: targetCamp.bank || 'all',
          });

          // Exact NC Query (OPEN_ACCOUNT in period, pure registrations)
          let ncCount: number | null = null;
          if (!rpcData?.mtd_new_customers) {
            try {
              let ncQ = supabase
                .from('monthly_data')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', targetCamp.campaign_date_start)
                .lte('created_at', `${effectiveCutoff} 23:59:59`)
                .eq('transaction_type', 'OPEN_ACCOUNT');

              if (targetCamp.bank && targetCamp.bank.toLowerCase() !== 'all') {
                const bList = targetCamp.bank.split(',').map((b: string) => b.trim()).filter(Boolean);
                if (bList.length === 1) {
                  ncQ = ncQ.ilike('bank', `%${bList[0]}%`);
                } else if (bList.length > 1) {
                  ncQ = ncQ.or(bList.map((b: string) => `bank.ilike.%${b}%`).join(','));
                }
              }

              const { count } = await ncQ;
              ncCount = count;
            } catch (err) {
              console.warn('NC count direct error:', err);
            }
          }

          if (rpcData && rpcData.mtd_transac !== undefined) {
            const finalNc = Number(rpcData.mtd_new_customers) > 0 
              ? Number(rpcData.mtd_new_customers) 
              : ((ncCount !== null && ncCount !== undefined && ncCount > 0) ? ncCount : 0);

            // Construct dynamic SQL script for Supabase query bridge
            const bList = targetCamp.bank && targetCamp.bank !== 'all' ? targetCamp.bank.split(',').map((b: string) => b.trim()).filter(Boolean) : [];
            const bankSql = bList.length === 1 
              ? `\n  AND bank ILIKE '%${bList[0]}%'` 
              : bList.length > 1 
              ? `\n  AND (${bList.map((b: string) => `bank ILIKE '%${b}%'`).join(' OR ')})` 
              : '';
            let condSql = '';
            for (const r of rules) {
              const col = r.metric === 'weight' ? 'gold_weight' : 'total_amount';
              if (r.operator === 'between') {
                condSql += `\n  AND ${col} >= ${r.value} AND ${col} <= ${r.max_value || r.value}`;
              } else if (r.operator === '<=') {
                condSql += `\n  AND ${col} <= ${r.value}`;
              } else if (r.operator === '==') {
                condSql += `\n  AND ${col} = ${r.value}`;
              } else {
                condSql += `\n  AND ${col} >= ${r.value}`;
              }
            }
            const dynamicScript = `-- ============================================================================
-- CAMPAIGN INTELLIGENCE: ${targetCamp.campaign_name || 'Campaign Target'}
-- Rule: ${targetCamp.condition_label || 'Buy trans'} | Bank: ${(targetCamp.bank || 'ALL').toUpperCase()}
-- ============================================================================

-- 1. Actual MTD Performance (${targetCamp.campaign_date_start} to ${effectiveCutoff})
SELECT 
    COUNT(*) AS ec_actual_mtd,
    COUNT(DISTINCT phone) AS unique_customers_mtd,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS mtd_buy_weight_g,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS mtd_buy_value_mil_lak
FROM public.monthly_data
WHERE created_at >= '${targetCamp.campaign_date_start}'
  AND created_at <= '${effectiveCutoff} 23:59:59'
  AND status IN ('ສໍາເລັດ', 'ສຳເລັດ')
  AND transaction_type = '${targetCamp.tx_type || 'BUY_GOLD'}'${bankSql}${condSql};

-- 2. Equal Backward Benchmark Baseline (${backwardWindow.start} to ${backwardWindow.end}, ${elapsedDays} days)
SELECT 
    COUNT(*) AS buy_trans_backward,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS buy_weight_g_backward,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS buy_value_lak_backward
FROM public.monthly_data
WHERE created_at >= '${backwardWindow.start}'
  AND created_at <= '${backwardWindow.end} 23:59:59'
  AND status IN ('ສໍາເລັດ', 'ສຳເລັດ')
  AND transaction_type = '${targetCamp.tx_type || 'BUY_GOLD'}'${bankSql}${condSql};`;

            payload = {
              ec_actual_mtd: Number(rpcData.mtd_transac) || 0,
              nc_actual_mtd: finalNc,
              mtd_buy_weight_g: Number(rpcData.mtd_gold_weight_g) || 0,
              mtd_buy_value_mil_lak: Number(rpcData.mtd_revenue_mil_lak) || 0,
              backward_trans: Number(rpcData.backward_transac) || 0,
              backward_val_mil: Number(rpcData.backward_revenue_mil_lak) || 0,
              backward_weight_g: Number(rpcData.backward_gold_weight_g) || 0,
              backward_ticket: Number(rpcData.backward_transac) > 0 ? Number((Number(rpcData.backward_gold_weight_g) / Number(rpcData.backward_transac)).toFixed(1)) : 2.8,
              backward_nc: Number(rpcData.backward_new_customers) || 0,
              max_db_date: asOf,
              sql_script: dynamicScript,
            };
          }
        } catch (dbErr) {
          console.warn('Direct Supabase calculation fallback error:', dbErr);
        }
      }

      if (payload) {
        setLiveDataMap((prev) => {
          const next = { ...prev, [targetCamp.id]: payload };
          saveLiveDataMapCache(next);
          return next;
        });

        if (currentTargetCampaignRef.current?.id === targetCamp.id) {
          setLiveData(payload);
        }

        // Persist full actuals snapshot back to Supabase and in-memory list
        if (payload.ec_actual_mtd > 0) {
          const isCampaignEnded = Boolean(
            targetCamp.campaign_date_end && effectiveAsOfDate >= targetCamp.campaign_date_end
          );

          const updatedCamp: CampaignSetupConfig = {
            ...targetCamp,
            customers_actual: payload.ec_actual_mtd,
            new_cust_actual: payload.nc_actual_mtd,
            actual_gold_weight_g: payload.mtd_buy_weight_g,
            actual_revenue_mil: payload.mtd_buy_value_mil_lak,
            backward_trans: payload.backward_trans,
            backward_val_mil: payload.backward_val_mil,
            backward_weight_g: payload.backward_weight_g,
            backward_nc: payload.backward_nc,
            cached_as_of_date: payload.max_db_date || targetCamp.data_update_on,
            is_frozen: isCampaignEnded,
            frozen_analytics: isCampaignEnded ? payload : undefined,
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
    } catch (err) {
      console.warn('Live campaign calculation query error:', err);
    } finally {
      calculatingIdsRef.current.delete(targetCamp.id);
      setCalculatingIds(new Set(calculatingIdsRef.current));
      setRecordingId((cur) => (cur === targetCamp.id ? null : cur));
    }
  }, [currentUser?.id, dbLatestDate]);

  // Unified single initialization: Fetch DB latest date & campaigns, hydrate cache, prefetch missing in background
  const refreshCampaigns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let latestDb = '';
      const supabase = createClient();

      // Parallel fetch of latest date and campaign list
      const [maxDateRes, campaignList] = await Promise.all([
        (async () => {
          try {
            return await supabase.rpc('get_max_monthly_data_date');
          } catch {
            return { data: null };
          }
        })(),
        loadCampaignSetups(currentUser?.id).catch(() => []),
      ]);

      if (maxDateRes?.data) {
        latestDb = String(maxDateRes.data).split('T')[0];
        setDbLatestDate(latestDb);
        if (typeof window !== 'undefined') {
          localStorage.setItem('easy_gold_latest_db_date', latestDb);
        }
      }

      const list = campaignList && campaignList.length > 0 ? campaignList : allCampaigns;
      setAllCampaigns(list);

      // Hydrate liveDataMap from campaign embedded snapshots if localStorage didn't have them
      setLiveDataMap((prevMap) => {
        let updated = false;
        const nextMap = { ...prevMap };
        for (const c of list) {
          if (!nextMap[c.id] && c.customers_actual && (c.actual_gold_weight_g !== undefined || c.backward_trans !== undefined)) {
            nextMap[c.id] = {
              ec_actual_mtd: c.customers_actual,
              nc_actual_mtd: c.new_cust_actual || 0,
              mtd_buy_weight_g: c.actual_gold_weight_g || 0,
              mtd_buy_value_mil_lak: c.actual_revenue_mil || 0,
              backward_trans: c.backward_trans || 0,
              backward_val_mil: c.backward_val_mil || 0,
              backward_weight_g: c.backward_weight_g || 0,
              backward_nc: c.backward_nc || 0,
              max_db_date: c.cached_as_of_date || c.data_update_on || latestDb,
              sql_script: c.sql_script,
            };
            updated = true;
          }
        }
        if (updated) {
          saveLiveDataMapCache(nextMap);
          return nextMap;
        }
        return prevMap;
      });

      // Stale-While-Revalidate: Identify campaigns that need background calculation
      const effectiveDbDate = latestDb || dbLatestDate || '2026-10-21';
      const campaignsToSync = list.filter((c: CampaignSetupConfig) => {
        // If campaign is frozen with stored analytics snapshot, NEVER re-calculate
        if (c.is_frozen && c.frozen_analytics) {
          return false;
        }
        const cached = liveDataMap[c.id];
        // If completed campaign and cache is at or beyond campaign end date, it's 100% permanently valid
        if (c.status === 'completed' && cached && cached.max_db_date && c.campaign_date_end && cached.max_db_date >= c.campaign_date_end) {
          return false;
        }
        // If active and cache matches latest DB date, it is fresh
        if (cached && cached.max_db_date === effectiveDbDate && cached.ec_actual_mtd > 0) {
          return false;
        }
        return true;
      });

      // Synchronize primary campaign first, then remaining in parallel
      const primaryCamp = currentTargetCampaignRef.current || (list.length > 0 ? list[0] : null);
      if (primaryCamp && campaignsToSync.some((c: CampaignSetupConfig) => c.id === primaryCamp.id)) {
        await handleExecuteCalculate(primaryCamp, effectiveDbDate);
      }

      // Prefetch other out-of-date campaigns in background parallel batches
      const remainingSync = campaignsToSync.filter((c: CampaignSetupConfig) => c.id !== primaryCamp?.id);
      if (remainingSync.length > 0) {
        Promise.all(remainingSync.map((c: CampaignSetupConfig) => handleExecuteCalculate(c, effectiveDbDate))).catch((err) => {
          console.warn('Background campaign prefetch error:', err);
        });
      }
    } finally {
      setIsLoadingCampaigns(false);
      setTimeout(() => setIsRefreshing(false), 200);
    }
  }, [currentUser?.id, allCampaigns, dbLatestDate, handleExecuteCalculate, liveDataMap]);

  // Initial load
  useEffect(() => {
    refreshCampaigns();
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Select campaign: 0ms instant switch from memory/cache
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

  // Format date helper: YYYY-MM-DD -> DD Mon YYYY
  const formatDisplayDate = (dStr?: string) => {
    const target = dStr || dbLatestDate || '2026-10-21';
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
  const latestDataDate = (currentTargetCampaign?.auto_sync_max_date !== false && dbLatestDate)
    ? dbLatestDate
    : (liveData?.max_db_date || dbLatestDate || currentTargetCampaign?.data_update_on || '2026-10-21');

  // Generate fallback SQL script for target campaign
  const defaultGeneratedSql = useMemo(() => {
    if (!currentTargetCampaign) return '';
    const camp = currentTargetCampaign;
    const isEnded = camp.campaign_date_end && latestDataDate >= camp.campaign_date_end;
    const effectiveCutoff = isEnded ? camp.campaign_date_end : latestDataDate;
    const banks = camp.bank && camp.bank !== 'all' ? camp.bank.split(',').map((b: string) => b.trim()).filter(Boolean) : [];
    const bankFilter = banks.length === 1 
      ? `\n  AND bank ILIKE '%${banks[0]}%'` 
      : banks.length > 1 
      ? `\n  AND (${banks.map((b: string) => `bank ILIKE '%${b}%'`).join(' OR ')})` 
      : '';

    const rules = Array.isArray(camp.conditions)
      ? camp.conditions
      : (camp.condition_operator !== 'all' && Number(camp.condition_value) > 0 && !camp.condition_label?.toLowerCase().includes('no condition'))
        ? [{
            id: '1',
            metric: ((camp.condition_type || '').includes('weight') || (camp.condition_label || '').toLowerCase().includes('g')) ? ('weight' as const) : ('amount' as const),
            operator: camp.condition_operator || '>=',
            value: Number(camp.condition_value) || 0,
            max_value: camp.condition_max_value,
          }]
        : [];

    let condFilter = '';
    for (const r of rules) {
      const col = r.metric === 'weight' ? 'gold_weight' : 'total_amount';
      if (r.operator === 'between') {
        condFilter += `\n  AND ${col} >= ${r.value} AND ${col} <= ${r.max_value || r.value}`;
      } else if (r.operator === '<=') {
        condFilter += `\n  AND ${col} <= ${r.value}`;
      } else if (r.operator === '==') {
        condFilter += `\n  AND ${col} = ${r.value}`;
      } else {
        condFilter += `\n  AND ${col} >= ${r.value}`;
      }
    }

    const totalDays = calculateDateDiffDays(camp.campaign_date_start, camp.campaign_date_end);
    const elapsedDays = isEnded ? totalDays : calculateDateDiffDays(camp.campaign_date_start, effectiveCutoff);
    const backwardWindow = computeBackwardDates(camp.campaign_date_start, elapsedDays, totalDays);

    return `-- ============================================================================
-- CAMPAIGN INTELLIGENCE: ${camp.campaign_name || 'Campaign Target'}
-- Rule: ${camp.condition_label || 'Buy trans'} | Bank: ${(camp.bank || 'ALL').toUpperCase()}
-- ============================================================================

-- 1. Actual MTD Performance (${camp.campaign_date_start} to ${effectiveCutoff})
SELECT 
    COUNT(*) AS ec_actual_mtd,
    COUNT(DISTINCT phone) AS unique_customers_mtd,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS mtd_buy_weight_g,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS mtd_buy_value_mil_lak
FROM public.monthly_data
WHERE created_at >= '${camp.campaign_date_start}'
  AND created_at <= '${effectiveCutoff} 23:59:59'
  AND status IN ('ສໍາເລັດ', 'ສຳເລັດ')
  AND transaction_type = '${camp.tx_type || 'BUY_GOLD'}'${bankFilter}${condFilter};

-- 2. Equal Backward Benchmark Baseline (${backwardWindow.start} to ${backwardWindow.end}, ${elapsedDays} days)
SELECT 
    COUNT(*) AS buy_trans_backward,
    ROUND(COALESCE(SUM(gold_weight), 0)::numeric, 1) AS buy_weight_g_backward,
    ROUND(COALESCE(SUM(total_amount), 0)::numeric / 1000000.0, 1) AS buy_value_lak_backward
FROM public.monthly_data
WHERE created_at >= '${backwardWindow.start}'
  AND created_at <= '${backwardWindow.end} 23:59:59'
  AND status IN ('ສໍາເລັດ', 'ສຳເລັດ')
  AND transaction_type = '${camp.tx_type || 'BUY_GOLD'}'${bankFilter}${condFilter};`;
  }, [currentTargetCampaign, latestDataDate]);

  // Save (Create / Update) Campaign: Unfreezes campaign to force fresh recalculation
  const handleSaveCampaign = async (config: CampaignSetupConfig) => {
    const unfrozenConfig: CampaignSetupConfig = {
      ...config,
      is_frozen: false,
      frozen_analytics: undefined,
    };

    // 1. Immediately update UI state in memory so edited date displays instantly
    setAllCampaigns((prev) => {
      const idx = prev.findIndex((c) => c.id === unfrozenConfig.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = unfrozenConfig;
        return next;
      }
      return [unfrozenConfig, ...prev];
    });
    setActiveCampaign(unfrozenConfig);

    // 2. Persist to Supabase and localStorage
    const saved = await saveCampaignSetup(unfrozenConfig, currentUser?.id);
    
    // 3. Clear cached calculation and force recalculate with new criteria immediately
    setLiveData(null);
    setLiveDataMap((prev) => {
      const next = { ...prev };
      delete next[unfrozenConfig.id];
      saveLiveDataMapCache(next);
      return next;
    });

    handleExecuteCalculate(saved, undefined, true);
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

          {/* Start Month Filter */}
          <select
            value={selectedStartMonth}
            onChange={(e) => setSelectedStartMonth(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden cursor-pointer"
            title="Filter by campaign start month"
          >
            <option value="all">All Start Months</option>
            {availableStartMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
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
                {paginatedCampaigns.map((camp) => {
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
                        isSelected ? 'bg-blue-50/80 font-bold ring-1 ring-inset ring-brand-navy/30' : ''
                      }`}
                    >
                      {/* Status */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : isUpcoming ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-brand-navy'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted ? 'bg-emerald-500' : isUpcoming ? 'bg-amber-500' : 'bg-brand-navy animate-pulse'
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
                            disabled={calculatingIds.has(camp.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                            title="Execute live calculation with all condition rules & bank filters"
                          >
                            {calculatingIds.has(camp.id) ? '...' : 'Calc'}
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
          {paginatedCampaigns.map((camp) => (
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
              isRecording={calculatingIds.has(camp.id)}
            />
          ))}

          {filteredCampaigns.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-10 text-center border-2 border-dashed border-slate-200 space-y-2">
              <Sparkles className="w-7 h-7 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No campaigns found matching filter</h4>
              <p className="text-xs text-slate-500">Reset the search query, status, start month, or category to see campaigns.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls Bar (Displays when there is at least 1 campaign) */}
      {filteredCampaigns.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
          {/* Item count text */}
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800 font-mono">{Math.min(filteredCampaigns.length, (safeCurrentPage - 1) * pageSize + 1)}</strong> to{' '}
            <strong className="text-slate-800 font-mono">{Math.min(filteredCampaigns.length, safeCurrentPage * pageSize)}</strong> of{' '}
            <strong className="text-slate-900 font-mono">{filteredCampaigns.length}</strong> campaigns
            {filteredCampaigns.some((c) => c.is_frozen) && (
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ⚡ Frozen JSON Cache Active
              </span>
            )}
          </div>

          {/* Page Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                  // If lots of pages, only show current page +/- 2 and first/last
                  const isCurrent = pNum === safeCurrentPage;
                  const isNear = Math.abs(pNum - safeCurrentPage) <= 1 || pNum === 1 || pNum === totalPages;
                  if (!isNear && totalPages > 7) {
                    if (pNum === 2 || pNum === totalPages - 1) {
                      return <span key={pNum} className="px-1 text-slate-400 text-xs">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#0c4ca3] text-white shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
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
            <div className="flex items-center gap-2.5 bg-blue-50/80 border border-blue-200 px-3 py-2 rounded-xl shadow-2xs">
              <Clock className="w-4 h-4 text-brand-navy shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Report Data Up To:
                  </span>
                  <span className="text-xs font-bold text-brand-navy font-mono tabular-nums">
                    {formatDisplayDate(latestDataDate)}
                  </span>
                </div>
                <span className="text-xs font-medium text-brand-navyLight block font-mono tabular-nums">
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
              isLoading={calculatingIds.has(currentTargetCampaign.id)}
            />

            {/* Table 2: Comparison vs Same Period Backward (Past Baseline Benchmark) */}
            <CampaignBackwardCompareTable 
              data={analytics.backwardComparison} 
              asOfDate={latestDataDate}
              isLoading={calculatingIds.has(currentTargetCampaign.id)}
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
                  onClick={() => setShowSqlScript((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  title={showSqlScript ? 'Hide SQL Script' : 'Show SQL Script'}
                >
                  {showSqlScript ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{showSqlScript ? 'Hide SQL' : 'Show SQL'}</span>
                </button>

                <button
                  onClick={() => {
                    const isSqlCurrent = liveData?.sql_script 
                      && !liveData.sql_script.includes('2026-10-19') 
                      && !liveData.sql_script.includes('2026-10-18')
                      && liveData.sql_script.includes(latestDataDate);
                    const rawSql = isSqlCurrent ? liveData.sql_script : defaultGeneratedSql;
                    const cleanSql = rawSql.replace(/\/\* (CONDITIONS_CONFIG|LIVE_METRICS_CACHE):[\s\S]*? \*\/\n?/g, '');
                    handleCopySql(cleanSql);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  title="Copy generated SQL script"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>

                <button
                  onClick={() => handleExecuteCalculate(currentTargetCampaign)}
                  disabled={calculatingIds.has(currentTargetCampaign.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  title="Send generated SQL to Supabase and update campaign info live"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${calculatingIds.has(currentTargetCampaign.id) ? 'animate-spin' : ''}`} />
                  <span>{calculatingIds.has(currentTargetCampaign.id) ? 'Asking Supabase...' : '⚡ Ask Supabase (Execute SQL)'}</span>
                </button>
              </div>
            </div>

            {/* SQL Script Display */}
            {showSqlScript && (
              <div className="relative">
                <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-3.5 rounded-xl overflow-x-auto whitespace-pre border border-slate-800/80 leading-relaxed max-h-56">
                  {((liveData?.sql_script && !liveData.sql_script.includes('2026-10-19') && !liveData.sql_script.includes('2026-10-18') && liveData.sql_script.includes(latestDataDate)) ? liveData.sql_script : defaultGeneratedSql).replace(/\/\* (CONDITIONS_CONFIG|LIVE_METRICS_CACHE):[\s\S]*? \*\/\n?/g, '')}
                </pre>
              </div>
            )}
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
        latestDataDate={latestDataDate}
      />
    </div>
  );
}
