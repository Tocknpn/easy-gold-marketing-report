'use client';

import React, { useState } from 'react';
import { Filter, Plus, Trash2, Sigma, ChevronDown } from 'lucide-react';
import {
  PowerPivotFilter,
  PowerPivotMeta,
  MeasureDef,
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

export function PowerPivotFilterBuilder({ filters, onChange, meta, measures, compact }: FilterBuilderProps) {
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

  const maxDate = meta?.max_date || '';

  const changeField = (f: PowerPivotFilter, field: string) => {
    const def = getFilterField(field);
    const op = (def ? OPS_BY_KIND[def.kind][0].id : '>=') as FilterOp;
    update(f.id, { field, op, value: '', value2: '', values: [] });
  };

  const rowQuick: { label: string; make: () => Partial<PowerPivotFilter> }[] = [
    { label: 'Amount >= 500K', make: () => ({ field: 'total_amount', op: '>=', value: '500000' }) },
    { label: 'Weight >= 2g', make: () => ({ field: 'gold_weight', op: '>=', value: '2' }) },
    { label: 'Weight between 1g - 5g', make: () => ({ field: 'gold_weight', op: 'between', value: '1', value2: '5' }) },
    {
      label: 'Date range',
      make: () => ({ field: 'date', op: 'between', value: meta?.min_date || '', value2: maxDate }),
    },
    { label: 'Pick banks', make: () => ({ field: 'bank', op: 'in', values: [] }) },
  ];

  return (
    <div className="space-y-2">
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
        const inputType = kind === 'date' ? 'date' : kind === 'num' ? 'number' : 'text';
        const options = def?.optionsKey && meta ? (meta[def.optionsKey] as string[]) : [];

        return (
          <div
            key={f.id}
            className={`flex flex-wrap items-center gap-2 p-2 rounded-xl border ${
              f.enabled ? (isMeasure ? 'bg-purple-50/60 border-purple-200' : 'bg-blue-50/50 border-blue-200') : 'bg-slate-50 border-slate-200 opacity-60'
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
              className={`${inputCls} max-w-[200px]`}
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
                  className={`${inputCls} ${kind === 'date' ? 'w-36' : 'w-32'} font-mono`}
                  placeholder={between ? 'From' : 'Value'}
                  value={f.value ?? ''}
                  onChange={(e) => update(f.id, { value: e.target.value })}
                />
                {between && (
                  <>
                    <span className="text-[11px] font-bold text-slate-500">and</span>
                    <input
                      type={inputType}
                      className={`${inputCls} ${kind === 'date' ? 'w-36' : 'w-32'} font-mono`}
                      placeholder="To"
                      value={f.value2 ?? ''}
                      onChange={(e) => update(f.id, { value2: e.target.value })}
                    />
                  </>
                )}
              </>
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
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
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
