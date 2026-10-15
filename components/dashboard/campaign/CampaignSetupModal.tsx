'use client';

import React, { useState, useEffect } from 'react';
import { CampaignSetupConfig, CampaignConditionType } from '@/lib/types/campaign.types';
import { 
  X, 
  Target, 
  Calendar, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { calculateDateDiffDays } from '@/lib/campaign/campaignEngine';

interface CampaignSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit?: CampaignSetupConfig | null;
  onSave: (config: CampaignSetupConfig) => Promise<void>;
}

export function CampaignSetupModal({
  isOpen,
  onClose,
  campaignToEdit,
  onSave,
}: CampaignSetupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('2026-08-24');
  const [endDate, setEndDate] = useState('2026-12-25');
  const [asOfDate, setAsOfDate] = useState('2026-10-14');
  const [backwardStart, setBackwardStart] = useState('2026-07-03');
  const [backwardEnd, setBackwardEnd] = useState('2026-08-23');

  const [conditionType, setConditionType] = useState<CampaignConditionType>('amount_gte');
  const [conditionValue, setConditionValue] = useState<number>(500000);
  const [conditionLabel, setConditionLabel] = useState('Buy trans >= 500k');

  const [ecTarget, setEcTarget] = useState<number>(307500);
  const [ncTarget, setNcTarget] = useState<number>(17220);
  const [baselineDailyRr, setBaselineDailyRr] = useState<number | undefined>(79.0);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (campaignToEdit) {
      setName(campaignToEdit.campaign_name);
      setDescription(campaignToEdit.description || '');
      setStartDate(campaignToEdit.campaign_date_start);
      setEndDate(campaignToEdit.campaign_date_end);
      setAsOfDate(campaignToEdit.data_update_on);
      setBackwardStart(campaignToEdit.same_period_backward_start);
      setBackwardEnd(campaignToEdit.same_period_backward_end);
      setConditionType(campaignToEdit.condition_type);
      setConditionValue(campaignToEdit.condition_value);
      setConditionLabel(campaignToEdit.condition_label);
      setEcTarget(campaignToEdit.ec_target);
      setNcTarget(campaignToEdit.nc_target);
      setBaselineDailyRr(campaignToEdit.baseline_daily_rr);
    } else {
      // Default template
      setName('New Marketing Campaign');
      setDescription('');
      setStartDate('2026-08-24');
      setEndDate('2026-12-25');
      setAsOfDate('2026-10-14');
      setBackwardStart('2026-07-03');
      setBackwardEnd('2026-08-23');
      setConditionType('amount_gte');
      setConditionValue(500000);
      setConditionLabel('Buy trans >= 500k');
      setEcTarget(307500);
      setNcTarget(17220);
    }
  }, [campaignToEdit, isOpen]);

  if (!isOpen) return null;

  const totalDays = calculateDateDiffDays(startDate, endDate);
  const elapsedDays = Math.min(totalDays, calculateDateDiffDays(startDate, asOfDate));
  const backwardDays = calculateDateDiffDays(backwardStart, backwardEnd);

  const handleConditionPreset = (type: '500k' | '2g' | '15g') => {
    if (type === '500k') {
      setConditionType('amount_gte');
      setConditionValue(500000);
      setConditionLabel('Buy trans >= 500k');
    } else if (type === '2g') {
      setConditionType('weight_gte');
      setConditionValue(2.0);
      setConditionLabel('Buy trans >= 2g');
    } else {
      setConditionType('weight_gte');
      setConditionValue(15.0);
      setConditionLabel('Buy trans >= 15g');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const config: CampaignSetupConfig = {
        id: campaignToEdit ? campaignToEdit.id : `campaign-${Date.now()}`,
        campaign_name: name.trim(),
        description: description.trim(),
        campaign_date_start: startDate,
        campaign_date_end: endDate,
        data_update_on: asOfDate,
        same_period_backward_start: backwardStart,
        same_period_backward_end: backwardEnd,
        condition_type: conditionType,
        condition_value: Number(conditionValue),
        condition_label: conditionLabel,
        tx_type: 'BUY_GOLD',
        ec_target: Number(ecTarget),
        nc_target: Number(ncTarget),
        baseline_daily_rr: baselineDailyRr ? Number(baselineDailyRr) : undefined,
        status: 'active',
      };

      await onSave(config);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
              {campaignToEdit ? 'Edit Campaign Setup' : 'Create New Campaign Tracking Concept'}
            </h3>
          </div>
          <p className="text-xs text-blue-100/80">
            Configure campaign dates, transaction threshold conditions, target volume (EC/NC), and backward baseline period.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* 1. Basic Metadata */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>1. Campaign Concept & Title</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Objective
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Drive buy transactions >= 500k to hit Q4 budget targets"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 2. Timeline & As-Of Date */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0c4ca3]" />
                <span>2. Campaign Timeline & Pace (Total: {totalDays} Days)</span>
              </h4>
              <span className="text-[11px] font-bold text-[#0c4ca3] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Elapsed: {elapsedDays} Days ({Math.round((elapsedDays / totalDays) * 100)}%)
              </span>
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
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
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
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Update On (As-Of)
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* 3. Backward Baseline Period */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>3. Same Period Backward Baseline ({backwardDays} Days)</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-medium">
                Benchmark period for growth %compare
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Backward Start Date
                </label>
                <input
                  type="date"
                  value={backwardStart}
                  onChange={(e) => setBackwardStart(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Backward End Date
                </label>
                <input
                  type="date"
                  value={backwardEnd}
                  onChange={(e) => setBackwardEnd(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. Campaign Conditions & Targets */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>4. Condition Rules & Targets</span>
              <div className="flex items-center gap-1 font-sans">
                <button
                  type="button"
                  onClick={() => handleConditionPreset('500k')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                >
                  &gt;= 500k LAK
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionPreset('2g')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#0c4ca3] border border-blue-200"
                >
                  &gt;= 2.0g
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionPreset('15g')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  &gt;= 15.0g
                </button>
              </div>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Condition Display Label *
                </label>
                <input
                  type="text"
                  value={conditionLabel}
                  onChange={(e) => setConditionLabel(e.target.value)}
                  placeholder="e.g. Buy trans >= 500k"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Threshold Value ({conditionType === 'amount_gte' ? 'LAK' : 'Grams'})
                </label>
                <input
                  type="number"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  EC Target (Existing/Total Customers) *
                </label>
                <input
                  type="number"
                  value={ecTarget}
                  onChange={(e) => setEcTarget(Number(e.target.value))}
                  placeholder="e.g. 307500"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NC Target (New Customers) *
                </label>
                <input
                  type="number"
                  value={ncTarget}
                  onChange={(e) => setNcTarget(Number(e.target.value))}
                  placeholder="e.g. 17220"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono font-bold"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Baseline Normal Run-Rate per Day (Optional, e.g. Q3 average 79/day)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={baselineDailyRr || ''}
                  onChange={(e) => setBaselineDailyRr(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 79.0"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
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
        </form>
      </div>
    </div>
  );
}
