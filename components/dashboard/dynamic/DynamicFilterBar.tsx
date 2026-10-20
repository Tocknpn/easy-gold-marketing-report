'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { DynamicFilterState } from '@/lib/types/dynamicReport.types';
import { 
  ALL_AVAILABLE_BANKS, 
  ALL_AVAILABLE_BRANCHES, 
  ALL_AVAILABLE_TX_TYPES,
  DEFAULT_FILTER_STATE 
} from '@/lib/constants/dynamicReportData';

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: `${String(i).padStart(2, '0')}:00 - ${String((i + 1) % 24).padStart(2, '0')}:00`,
  short: `${String(i).padStart(2, '0')}:00`,
}));

const ALL_DAYS_OF_WEEK = [
  { id: 'mon', name: 'Monday', lao: 'ວັນຈັນ', short: 'Mon', isWeekend: false },
  { id: 'tue', name: 'Tuesday', lao: 'ວັນອັງຄານ', short: 'Tue', isWeekend: false },
  { id: 'wed', name: 'Wednesday', lao: 'ວັນພຸດ', short: 'Wed', isWeekend: false },
  { id: 'thu', name: 'Thursday', lao: 'ວັນພະຫັດ', short: 'Thu', isWeekend: false },
  { id: 'fri', name: 'Friday', lao: 'ວັນສຸກ', short: 'Fri', isWeekend: false },
  { id: 'sat', name: 'Saturday', lao: 'ວັນເສົາ', short: 'Sat', isWeekend: true },
  { id: 'sun', name: 'Sunday', lao: 'ວັນອາທິດ', short: 'Sun', isWeekend: true },
];

interface DynamicFilterBarProps {
  filters: DynamicFilterState;
  onFilterChange: (newFilters: DynamicFilterState) => void;
  onReset: () => void;
  isLoading?: boolean;
  onExecuteQuery?: () => void;
  onExportCsv?: () => void;
  isExporting?: boolean;
  hasExecuted?: boolean;
}

