'use client';

import React, { useMemo, useState } from 'react';
import { X, Plus, Pencil, Trash2, Search, Sigma, Check } from 'lucide-react';
import {
  CustomMeasure,
  CustomAgg,
  CustomField,
  MeasureFormat,
  PowerPivotFilter,
  PowerPivotMeta,
  getAllMeasures,
} from '@/lib/types/powerPivot.types';
import { PowerPivotFilterBuilder } from './PowerPivotFilterBuilder';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customMeasures: CustomMeasure[];
  selectedValues: string[];
  meta: PowerPivotMeta | null;
  onChangeCustom: (list: CustomMeasure[]) => void;
  onToggleValue: (id: string) => void;
}

const inputCls =
  'w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden';

const AGGS: { id: CustomAgg; label: string }[] = [
  { id: 'sum', label: 'SUM' },
  { id: 'count', label: 'COUNT' },
  { id: 'distinct_count', label: 'DISTINCTCOUNT' },
  { id: 'avg', label: 'AVERAGE' },
  { id: 'min', label: 'MIN' },
  { id: 'max', label: 'MAX' },
];
const FIELDS: { id: CustomField; label: string }[] = [
  { id: 'rows', label: 'Rows (transactions)' },
  { id: 'gold_weight', label: 'Gold Weight (g)' },
  { id: 'total_amount', label: 'Purchase Amount (LAK)' },
  { id: 'phone', label: 'Phone (customer)' },
];
const FORMATS: { id: MeasureFormat; label: string }[] = [
  { id: 'int', label: '1,234' },
  { id: 'dec1', label: '1,234.5' },
  { id: 'dec2', label: '1,234.56' },
  { id: 'pct', label: '12.3%' },
];

function blankMeasure(): CustomMeasure {
  return {
    id: `cm_${Date.now().toString(36)}`,
    label: 'My Measure',
    type: 'calc',
    format: 'dec2',
    agg: 'sum',
    field: 'gold_weight',
    divisor: 1,
    filters: [],
    num: 'total_buy_transac',
    den: 'total_transaction',
    multiplier: 100,
  };
}

export function MeasureManagerModal({
  isOpen,
  onClose,
  customMeasures,
  selectedValues,
  meta,
  onChangeCustom,
  onToggleValue,
}: Props) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<CustomMeasure | null>(null);

  const all = useMemo(() => getAllMeasures(customMeasures), [customMeasures]);
  const shown = all.filter(
    (m) =>
      m.label.toLowerCase().includes(q.toLowerCase()) ||
      m.dax.toLowerCase().includes(q.toLowerCase()) ||
      m.group.toLowerCase().includes(q.toLowerCase())
  );

  if (!isOpen) return null;

  const saveEditing = () => {
    if (!editing || !editing.label.trim()) return;
    const exists = customMeasures.some((c) => c.id === editing.id);
    onChangeCustom(exists ? customMeasures.map((c) => (c.id === editing.id ? editing : c)) : [...customMeasures, editing]);
    if (!exists) onToggleValue(editing.id);
    setEditing(null);
  };

  const setFilters = (filters: PowerPivotFilter[]) => editing && setEditing({ ...editing, filters });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-[#0c4ca3] to-[#062c60] text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sigma className="w-5 h-5 text-[#e5a812]" />
              <h3 className="text-lg font-bold">Manage Measures</h3>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Same measures as your Excel Power Pivot (DAX shown for reference) + create your own CALCULATE / DIVIDE measures.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        {editing ? (
          <div className="p-6 overflow-y-auto space-y-4">
            <h4 className="text-sm font-black text-slate-800">
              {customMeasures.some((c) => c.id === editing.id) ? 'Edit' : 'New'} custom measure
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Measure name</label>
                <input className={inputCls} value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Number format</label>
                <select className={inputCls} value={editing.format} onChange={(e) => setEditing({ ...editing, format: e.target.value as MeasureFormat })}>
                  {FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              {(['calc', 'ratio'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditing({ ...editing, type: t })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                    editing.type === t ? 'bg-[#0c4ca3] text-white border-[#0c4ca3]' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  {t === 'calc' ? 'CALCULATE (aggregate + filter)' : 'DIVIDE (ratio of two measures)'}
                </button>
              ))}
            </div>

            {editing.type === 'calc' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Aggregation</label>
                    <select className={inputCls} value={editing.agg} onChange={(e) => setEditing({ ...editing, agg: e.target.value as CustomAgg })}>
                      {AGGS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Of field</label>
                    <select className={inputCls} value={editing.field} onChange={(e) => setEditing({ ...editing, field: e.target.value as CustomField })}>
                      {FIELDS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Divide result by (e.g. 1000000)</label>
                    <input type="number" className={`${inputCls} font-mono`} value={editing.divisor ?? 1} onChange={(e) => setEditing({ ...editing, divisor: Number(e.target.value) || 1 })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    CALCULATE filters (e.g. transaction_type = BUY_GOLD, gold_weight between 2 and 5)
                  </label>
                  <PowerPivotFilterBuilder filters={editing.filters || []} onChange={setFilters} meta={meta} compact />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Numerator</label>
                  <select className={inputCls} value={editing.num} onChange={(e) => setEditing({ ...editing, num: e.target.value })}>
                    {all.filter((m) => m.id !== editing.id).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Denominator</label>
                  <select className={inputCls} value={editing.den} onChange={(e) => setEditing({ ...editing, den: e.target.value })}>
                    {all.filter((m) => m.id !== editing.id).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Multiply by (100 = %)</label>
                  <input type="number" className={`${inputCls} font-mono`} value={editing.multiplier ?? 1} onChange={(e) => setEditing({ ...editing, multiplier: Number(e.target.value) || 1 })} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={saveEditing} className="px-5 py-2 rounded-xl text-xs font-black bg-[#0c4ca3] text-white hover:bg-[#093d84]">
                Save measure & add to Values
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 flex items-center gap-3 border-b border-slate-200 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input className={`${inputCls} pl-9`} placeholder="Search measure / formula / group..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <button
                onClick={() => setEditing(blankMeasure())}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#e5a812] hover:bg-[#d4970b] text-slate-950"
              >
                <Plus className="w-4 h-4" /> New measure
              </button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600 text-[11px] uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left w-12">Use</th>
                    <th className="px-4 py-2 text-left">Measure</th>
                    <th className="px-4 py-2 text-left">Group</th>
                    <th className="px-4 py-2 text-left">Formula (DAX equivalent)</th>
                    <th className="px-4 py-2 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((m) => {
                    const on = selectedValues.includes(m.id);
                    const custom = customMeasures.find((c) => c.id === m.id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <button
                            onClick={() => onToggleValue(m.id)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              on ? 'bg-[#0c4ca3] border-[#0c4ca3] text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {on && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-800 whitespace-nowrap">
                          {m.label}
                          {m.isCustom && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black">CUSTOM</span>}
                        </td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{m.group}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-600 break-all">{m.dax}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          {custom && (
                            <>
                              <button onClick={() => setEditing(custom)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  onChangeCustom(customMeasures.filter((c) => c.id !== custom.id));
                                  if (on) onToggleValue(custom.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
