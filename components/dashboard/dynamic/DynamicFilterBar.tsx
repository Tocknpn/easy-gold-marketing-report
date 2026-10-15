'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Building2, 
  Landmark, 
  Layers, 
  Scale, 
  Banknote, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  X,
  Check,
  Users,
  CalendarDays,
  ShieldCheck,
  Search,
  Sparkles,
  Loader2
} from 'lucide-react';
import { DynamicFilterState } from '@/lib/types/dynamicReport.types';
import { 
  ALL_AVAILABLE_BANKS, 
  ALL_AVAILABLE_BRANCHES, 
  ALL_AVAILABLE_TX_TYPES,
  DEFAULT_FILTER_STATE 
} from '@/lib/constants/dynamicReportData';

interface DynamicFilterBarProps {
  filters: DynamicFilterState;
  onFilterChange: (newFilters: DynamicFilterState) => void;
  onReset: () => void;
  isLoading?: boolean;
  onExecuteQuery?: () => void;
}

export function DynamicFilterBar({
  filters,
  onFilterChange,
  onReset,
  isLoading,
  onExecuteQuery,
}: DynamicFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'banks' | 'branches' | 'txTypes' | null>(null);

  // Count active non-default filters
  const activeFilterCount = [
    filters.quickPreset !== 'this_month' && filters.quickPreset !== 'custom' ? 1 : 0,
    filters.selectedBanks.length > 0 ? 1 : 0,
    filters.selectedBranches.length > 0 ? 1 : 0,
    filters.selectedTxTypes.length > 0 ? 1 : 0,
    filters.minWeight !== null || filters.maxWeight !== null ? 1 : 0,
    filters.minAmount !== null || filters.maxAmount !== null ? 1 : 0,
    filters.startHour !== null || filters.endHour !== null ? 1 : 0,
    filters.customerSegment && filters.customerSegment !== 'all' ? 1 : 0,
    filters.dayOfWeek && filters.dayOfWeek !== 'all' ? 1 : 0,
    filters.searchKeyword && filters.searchKeyword.trim() !== '' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Quick preset handlers
  const handlePresetSelect = (preset: string) => {
    let start = '2026-10-01';
    let end = '2026-10-12';

    if (preset === 'today') {
      start = '2026-10-12';
      end = '2026-10-12';
    } else if (preset === 'yesterday') {
      start = '2026-10-11';
      end = '2026-10-11';
    } else if (preset === 'last7d') {
      start = '2026-10-06';
      end = '2026-10-12';
    } else if (preset === 'last30d') {
      start = '2026-09-13';
      end = '2026-10-12';
    } else if (preset === 'this_month') {
      start = '2026-10-01';
      end = '2026-10-12';
    } else if (preset === 'last_month') {
      start = '2026-09-01';
      end = '2026-09-30';
    } else if (preset === 'aug_month') {
      start = '2026-08-01';
      end = '2026-08-31';
    } else if (preset === 'q3') {
      start = '2026-07-01';
      end = '2026-09-30';
    } else if (preset === 'q4') {
      start = '2026-10-01';
      end = '2026-12-31';
    }

    onFilterChange({
      ...filters,
      quickPreset: preset,
      startDate: start,
      endDate: end,
    });
  };

  const toggleBank = (bank: string) => {
    const exists = filters.selectedBanks.includes(bank);
    const updated = exists
      ? filters.selectedBanks.filter((b) => b !== bank)
      : [...filters.selectedBanks, bank];
    onFilterChange({ ...filters, selectedBanks: updated });
  };

  const toggleBranch = (branch: string) => {
    const exists = filters.selectedBranches.includes(branch);
    const updated = exists
      ? filters.selectedBranches.filter((b) => b !== branch)
      : [...filters.selectedBranches, branch];
    onFilterChange({ ...filters, selectedBranches: updated });
  };

  const toggleTxType = (typeId: string) => {
    const exists = filters.selectedTxTypes.includes(typeId);
    const updated = exists
      ? filters.selectedTxTypes.filter((t) => t !== typeId)
      : [...filters.selectedTxTypes, typeId];
    onFilterChange({ ...filters, selectedTxTypes: updated });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm transition-all mb-4">
      {/* Top Main Filter Bar */}
      <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Preset Slicers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-[#0c4ca3]" />
            Preset:
          </span>
          {[
            { id: 'this_month', label: "Oct'26 (This Month)" },
            { id: 'last_month', label: "Sep'26 (Last Month)" },
            { id: 'aug_month', label: "Aug'26" },
            { id: 'last7d', label: 'Last 7 Days' },
            { id: 'last30d', label: 'Last 30 Days' },
            { id: 'q3', label: 'Q3 (Jul-Sep)' },
            { id: 'today', label: 'Today' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                filters.quickPreset === preset.id
                  ? 'bg-[#0c4ca3] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-750 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Action Controls: Expand Advanced, Clear, Filter Count */}
        <div className="flex items-center gap-2 ml-auto">
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
              <Filter className="w-3 h-3" />
              {activeFilterCount} Active
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Filter className="w-3.5 h-3.5 text-[#0c4ca3]" />
            <span>{isExpanded ? 'Hide Slicers' : 'Advanced Slicers'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {onExecuteQuery && (
            <button
              onClick={onExecuteQuery}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-sm hover:shadow-md ring-1 ring-emerald-400/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              title="Execute live calculations on Supabase"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{isLoading ? 'Calculating...' : 'Calculate (ຄຳນວນ)'}</span>
            </button>
          )}

          <button
            onClick={onReset}
            title="Reset to default filters"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Collapsible Multi-Dimensional Slicers */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Date Range Inputs */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0c4ca3]" />
                Date Range (Custom)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    onFilterChange({ ...filters, startDate: e.target.value, quickPreset: 'custom' })
                  }
                  className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0c4ca3]"
                />
                <span className="text-slate-400 font-bold text-xs">to</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    onFilterChange({ ...filters, endDate: e.target.value, quickPreset: 'custom' })
                  }
                  className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0c4ca3]"
                />
              </div>
            </div>

            {/* 2. Hour Filter (Peak vs Non-Peak) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0c4ca3]" />
                Trading Hours (0-23)
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => onFilterChange({ ...filters, startHour: null, endHour: null })}
                  className={`px-2 py-1 text-[11px] font-bold rounded ${
                    filters.startHour === null
                      ? 'bg-[#0c4ca3] text-white'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  All 24h
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, startHour: 8, endHour: 12 })}
                  className={`px-2 py-1 text-[11px] font-bold rounded ${
                    filters.startHour === 8 && filters.endHour === 12
                      ? 'bg-[#0c4ca3] text-white'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Morning (08-12)
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, startHour: 13, endHour: 17 })}
                  className={`px-2 py-1 text-[11px] font-bold rounded ${
                    filters.startHour === 13 && filters.endHour === 17
                      ? 'bg-[#0c4ca3] text-white'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Afternoon (13-17)
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, startHour: 18, endHour: 23 })}
                  className={`px-2 py-1 text-[11px] font-bold rounded ${
                    filters.startHour === 18 && filters.endHour === 23
                      ? 'bg-[#0c4ca3] text-white'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Evening (18-23)
                </button>
              </div>
            </div>

            {/* 3. Gold Weight Bracket (0.5g to 15g, etc) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#0c4ca3]" />
                Gold Weight (Grams)
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Min (g)"
                  value={filters.minWeight ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      minWeight: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg"
                />
                <span className="text-slate-400 font-bold text-xs">-</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Max (g)"
                  value={filters.maxWeight ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      maxWeight: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => onFilterChange({ ...filters, minWeight: 0.1, maxWeight: 0.5 })}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600"
                >
                  &lt;0.5g
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, minWeight: 0.5, maxWeight: 15.0 })}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600"
                >
                  0.5g - 15g
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, minWeight: 15.0, maxWeight: null })}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600"
                >
                  &gt;15g (1 Baht+)
                </button>
              </div>
            </div>

            {/* 4. Total Amount Range (100k to 500k, etc) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-[#0c4ca3]" />
                Transaction Value (LAK)
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="number"
                  step="50000"
                  placeholder="Min LAK"
                  value={filters.minAmount ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      minAmount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg"
                />
                <span className="text-slate-400 font-bold text-xs">-</span>
                <input
                  type="number"
                  step="50000"
                  placeholder="Max LAK"
                  value={filters.maxAmount ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      maxAmount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => onFilterChange({ ...filters, minAmount: 100000, maxAmount: 500000 })}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600"
                >
                  100k - 500k
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, minAmount: 500000, maxAmount: 5000000 })}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600"
                >
                  500k - 5M
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, minAmount: 5000000, maxAmount: null })}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600"
                >
                  &gt; 5M LAK
                </button>
              </div>
            </div>
          </div>

          {/* 5-8: Customer Segment, Day of Week, Status & Search Keyword */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* 5. Customer Segment */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0c4ca3]" />
                Customer Volume Tier
              </div>
              <select
                value={filters.customerSegment || 'all'}
                onChange={(e) => onFilterChange({ ...filters, customerSegment: e.target.value })}
                className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0c4ca3]"
              >
                <option value="all">All Customers (ທຸກກຸ່ມລູກຄ້າ)</option>
                <option value="vip_15g">VIP Wholesaler (&gt;= 15g / 1 Baht)</option>
                <option value="medium_2_15g">Medium Investor (2.0g - 15.0g)</option>
                <option value="micro_2g">Retail &amp; Micro Saver (&lt; 2.0g)</option>
              </select>
            </div>

            {/* 6. Day of Week */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-[#0c4ca3]" />
                Day of Week
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => onFilterChange({ ...filters, dayOfWeek: 'all' })}
                  className={`px-2 py-1 text-[11px] font-bold rounded ${
                    filters.dayOfWeek === 'all' || !filters.dayOfWeek
                      ? 'bg-[#0c4ca3] text-white'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  All 7 Days
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, dayOfWeek: 'weekdays' })}
                  className={`px-2 py-1 text-[11px] font-bold rounded ${
                    filters.dayOfWeek === 'weekdays'
                      ? 'bg-[#0c4ca3] text-white'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Weekdays (Mon-Fri)
                </button>
                <button
                  onClick={() => onFilterChange({ ...filters, dayOfWeek: 'weekends' })}
                  className={`px-2 py-1 text-[11px] font-bold rounded ${
                    filters.dayOfWeek === 'weekends'
                      ? 'bg-[#0c4ca3] text-white'
                      : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                  }`}
                >
                  Weekends (Sat-Sun)
                </button>
              </div>
            </div>

            {/* 7. Status Filter */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0c4ca3]" />
                Transaction Status
              </div>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0c4ca3]"
              >
                <option value="all">All Status (ທັງໝົດ)</option>
                <option value="ສໍາເລັດ">ສໍາເລັດ (Completed Only)</option>
                <option value="ປະຕິເສດ">ປະຕິເສດ (Rejected Only)</option>
              </select>
            </div>

            {/* 8. Search Keyword */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#0c4ca3]" />
                Search Keyword
              </div>
              <input
                type="text"
                placeholder="Phone or Name..."
                value={filters.searchKeyword || ''}
                onChange={(e) => onFilterChange({ ...filters, searchKeyword: e.target.value })}
                className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0c4ca3]"
              />
            </div>
          </div>

          {/* Multi-Select Chips: Banks, Branches, and Transaction Types */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Banks Selector */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#0c4ca3]" />
                  Bank ({filters.selectedBanks.length === 0 ? 'All 10' : filters.selectedBanks.length})
                </span>
                {filters.selectedBanks.length > 0 && (
                  <button
                    onClick={() => onFilterChange({ ...filters, selectedBanks: [] })}
                    className="text-[10px] text-red-600 font-bold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {ALL_AVAILABLE_BANKS.map((b) => {
                  const isSelected = filters.selectedBanks.includes(b);
                  return (
                    <button
                      key={b}
                      onClick={() => toggleBank(b)}
                      className={`text-xs px-2 py-0.5 rounded-md font-bold transition-all ${
                        isSelected
                          ? 'bg-[#0c4ca3] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branches Selector */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0c4ca3]" />
                  Branch ({filters.selectedBranches.length === 0 ? 'All Branches' : filters.selectedBranches.length})
                </span>
                {filters.selectedBranches.length > 0 && (
                  <button
                    onClick={() => onFilterChange({ ...filters, selectedBranches: [] })}
                    className="text-[10px] text-red-600 font-bold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {ALL_AVAILABLE_BRANCHES.map((br) => {
                  const isSelected = filters.selectedBranches.includes(br);
                  return (
                    <button
                      key={br}
                      onClick={() => toggleBranch(br)}
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#e5a812] text-slate-900 font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {br}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transaction Types Selector */}
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0c4ca3]" />
                  Transaction Type ({filters.selectedTxTypes.length === 0 ? 'All Types' : filters.selectedTxTypes.length})
                </span>
                {filters.selectedTxTypes.length > 0 && (
                  <button
                    onClick={() => onFilterChange({ ...filters, selectedTxTypes: [] })}
                    className="text-[10px] text-red-600 font-bold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {ALL_AVAILABLE_TX_TYPES.map((t) => {
                  const isSelected = filters.selectedTxTypes.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTxType(t.id)}
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#15803d] text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