export function DynamicFilterBar({
  filters,
  onFilterChange,
  onReset,
  isLoading,
  onExecuteQuery,
  onExportCsv,
  isExporting,
  hasExecuted,
}: DynamicFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'banks' | 'branches' | 'txTypes' | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'hours' | 'days' | null>(null);

  const hoursDropdownRef = useRef<HTMLDivElement>(null);
  const daysDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        openDropdown === 'hours' &&
        hoursDropdownRef.current &&
        !hoursDropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === 'days' &&
        daysDropdownRef.current &&
        !daysDropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Count active non-default filters
  const activeFilterCount = [
    filters.quickPreset !== 'this_month' && filters.quickPreset !== 'custom' ? 1 : 0,
    filters.selectedBanks.length > 0 ? 1 : 0,
    filters.selectedBranches.length > 0 ? 1 : 0,
    filters.selectedTxTypes.length > 0 ? 1 : 0,
    filters.minWeight !== null || filters.maxWeight !== null ? 1 : 0,
    filters.minAmount !== null || filters.maxAmount !== null ? 1 : 0,
    (filters.selectedHours && filters.selectedHours.length > 0 && filters.selectedHours.length < 24) ||
    filters.startHour !== null || filters.endHour !== null ? 1 : 0,
    filters.customerSegment && filters.customerSegment !== 'all' ? 1 : 0,
    (filters.selectedDaysOfWeek && filters.selectedDaysOfWeek.length > 0 && filters.selectedDaysOfWeek.length < 7) ||
    (filters.dayOfWeek && filters.dayOfWeek !== 'all') ? 1 : 0,
    filters.searchKeyword && filters.searchKeyword.trim() !== '' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const toggleHour = (hour: number) => {
    const current = filters.selectedHours || [];
    const exists = current.includes(hour);
    const updated = exists ? current.filter((h) => h !== hour) : [...current, hour].sort((a, b) => a - b);
    onFilterChange({
      ...filters,
      selectedHours: updated,
      startHour: updated.length > 0 ? Math.min(...updated) : null,
      endHour: updated.length > 0 ? Math.max(...updated) : null,
    });
  };

  const selectHourPreset = (preset: 'all' | 'morning' | 'afternoon' | 'evening' | 'clear') => {
    let newHours: number[] = [];
    if (preset === 'all') {
      newHours = Array.from({ length: 24 }, (_, i) => i);
    } else if (preset === 'morning') {
      newHours = [8, 9, 10, 11, 12];
    } else if (preset === 'afternoon') {
      newHours = [13, 14, 15, 16, 17];
    } else if (preset === 'evening') {
      newHours = [18, 19, 20, 21, 22, 23];
    } else if (preset === 'clear') {
      newHours = [];
    }
    onFilterChange({
      ...filters,
      selectedHours: newHours,
      startHour: newHours.length > 0 ? Math.min(...newHours) : null,
      endHour: newHours.length > 0 ? Math.max(...newHours) : null,
    });
  };

  const toggleDay = (dayId: string) => {
    const current = filters.selectedDaysOfWeek || [];
    const exists = current.includes(dayId);
    const updated = exists ? current.filter((d) => d !== dayId) : [...current, dayId];
    onFilterChange({
      ...filters,
      selectedDaysOfWeek: updated,
      dayOfWeek:
        updated.length === 5 && !updated.includes('sat') && !updated.includes('sun')
          ? 'weekdays'
          : updated.length === 2 && updated.includes('sat') && updated.includes('sun')
          ? 'weekends'
          : updated.length === 7 || updated.length === 0
          ? 'all'
          : 'custom',
    });
  };

  const selectDayPreset = (preset: 'all' | 'weekdays' | 'weekends' | 'clear') => {
    let newDays: string[] = [];
    if (preset === 'all') {
      newDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    } else if (preset === 'weekdays') {
      newDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    } else if (preset === 'weekends') {
      newDays = ['sat', 'sun'];
    } else if (preset === 'clear') {
      newDays = [];
    }
    onFilterChange({
      ...filters,
      selectedDaysOfWeek: newDays,
      dayOfWeek: preset === 'all' || preset === 'clear' ? 'all' : preset,
    });
  };

  const getHoursDisplayLabel = () => {
    const count = filters.selectedHours ? filters.selectedHours.length : 0;
    if (count === 0 || count === 24) return 'All 24 Hours (00-23)';
    if (count === 1) return `Hour: ${String(filters.selectedHours[0]).padStart(2, '0')}:00`;
    if (count <= 3) {
      return filters.selectedHours.map((h) => `${String(h).padStart(2, '0')}:00`).join(', ');
    }
    return `${count} Hours Selected`;
  };

  const getDaysDisplayLabel = () => {
    const sel = filters.selectedDaysOfWeek || [];
    if (sel.length === 0 || sel.length === 7) return 'All 7 Days (Mon - Sun)';
    if (sel.length === 5 && !sel.includes('sat') && !sel.includes('sun')) return 'Weekdays (Mon - Fri)';
    if (sel.length === 2 && sel.includes('sat') && sel.includes('sun')) return 'Weekends (Sat - Sun)';
    if (sel.length <= 3) {
      return sel.map((d) => ALL_DAYS_OF_WEEK.find((x) => x.id === d)?.short).join(', ');
    }
    return `${sel.length} Days Selected`;
  };

  // Quick preset handlers
  const handlePresetSelect = (preset: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    
    // Yesterday
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];

    // 7 days ago
    const d7 = new Date(today);
    d7.setDate(d7.getDate() - 6);
    const d7Str = d7.toISOString().split('T')[0];

    // 30 days ago
    const d30 = new Date(today);
    d30.setDate(d30.getDate() - 29);
    const d30Str = d30.toISOString().split('T')[0];

    let start = `${yyyy}-${mm}-01`;
    let end = todayStr;

    if (preset === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (preset === 'yesterday') {
      start = yestStr;
      end = yestStr;
    } else if (preset === 'last7d') {
      start = d7Str;
      end = todayStr;
    } else if (preset === 'last30d') {
      start = d30Str;
      end = todayStr;
    } else if (preset === 'this_month') {
      start = `${yyyy}-${mm}-01`;
      end = todayStr;
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

          {hasExecuted && onExportCsv && (
            <button
              onClick={onExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#e5a812] hover:bg-[#d4970b] text-slate-950 shadow-xs transition-all cursor-pointer font-sans"
              title="Export report data to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}

          {onExecuteQuery && (
            <button
              onClick={onExecuteQuery}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-sm hover:shadow-md ring-1 ring-emerald-400/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer font-sans"
              title="Execute live calculations on Supabase"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span className="font-sans font-black tracking-wide">{isLoading ? 'Calculating...' : 'Calculate'}</span>
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

            {/* 2. Custom Trading Hours Dropdown (Multiple Selection) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 relative" ref={hoursDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0c4ca3]" />
                  Trading Hours (0-23)
                </span>
                {filters.selectedHours && filters.selectedHours.length > 0 && filters.selectedHours.length < 24 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectHourPreset('clear');
                    }}
                    className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Dropdown Trigger Button */}
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'hours' ? null : 'hours')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  openDropdown === 'hours'
                    ? 'border-[#0c4ca3] ring-1 ring-[#0c4ca3] bg-blue-50/40 text-slate-900'
                    : filters.selectedHours && filters.selectedHours.length > 0 && filters.selectedHours.length < 24
                    ? 'border-blue-400 bg-blue-50/50 text-[#0c4ca3] font-bold'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{getHoursDisplayLabel()}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {filters.selectedHours && filters.selectedHours.length > 0 && filters.selectedHours.length < 24 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#0c4ca3] text-white">
                      {filters.selectedHours.length}
                    </span>
                  )}
                  {openDropdown === 'hours' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Dropdown Popover */}
              {openDropdown === 'hours' && (
                <div className="absolute top-[calc(100%+4px)] left-0 sm:left-auto sm:right-0 z-50 w-[290px] sm:w-[330px] bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0c4ca3]" />
                      Custom Trading Hours (00-23)
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Preset Shortcuts inside dropdown */}
                  <div className="flex items-center gap-1 flex-wrap mb-2.5 pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => selectHourPreset('all')}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        !filters.selectedHours || filters.selectedHours.length === 0 || filters.selectedHours.length === 24
                          ? 'bg-[#0c4ca3] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All 24h
                    </button>
                    <button
                      type="button"
                      onClick={() => selectHourPreset('morning')}
                      className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Morning (08-12)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectHourPreset('afternoon')}
                      className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Afternoon (13-17)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectHourPreset('evening')}
                      className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Evening (18-23)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectHourPreset('clear')}
                      className="text-[10px] px-2 py-0.5 rounded font-bold text-red-600 hover:bg-red-50 ml-auto cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {/* 24 Hours Multi-Select Grid */}
                  <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {ALL_HOURS.map((h) => {
                      const isSelected = (filters.selectedHours || []).includes(h.hour);
                      return (
                        <button
                          key={h.hour}
                          type="button"
                          onClick={() => toggleHour(h.hour)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0c4ca3] text-white border-[#0c4ca3] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                          title={h.label}
                        >
                          <span>{h.short}</span>
                          {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 font-medium">
                      {(filters.selectedHours || []).length === 0 || (filters.selectedHours || []).length === 24
                        ? 'All 24 hours enabled'
                        : `${filters.selectedHours.length} hours active`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="px-3 py-1 rounded-lg text-xs font-black bg-[#0c4ca3] text-white hover:bg-[#093d84] transition-colors cursor-pointer"
                    >
                      Done (ຕົກລົງ)
                    </button>
                  </div>
                </div>
              )}
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

            {/* 6. Custom Day of Week Dropdown (Multiple Selection) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 relative" ref={daysDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#0c4ca3]" />
                  Day of Week
                </span>
                {filters.selectedDaysOfWeek && filters.selectedDaysOfWeek.length > 0 && filters.selectedDaysOfWeek.length < 7 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectDayPreset('clear');
                    }}
                    className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Dropdown Trigger Button */}
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'days' ? null : 'days')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  openDropdown === 'days'
                    ? 'border-[#0c4ca3] ring-1 ring-[#0c4ca3] bg-blue-50/40 text-slate-900'
                    : filters.selectedDaysOfWeek && filters.selectedDaysOfWeek.length > 0 && filters.selectedDaysOfWeek.length < 7
                    ? 'border-blue-400 bg-blue-50/50 text-[#0c4ca3] font-bold'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{getDaysDisplayLabel()}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {filters.selectedDaysOfWeek && filters.selectedDaysOfWeek.length > 0 && filters.selectedDaysOfWeek.length < 7 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#0c4ca3] text-white">
                      {filters.selectedDaysOfWeek.length}
                    </span>
                  )}
                  {openDropdown === 'days' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Dropdown Popover */}
              {openDropdown === 'days' && (
                <div className="absolute top-[calc(100%+4px)] left-0 sm:left-auto sm:right-0 z-50 w-[290px] sm:w-[330px] bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-[#0c4ca3]" />
                      Custom Day of Week
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Preset Shortcuts inside dropdown */}
                  <div className="flex items-center gap-1 flex-wrap mb-2.5 pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => selectDayPreset('all')}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        !filters.selectedDaysOfWeek || filters.selectedDaysOfWeek.length === 0 || filters.selectedDaysOfWeek.length === 7
                          ? 'bg-[#0c4ca3] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => selectDayPreset('weekdays')}
                      className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Weekdays (Mon-Fri)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectDayPreset('weekends')}
                      className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Weekends (Sat-Sun)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectDayPreset('clear')}
                      className="text-[10px] px-2 py-0.5 rounded font-bold text-red-600 hover:bg-red-50 ml-auto cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Days Multi-Select List */}
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {ALL_DAYS_OF_WEEK.map((d) => {
                      const isSelected = (filters.selectedDaysOfWeek || []).includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDay(d.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-[#0c4ca3] text-[#0c4ca3] font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black ${
                                isSelected ? 'bg-[#0c4ca3] text-white' : 'border border-slate-300'
                              }`}
                            >
                              {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                            </span>
                            <span className="text-slate-800 font-bold">{d.name}</span>
                            <span className="text-slate-400 text-[11px] font-normal">({d.lao})</span>
                          </div>

                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                              d.isWeekend
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {d.isWeekend ? 'Weekend' : 'Weekday'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 font-medium">
                      {(filters.selectedDaysOfWeek || []).length === 0 || (filters.selectedDaysOfWeek || []).length === 7
                        ? 'All 7 days enabled'
                        : `${filters.selectedDaysOfWeek.length} days active`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="px-3 py-1 rounded-lg text-xs font-black bg-[#0c4ca3] text-white hover:bg-[#093d84] transition-colors cursor-pointer"
                    >
                      Done (ຕົກລົງ)
                    </button>
                  </div>
                </div>
              )}
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
