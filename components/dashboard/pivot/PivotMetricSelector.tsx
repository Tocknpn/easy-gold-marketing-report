'use client';

import React from 'react';
import { PivotMetricId } from '@/lib/types/pivotReport.types';
import { PIVOT_METRIC_DEFINITIONS } from '@/lib/pivot/pivotData';
import { SlidersHorizontal, CheckSquare, Square } from 'lucide-react';

interface PivotMetricSelectorProps {
  activeMetricIds: PivotMetricId[];
  onChange: (metrics: PivotMetricId[]) => void;
}

export function PivotMetricSelector({
  activeMetricIds,
  onChange,
}: PivotMetricSelectorProps) {
  const allMetricIds = Object.keys(PIVOT_METRIC_DEFINITIONS) as PivotMetricId[];

  const toggleMetric = (id: PivotMetricId) => {
    if (activeMetricIds.includes(id)) {
      if (activeMetricIds.length === 1) return; // Keep at least one metric
      onChange(activeMetricIds.filter((m) => m !== id));
    } else {
      onChange([...activeMetricIds, id]);
    }
  };

  const applyPreset = (preset: 'image1' | 'image2' | 'all') => {
    if (preset === 'image1') {
      onChange([
        'total_buy_transac',
        'total_unique_user',
        'revenue_buy_mil_lak',
        'gold_weight_buy_g',
        'gold_buy_size_g',
        'total_nc',
      ]);
    } else if (preset === 'image2') {
      onChange([
        'sum_gold_weight',
        'sum_amount_lak',
      ]);
    } else {
      onChange(allMetricIds);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col gap-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#0c4ca3]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Select Pivot Value Metrics (ເລືອກຄ່າວັດແທກ)
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            ({activeMetricIds.length} of {allMetricIds.length} visible)
          </span>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => applyPreset('image1')}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-[#0c4ca3] hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            Image 1 Standard (6)
          </button>
          <button
            onClick={() => applyPreset('image2')}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 transition-colors"
          >
            Image 2 Sums (2)
          </button>
          <button
            onClick={() => applyPreset('all')}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            All Values
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {allMetricIds.map((id) => {
          const def = PIVOT_METRIC_DEFINITIONS[id];
          const isSelected = activeMetricIds.includes(id);

          return (
            <button
              key={id}
              onClick={() => toggleMetric(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isSelected
                  ? 'bg-blue-50 border-[#0c4ca3] text-[#0c4ca3] shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#0c4ca3]" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>{def.label}</span>
              <span className="text-[10px] font-normal text-slate-400">
                ({def.unit})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
