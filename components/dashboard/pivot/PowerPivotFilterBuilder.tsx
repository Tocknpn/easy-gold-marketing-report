'use client';

import React, { useState } from 'react';
import { Filter, Plus, Trash2, Sigma, ChevronDown, Clock, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import {
  PowerPivotFilter,
  PowerPivotMeta,
  MeasureDef,
  PivotConflict,
  FILTER_FIELDS,
  OPS_BY_KIND,
  MEASURE_FILTER_OPS,
  FilterOp,
  getFilterField,
  newFilterId,
} from '@/lib/types/powerPivot.types';

interface FilterBuilderProps {
  filters: PowerPivotFilter[];
  onChange: (filters: PowerPivotFilter[]) => void;
  meta: PowerPivotMeta | null;
  /** measures usable for measure-level (HAVING) filters. Omit to disable that feature. */
  measures?: MeasureDef[];
  conflicts?: PivotConflict[];
  compact?: boolean;
}

const inputCls =
  'px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden';

function MultiPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  if (!options.length) {
    return (
      <input
        className={`${inputCls} w-56`}
        placeholder="value1, value2, ..."
        value={value.join(', ')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
      />
    );
  }

  const shown = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputCls} w-56 flex items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">
          {value.length ? (value.length <= 2 ? value.join(', ') : `${value.length} selected`) : 'Pick values...'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2">
          <input
            autoFocus
            className={`${inputCls} w-full mb-1.5`}
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {shown.map((o) => (
              <label key={o} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-50 text-xs cursor-pointer">
                <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
                <span className="truncate">{o}</span>
              </label>
            ))}
            {!shown.length && <div className="text-[11px] text-slate-400 px-2 py-1">No match</div>}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
            <button type="button" className="text-[11px] font-bold text-slate-500" onClick={() => onChange([])}>
              Clear
            </button>
            <button type="button" className="text-[11px] font-black text-[#0c4ca3]" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Normalize 'YYYY-MM-DD HH:mm' or 'YYYY-MM-DD' to 'YYYY-MM-DDTHH:mm' for datetime-local input */
function toDatetimeLocalValue(raw?: string, fallbackTime = '00:00'): string {
  if (!raw) return '';
  const s = raw.trim().replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T${fallbackTime}`;
  return s.slice(0, 16);
}

/** Split 'YYYY-MM-DDTHH:mm' or 'YYYY-MM-DD HH:mm' into date and time parts */
function splitDateTime(raw?: string, defaultTime = '00:00'): { date: string; time: string } {
  if (!raw) return { date: '', time: defaultTime };
  const clean = raw.trim().replace('T', ' ');
  const [d, t] = clean.split(' ');
  return {
    date: d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '',
    time: t && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : defaultTime,
  };
}

export function PowerPivotFilterBuilder({
  filters,
  onChange,
  meta,
  measures,
  conflicts = [],
  compact,
}: FilterBuilderProps) {
  const update = (id: string, patch: Partial<PowerPivotFilter>) =>
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id: string) => onChange(filters.filter((f) => f.id !== id));

  const addRow = (partial?: Partial<PowerPivotFilter>) =>
    onChange([
      ...filters,
      { id: newFilterId(), scope: 'row', field: 'gold_weight', op: '>=', value: '', enabled: true, ...partial },
    ]);

  const addMeasure = () =>
    onChange([
      ...filters,
      {
        id: newFilterId(),
        scope: 'measure',
        field: measures?.[0]?.id || 'total_buy_transac',
        op: '>=',
        value: '',
        enabled: true,
      },
    ]);

  const minDate = meta?.min_date || '2026-01-01';
  const maxDate = meta?.max_date || '2026-10-28';

  // Dedicated Datetime From-To slicer binding (synced with 'datetime' between filter)
  const dtFilter = filters.find((f) => f.scope === 'row' && f.field === 'datetime');
  const fromParts = splitDateTime(dtFilter?.value, '00:00');
  const toParts = splitDateTime(dtFilter?.value2, '23:59');

  const upsertDatetimeRange = (nextFromDate: string, nextFromTime: string, nextToDate: string, nextToTime: string) => {
    const hasFrom = !!nextFromDate;
    const hasTo = !!nextToDate;
    if (!hasFrom && !hasTo) {
      if (dtFilter) remove(dtFilter.id);
      return;
    }
    const fDate = nextFromDate || nextToDate || minDate;
    const tDate = nextToDate || nextFromDate || maxDate;
    const val1 = `${fDate} ${nextFromTime || '00:00'}`;
    const val2 = `${tDate} ${nextToTime || '23:59'}`;

    if (dtFilter) {
      update(dtFilter.id, { op: 'between', value: val1, value2: val2, enabled: true });
    } else {
      onChange([
        ...filters,
        {
          id: newFilterId(),
          scope: 'row',
          field: 'datetime',
          op: 'between',
          value: val1,
          value2: val2,
          enabled: true,
        },
      ]);
    }
  };

  // Completed Status ('ສໍາເລັດ') quick toggle
  const statusFilter = filters.find(
    (f) => f.scope === 'row' && f.field === 'status' && f.op === '=' && f.value === 'ສໍາເລັດ'
  );
  const isCompletedOnly = !!statusFilter && statusFilter.enabled;

  const toggleCompletedStatus = () => {
    if (statusFilter) {
      update(statusFilter.id, { enabled: !statusFilter.enabled });
    } else {
      onChange([
        { id: newFilterId(), scope: 'row', field: 'status', op: '=', value: 'ສໍາເລັດ', enabled: true },
        ...filters,
      ]);
    }
  };

  const changeField = (f: PowerPivotFilter, field: string) => {
    const def = getFilterField(field);
    const op = (def ? OPS_BY_KIND[def.kind][0].id : '>=') as FilterOp;
    const defaultVal =
      field === 'datetime' ? `${minDate} 00:00` : field === 'date' ? minDate : '';
    const defaultVal2 =
      field === 'datetime' ? `${maxDate} 23:59` : field === 'date' ? maxDate : '';
    update(f.id, { field, op, value: defaultVal, value2: defaultVal2, values: [] });
  };

  const conflictMap = new Map<string, PivotConflict>();
  conflicts.forEach((c) => {
    c.filterIds.forEach((fid) => conflictMap.set(fid, c));
  });

  const rowQuick: { label: string; make: () => Partial<PowerPivotFilter> }[] = [
    { label: 'Amount >= 500K', make: () => ({ field: 'total_amount', op: '>=', value: '500000' }) },
    { label: 'Weight >= 2g', make: () => ({ field: 'gold_weight', op: '>=', value: '2' }) },
    { label: 'Weight 1g - 5g', make: () => ({ field: 'gold_weight', op: 'between', value: '1', value2: '5' }) },
    {
      label: 'Datetime From-To (HH:mm)',
      make: () => ({ field: 'datetime', op: 'between', value: `${minDate} 00:00`, value2: `${maxDate} 23:59` }),
    },
    {
      label: 'Hour 08:00 - 17:00',
      make: () => ({ field: 'hour', op: 'between', value: '8', value2: '17' }),
    },
    { label: 'Pick banks', make: () => ({ field: 'bank', op: 'in', values: [] }) },
    { label: 'Search phone', make: () => ({ field: 'phone', op: 'contains', value: '' }) },
  ];

  return (
    <div className="space-y-2.5">
      {/* DEDICATED DATETIME FROM-TO (HOUR & MINUTE) BAR + STATUS TOGGLE */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0c4ca3]">
              <Clock className="w-3.5 h-3.5" /> Datetime From – To (Hour:Min):
            </span>

            {/* FROM DATE + TIME */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
              <input
                type="date"
                value={fromParts.date}
                onChange={(e) => upsertDatetimeRange(e.target.value, fromParts.time, toParts.date, toParts.time)}
                className="text-xs font-mono text-slate-800 focus:outline-hidden bg-transparent"
              />
              <input
                type="time"
                value={fromParts.time}
                onChange={(e) =>
                  upsertDatetimeRange(fromParts.date || minDate, e.target.value, toParts.date || maxDate, toParts.time)
                }
                className="text-xs font-mono font-bold text-[#0c4ca3] focus:outline-hidden bg-blue-50/70 px-1.5 py-0.5 rounded"
              />
            </div>

            <span className="text-xs font-black text-slate-400">→</span>

            {/* TO DATE + TIME */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
              <input
                type="date"
                value={toParts.date}
                onChange={(e) => upsertDatetimeRange(fromParts.date, fromParts.time, e.target.value, toParts.time)}
                className="text-xs font-mono text-slate-800 focus:outline-hidden bg-transparent"
              />
              <input
                type="time"
                value={toParts.time}
                onChange={(e) =>
                  upsertDatetimeRange(fromParts.date || minDate, fromParts.time, toParts.date || maxDate, e.target.value)
                }
                className="text-xs font-mono font-bold text-[#0c4ca3] focus:outline-hidden bg-blue-50/70 px-1.5 py-0.5 rounded"
              />
            </div>

            {dtFilter && (
              <button
                type="button"
                onClick={() => remove(dtFilter.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                title="Clear Datetime From-To filter"
              >
                <X className="w-3 h-3" /> Clear Datetime
              </button>
            )}
          </div>

          {/* Completed Status ('ສໍາເລັດ') Quick Toggle */}
          <button
            type="button"
            onClick={toggleCompletedStatus}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
              isCompletedOnly
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
            title="Filter only completed transactions (ສໍາເລັດ) to match Dynamic BI"
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompletedOnly ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Status: ສໍາເລັດ (Completed) {isCompletedOnly ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}

      {filters.length === 0 && (
        <div className="text-[11px] text-slate-400 italic px-1">
          No filters - the report will use ALL transactions. Add a filter below (works like Power BI CALCULATETABLE / FILTER).
        </div>
      )}

      {filters.map((f) => {
        const isMeasure = f.scope === 'measure';
        const def = getFilterField(f.field);
        const kind = isMeasure ? 'num' : def?.kind || 'num';
        const ops = isMeasure ? MEASURE_FILTER_OPS : OPS_BY_KIND[kind];
        const between = f.op === 'between' || f.op === 'not_between';
        const multi = f.op === 'in' || f.op === 'not_in';
        const inputType =
          kind === 'datetime' ? 'datetime-local' : kind === 'date' ? 'date' : kind === 'num' ? 'number' : 'text';
        const options = def?.optionsKey && meta ? (meta[def.optionsKey] as string[]) : [];
        const conflict = conflictMap.get(f.id);

        return (
          <div
            key={f.id}
            className={`flex flex-wrap items-center gap-2 p-2 rounded-xl border transition-colors ${
              conflict
                ? 'bg-rose-50/90 border-rose-400 ring-1 ring-rose-300'
                : f.enabled
                ? isMeasure
                  ? 'bg-purple-50/60 border-purple-200'
                  : 'bg-blue-50/50 border-blue-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <input
              type="checkbox"
              checked={f.enabled}
              onChange={(e) => update(f.id, { enabled: e.target.checked })}
              title="Enable / disable this filter"
            />
            <span
              className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                isMeasure ? 'bg-purple-200 text-purple-900' : 'bg-blue-200 text-blue-900'
              }`}
              title={
                isMeasure
                  ? 'Filters the result rows by the aggregated measure value (HAVING)'
                  : 'Filters raw transactions before aggregation (CALCULATETABLE)'
              }
            >
              {isMeasure ? 'Measure' : 'Row'}
            </span>

            <select
              className={`${inputCls} max-w-[215px]`}
              value={f.field}
              onChange={(e) => (isMeasure ? update(f.id, { field: e.target.value }) : changeField(f, e.target.value))}
            >
              {isMeasure
                ? (measures || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))
                : FILTER_FIELDS.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
            </select>

            <select
              className={inputCls}
              value={f.op}
              onChange={(e) => update(f.id, { op: e.target.value as FilterOp })}
            >
              {ops.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>

            {multi ? (
              <MultiPicker options={options} value={f.values || []} onChange={(v) => update(f.id, { values: v })} />
            ) : (
              <>
                <input
                  type={inputType}
                  className={`${inputCls} ${
                    kind === 'datetime' ? 'w-48' : kind === 'date' ? 'w-36' : 'w-36'
                  } font-mono`}
                  placeholder={between ? 'From' : 'Value'}
                  value={kind === 'datetime' ? toDatetimeLocalValue(f.value, '00:00') : f.value ?? ''}
                  onChange={(e) =>
                    update(f.id, {
                      value: kind === 'datetime' ? e.target.value.replace('T', ' ') : e.target.value,
                    })
                  }
                />
                {between && (
                  <>
                    <span className="text-[11px] font-bold text-slate-500">and</span>
                    <input
                      type={inputType}
                      className={`${inputCls} ${
                        kind === 'datetime' ? 'w-48' : kind === 'date' ? 'w-36' : 'w-36'
                      } font-mono`}
                      placeholder="To"
                      value={kind === 'datetime' ? toDatetimeLocalValue(f.value2, '23:59') : f.value2 ?? ''}
                      onChange={(e) =>
                        update(f.id, {
                          value2: kind === 'datetime' ? e.target.value.replace('T', ' ') : e.target.value,
                        })
                      }
                    />
                  </>
                )}
              </>
            )}

            {conflict && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold"
                title={conflict.detail}
              >
                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                {conflict.title}
              </span>
            )}

            <button
              type="button"
              onClick={() => remove(f.id)}
              className="ml-auto p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
              title="Remove filter"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => addRow()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-[#0c4ca3] text-white hover:bg-[#093d84]"
        >
          <Plus className="w-3 h-3" /> <Filter className="w-3 h-3" /> Row filter
        </button>
        {measures && (
          <button
            type="button"
            onClick={addMeasure}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-purple-600 text-white hover:bg-purple-700"
          >
            <Plus className="w-3 h-3" /> <Sigma className="w-3 h-3" /> Measure filter
          </button>
        )}
        {!compact && (
          <>
            <span className="text-[10px] text-slate-400 font-bold ml-1">Quick add:</span>
            {rowQuick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => addRow(q.make())}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
