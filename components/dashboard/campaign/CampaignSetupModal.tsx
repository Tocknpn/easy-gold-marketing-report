'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CampaignSetupConfig, 
  CampaignConditionType, 
  CampaignOperator 
} from '@/lib/types/campaign.types';
import { 
  X, 
  Target, 
  Calendar, 
  Settings, 
  Sparkles,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  Copy,
  Clock,
  Layers,
  Landmark
} from 'lucide-react';
import { calculateDateDiffDays, computeBackwardDates } from '@/lib/campaign/campaignEngine';

interface CampaignSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit?: CampaignSetupConfig | null;
  onSave: (config: CampaignSetupConfig) => Promise<void>;
  onDelete?: (campaignId: string) => Promise<void>;
}

export function CampaignSetupModal({
  isOpen,
  onClose,
  campaignToEdit,
  onSave,
  onDelete,
}: CampaignSetupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryTag, setCategoryTag] = useState('Volume Driver');
  const [imageUrl, setImageUrl] = useState('');
  
  // Dates
  const [startDate, setStartDate] = useState('2026-08-24');
  const [endDate, setEndDate] = useState('2026-12-25');
  const [asOfDate, setAsOfDate] = useState('2026-10-14');
  const [autoSyncMaxDate, setAutoSyncMaxDate] = useState(true);

  // Conditions
  const [conditionType, setConditionType] = useState<CampaignConditionType>('amount_gte');
  const [conditionOperator, setConditionOperator] = useState<CampaignOperator>('>=');
  const [conditionValue, setConditionValue] = useState<number>(500000);
  const [conditionMaxValue, setConditionMaxValue] = useState<number>(2000000);
  const [conditionLabel, setConditionLabel] = useState('Buy trans >= 500k');
  const [txType, setTxType] = useState('BUY_GOLD');
  const [bank, setBank] = useState<string>('all');

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Event Plan & Scale Tracking (Image 2 style)
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
    if (campaignToEdit) {
      setName(campaignToEdit.campaign_name);
      setDescription(campaignToEdit.description || '');
      setCategoryTag(campaignToEdit.category_tag || 'Volume Driver');
      setImageUrl(campaignToEdit.image_url || '');
      setStartDate(campaignToEdit.campaign_date_start);
      setEndDate(campaignToEdit.campaign_date_end);
      setAsOfDate((campaignToEdit.auto_sync_max_date ?? true) ? '2026-10-18' : (campaignToEdit.data_update_on || '2026-10-18'));
      setAutoSyncMaxDate(campaignToEdit.auto_sync_max_date ?? true);
      setConditionType(campaignToEdit.condition_type || 'amount_gte');
      setConditionOperator(campaignToEdit.condition_operator || '>=');
      setConditionValue(campaignToEdit.condition_value || 500000);
      setConditionMaxValue(campaignToEdit.condition_max_value || 2000000);
      setConditionLabel(campaignToEdit.condition_label || 'Buy trans >= 500k');
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
      setImageUrl('https://images.unsplash.com/photo-1610375461246-83df859d849d?w=150&auto=format&fit=crop&q=80');
      setStartDate('2026-10-21');
      setEndDate('2026-10-27');
      setAsOfDate('2026-10-14');
      setAutoSyncMaxDate(true);
      setConditionType('amount_gte');
      setConditionOperator('>=');
      setConditionValue(500000);
      setConditionMaxValue(2000000);
      setConditionLabel('Buy trans >= 500k');
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
  }, [campaignToEdit, isOpen]);

  // Dynamic calculations for preview
  const totalDays = calculateDateDiffDays(startDate, endDate);
  const isEnded = new Date(asOfDate).getTime() >= new Date(endDate).getTime();
  const isUpcoming = new Date(asOfDate).getTime() < new Date(startDate).getTime();
  const elapsedDays = isEnded ? totalDays : isUpcoming ? 0 : Math.min(totalDays, calculateDateDiffDays(startDate, asOfDate));
  const pctTimeGone = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  // Dynamic backward dates
  const backwardWindow = computeBackwardDates(startDate, elapsedDays);
  const backwardDays = calculateDateDiffDays(backwardWindow.start, backwardWindow.end);

  if (!isOpen) return null;

  // Handle local image file upload -> Base64 Data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick preset selector
  const handleConditionPreset = (type: '500k' | '2g' | '15g' | 'range_1_5g' | 'ldb' | 'bcel') => {
    if (type === '500k') {
      setConditionType('amount_gte');
      setConditionOperator('>=');
      setConditionValue(500000);
      setConditionLabel(bank !== 'all' ? `Buy trans >= 500k (${bank})` : 'Buy trans >= 500k');
    } else if (type === '2g') {
      setConditionType('weight_gte');
      setConditionOperator('>=');
      setConditionValue(2.0);
      setConditionLabel(bank !== 'all' ? `Buy trans >= 2g (${bank})` : 'Buy trans >= 2g');
    } else if (type === '15g') {
      setConditionType('weight_gte');
      setConditionOperator('>=');
      setConditionValue(15.0);
      setConditionLabel(bank !== 'all' ? `Buy trans >= 15g (${bank})` : 'Buy trans >= 15g');
    } else if (type === 'range_1_5g') {
      setConditionType('weight_between');
      setConditionOperator('between');
      setConditionValue(1.0);
      setConditionMaxValue(5.0);
      setConditionLabel(bank !== 'all' ? `Gold weight 1-5g (${bank})` : 'Gold weight between 1.0g - 5.0g');
    } else if (type === 'ldb') {
      setBank('LDB');
      setConditionType('bank');
      setConditionOperator('==');
      setConditionValue(100000);
      setConditionLabel('Buy trans >= 100k (LDB)');
    } else if (type === 'bcel') {
      setBank('BCEL');
      setConditionType('bank');
      setConditionOperator('==');
      setConditionValue(100000);
      setConditionLabel('Buy trans >= 100k (BCEL)');
    }
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

      const config: CampaignSetupConfig = {
        id: isDuplicate || !campaignToEdit ? generatedId : (isUuid ? campaignToEdit.id : generatedId),
        campaign_name: isDuplicate ? `${name.trim()} (Copy)` : name.trim(),
        description: description.trim(),
        category_tag: categoryTag,
        image_url: imageUrl,
        campaign_date_start: startDate,
        campaign_date_end: endDate,
        data_update_on: asOfDate,
        auto_sync_max_date: autoSyncMaxDate,
        same_period_backward_start: backwardWindow.start,
        same_period_backward_end: backwardWindow.end,
        condition_type: conditionType,
        condition_operator: conditionOperator,
        condition_value: Number(conditionValue),
        condition_max_value: conditionOperator === 'between' ? Number(conditionMaxValue) : undefined,
        condition_label: conditionLabel.trim(),
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
            Set campaign profile image, date timeline, reverse backward duration, condition thresholds, and multi-targets.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-5 overflow-y-auto">
          
          {/* 1. Identity & Profile Picture */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>1. Campaign Profile & Visual Identity</span>
            </h4>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Avatar Preview & Upload */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-slate-100 flex items-center justify-center relative group">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Campaign Logo" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                  )}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-[10px] font-bold"
                  >
                    <Upload className="w-4 h-4 mb-0.5" />
                    <span>Upload</span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-bold text-[#0c4ca3] hover:underline"
                >
                  Upload Photo
                </button>
              </div>

              {/* Name & URL & Category */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mega Buy Gold >= 500K Campaign"
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
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Image Link (URL)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... or paste image link"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Campaign Objective / Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Volume driver incentivizing transactions of 500,000 LAK and above"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                  />
                </div>
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
                  <label className="flex items-center gap-1 text-[10px] text-blue-700 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={autoSyncMaxDate}
                      onChange={(e) => setAutoSyncMaxDate(e.target.checked)}
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

            {/* Calculated Reverse Backward Window Ribbon */}
            <div className="bg-pink-50/70 border border-pink-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-pink-900">Computed Backward Period:</span>
                <span className="font-mono font-bold text-pink-950 bg-white px-2 py-0.5 rounded-md border border-pink-200">
                  {backwardWindow.start} → {backwardWindow.end}
                </span>
                <span className="text-[11px] text-pink-800 font-semibold">({backwardDays} Days duration)</span>
              </div>
              <span className="text-[10px] text-pink-700 italic">
                *Exact same period backward calculated from timegone reversed from campaign start
              </span>
            </div>
          </div>

          {/* 3. Flexible Condition Rules (Weight, Value, Operators Min/Max/Between) */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#0c4ca3]" />
                <span>3. Condition Rules & Eligibility</span>
              </h4>

              {/* Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleConditionPreset('500k')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                >
                  &gt;= 500k
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionPreset('2g')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                >
                  &gt;= 2.0g
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionPreset('15g')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 cursor-pointer"
                >
                  &gt;= 15.0g
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionPreset('range_1_5g')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  Between 1-5g
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionPreset('ldb')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 cursor-pointer flex items-center gap-1"
                >
                  <Landmark className="w-2.5 h-2.5 text-indigo-600" />
                  <span>LDB Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionPreset('bcel')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100 cursor-pointer flex items-center gap-1"
                >
                  <Landmark className="w-2.5 h-2.5 text-sky-600" />
                  <span>BCEL Bank</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Condition Metric
                </label>
                <select
                  value={conditionType}
                  onChange={(e) => {
                    const val = e.target.value as CampaignConditionType;
                    setConditionType(val);
                    if (val === 'bank') {
                      if (bank === 'all') setBank('LDB');
                      setConditionOperator('==');
                      setConditionLabel(`Bank: ${bank !== 'all' ? bank : 'LDB'} Promo`);
                    } else if (val.includes('weight')) {
                      setConditionValue(2.0);
                      setConditionLabel(bank !== 'all' ? `Buy trans >= 2g (${bank})` : 'Buy trans >= 2g');
                    } else {
                      setConditionValue(500000);
                      setConditionLabel(bank !== 'all' ? `Buy trans >= 500k (${bank})` : 'Buy trans >= 500k');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden bg-white"
                >
                  <option value="amount_gte">Total Buy Value (LAK)</option>
                  <option value="weight_gte">Gold Weight (Grams)</option>
                  <option value="weight_between">Weight Range (Between)</option>
                  <option value="amount_between">Amount Range (Between)</option>
                  <option value="bank">Bank (Partner / Channel)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operator
                </label>
                <select
                  value={conditionOperator}
                  onChange={(e) => setConditionOperator(e.target.value as CampaignOperator)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden bg-white font-mono"
                >
                  <option value=">=">&gt;= (Greater or Equal / Min)</option>
                  <option value="<=">&lt;= (Less or Equal / Max)</option>
                  <option value="between">BETWEEN (Min and Max)</option>
                  <option value="==">== (Exact Bank / Match)</option>
                  <option value="all">ALL (No threshold filter)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {conditionType === 'bank' 
                    ? 'Target Bank Channel' 
                    : conditionOperator === 'between' 
                    ? 'Min Value' 
                    : 'Threshold Value'}
                </label>
                {conditionType === 'bank' ? (
                  <select
                    value={bank}
                    onChange={(e) => {
                      const selectedBank = e.target.value;
                      setBank(selectedBank);
                      setConditionLabel(`Bank: ${selectedBank}`);
                    }}
                    className="w-full px-3 py-2 text-xs border border-indigo-300 bg-indigo-50/50 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-bold text-indigo-950"
                  >
                    <option value="all">All Banks (ທຸກທະນາຄານ)</option>
                    <option value="BCEL">BCEL (OnePay)</option>
                    <option value="LDB">LDB (Lao Development Bank)</option>
                    <option value="JDB">JDB (Yes Pay)</option>
                    <option value="UMONEY">u-money (Unitel)</option>
                    <option value="MMONEY">M-Money (Lao Telecom)</option>
                    <option value="ACLEDA">ACLEDA Bank</option>
                    <option value="APB">APB (Agri Promotion Bank)</option>
                    <option value="LVB">LVB Bank</option>
                    <option value="PSVB">Phongsavanh Bank</option>
                    <option value="STB">ST Bank</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                    required
                  />
                )}
              </div>

              {conditionOperator === 'between' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Max Value (Upper Bound)
                  </label>
                  <input
                    type="number"
                    value={conditionMaxValue}
                    onChange={(e) => setConditionMaxValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Condition Display Label
                  </label>
                  <input
                    type="text"
                    value={conditionLabel}
                    onChange={(e) => setConditionLabel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                    required
                  />
                </div>
              )}
            </div>

            {/* Dedicated Bank Channel Scope & Filter Selector */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800">Bank Channel Filter:</span>
                  <span className="text-[10px] text-slate-500 ml-1.5 hidden sm:inline">
                    Filter campaign transactions by payment bank / partner
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bank}
                  onChange={(e) => {
                    const newBank = e.target.value;
                    setBank(newBank);
                    if (newBank !== 'all' && !conditionLabel.includes(newBank)) {
                      setConditionLabel((prev) => `${prev.replace(/\s*\([A-Z]+\)$/, '')} (${newBank})`);
                    } else if (newBank === 'all') {
                      setConditionLabel((prev) => prev.replace(/\s*\([A-Z]+\)$/, ''));
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden bg-white text-slate-800"
                >
                  <option value="all">🏦 All Banks (ທຸກທະນາຄານ)</option>
                  <option value="BCEL">BCEL (OnePay)</option>
                  <option value="LDB">LDB (Lao Development Bank)</option>
                  <option value="JDB">JDB (Yes Pay)</option>
                  <option value="UMONEY">u-money (Unitel)</option>
                  <option value="MMONEY">M-Money (Lao Telecom)</option>
                  <option value="ACLEDA">ACLEDA Bank</option>
                  <option value="APB">APB (Agri Promotion Bank)</option>
                  <option value="LVB">LVB Bank</option>
                  <option value="PSVB">Phongsavanh Bank</option>
                  <option value="STB">ST Bank</option>
                </select>
                {bank !== 'all' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                    Active: {bank}
                  </span>
                )}
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
                <span>EC (Transactions)</span>
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
                    EC Target (Existing/Total Customers Transactions) *
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
