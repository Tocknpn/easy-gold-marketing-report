'use client';

import React, { useState, useEffect } from 'react';
import { 
  CampaignSetupConfig, 
  CampaignConditionType, 
  CampaignOperator,
  CampaignConditionRule
} from '@/lib/types/campaign.types';
import { 
  X, 
  Target, 
  Calendar, 
  Settings, 
  Sparkles,
  ArrowRight,
  Check,
  CheckCircle2,
  Trash2,
  Copy,
  Clock,
  Layers,
  Landmark,
  Plus
} from 'lucide-react';
import { calculateDateDiffDays, computeBackwardDates } from '@/lib/campaign/campaignEngine';

export const BANK_OPTIONS = [
  { id: 'BCEL', label: 'BCEL (OnePay)' },
  { id: 'LDB', label: 'LDB (TrustBank)' },
  { id: 'JDB', label: 'JDB (Yes Pay)' },
  { id: 'UMONEY', label: 'u-money' },
  { id: 'MMONEY', label: 'M-Money' },
  { id: 'ACLEDA', label: 'ACLEDA' },
  { id: 'APB', label: 'APB' },
  { id: 'LVB', label: 'LVB' },
  { id: 'PSVB', label: 'PSVB' },
  { id: 'STB', label: 'STB' },
];

interface CampaignSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit?: CampaignSetupConfig | null;
  onSave: (config: CampaignSetupConfig) => Promise<void>;
  onDelete?: (campaignId: string) => Promise<void>;
  latestDataDate?: string;
}

