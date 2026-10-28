'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  Layers,
  Filter,
  Sigma,
  Save,
  Star,
  Plus,
  X,
  Trash2,
  Search,
  Download,
  GripVertical,
  RefreshCw,
  Copy,
  AlertCircle,
  AlertTriangle,
  Database,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Calendar,
  ChevronDown,
  Trophy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Wrench,
} from 'lucide-react';
import { UserProfile } from '@/lib/types/auth.types';
import {
  PowerPivotConfig,
  PowerPivotProfile,
  PowerPivotResult,
  PowerPivotMeta,
  CustomMeasure,
  PivotConflict,
  DIMENSIONS,
  DimensionGroup,
  MeasureGroup,
  TOP_N_METRICS,
  TOP_N_CHOICES,
  createEmptyConfig,
  getAllMeasures,
  describeFilter,
  newFilterId,
  validatePivotConfig,
  applyAllConflictFixes,
} from '@/lib/types/powerPivot.types';
import {
  loadPowerPivotProfiles,
  savePowerPivotProfile,
  deletePowerPivotProfile,
  getActiveProfileId,
  setActiveProfileId,
  makeProfileId,
} from '@/lib/storage/powerPivotProfileStorage';
import {
  runPowerPivot,
  fetchPowerPivotMeta,
  readCachedMeta,
  resultToCsv,
  downloadCsv,
  downloadExcel,
} from '@/lib/pivot/powerPivotApi';
import { PowerPivotGrid } from './PowerPivotGrid';
import { PowerPivotFilterBuilder } from './PowerPivotFilterBuilder';
import { MeasureManagerModal } from './MeasureManagerModal';

interface Props {
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
}

