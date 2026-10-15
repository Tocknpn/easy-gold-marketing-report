'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  Layers,
  Filter,
  Sigma,
  Zap,
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
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserProfile } from '@/lib/types/auth.types';
import {
  PowerPivotConfig,
  PowerPivotProfile,
  PowerPivotResult,
  PowerPivotMeta,
  CustomMeasure,
  DIMENSIONS,
  DimensionGroup,
  MeasureGroup,
  createEmptyConfig,
  getAllMeasures,
  describeFilter,
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
              <>
                <button type="button" disabled={i === 0} onClick={() => onMove(id, -1)} className="disabled:opacity-20 hover:text-[#0c4ca3]">
                  <ChevronLeft className="w-3 h-3" />
                </button>
              </>
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
// Main studio
// ----------------------------------------------------------------------------
export function PowerPivotStudio({ currentUser }: Props) {
  const [profiles, setProfiles] = useState<PowerPivotProfile[]>([]);
  const [activeId, setActiveId] = useState<string>('preset-daily-buy');
  const [config, setConfig] = useState<PowerPivotConfig>(createEmptyConfig());

  const [result, setResult] = useState<PowerPivotResult | null>(null);
  const [ranConfig, setRanConfig] = useState<PowerPivotConfig | null>(null);
  const [loading, setLoading] = useState(false);
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

  const allMeasures = useMemo(() => getAllMeasures(config.customMeasures), [config.customMeasures]);
  const measureLabel = useCallback((id: string) => allMeasures.find((m) => m.id === id)?.label || id, [allMeasures]);
  const dimLabel = useCallback((id: string) => DIMENSIONS.find((d) => d.id === id)?.label || id, []);

  const activeProfile = profiles.find((p) => p.id === activeId);
  const isDirty = activeProfile ? JSON.stringify(activeProfile.config) !== JSON.stringify(config) : true;
  const isStale = !!ranConfig && JSON.stringify(ranConfig) !== JSON.stringify(config);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

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
    setResult(null); // Query-on-demand: nothing shown until GO!
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

  const toggleFavorite = async () => {
    if (!activeProfile || activeProfile.isPreset) return;
    await savePowerPivotProfile({ ...activeProfile, isFavorite: !activeProfile.isFavorite }, currentUser?.id);
    await reloadProfiles();
  };

  const removeProfile = async () => {
    if (!activeProfile || activeProfile.isPreset) return;
    if (!confirm(`Delete reporting profile "${activeProfile.name}"?`)) return;
    await deletePowerPivotProfile(activeProfile.id);
    const list = await loadPowerPivotProfiles(currentUser?.id);
    setProfiles(list);
    selectProfile(list[0]?.id || 'preset-daily-buy');
  };

  const newBlank = () => {
    setActiveId('__new__');
    setConfig({ ...createEmptyConfig(), filters: [], values: ['total_transaction'], rows: [], sortBy: 'total_transaction' });
    setResult(null);
    setRanConfig(null);
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
      return { ...c, values, sortBy: c.sortBy !== 'label' && !values.includes(c.sortBy) ? values[0] || 'label' : c.sortBy };
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

  const handleGo = () => execute(config, 1);

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

  const exportCsv = async (all: boolean) => {
    if (!result || !ranConfig) return;
    setExporting(true);
    try {
      const res = all ? await runPowerPivot(ranConfig, 1, true) : result;
      downloadCsv(
        `power_pivot_${(activeProfile?.name || 'report').replace(/[^a-z0-9]+/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
        resultToCsv(res, ranConfig)
      );
      if (all && res.total_rows > res.page_size) flash(`Exported first ${res.page_size.toLocaleString()} of ${res.total_rows.toLocaleString()} rows (cap 100,000).`);
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

  return (
    <div className="space-y-4">
      {/* HEADER + PROFILE BAR */}
      <div className="bg-gradient-to-r from-[#0c4ca3] via-[#093d84] to-[#062c60] rounded-2xl p-4 text-white shadow-md">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Table className="w-5 h-5 text-[#e5a812]" />
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">Power Pivot Studio</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#e5a812] text-slate-950">
                Design your own report
              </span>
            </div>
            <p className="text-xs text-white/80 mt-1">
              Choose Rows, Columns, Values &amp; Filters from live Supabase data - then GO! Save the design as a reporting profile for daily use.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={activeId}
              onChange={(e) => selectProfile(e.target.value)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#e5a812] focus:outline-hidden max-w-[280px]"
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
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>

            <button
              onClick={toggleFavorite}
              disabled={!activeProfile || activeProfile.isPreset}
              title="Pin as favorite (opens first next time)"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-30"
            >
              <Star className={`w-4 h-4 ${activeProfile?.isFavorite ? 'fill-[#e5a812] text-[#e5a812]' : 'text-white'}`} />
            </button>
            <button onClick={newBlank} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button onClick={() => openSave('saveas')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20">
              <Copy className="w-3.5 h-3.5" /> Save as
            </button>
            <button
              onClick={() => openSave('save')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#e5a812] hover:bg-[#d4970b] text-slate-950 ${isDirty ? 'ring-2 ring-white/70' : ''}`}
            >
              <Save className="w-4 h-4" /> Save Profile{isDirty ? ' *' : ''}
            </button>
            <button
              onClick={removeProfile}
              disabled={!activeProfile || activeProfile.isPreset}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/40 border border-white/20 disabled:opacity-30"
              title="Delete profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {activeProfile?.description && <p className="text-[11px] text-blue-100/70 mt-2">{activeProfile.description}</p>}
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
          <div className="max-h-[560px] overflow-y-auto p-2.5 space-y-3">
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

            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-[#0c4ca3]" /> Filters
                  <span className="text-[10px] font-semibold text-slate-400 normal-case">
                    Row filter = CALCULATETABLE on transactions - Measure filter = filter the result by aggregated value
                  </span>
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
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
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                <span><b className="text-slate-700">Rows:</b> {config.rows.map(dimLabel).join(' > ') || 'Grand total only'}</span>
                {config.columns[0] && <span><b className="text-slate-700">Columns:</b> {dimLabel(config.columns[0])}</span>}
                <span><b className="text-slate-700">Values:</b> {config.values.length}</span>
                <span><b className="text-slate-700">Filters:</b> {activeFilters.length}</span>
              </div>
              <button
                onClick={handleGo}
                disabled={loading || config.values.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 fill-current ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'CALCULATING...' : 'GO! CALCULATE (ສົ່ງຄຳນວນ)'}
              </button>
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
              <button onClick={handleGo} className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black">
                GO! refresh
              </button>
            </div>
          )}

          {result && ranConfig ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex flex-wrap gap-1.5">
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportCsv(false)}
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" /> CSV (this page)
                  </button>
                  <button
                    onClick={() => exportCsv(true)}
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0c4ca3]" /> {exporting ? 'Exporting...' : 'CSV (all, max 100k)'}
                  </button>
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
                <h3 className="text-base font-black text-slate-800">READY TO CALCULATE (ກຽມພ້ອມຄຳນວນ)</h3>
                <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
                  No numbers are shown until you click GO!. Supabase calculates exactly the design above over the raw transactions and returns the result
                  page by page.
                </p>
              </div>
            )
          )}
          {loading && !result && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm font-bold text-slate-500 animate-pulse">
              Supabase is calculating...
            </div>
          )}
        </div>
      </div>

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
                Saves rows, columns, values, filters, custom measures, sorting and page size. Stored in this browser and synced to Supabase table
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
