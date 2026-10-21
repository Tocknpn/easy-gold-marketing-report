'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  PivotRowDimension, 
  PivotMetricId, 
  PivotSlicerState, 
  SavedReportingProfile,
  PivotReportPayload
} from '@/lib/types/pivotReport.types';
import { UserProfile } from '@/lib/types/auth.types';
import { 
  loadReportingProfiles, 
  saveReportingProfile, 
  deleteReportingProfile,
  DEFAULT_PIVOT_SLICERS,
  INITIAL_PRESET_PROFILES 
} from '@/lib/storage/profileStorage';
import { computePivotReport } from '@/lib/pivot/pivotEngine';
import { PivotSlicerBar } from './PivotSlicerBar';
import { PivotDimensionPicker } from './PivotDimensionPicker';
import { PivotMetricSelector } from './PivotMetricSelector';
import { PivotTableGrid } from './PivotTableGrid';
import { ProfileManagerModal } from './ProfileManagerModal';
import { 
  Table2, 
  BookmarkCheck, 
  FileSpreadsheet, 
  Sparkles, 
  ChevronDown,
  Layers,
  Sliders,
  Share2,
  Loader2
} from 'lucide-react';

interface PivotReportViewProps {
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
}

export function PivotReportView({
  currentUser,
  onOpenAuthModal,
}: PivotReportViewProps) {
  const [savedProfiles, setSavedProfiles] = useState<SavedReportingProfile[]>(INITIAL_PRESET_PROFILES);
  const [activeProfile, setActiveProfile] = useState<SavedReportingProfile>(INITIAL_PRESET_PROFILES[0]);
  const [dimension, setDimension] = useState<PivotRowDimension>(INITIAL_PRESET_PROFILES[0].row_dimension);
  const [slicers, setSlicers] = useState<PivotSlicerState>(INITIAL_PRESET_PROFILES[0].slicers);
  const [activeMetrics, setActiveMetrics] = useState<PivotMetricId[]>(INITIAL_PRESET_PROFILES[0].selected_metrics);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load profiles from storage or Supabase on mount or user change
  useEffect(() => {
    async function load() {
      const loaded = await loadReportingProfiles(currentUser?.id);
      setSavedProfiles(loaded);
      const defaultProf = loaded.find((p) => p.is_default) || loaded[0];
      if (defaultProf) {
        setActiveProfile(defaultProf);
        setDimension(defaultProf.row_dimension);
        setSlicers(defaultProf.slicers);
        setActiveMetrics(defaultProf.selected_metrics);
      }
    }
    load();
  }, [currentUser?.id]);

  // State for on-demand calculation (Do not show numbers until user clicks GO!)
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [livePayload, setLivePayload] = useState<PivotReportPayload | null>(null);
  const [executionTimestamp, setExecutionTimestamp] = useState<string>('');

  // Fallback engine if backend is offline
  const fallbackPayload = useMemo(() => {
    return computePivotReport(dimension, slicers, activeMetrics);
  }, [dimension, slicers, activeMetrics]);

  // Execute query on demand when user clicks GO!
  const handleExecuteQuery = async () => {
    setIsExecuting(true);
    try {
      const params = new URLSearchParams({
        dimension,
        month: slicers.month || 'all',
        tx_type: slicers.tx_type || 'BUY_GOLD',
        is_500k_up: slicers.is_500k_up || 'all',
        is_2g_up: slicers.is_2g_up || 'all',
        is_3_75g_up: slicers.is_3_75g_up || 'all',
        is_15g_up: slicers.is_15g_up || 'all',
        status: slicers.status || 'all',
      });

      const headers: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        const localUrl = localStorage.getItem('supabase_project_url');
        const localKey = localStorage.getItem('supabase_anon_key');
        if (localUrl) headers['x-supabase-url'] = localUrl;
        if (localKey) headers['x-supabase-key'] = localKey;
      }

      const res = await fetch(`/api/dashboard/pivot-report?${params.toString()}`, { headers });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (json && json.rows && json.rows.length > 0) {
            setLivePayload(json);
          } else {
            setLivePayload(fallbackPayload);
          }
        } else {
          setLivePayload(fallbackPayload);
        }
      } else {
        setLivePayload(fallbackPayload);
      }
    } catch {
      setLivePayload(fallbackPayload);
    } finally {
      setIsExecuting(false);
      setHasExecuted(true);
      setExecutionTimestamp(new Date().toLocaleTimeString());
    }
  };

  const pivotPayload = livePayload || fallbackPayload;

  // Handle switching to a saved profile
  const handleSelectProfile = (profile: SavedReportingProfile) => {
    setActiveProfile(profile);
    setDimension(profile.row_dimension);
    setSlicers(profile.slicers);
    setActiveMetrics(profile.selected_metrics);
  };

  // Handle saving new profile
  const handleSaveProfile = async (name: string, description: string, isDefault: boolean) => {
    const newProfile: SavedReportingProfile = {
      id: `profile-${Date.now()}`,
      user_id: currentUser?.id,
      profile_name: name,
      description,
      row_dimension: dimension,
      selected_metrics: activeMetrics,
      slicers,
      is_default: isDefault,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = await saveReportingProfile(newProfile, currentUser?.id);
    const updatedList = await loadReportingProfiles(currentUser?.id);
    setSavedProfiles(updatedList);
    setActiveProfile(saved);
  };

  // Handle deleting profile
  const handleDeleteProfile = async (profileId: string) => {
    await deleteReportingProfile(profileId, currentUser?.id);
    const updatedList = await loadReportingProfiles(currentUser?.id);
    setSavedProfiles(updatedList);
    if (activeProfile.id === profileId && updatedList.length > 0) {
      handleSelectProfile(updatedList[0]);
    }
  };

  // Reset slicers
  const handleResetSlicers = () => {
    setSlicers(DEFAULT_PIVOT_SLICERS);
  };

  // Export table to CSV
  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const headers = [
        dimension === 'customer' ? 'Phone,Customer Name' : `Row Labels (${dimension})`,
        ...activeMetrics.map((m) => m),
      ].join(',');

      const rows = pivotPayload.rows.map((r) => {
        const dimStr = dimension === 'customer' ? `"${r.label}","${r.subLabel || ''}"` : `"${r.label}"`;
        const metricStrs = activeMetrics.map((m) => r.metrics[m] ?? 0);
        return [dimStr, ...metricStrs].join(',');
      });

      const totalsRow = [
        dimension === 'customer' ? '"Grand Total",""' : '"Grand Total"',
        ...activeMetrics.map((m) => pivotPayload.totals[m] ?? 0),
      ].join(',');

      const csvContent = [headers, ...rows, totalsRow].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `easy_gold_pivot_${dimension}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Profile Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] p-4 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-[#e5a812]" />
            <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
              Custom Reporting Profile (Pivot Studio)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#e5a812] text-slate-950">
              Interactive Pivot
            </span>
          </div>
          <p className="text-xs text-white/80 mt-1 font-medium">
            Configure your own reporting concepts using multi-level pivot rows, custom metrics, and Excel-style slicers.
          </p>
        </div>

        {/* Action Controls: Profile Switcher & Save Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Profile Dropdown Pill */}
          <div className="relative">
            <select
              value={activeProfile.id}
              onChange={(e) => {
                const found = savedProfiles.find((p) => p.id === e.target.value);
                if (found) handleSelectProfile(found);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs font-bold rounded-xl px-3 py-2 pr-8 focus:ring-2 focus:ring-[#e5a812] focus:outline-hidden appearance-none cursor-pointer"
            >
              {savedProfiles.map((p) => (
                <option key={p.id} value={p.id} className="text-slate-900 bg-white">
                  📌 {p.profile_name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-white/70 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Manage / Save Profile Modal Trigger */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#e5a812] hover:bg-[#d4970b] text-slate-950 shadow-sm transition-all"
          >
            <BookmarkCheck className="w-4 h-4 text-slate-950" />
            <span>Save Profile</span>
          </button>

          {/* Export to CSV/Excel */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* 2. Row Dimension Picker */}
      <PivotDimensionPicker
        selectedDimension={dimension}
        onChange={setDimension}
      />

      {/* 3. Excel Pivot Slicers with GO! Execute Button */}
      <PivotSlicerBar
        slicers={slicers}
        onChange={setSlicers}
        onReset={handleResetSlicers}
        onExecuteQuery={handleExecuteQuery}
        isCalculating={isExecuting}
      />

      {/* 4. Metric Value Selection */}
      <PivotMetricSelector
        activeMetricIds={activeMetrics}
        onChange={setActiveMetrics}
      />

      {/* 5. Pivot Table Grid or Empty "Ready to Calculate" State */}
      {!hasExecuted ? (
        <div className="bg-white rounded-3xl p-8 sm:p-14 border-2 border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-4 shadow-xs animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#0c4ca3] flex items-center justify-center border border-blue-200 shadow-inner">
            <Table2 className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="max-w-md space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 inline-block">
              Waiting for Query Execution
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              Ready to Calculate
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              To guarantee 100% calculation accuracy against Supabase, no numbers are displayed automatically. Configure your Row Dimension and Slicers above, then click <strong className="text-slate-800">Calculate</strong> to run.
            </p>
          </div>

          {/* Quick Filter Preview */}
          <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 text-xs text-slate-600 flex items-center gap-2 flex-wrap justify-center font-medium">
            <span>Dimension: <strong className="text-slate-800 uppercase">{dimension}</strong></span>
            <span>&bull;</span>
            <span>Tx Type: <strong className="text-slate-800">{slicers.tx_type}</strong></span>
            <span>&bull;</span>
            <span>Month: <strong className="text-slate-800">{slicers.month}</strong></span>
            <span>&bull;</span>
            <span>Status: <strong className="text-slate-800">{slicers.status}</strong></span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Live Execution Feedback Badge */}
          <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-2xl px-4 py-2.5 text-xs text-emerald-900 font-medium flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                <strong>Live Supabase Calculation:</strong> Dimension = <strong className="uppercase">{dimension}</strong> | Tx Type: <strong>{slicers.tx_type}</strong> | Month: <strong>{slicers.month}</strong> ({pivotPayload.totalRowCount} rows returned)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 text-[11px]">Computed at {executionTimestamp}</span>
              <button
                onClick={handleExecuteQuery}
                disabled={isExecuting}
                className="text-xs font-black text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isExecuting ? 'Recalculating...' : 'Re-run Query'}</span>
              </button>
            </div>
          </div>

          <PivotTableGrid payload={pivotPayload} />
        </div>
      )}

      {/* Profile Manager Modal */}
      <ProfileManagerModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        savedProfiles={savedProfiles}
        activeProfileId={activeProfile.id}
        currentDimension={dimension}
        currentMetrics={activeMetrics}
        currentSlicers={slicers}
        onSelectProfile={handleSelectProfile}
        onSaveNewProfile={handleSaveProfile}
        onDeleteProfile={handleDeleteProfile}
        onOpenAuthModal={onOpenAuthModal}
      />
    </div>
  );
}