type DragPayload = { kind: 'dim' | 'measure'; id: string };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ----------------------------------------------------------------------------
// Drop zone
// ----------------------------------------------------------------------------
function Zone({
  title,
  hint,
  accent,
  accept,
  items,
  labelOf,
  onDropItem,
  onRemove,
  onMove,
}: {
  title: string;
  hint: string;
  accent: string;
  accept: 'dim' | 'measure';
  items: string[];
  labelOf: (id: string) => string;
  onDropItem: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          const p = JSON.parse(e.dataTransfer.getData('text/plain')) as DragPayload;
          if (p.kind === accept) onDropItem(p.id);
        } catch {
          /* ignore */
        }
      }}
      className={`rounded-2xl border-2 border-dashed p-3 min-h-[92px] transition-colors ${
        over ? 'border-[#e5a812] bg-amber-50' : 'border-slate-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-black uppercase tracking-wider ${accent}`}>{title}</span>
        <span className="text-[10px] text-slate-400">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-[11px] text-slate-400 italic">Drag fields here or click them in the field list</span>}
        {items.map((id, i) => (
          <span
            key={id}
            className="group flex items-center gap-1 pl-1 pr-1.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-800"
          >
            {items.length > 1 && (
              <button type="button" disabled={i === 0} onClick={() => onMove(id, -1)} className="disabled:opacity-20 hover:text-[#0c4ca3]">
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}
            <span className="px-0.5">{labelOf(id)}</span>
            {items.length > 1 && (
              <button type="button" disabled={i === items.length - 1} onClick={() => onMove(id, 1)} className="disabled:opacity-20 hover:text-[#0c4ca3]">
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <button type="button" onClick={() => onRemove(id)} className="ml-0.5 text-slate-400 hover:text-rose-600">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Month Multi-Select Picker (looks like Row Filter multi-select)
// ----------------------------------------------------------------------------
function MonthMultiPicker({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (months: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const allSelected = selected.length === 0 || selected.length === options.length;
  const filtered = options.filter((m) => m.toLowerCase().includes(search.toLowerCase()));

  const toggleMonth = (m: string) => {
    let next: string[];
    if (allSelected) {
      next = options.filter((x) => x !== m);
    } else if (selected.includes(m)) {
      next = selected.filter((x) => x !== m);
    } else {
      next = [...selected, m];
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const displayText = allSelected
    ? 'All Months (Full Data)'
    : selected.length === 1
    ? selected[0]
    : selected.length <= 2
    ? selected.join(', ')
    : `${selected.length} Months`;

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-white border border-blue-300 text-blue-900 rounded-lg px-2.5 py-1 text-xs font-bold hover:bg-blue-50/80 transition-colors shadow-2xs cursor-pointer"
        title="Filter by one or multiple months"
      >
        <Calendar className="w-3.5 h-3.5 text-[#0c4ca3]" />
        <span className="font-bold text-[11px] text-slate-700">Month:</span>
        <span className="font-extrabold text-[#0c4ca3] max-w-[170px] truncate">{displayText}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-64 bg-white border border-slate-300 rounded-xl shadow-xl p-2.5 text-slate-800">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
            <span className="text-[11px] font-black uppercase text-slate-600">Filter Months</span>
            <span className="text-[10px] text-slate-400 font-bold">{allSelected ? 'All' : `${selected.length} of ${options.length}`}</span>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            <input
              autoFocus
              className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0c4ca3] focus:outline-hidden"
              placeholder="Search month (e.g. 2026-10)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="rounded text-[#0c4ca3] focus:ring-[#0c4ca3]"
              />
              <span>All Months (Full Data)</span>
            </label>

            <div className="border-t border-slate-100 my-1" />

            {filtered.map((m) => {
              const isChecked = !allSelected && selected.includes(m);
              return (
                <label
                  key={m}
                  className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors ${
                    isChecked ? 'bg-blue-50 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMonth(m)}
                    className="rounded text-[#0c4ca3] focus:ring-[#0c4ca3]"
                  />
                  <span className="font-mono">{m}</span>
                </label>
              );
            })}
            {!filtered.length && <div className="text-[11px] text-slate-400 px-2 py-1 text-center">No month matched</div>}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              onClick={handleSelectAll}
            >
              Reset to All
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded-lg text-xs font-black bg-[#0c4ca3] text-white hover:bg-[#093d84] cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main studio
// ----------------------------------------------------------------------------
export function PowerPivotStudio({ currentUser }: Props) {
  const [profiles, setProfiles] = useState<PowerPivotProfile[]>([]);
  const [activeId, setActiveId] = useState<string>('preset-daily-buy');
  const [config, setConfig] = useState<PowerPivotConfig>(createEmptyConfig());

  const [result, setResult] = useState<PowerPivotResult | null>(null);
  const [ranConfig, setRanConfig] = useState<PowerPivotConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSec, setLoadingSec] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [meta, setMeta] = useState<PowerPivotMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const [fieldSearch, setFieldSearch] = useState('');
  const [measureModal, setMeasureModal] = useState(false);
  const [saveModal, setSaveModal] = useState<null | 'save' | 'saveas'>(null);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Conflict modal & Custom Top N state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [customTopNInput, setCustomTopNInput] = useState('');

  const allMeasures = useMemo(() => getAllMeasures(config.customMeasures), [config.customMeasures]);
  const measureLabel = useCallback((id: string) => allMeasures.find((m) => m.id === id)?.label || id, [allMeasures]);
  const dimLabel = useCallback((id: string) => DIMENSIONS.find((d) => d.id === id)?.label || id, []);

  const conflicts = useMemo(() => validatePivotConfig(config), [config]);

  const activeProfile = profiles.find((p) => p.id === activeId);
  const isDirty = activeProfile ? JSON.stringify(activeProfile.config) !== JSON.stringify(config) : true;
  const isStale = !!ranConfig && JSON.stringify(ranConfig) !== JSON.stringify(config);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Elapsed timer during loading
  useEffect(() => {
    if (!loading && !exporting) {
      setLoadingSec(0);
      return;
    }
    const t0 = Date.now();
    const iv = setInterval(() => {
      setLoadingSec(Math.floor((Date.now() - t0) / 100) / 10);
    }, 100);
    return () => clearInterval(iv);
  }, [loading, exporting]);

  // ---- bootstrap ----
  useEffect(() => {
    (async () => {
      const list = await loadPowerPivotProfiles(currentUser?.id);
      setProfiles(list);
      const remembered = getActiveProfileId();
      const pick = list.find((p) => p.id === remembered) || list.find((p) => p.isFavorite) || list[0];
      if (pick) {
        setActiveId(pick.id);
        setConfig(clone(pick.config));
      }
    })();
    const cached = readCachedMeta();
    if (cached) {
      setMeta(cached);
    } else {
      fetchPowerPivotMeta().then((m) => m && setMeta(m)).catch(() => undefined);
    }
  }, [currentUser?.id]);

  const refreshMeta = async () => {
    setMetaLoading(true);
    const m = await fetchPowerPivotMeta(true).catch(() => null);
    if (m) setMeta(m);
    setMetaLoading(false);
  };

  // ---- profile actions ----
  const reloadProfiles = async () => setProfiles(await loadPowerPivotProfiles(currentUser?.id));

  const selectProfile = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    setActiveId(id);
    setActiveProfileId(id);
    setConfig(clone(p.config));
    setResult(null);
    setRanConfig(null);
    setError(null);
  };

  const openSave = (mode: 'save' | 'saveas') => {
    const canOverwrite = mode === 'save' && activeProfile && !activeProfile.isPreset;
    setSaveName(canOverwrite ? activeProfile!.name : activeProfile ? `${activeProfile.name} (copy)` : 'My Pivot Report');
    setSaveDesc(activeProfile?.description || '');
    setSaveModal(canOverwrite ? 'save' : 'saveas');
  };

  const commitSave = async () => {
    if (!saveName.trim()) return;
    const overwrite = saveModal === 'save' && activeProfile && !activeProfile.isPreset;
    const now = new Date().toISOString();
    const profile: PowerPivotProfile = overwrite
      ? { ...activeProfile!, name: saveName.trim(), description: saveDesc.trim(), config: clone(config) }
      : {
          id: makeProfileId(),
          name: saveName.trim(),
          description: saveDesc.trim(),
          config: clone(config),
          isFavorite: false,
          useCount: 0,
          createdAt: now,
          updatedAt: now,
        };
    const saved = await savePowerPivotProfile(profile, currentUser?.id);
    await reloadProfiles();
    setActiveId(saved.id);
    setActiveProfileId(saved.id);
    setSaveModal(null);
    flash(`Saved reporting profile "${saved.name}"`);
  };

  const handleSaveProfile = () => {
    if (activeProfile && !activeProfile.isPreset && activeId !== '__new__') {
      const updated: PowerPivotProfile = {
        ...activeProfile,
        config: clone(config),
        updatedAt: new Date().toISOString(),
      };
      savePowerPivotProfile(updated, currentUser?.id).then(() => {
        reloadProfiles();
        flash(`Saved reporting profile "${updated.name}"`);
      });
    } else {
      openSave('save');
    }
  };

  const toggleFavorite = async () => {
    if (!activeProfile) return;
    const nextFav = !activeProfile.isFavorite;
    await savePowerPivotProfile({ ...activeProfile, isFavorite: nextFav }, currentUser?.id);
    await reloadProfiles();
    flash(nextFav ? `Pinned "${activeProfile.name}" as favorite ★` : `Unpinned "${activeProfile.name}"`);
  };

  const removeProfile = async () => {
    if (!activeProfile) return;
    if (!confirm(`Delete reporting profile "${activeProfile.name}"?`)) return;
    const name = activeProfile.name;
    await deletePowerPivotProfile(activeProfile.id);
    const list = await loadPowerPivotProfiles(currentUser?.id);
    setProfiles(list);
    selectProfile(list[0]?.id || 'preset-daily-buy');
    flash(`Profile "${name}" deleted`);
  };

  const newBlank = () => {
    setActiveId('__new__');
    setConfig({
      ...createEmptyConfig(),
      filters: [{ id: newFilterId(), scope: 'row', field: 'status', op: '=', value: 'ສໍາເລັດ', enabled: true }],
      values: ['total_transaction'],
      rows: [],
      sortBy: 'total_transaction',
      topN: null,
    });
    setResult(null);
    setRanConfig(null);
    flash('New blank report profile');
  };

  // ---- configuration mutations ----
  const patch = (p: Partial<PowerPivotConfig>) => setConfig((c) => ({ ...c, ...p }));

  const addRow = (id: string) =>
    setConfig((c) => {
      const columns = c.columns.filter((x) => x !== id);
      const rows = c.rows.includes(id) ? c.rows : [...c.rows, id].slice(0, 3);
      return { ...c, rows, columns };
    });
  const setColumn = (id: string) =>
    setConfig((c) => ({ ...c, columns: [id], rows: c.rows.filter((x) => x !== id) }));
  const toggleValue = (id: string) =>
    setConfig((c) => {
      const values = c.values.includes(id) ? c.values.filter((x) => x !== id) : [...c.values, id].slice(0, 12);
      const isDimSort = c.sortBy === 'label' || ['r1', 'r2', 'r3'].includes(c.sortBy) || c.rows.includes(c.sortBy);
      return {
        ...c,
        values,
        sortBy: !isDimSort && !values.includes(c.sortBy) ? values[0] || 'label' : c.sortBy,
      };
    });
  const move = (key: 'rows' | 'values', id: string, dir: -1 | 1) =>
    setConfig((c) => {
      const arr = [...c[key]];
      const i = arr.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return c;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...c, [key]: arr };
    });

  // ---- Top N Leaderboard & Quick Metric Actions ----
  const applyTopNMetricPreset = (metricId: string) => {
    const presetDef = TOP_N_METRICS.find((m) => m.id === metricId);
    setConfig((c) => {
      const nextRows = c.rows.length > 0 ? c.rows : ['phone_customer'];
      let nextValues = [...c.values];
      if (!nextValues.includes(metricId)) {
        nextValues = [metricId, ...nextValues].slice(0, 12);
      }
      if (presetDef) {
        presetDef.companionValues.forEach((cv) => {
          if (!nextValues.includes(cv) && nextValues.length < 12) {
            nextValues.push(cv);
          }
        });
      }
      // Remove any restrictive transaction_type row filter that would block this metric
      const mDef = allMeasures.find((m) => m.id === metricId);
      const cleanedFilters = c.filters.filter((f) => {
        if (f.scope !== 'row' || f.field !== 'transaction_type' || !f.enabled) return true;
        if (mDef?.txScope === 'SELL' && f.value === 'BUY_GOLD') return false;
        if (mDef?.txScope === 'WITHDRAW' && f.value === 'BUY_GOLD') return false;
        if (mDef?.txScope === 'BUY' && f.value && f.value !== 'BUY_GOLD') return false;
        return true;
      });
      return {
        ...c,
        rows: nextRows,
        values: nextValues,
        filters: cleanedFilters,
        sortBy: metricId,
        sortDir: 'desc',
        topN: c.topN || 20,
      };
    });
  };

  const applyQuickSortDimension = (dimId: string) => {
    setConfig((c) => {
      const nextRows = c.rows.includes(dimId) ? c.rows : [dimId, ...c.rows].slice(0, 3);
      const nextDir: 'asc' | 'desc' = c.sortBy === dimId && c.sortDir === 'desc' ? 'asc' : 'desc';
      return {
        ...c,
        rows: nextRows,
        sortBy: dimId,
        sortDir: nextDir,
      };
    });
  };

  // ---- execution ----
  const execute = useCallback(
    async (cfg: PowerPivotConfig, page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await runPowerPivot(cfg, page);
        setResult(res);
        setRanConfig(clone(cfg));
        if (activeProfile && !activeProfile.isPreset && page === 1) {
          savePowerPivotProfile(
            {
              ...activeProfile,
              lastUsedAt: new Date().toISOString(),
              useCount: (activeProfile.useCount || 0) + 1,
            },
            currentUser?.id
          ).catch(() => undefined);
        }
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [activeProfile, currentUser?.id]
  );

  const handleGo = () => {
    const foundConflicts = validatePivotConfig(config);
    if (foundConflicts.length > 0) {
      setConflictModalOpen(true);
      return;
    }
    execute(config, 1);
  };

  const handleAutoFixAndCalculate = () => {
    const fixed = applyAllConflictFixes(config, conflicts);
    setConfig(fixed);
    setConflictModalOpen(false);
    execute(fixed, 1);
    flash('Applied automatic filter fix and calculated!');
  };

  const handlePage = (page: number) => ranConfig && execute(ranConfig, page);
  const handlePageSize = (size: number) => {
    if (!ranConfig) return;
    const next = { ...ranConfig, pageSize: size };
    setConfig((c) => ({ ...c, pageSize: size }));
    execute(next, 1);
  };
  const handleSort = (by: string) => {
    if (!ranConfig) return;
    const dir: 'asc' | 'desc' = ranConfig.sortBy === by && ranConfig.sortDir === 'desc' ? 'asc' : 'desc';
    const next = { ...ranConfig, sortBy: by, sortDir: dir };
    setConfig((c) => ({ ...c, sortBy: by, sortDir: dir }));
    execute(next, 1);
  };

  // ---- Download Showing vs Download All Data (CSV & Excel) ----
  const handleExport = async (mode: 'showing' | 'all', format: 'csv' | 'excel') => {
    const targetConfig = ranConfig || config;
    setExporting(true);
    setError(null);
    try {
      let resToExport: PowerPivotResult;
      if (mode === 'showing' && result && ranConfig) {
        resToExport = result;
      } else if (mode === 'showing') {
        resToExport = await runPowerPivot(targetConfig, 1, false);
        setResult(resToExport);
        setRanConfig(clone(targetConfig));
      } else {
        // mode === 'all': fetch all rows on table (ignoring Top N if user wants full table, or up to 100k)
        const fullConfig = { ...targetConfig, topN: null };
        resToExport = await runPowerPivot(fullConfig, 1, true);
      }

      const baseName = `custom_pivot_${(activeProfile?.name || 'report').replace(/[^a-z0-9]+/gi, '_')}_${
        mode === 'showing' ? (targetConfig.topN ? `top_${targetConfig.topN}` : `page_${resToExport.page}`) : 'all_data'
      }_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'csv') {
        downloadCsv(`${baseName}.csv`, resultToCsv(resToExport, targetConfig));
      } else {
        downloadExcel(`${baseName}.xls`, resToExport, targetConfig);
      }

      flash(
        `Downloaded ${resToExport.rows.length.toLocaleString()} rows (${
          mode === 'showing' ? 'Showing Table Data' : 'All Table Data'
        }) as ${format.toUpperCase()}`
      );
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setExporting(false);
    }
  };

  const setCustomMeasures = (list: CustomMeasure[]) => patch({ customMeasures: list });

  // ---- field list ----
  const dimGroups = useMemo(() => {
    const m = new Map<DimensionGroup, typeof DIMENSIONS>();
    DIMENSIONS.filter((d) => d.label.toLowerCase().includes(fieldSearch.toLowerCase())).forEach((d) => {
      m.set(d.group, [...(m.get(d.group) || []), d]);
    });
    return Array.from(m.entries());
  }, [fieldSearch]);

  const measureGroups = useMemo(() => {
    const m = new Map<MeasureGroup, typeof allMeasures>();
    allMeasures.filter((d) => d.label.toLowerCase().includes(fieldSearch.toLowerCase())).forEach((d) => {
      m.set(d.group, [...(m.get(d.group) || []), d]);
    });
    return Array.from(m.entries());
  }, [allMeasures, fieldSearch]);

  const dragStart = (e: React.DragEvent, p: DragPayload) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(p));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const activeFilters = config.filters.filter((f) => f.enabled);

  // Month slicer helper with multi-select support
  const availableMonths = useMemo(() => {
    return meta?.months && meta.months.length
      ? meta.months
      : ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01'];
  }, [meta?.months]);

  const selectedMonths = useMemo(() => {
    const mf = config.filters.find((f) => f.field === 'month' && f.enabled);
    if (!mf) return [];
    if (mf.op === 'in') return mf.values || [];
    if (mf.value) return [mf.value];
    return [];
  }, [config.filters]);

  const handleMonthsChange = (months: string[]) => {
    if (months.length === 0 || months.length === availableMonths.length) {
      patch({ filters: config.filters.filter((f) => f.field !== 'month') });
    } else {
      const existing = config.filters.find((f) => f.field === 'month');
      if (existing) {
        patch({
          filters: config.filters.map((f) =>
            f.field === 'month'
              ? { ...f, op: 'in', values: months, value: months[0], enabled: true, scope: 'row' }
              : f
          ),
        });
      } else {
        patch({
          filters: [
            ...config.filters,
            { id: newFilterId(), scope: 'row', field: 'month', op: 'in', values: months, value: months[0], enabled: true },
          ],
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* PROFILE TOOLBAR */}
      <div className="bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] rounded-2xl p-2.5 sm:p-3 text-white shadow-md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-200">Active Profile:</span>
            <span className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-none">
              {activeProfile?.name || 'Custom Pivot'}
            </span>
            {isDirty && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Unsaved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <select
              value={activeId}
              onChange={(e) => selectProfile(e.target.value)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#e5a812] focus:outline-hidden max-w-[280px] cursor-pointer"
            >
              {activeId === '__new__' && <option value="__new__" className="text-slate-900">New unsaved report</option>}
              <optgroup label="My reporting profiles" className="text-slate-900">
                {profiles.filter((p) => !p.isPreset).map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900">
                    {p.isFavorite ? '★ ' : ''}
                    {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Templates" className="text-slate-900">
                {profiles.filter((p) => p.isPreset).map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900">
                    {p.isFavorite ? '★ ' : ''}
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>

            <button
              onClick={toggleFavorite}
              disabled={!activeProfile}
              title={activeProfile?.isFavorite ? 'Unpin favorite' : 'Pin as favorite'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Star className={`w-4 h-4 ${activeProfile?.isFavorite ? 'fill-[#e5a812] text-[#e5a812]' : 'text-white'}`} />
            </button>
            <button
              onClick={newBlank}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button
              onClick={() => openSave('saveas')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Save as
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'pivot');
                  if (activeProfile?.id) {
                    url.searchParams.set('profile', activeProfile.id);
                  }
                  navigator.clipboard.writeText(url.toString());
                  flash('Report profile link copied to clipboard!');
                }
              }}
              title="Share report layout link"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Share
            </button>
            <button
              onClick={handleSaveProfile}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#e5a812] hover:bg-[#d4970b] text-slate-950 transition-colors cursor-pointer ${isDirty ? 'ring-2 ring-white/70' : ''}`}
            >
              <Save className="w-4 h-4" /> Save Profile{isDirty ? ' *' : ''}
            </button>
            <button
              onClick={removeProfile}
              disabled={!activeProfile}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/40 border border-white/20 disabled:opacity-30 transition-colors cursor-pointer"
              title="Delete profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[19rem_1fr] gap-4 items-start">
        {/* FIELD LIST */}
        <aside className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden lg:sticky lg:top-2">
          <div className="px-3 py-2.5 bg-[#f0f4f9] border-b border-slate-300 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#0c4ca3]" /> Pivot fields
            </span>
            <button onClick={() => setMeasureModal(true)} className="flex items-center gap-1 text-[11px] font-black text-[#0c4ca3] hover:underline">
              <Sigma className="w-3.5 h-3.5" /> Manage Measures
            </button>
          </div>
          <div className="p-2.5 border-b border-slate-200 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-5 top-5" />
            <input
              value={fieldSearch}
              onChange={(e) => setFieldSearch(e.target.value)}
              placeholder="Search fields & measures..."
              className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
            />
          </div>
          <div className="max-h-[580px] overflow-y-auto p-2.5 space-y-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Dimensions (rows / columns)</div>
              {dimGroups.map(([group, list]) => (
                <div key={group} className="mb-2">
                  <div className="text-[10px] font-bold text-slate-500 mb-1">{group}</div>
                  <div className="space-y-1">
                    {list.map((d) => {
                      const inRows = config.rows.includes(d.id);
                      const inCols = config.columns.includes(d.id);
                      return (
                        <div
                          key={d.id}
                          draggable
                          onDragStart={(e) => dragStart(e, { kind: 'dim', id: d.id })}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] cursor-grab active:cursor-grabbing ${
                            inRows ? 'bg-blue-50 border-blue-300' : inCols ? 'bg-purple-50 border-purple-300' : 'bg-white border-slate-200 hover:border-slate-400'
                          }`}
                          title={d.hint}
                        >
                          <GripVertical className="w-3 h-3 text-slate-300" />
                          <span className="font-bold text-slate-800 flex-1 truncate">{d.label}</span>
                          <button
                            onClick={() => (inRows ? patch({ rows: config.rows.filter((x) => x !== d.id) }) : addRow(d.id))}
                            className={`px-1.5 rounded-md font-black text-[9px] ${inRows ? 'bg-[#0c4ca3] text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-100'}`}
                          >
                            ROW
                          </button>
                          <button
                            onClick={() => (inCols ? patch({ columns: [] }) : setColumn(d.id))}
                            className={`px-1.5 rounded-md font-black text-[9px] ${inCols ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100'}`}
                          >
                            COL
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Measures (values)</div>
              {measureGroups.map(([group, list]) => (
                <div key={group} className="mb-2">
                  <div className="text-[10px] font-bold text-slate-500 mb-1">{group}</div>
                  <div className="space-y-1">
                    {list.map((m) => {
                      const on = config.values.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          draggable
                          onDragStart={(e) => dragStart(e, { kind: 'measure', id: m.id })}
                          onClick={() => toggleValue(m.id)}
                          title={m.dax}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer ${
                            on ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <Sigma className={`w-3 h-3 ${on ? 'text-emerald-600' : 'text-slate-300'}`} />
                          <span className="font-bold text-slate-800 flex-1 truncate">{m.label}</span>
                          {on && <span className="text-[9px] font-black text-emerald-700">ON</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* DESIGN SURFACE + RESULTS */}
        <div className="space-y-4 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xs p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Zone
                title="Rows"
                hint="up to 3 levels"
                accent="text-[#0c4ca3]"
                accept="dim"
                items={config.rows}
                labelOf={dimLabel}
                onDropItem={addRow}
                onRemove={(id) => patch({ rows: config.rows.filter((x) => x !== id) })}
                onMove={(id, d) => move('rows', id, d)}
              />
              <Zone
                title="Columns"
                hint="1 field = cross-tab"
                accent="text-purple-700"
                accept="dim"
                items={config.columns}
                labelOf={dimLabel}
                onDropItem={setColumn}
                onRemove={() => patch({ columns: [] })}
                onMove={() => undefined}
              />
              <Zone
                title="Values"
                hint="max 12 measures"
                accent="text-emerald-700"
                accept="measure"
                items={config.values}
                labelOf={measureLabel}
                onDropItem={(id) => !config.values.includes(id) && toggleValue(id)}
                onRemove={toggleValue}
                onMove={(id, d) => move('values', id, d)}
              />
            </div>

            {/* TOP N LEADERBOARD & SORTING CONTROLS */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50/80 via-blue-50/40 to-slate-50 border border-amber-200/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-900">
                    <Trophy className="w-4 h-4 text-[#e5a812]" /> Top N Leaderboard:
                  </span>
                  <button
                    type="button"
                    onClick={() => patch({ topN: null })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-colors cursor-pointer ${
                      !config.topN
                        ? 'bg-[#0c4ca3] text-white border-[#0c4ca3]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    All Rows
                  </button>
                  {TOP_N_CHOICES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => patch({ topN: n })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-colors cursor-pointer ${
                        config.topN === n
                          ? 'bg-[#e5a812] text-slate-950 border-amber-500 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                      }`}
                    >
                      Top {n}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      placeholder="Custom N"
                      value={customTopNInput}
                      onChange={(e) => setCustomTopNInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && Number(customTopNInput) > 0) {
                          patch({ topN: Number(customTopNInput) });
                        }
                      }}
                      className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => Number(customTopNInput) > 0 && patch({ topN: Number(customTopNInput) })}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer"
                    >
                      Set N
                    </button>
                  </div>
                </div>

                {/* Explicit Sort By Selector (Date, Datetime, Hour, Phone, or any Measure) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-slate-600">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#0c4ca3]" /> Sort By:
                  </span>
                  <select
                    value={config.sortBy}
                    onChange={(e) => patch({ sortBy: e.target.value })}
                    className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <optgroup label="Row Dimensions">
                      <option value="label">First Row Dimension (Default)</option>
                      {config.rows.map((rId, idx) => (
                        <option key={rId} value={rId}>
                          Row {idx + 1}: {dimLabel(rId)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Selected Measures">
                      {config.values.map((vId) => (
                        <option key={vId} value={vId}>
                          Measure: {measureLabel(vId)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <button
                    type="button"
                    onClick={() => patch({ sortDir: config.sortDir === 'desc' ? 'asc' : 'desc' })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer"
                    title="Toggle Ascending / Descending sort order"
                  >
                    {config.sortDir === 'desc' ? (
                      <>
                        <ArrowDown className="w-3.5 h-3.5 text-[#0c4ca3]" /> DESC (High → Low)
                      </>
                    ) : (
                      <>
                        <ArrowUp className="w-3.5 h-3.5 text-[#0c4ca3]" /> ASC (Low → High)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 7 Requested Top N Ranking Metric Pills + Quick Dimension Sort Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-200/60">
                <span className="text-[10px] font-black uppercase text-amber-900 mr-1">Rank Top N By:</span>
                {TOP_N_METRICS.map((tm) => {
                  const isCurrentSort = config.sortBy === tm.id && config.values.includes(tm.id);
                  return (
                    <button
                      key={tm.id}
                      type="button"
                      onClick={() => applyTopNMetricPreset(tm.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        isCurrentSort
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300'
                      }`}
                      title={`Add ${tm.label} & sort descending`}
                    >
                      {tm.shortLabel}
                    </button>
                  );
                })}

                <span className="text-[10px] font-black uppercase text-slate-500 ml-2 mr-1">Quick Sort Dim:</span>
                {[
                  { id: 'datetime', label: 'Date & Time' },
                  { id: 'date', label: 'Date' },
                  { id: 'hour', label: 'Hour' },
                  { id: 'phone', label: 'Phone' },
                  { id: 'phone_customer', label: 'Phone & Customer' },
                ].map((qd) => (
                  <button
                    key={qd.id}
                    type="button"
                    onClick={() => applyQuickSortDimension(qd.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      config.sortBy === qd.id
                        ? 'bg-[#0c4ca3] text-white border-[#0c4ca3]'
                        : 'bg-white hover:bg-blue-50 text-slate-600 border-slate-300'
                    }`}
                    title={`Add ${qd.label} to Rows and sort by it`}
                  >
                    Sort {qd.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FILTERS SECTION */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-[#0c4ca3]" /> Filters
                  <span className="text-[10px] font-semibold text-slate-400 normal-case">
                    Row filter = CALCULATETABLE on transactions - Measure filter = filter the result by aggregated value
                  </span>
                  {conflicts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setConflictModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black animate-pulse cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      {conflicts.length} Filter Conflict{conflicts.length > 1 ? 's' : ''} (Click to Review / Fix)
                    </button>
                  )}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <MonthMultiPicker
                    options={availableMonths}
                    selected={selectedMonths}
                    onChange={handleMonthsChange}
                  />
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  {meta ? (
                    <span className="font-mono">
                      {meta.min_date} → {meta.max_date} · {Number(meta.total_rows).toLocaleString()} rows
                    </span>
                  ) : (
                    <span>data range unknown</span>
                  )}
                  <button onClick={refreshMeta} disabled={metaLoading} className="p-1 rounded-md hover:bg-slate-100" title="Refresh data range & pick-lists">
                    <RefreshCw className={`w-3 h-3 ${metaLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <PowerPivotFilterBuilder
                filters={config.filters}
                onChange={(filters) => patch({ filters })}
                meta={meta}
                measures={allMeasures}
                conflicts={conflicts}
              />
            </div>

            {/* ACTION & DOWNLOAD BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                <span><b className="text-slate-700">Rows:</b> {config.rows.map(dimLabel).join(' > ') || 'Grand total only'}</span>
                {config.columns[0] && <span><b className="text-slate-700">Columns:</b> {dimLabel(config.columns[0])}</span>}
                <span><b className="text-slate-700">Values:</b> {config.values.length}</span>
                <span><b className="text-slate-700">Filters:</b> {activeFilters.length}</span>
                {config.topN && <span className="text-amber-700 font-black">Top N: Top {config.topN}</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Always-visible Download Buttons for Showing vs All Data */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleExport('showing', 'csv')}
                    disabled={exporting || loading || config.values.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-emerald-50 text-slate-800 border border-slate-300 disabled:opacity-40 cursor-pointer"
                    title="Download the data currently showing (current page / Top N) as CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    CSV (Showing)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('showing', 'excel')}
                    disabled={exporting || loading || config.values.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-emerald-50 text-slate-800 border border-slate-300 disabled:opacity-40 cursor-pointer"
                    title="Download the data currently showing (current page / Top N) as Excel (.xls)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    Excel (Showing)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('all', 'csv')}
                    disabled={exporting || loading || config.values.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-blue-50 text-[#0c4ca3] border border-blue-300 disabled:opacity-40 cursor-pointer"
                    title="Download ALL matching rows on table (up to 100,000 rows) as CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0c4ca3]" />
                    CSV (All Table)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('all', 'excel')}
                    disabled={exporting || loading || config.values.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-blue-50 text-[#0c4ca3] border border-blue-300 disabled:opacity-40 cursor-pointer"
                    title="Download ALL matching rows on table (up to 100,000 rows) as Excel (.xls)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#0c4ca3]" />
                    Excel (All Table)
                  </button>
                </div>

                <button
                  onClick={handleGo}
                  disabled={loading || config.values.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md hover:shadow-lg ring-1 ring-emerald-400/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  title="Execute pivot calculation on Supabase"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                  <span className="font-sans font-black tracking-wide">
                    {loading ? `Calculating (${loadingSec.toFixed(1)}s)...` : 'Calculate'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* feedback */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-mono break-all">{error}</span>
            </div>
          )}
          {isStale && result && !loading && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">The design changed since the last calculation - the table below is out of date.</span>
              <button onClick={handleGo} className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black cursor-pointer">
                GO! refresh
              </button>
            </div>
          )}

          {/* LOADING SPINNER BANNER */}
          {(loading || exporting) && (
            <div className="flex items-center justify-center gap-3 p-6 rounded-2xl bg-blue-950 text-white shadow-lg border border-blue-800">
              <Loader2 className="w-6 h-6 animate-spin text-[#e5a812]" />
              <div>
                <div className="text-sm font-black tracking-wide">
                  {exporting
                    ? `Preparing Full Data Export (${loadingSec.toFixed(1)}s)...`
                    : `Validating & Calculating Live Pivot on Supabase (${loadingSec.toFixed(1)}s)...`}
                </div>
                <div className="text-xs text-blue-200">
                  Scanning & aggregating raw transactions with 100% accuracy. Please wait...
                </div>
              </div>
            </div>
          )}

          {result && ranConfig ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {ranConfig.topN && (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900">
                      Top {ranConfig.topN} Ranked by {measureLabel(ranConfig.sortBy)} ({ranConfig.sortDir.toUpperCase()})
                    </span>
                  )}
                  {ranConfig.filters.filter((f) => f.enabled).map((f) => (
                    <span
                      key={f.id}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        f.scope === 'measure' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}
                    >
                      {f.scope === 'measure' ? `${measureLabel(f.field)} ${f.op} ${f.value ?? ''}${f.value2 ? ` and ${f.value2}` : ''}` : describeFilter(f)}
                    </span>
                  ))}
                </div>
              </div>
              <PowerPivotGrid
                result={result}
                config={ranConfig}
                loading={loading}
                onPage={handlePage}
                onPageSize={handlePageSize}
                onSort={handleSort}
              />
            </>
          ) : (
            !loading &&
            !error && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                  <Table className="w-6 h-6 text-[#0c4ca3]" />
                </div>
                <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 mb-2">
                  Waiting for query execution
                </span>
                <h3 className="text-base font-black text-slate-800">READY TO CALCULATE</h3>
                <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
                  No numbers are shown until you click Calculate. Supabase calculates exactly the design above over the raw transactions and returns the result
                  page by page.
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* CONFLICT WARNING & AUTO-FIX POP-UP MODAL */}
      {conflictModalOpen && conflicts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-rose-200">
            <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Filter / Metric Conflict Detected ({conflicts.length})
                </h3>
              </div>
              <button onClick={() => setConflictModalOpen(false)} className="p-1 rounded-full bg-white/10 hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              <p className="text-xs text-slate-600 font-medium">
                Some of your active filters contradict each other or block your selected metrics from returning valid data:
              </p>

              <div className="space-y-2.5">
                {conflicts.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-2xl border ${
                      c.severity === 'error'
                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : 'bg-amber-50/70 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-black">{c.title}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          c.severity === 'error' ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {c.severity}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-slate-700 leading-relaxed">{c.detail}</p>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = c.applyFix(config);
                          setConfig(updated);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-white border border-slate-300 hover:bg-emerald-50 text-emerald-800 shadow-2xs cursor-pointer"
                      >
                        <Wrench className="w-3 h-3 text-emerald-600" /> {c.autoFixLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Edit Filters Manually
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConflictModalOpen(false);
                    execute(config, 1);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 cursor-pointer"
                >
                  Calculate Anyway
                </button>
                <button
                  type="button"
                  onClick={handleAutoFixAndCalculate}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" /> Auto-Fix All & Calculate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVE MODAL */}
      {saveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#0c4ca3] to-[#062c60] text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-black">{saveModal === 'save' ? 'Update reporting profile' : 'Save as new reporting profile'}</h3>
              <button onClick={() => setSaveModal(null)} className="p-1 rounded-full bg-white/10 hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Profile name *</label>
                <input
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder="e.g. Daily morning check - BCEL buys >= 500K"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Saves rows, columns, values, filters, custom measures, Top N, sorting and page size. Stored in this browser and synced to Supabase table
                <span className="font-mono"> power_pivot_profiles</span> when connected.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setSaveModal(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button
                  onClick={commitSave}
                  disabled={!saveName.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#0c4ca3] hover:bg-[#093d84] text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MeasureManagerModal
        isOpen={measureModal}
        onClose={() => setMeasureModal(false)}
        customMeasures={config.customMeasures}
        selectedValues={config.values}
        meta={meta}
        onChangeCustom={setCustomMeasures}
        onToggleValue={toggleValue}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl">{toast}</div>
      )}
    </div>
  );
}
