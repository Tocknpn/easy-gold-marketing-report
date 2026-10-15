'use client';

import React, { useState, useMemo } from 'react';
import { 
  PivotReportPayload, 
  PivotMetricId 
} from '@/lib/types/pivotReport.types';
import { PIVOT_METRIC_DEFINITIONS } from '@/lib/pivot/pivotData';
import { 
  Search, 
  ArrowUpDown, 
  FileSpreadsheet,
  ChevronDown,
  PlusSquare,
  MinusSquare,
  Layers
} from 'lucide-react';

interface PivotTableGridProps {
  payload: PivotReportPayload;
}

export function PivotTableGrid({ payload }: PivotTableGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('label');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});

  const isCustomerDimension = payload.dimension === 'customer';

  // Format cell numbers with proper locale formatting
  const formatValue = (metricId: PivotMetricId, value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    const def = PIVOT_METRIC_DEFINITIONS[metricId];
    if (!def) return value.toLocaleString();

    if (def.decimals === 0) {
      return value.toLocaleString('en-US');
    }
    return value.toLocaleString('en-US', {
      minimumFractionDigits: def.decimals,
      maximumFractionDigits: def.decimals,
    });
  };

  const handleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldKey);
      setSortDirection('desc');
    }
  };

  // Filter & Sort
  const processedRows = useMemo(() => {
    let result = [...payload.rows];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.label.toLowerCase().includes(term) ||
          (r.subLabel && r.subLabel.toLowerCase().includes(term)) ||
          (r.phone && r.phone.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      let valA: any = sortField === 'label' ? a.label : a.metrics[sortField as PivotMetricId] ?? 0;
      let valB: any = sortField === 'label' ? b.label : b.metrics[sortField as PivotMetricId] ?? 0;

      if (sortField === 'label' && a.key.includes('/')) {
        // Date parse for Excel dates 4/1/2026
        const dateA = new Date(a.key).getTime() || 0;
        const dateB = new Date(b.key).getTime() || 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [payload.rows, searchTerm, sortField, sortDirection]);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
      {/* Top Table Control Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#0c4ca3]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Pivot Data View ({processedRows.length} rows)
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Dimension: <span className="font-bold text-[#0c4ca3] capitalize">{payload.dimension}</span>
          </span>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rows..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Excel Pivot Table Container */}
      <div className="overflow-x-auto max-h-[620px] divide-y divide-slate-200">
        <table className="w-full text-xs text-left border-collapse select-text">
          {/* Header Row matching Image 1 & Image 2 (Light blue ribbon with borders) */}
          <thead className="bg-[#b9d7ea]/50 text-slate-900 sticky top-0 z-10 border-b-2 border-slate-300 text-[11px] font-black tracking-tight uppercase shadow-xs">
            <tr>
              {/* Row Dimension Column Header */}
              {isCustomerDimension ? (
                <>
                  <th 
                    className="py-2.5 px-3 border-r border-slate-300/80 cursor-pointer hover:bg-[#b9d7ea]/70 transition-colors"
                    onClick={() => handleSort('label')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">ເບີໂທ (Phone)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300/80">
                    <span className="font-bold text-slate-900">ຊື່ ແລະ ນາມສະກຸນ (Customer Name)</span>
                  </th>
                </>
              ) : (
                <th 
                  className="py-2.5 px-3.5 border-r border-slate-300/80 cursor-pointer hover:bg-[#b9d7ea]/70 transition-colors"
                  onClick={() => handleSort('label')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">Row Labels ({payload.dimension})</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
              )}

              {/* Dynamic Value Metric Columns */}
              {payload.activeMetricIds.map((metricId) => {
                const def = PIVOT_METRIC_DEFINITIONS[metricId];
                return (
                  <th
                    key={metricId}
                    onClick={() => handleSort(metricId)}
                    className="py-2.5 px-3 border-r border-slate-300/80 text-right cursor-pointer hover:bg-[#b9d7ea]/70 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-bold text-slate-900">{def.label}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Data Rows */}
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {processedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={payload.activeMetricIds.length + (isCustomerDimension ? 2 : 1)}
                  className="py-8 text-center text-slate-400 font-sans italic"
                >
                  No records match current filter slicers.
                </td>
              </tr>
            ) : (
              processedRows.map((row, idx) => {
                return (
                  <tr
                    key={row.key}
                    className={`hover:bg-blue-50/50 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Dimension Value */}
                    {isCustomerDimension ? (
                      <>
                        <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800 flex items-center gap-1.5 whitespace-nowrap font-mono">
                          <PlusSquare className="w-3 h-3 text-slate-400" />
                          <span>{row.label}</span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-sans font-medium text-slate-900 whitespace-nowrap">
                          {row.subLabel || '-'}
                        </td>
                      </>
                    ) : (
                      <td className="py-2 px-3.5 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">
                        {row.label}
                      </td>
                    )}

                    {/* Metric Values */}
                    {payload.activeMetricIds.map((metricId) => {
                      const val = row.metrics[metricId];
                      return (
                        <td
                          key={metricId}
                          className="py-2 px-3 border-r border-slate-200 text-right text-slate-800 whitespace-nowrap"
                        >
                          {formatValue(metricId, val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Excel Pivot Grand Total Row at Bottom */}
          <tfoot className="bg-[#b9d7ea]/70 text-slate-950 font-black font-mono text-[11px] sticky bottom-0 border-t-2 border-slate-400 shadow-md">
            <tr>
              <td 
                colSpan={isCustomerDimension ? 2 : 1}
                className="py-2.5 px-3.5 border-r border-slate-300 uppercase tracking-wider font-sans font-black text-slate-950"
              >
                Grand Total ({processedRows.length} Rows)
              </td>
              {payload.activeMetricIds.map((metricId) => {
                return (
                  <td
                    key={metricId}
                    className="py-2.5 px-3 border-r border-slate-300 text-right whitespace-nowrap"
                  >
                    {formatValue(metricId, payload.totals[metricId])}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