export function CampaignSetupModal({
  isOpen,
  onClose,
  campaignToEdit,
  onSave,
  onDelete,
  latestDataDate = '2026-10-18',
}: CampaignSetupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryTag, setCategoryTag] = useState('Volume Driver');
  
  // Dates
  const [startDate, setStartDate] = useState('2026-08-24');
  const [endDate, setEndDate] = useState('2026-12-25');
  const [asOfDate, setAsOfDate] = useState(latestDataDate || '2026-10-18');
  const [autoSyncMaxDate, setAutoSyncMaxDate] = useState(true);

  // Dynamic Conditions Rules
  const [conditions, setConditions] = useState<CampaignConditionRule[]>([
    {
      id: 'cond-1',
      metric: 'amount',
      operator: '>=',
      value: 500000,
    }
  ]);
  const [conditionLabel, setConditionLabel] = useState('Buy trans >= 500k');
  const [isCustomLabelUserEdited, setIsCustomLabelUserEdited] = useState(false);
  const [txType, setTxType] = useState('BUY_GOLD');
  const [bank, setBank] = useState<string>('all');

  const selectedBanksList = React.useMemo(() => {
    if (!bank || bank === 'all') return ['all'];
    return bank.split(',').map((b) => b.trim()).filter(Boolean);
  }, [bank]);

  const handleToggleBank = (bankId: string) => {
    if (bankId === 'all') {
      setBank('all');
      return;
    }
    const current = selectedBanksList.filter((b) => b !== 'all');
    let next: string[];
    if (current.includes(bankId)) {
      next = current.filter((b) => b !== bankId);
    } else {
      next = [...current, bankId];
    }
    if (next.length === 0) {
      setBank('all');
    } else {
      setBank(next.join(', '));
    }
  };

  // Targets
  const [selectedTargets, setSelectedTargets] = useState<('ec' | 'nc' | 'revenue' | 'weight')[]>([
    'ec',
    'nc',
    'revenue',
    'weight',
  ]);
  const [ecTarget, setEcTarget] = useState<number>(307500);
  const [ncTarget, setNcTarget] = useState<number>(0);
  const [revenueTarget, setRevenueTarget] = useState<number>(2876304.2);
  const [goldWeightTarget, setGoldWeightTarget] = useState<number>(913509.7);
  const [baselineDailyRr, setBaselineDailyRr] = useState<number | undefined>(undefined);

  const [isSaving, setIsSaving] = useState(false);

  // Event Plan & Scale Tracking
  const [scaleCategory, setScaleCategory] = useState('MEDIUM — H2H BOOTH');
  const [team, setTeam] = useState('KPV');
  const [location, setLocation] = useState('');
  const [planBudget, setPlanBudget] = useState<number>(0);
  const [totalSpendingCost, setTotalSpendingCost] = useState<number>(0);
  const [customersActual, setCustomersActual] = useState<number>(0);
  const [customersTarget, setCustomersTarget] = useState<number>(0);
  const [newCustActual, setNewCustActual] = useState<number>(0);
  const [newCustTarget, setNewCustTarget] = useState<number>(0);
  const [cpoActual, setCpoActual] = useState<number>(0);
  const [cpoTarget, setCpoTarget] = useState<number>(0);
  const [cpaActual, setCpaActual] = useState<number>(0);
  const [cpaTarget, setCpaTarget] = useState<number>(0);
  const [executionStatusLabel, setExecutionStatusLabel] = useState('');
  const [year, setYear] = useState<number>(2026);
  const [quarter, setQuarter] = useState<string>('Q4');

  // Load existing campaign data or defaults
  useEffect(() => {
    const effectiveLatestDate = latestDataDate || '2026-10-18';

    if (campaignToEdit) {
      setName(campaignToEdit.campaign_name);
      setDescription(campaignToEdit.description || '');
      setCategoryTag(campaignToEdit.category_tag || 'Volume Driver');
      setStartDate(campaignToEdit.campaign_date_start);
      setEndDate(campaignToEdit.campaign_date_end);

      const shouldAutoSync = campaignToEdit.auto_sync_max_date ?? true;
      setAutoSyncMaxDate(shouldAutoSync);
      setAsOfDate(shouldAutoSync ? effectiveLatestDate : (campaignToEdit.data_update_on || effectiveLatestDate));

      // Restore condition rules
      if (Array.isArray(campaignToEdit.conditions)) {
        setConditions(campaignToEdit.conditions);
      } else if (
        campaignToEdit.condition_operator === 'all' || 
        (campaignToEdit.condition_label && campaignToEdit.condition_label.toLowerCase().includes('no condition'))
      ) {
        setConditions([]);
      } else {
        const isWeight = (campaignToEdit.condition_type || '').includes('weight');
        setConditions([
          {
            id: 'cond-1',
            metric: isWeight ? 'weight' : 'amount',
            operator: campaignToEdit.condition_operator || '>=',
            value: Number(campaignToEdit.condition_value) || 500000,
            max_value: campaignToEdit.condition_max_value ? Number(campaignToEdit.condition_max_value) : undefined,
          }
        ]);
      }
      setConditionLabel(campaignToEdit.condition_label || 'Buy trans >= 500k');
      setIsCustomLabelUserEdited(true);

      setTxType(campaignToEdit.tx_type || 'BUY_GOLD');
      setBank(campaignToEdit.bank || 'all');
      setSelectedTargets(campaignToEdit.target_types || ['ec', 'nc']);
      setEcTarget(campaignToEdit.ec_target ?? 307500);
      setNcTarget(campaignToEdit.nc_target ?? 0);
      setRevenueTarget(campaignToEdit.revenue_target_mil ?? 2876304.2);
      setGoldWeightTarget(campaignToEdit.gold_weight_target_g ?? 913509.7);
      setBaselineDailyRr(campaignToEdit.baseline_daily_rr);
      setScaleCategory(campaignToEdit.scale_category || 'MEDIUM — H2H BOOTH');
      setTeam(campaignToEdit.team || 'KPV');
      setLocation(campaignToEdit.location || '');
      setPlanBudget(campaignToEdit.plan_budget || 0);
      setTotalSpendingCost(campaignToEdit.total_spending_cost || 0);

      // Clean contaminated 1731 dummy value if target differs
      const cleanedActual = campaignToEdit.customers_actual === 1731 && campaignToEdit.ec_target !== 1731 ? 0 : (campaignToEdit.customers_actual || 0);
      setCustomersActual(cleanedActual);
      setCustomersTarget(campaignToEdit.customers_target ?? campaignToEdit.ec_target ?? 0);
      setNewCustActual(campaignToEdit.new_cust_actual || 0);
      setNewCustTarget(campaignToEdit.new_cust_target ?? campaignToEdit.nc_target ?? 0);
      setCpoActual(campaignToEdit.cpo_actual || 0);
      setCpoTarget(campaignToEdit.cpo_target || 0);
      setCpaActual(campaignToEdit.cpa_actual || 0);
      setCpaTarget(campaignToEdit.cpa_target || 0);
      setExecutionStatusLabel(campaignToEdit.execution_status_label || '');
      setYear(campaignToEdit.year || 2026);
      setQuarter(campaignToEdit.quarter || 'Q4');
    } else {
      // New campaign template
      setName('New Marketing Event / Campaign');
      setDescription('Customer activation and booth event');
      setCategoryTag('Event');
      setStartDate('2026-10-21');
      setEndDate('2026-10-27');
      setAsOfDate(effectiveLatestDate);
      setAutoSyncMaxDate(true);
      setConditions([
        {
          id: `cond-${Date.now()}`,
          metric: 'amount',
          operator: '>=',
          value: 500000,
        }
      ]);
      setConditionLabel('Buy trans >= 500k');
      setIsCustomLabelUserEdited(false);
      setTxType('BUY_GOLD');
      setBank('all');
      setSelectedTargets(['ec', 'nc']);
      setEcTarget(50000);
      setNcTarget(2500);
      setRevenueTarget(150000);
      setGoldWeightTarget(150000);
      setBaselineDailyRr(79.0);
      setScaleCategory('MEDIUM — H2H BOOTH');
      setTeam('KPV');
      setLocation('Watchan');
      setPlanBudget(50000000);
      setTotalSpendingCost(0);
      setCustomersActual(0);
      setCustomersTarget(50000);
      setNewCustActual(0);
      setNewCustTarget(2500);
      setCpoActual(0);
      setCpoTarget(0);
      setCpaActual(0);
      setCpaTarget(0);
      setExecutionStatusLabel('New Campaign Horizon');
      setYear(2026);
      setQuarter('Q4');
    }
  }, [campaignToEdit, isOpen, latestDataDate]);

  // Compute automatic descriptive label for condition rules
  const computedConditionLabel = React.useMemo(() => {
    if (conditions.length === 0) {
      if (bank && bank !== 'all') {
        return `All Trans (${bank})`;
      }
      return 'No Condition (All Trans)';
    }

    const parts = conditions.map((c) => {
      const isW = c.metric === 'weight';
      const valStr = isW 
        ? `${c.value}g` 
        : c.value >= 1_000_000 
        ? `${(c.value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` 
        : c.value >= 1000 
        ? `${c.value / 1000}k` 
        : `${c.value}`;

      if (c.operator === 'between') {
        const maxStr = isW 
          ? `${c.max_value || c.value}g` 
          : `${(c.max_value || c.value) / 1000}k`;
        return isW ? `Weight ${c.value}-${maxStr}` : `Amount ${valStr}-${maxStr}`;
      }
      const opSym = c.operator === '==' ? '=' : c.operator;
      return isW ? `Weight ${opSym} ${valStr}` : `Buy trans ${opSym} ${valStr}`;
    });

    const base = parts.join(' & ');
    if (bank && bank !== 'all') {
      return `${base} (${bank})`;
    }
    return base;
  }, [conditions, bank]);

  // Sync auto label when condition rules or bank changes unless user typed a custom label
  useEffect(() => {
    if (!isCustomLabelUserEdited) {
      setConditionLabel(computedConditionLabel);
    }
  }, [computedConditionLabel, isCustomLabelUserEdited]);

  // Dynamic calculations for preview
  const totalDays = calculateDateDiffDays(startDate, endDate);
  const isEnded = new Date(asOfDate).getTime() >= new Date(endDate).getTime();
  const isUpcoming = new Date(asOfDate).getTime() < new Date(startDate).getTime();
  const elapsedDays = isEnded ? totalDays : isUpcoming ? 0 : Math.min(totalDays, calculateDateDiffDays(startDate, asOfDate));
  const pctTimeGone = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  // Dynamic backward dates
  const backwardWindow = computeBackwardDates(startDate, elapsedDays);

  if (!isOpen) return null;

  // Condition Handlers
  const handleAddCondition = () => {
    const newMetric = conditions.length === 0 
      ? 'amount' 
      : (conditions[conditions.length - 1].metric === 'amount' ? 'weight' : 'amount');
    const newRule: CampaignConditionRule = {
      id: `cond-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      metric: newMetric,
      operator: '>=',
      value: newMetric === 'weight' ? 2.0 : 500000,
      max_value: newMetric === 'weight' ? 5.0 : 2000000,
    };
    setConditions((prev) => [...prev, newRule]);
    setIsCustomLabelUserEdited(false);
  };

  const handleUpdateCondition = (index: number, updates: Partial<CampaignConditionRule>) => {
    setConditions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
    setIsCustomLabelUserEdited(false);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, idx) => idx !== index));
    setIsCustomLabelUserEdited(false);
  };

  const handleRemoveAllConditions = () => {
    setConditions([]);
    setIsCustomLabelUserEdited(false);
  };

  const toggleTargetType = (type: 'ec' | 'nc' | 'revenue' | 'weight') => {
    if (selectedTargets.includes(type)) {
      if (selectedTargets.length > 1) {
        setSelectedTargets(selectedTargets.filter((t) => t !== type));
      }
    } else {
      setSelectedTargets([...selectedTargets, type]);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDuplicate = false) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const isUuid = campaignToEdit && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignToEdit.id);
      const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `10000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;

      const effectiveLabel = conditionLabel.trim() || computedConditionLabel;
      const firstCond = conditions[0];

      const config: CampaignSetupConfig = {
        id: isDuplicate || !campaignToEdit ? generatedId : (isUuid ? campaignToEdit.id : generatedId),
        campaign_name: isDuplicate ? `${name.trim()} (Copy)` : name.trim(),
        description: description.trim(),
        category_tag: categoryTag,
        image_url: campaignToEdit?.image_url || '',
        campaign_date_start: startDate,
        campaign_date_end: endDate,
        data_update_on: asOfDate,
        auto_sync_max_date: autoSyncMaxDate,
        same_period_backward_start: backwardWindow.start,
        same_period_backward_end: backwardWindow.end,
        conditions: conditions,
        condition_type: conditions.length === 0 ? 'custom' : (firstCond.metric === 'weight' ? 'weight_gte' : 'amount_gte'),
        condition_operator: conditions.length === 0 ? 'all' : firstCond.operator,
        condition_value: conditions.length === 0 ? 0 : Number(firstCond.value),
        condition_max_value: (firstCond && firstCond.operator === 'between') ? Number(firstCond.max_value) : undefined,
        condition_label: effectiveLabel,
        tx_type: txType,
        bank: bank || 'all',
        target_types: selectedTargets,
        ec_target: selectedTargets.includes('ec') ? Number(ecTarget) : 0,
        nc_target: selectedTargets.includes('nc') ? Number(ncTarget) : 0,
        revenue_target_mil: selectedTargets.includes('revenue') ? Number(revenueTarget) : undefined,
        gold_weight_target_g: selectedTargets.includes('weight') ? Number(goldWeightTarget) : undefined,
        baseline_daily_rr: baselineDailyRr ? Number(baselineDailyRr) : undefined,
        status: isEnded ? 'completed' : isUpcoming ? 'upcoming' : 'active',
        scale_category: scaleCategory,
        team: team,
        location: location.trim(),
        plan_budget: Number(planBudget),
        total_spending_cost: Number(totalSpendingCost),
        customers_actual: isUpcoming ? 0 : (customersActual === 1731 && Number(ecTarget) !== 1731 ? 0 : Number(customersActual)),
        customers_target: selectedTargets.includes('ec') ? (Number(customersTarget) || Number(ecTarget)) : 0,
        new_cust_actual: isUpcoming ? 0 : Number(newCustActual),
        new_cust_target: selectedTargets.includes('nc') ? (Number(newCustTarget) || Number(ncTarget)) : 0,
        cpo_actual: Number(cpoActual),
        cpo_target: Number(cpoTarget),
        cpa_actual: Number(cpaActual),
        cpa_target: Number(cpaTarget),
        execution_status_label: executionStatusLabel.trim(),
        year: Number(year),
        quarter: quarter,
      };

      await onSave(config);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] text-white p-5 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-[#e5a812]" />
            <h3 className="text-lg font-bold">
              {campaignToEdit ? 'Adjust & Edit Campaign Tracking' : 'Create New Campaign Profile'}
            </h3>
          </div>
          <p className="text-xs text-blue-100/80">
            Set campaign date timeline, condition thresholds, and multi-targets.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-5 overflow-y-auto">
          
          {/* 1. Identity & Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0c4ca3]" />
              <span>1. Campaign Profile & Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hero Campaign 2026 (500K)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Tag
                </label>
                <select
                  value={categoryTag}
                  onChange={(e) => setCategoryTag(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden bg-white"
                >
                  <option value="Volume Driver">Volume Driver</option>
                  <option value="Sprint Promo">Sprint Promo</option>
                  <option value="High Ticket Retention">High Ticket Retention</option>
                  <option value="New User Acquisition">New User Acquisition</option>
                  <option value="Seasonal Festival">Seasonal Festival</option>
                  <option value="Event">Event</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign Objective / Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Hero Campaign Nationwide with 500K MOV"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 2. Timeline & Automatic Reverse Backward Window */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0c4ca3]" />
                <span>2. Timeline Engine (Time Gone & Reverse Backward Benchmark)</span>
              </h4>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  isEnded ? 'bg-slate-200 text-slate-800' : isUpcoming ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isEnded ? '🏁 Status: Ended' : isUpcoming ? '⏳ Status: Upcoming' : '🟢 Status: Active'}
                </span>
                <span className="text-[11px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {pctTimeGone}% Time Gone ({elapsedDays}/{totalDays}d)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Data Update On (As-Of)
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-blue-700 cursor-pointer font-bold select-none">
                    <input
                      type="checkbox"
                      checked={autoSyncMaxDate}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setAutoSyncMaxDate(isChecked);
                        if (isChecked) {
                          setAsOfDate(latestDataDate || '2026-10-18');
                        }
                      }}
                      className="rounded-xs text-[#0c4ca3]"
                    />
                    <span>Auto-Sync DB</span>
                  </label>
                </div>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* 3. Flexible Condition Rules (Dynamic Multi-Condition & Zero Condition Support) */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-[#0c4ca3]" />
                  <span>3. Condition Rules & Eligibility</span>
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {conditions.length === 0 
                    ? 'No conditions active (matching all transactions)' 
                    : `${conditions.length} condition rule${conditions.length > 1 ? 's' : ''} combined with AND logic`}
                </p>
              </div>

              {/* Action buttons to add or remove conditions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#0c4ca3] text-white hover:bg-[#093d84] transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Condition</span>
                </button>
                {conditions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveAllConditions}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Remove all conditions to track all transactions without filter (e.g. NC only)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Zero Conditions Empty State Callout */}
            {conditions.length === 0 ? (
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>No Condition Filter Applied (Tracking All Transactions)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    All transactions in the selected date range and bank channel will qualify without any threshold restriction. Perfect for overall NC (New Customer) campaigns or generic volume tracking.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0c4ca3] text-white hover:bg-[#093d84] flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Condition</span>
                </button>
              </div>
            ) : (
              /* Dynamic Condition Rows */
              <div className="space-y-2.5">
                {conditions.map((cond, idx) => (
                  <div key={cond.id || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#0c4ca3] text-white text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          Condition #{idx + 1} {idx > 0 && <span className="text-[10px] font-black text-blue-600 ml-1">(AND)</span>}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove this condition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Condition Metric
                        </label>
                        <select
                          value={cond.metric}
                          onChange={(e) => {
                            const m = e.target.value as 'amount' | 'weight';
                            handleUpdateCondition(idx, { 
                              metric: m, 
                              value: m === 'weight' ? 2.0 : 500000,
                              max_value: m === 'weight' ? 5.0 : 2000000 
                            });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                        >
                          <option value="amount">Total Buy Value (LAK)</option>
                          <option value="weight">Gold Weight (Grams)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Operator
                        </label>
                        <select
                          value={cond.operator}
                          onChange={(e) => handleUpdateCondition(idx, { operator: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                        >
                          <option value=">=">&gt;= (Greater or Equal / Min)</option>
                          <option value="<=">&lt;= (Less or Equal / Max)</option>
                          <option value="between">BETWEEN (Min and Max)</option>
                          <option value="==">== (Exact Value)</option>
                        </select>
                      </div>

                      {cond.operator === 'between' ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Min {cond.metric === 'weight' ? '(g)' : '(LAK)'}
                            </label>
                            <input
                              type="number"
                              step={cond.metric === 'weight' ? '0.1' : '1000'}
                              value={cond.value}
                              onChange={(e) => handleUpdateCondition(idx, { value: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Max {cond.metric === 'weight' ? '(g)' : '(LAK)'}
                            </label>
                            <input
                              type="number"
                              step={cond.metric === 'weight' ? '0.1' : '1000'}
                              value={cond.max_value ?? (cond.metric === 'weight' ? 5.0 : 2000000)}
                              onChange={(e) => handleUpdateCondition(idx, { max_value: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Threshold Value {cond.metric === 'weight' ? '(g)' : '(LAK)'}
                          </label>
                          <input
                            type="number"
                            step={cond.metric === 'weight' ? '0.1' : '1000'}
                            value={cond.value}
                            onChange={(e) => handleUpdateCondition(idx, { value: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Condition Display Label */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Condition Display Label
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setConditionLabel(computedConditionLabel);
                    setIsCustomLabelUserEdited(false);
                  }}
                  className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  Reset to Auto Label
                </button>
              </div>
              <input
                type="text"
                value={conditionLabel}
                onChange={(e) => {
                  setConditionLabel(e.target.value);
                  setIsCustomLabelUserEdited(true);
                }}
                placeholder={computedConditionLabel}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                required
              />
            </div>

            {/* Dedicated Multi-Select Bank Channel Scope & Filter Selector */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Bank Channel Filter:</span>
                    <span className="text-[10px] text-slate-500 ml-1.5 hidden sm:inline">
                      (Multi-selection — click multiple banks to combine)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {bank === 'all' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      All Banks Selected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 max-w-[280px] truncate" title={bank}>
                      {selectedBanksList.length} Bank{selectedBanksList.length > 1 ? 's' : ''}: {bank}
                    </span>
                  )}
                </div>
              </div>

              {/* Multi-Select Bank Interactive Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleToggleBank('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    bank === 'all'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>🏦 All Banks (ທຸກທະນາຄານ)</span>
                  {bank === 'all' && <Check className="w-3 h-3" />}
                </button>
                {BANK_OPTIONS.map((b) => {
                  const isSelected = bank !== 'all' && selectedBanksList.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleToggleBank(b.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-500'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{b.label}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Multiple Target Selection by User */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#0c4ca3]" />
                <span>4. Multiple Target Selection & Numerical Targets</span>
              </h4>
              <span className="text-[10px] text-slate-500">
                Choose which KPI targets to evaluate
              </span>
            </div>

            {/* Target Select Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => toggleTargetType('ec')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                  selectedTargets.includes('ec')
                    ? 'bg-blue-50 border-[#0c4ca3] text-[#0c4ca3]'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <span>Buy Transactions</span>
                {selectedTargets.includes('ec') && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleTargetType('nc')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                  selectedTargets.includes('nc')
                    ? 'bg-purple-50 border-purple-600 text-purple-700'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <span>NC (New Customers)</span>
                {selectedTargets.includes('nc') && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleTargetType('revenue')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                  selectedTargets.includes('revenue')
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <span>Revenue (Mil LAK)</span>
                {selectedTargets.includes('revenue') && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleTargetType('weight')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                  selectedTargets.includes('weight')
                    ? 'bg-amber-50 border-amber-500 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <span>Gold Weight (Grams)</span>
                {selectedTargets.includes('weight') && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Target Value Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {selectedTargets.includes('ec') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Buy Transactions Target *
                  </label>
                  <input
                    type="number"
                    value={ecTarget}
                    onChange={(e) => setEcTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono font-bold"
                    required
                  />
                </div>
              )}

              {selectedTargets.includes('nc') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NC Target (New Customers Count) *
                  </label>
                  <input
                    type="number"
                    value={ncTarget}
                    onChange={(e) => setNcTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono font-bold"
                    required
                  />
                </div>
              )}

              {selectedTargets.includes('revenue') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Revenue Target (Million LAK)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={revenueTarget}
                    onChange={(e) => setRevenueTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                  />
                </div>
              )}

              {selectedTargets.includes('weight') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gold Weight Target (Grams)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={goldWeightTarget}
                    onChange={(e) => setGoldWeightTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              {campaignToEdit && onDelete && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete "${campaignToEdit.campaign_name}"?`)) {
                      await onDelete(campaignToEdit.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {campaignToEdit && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Save as Copy</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white shadow-md transition-all flex items-center gap-2"
              >
                {isSaving ? 'Saving...' : 'Save Campaign Setup'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
