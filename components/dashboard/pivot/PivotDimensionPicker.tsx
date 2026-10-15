'use client';

import React from 'react';
import { PivotRowDimension } from '@/lib/types/pivotReport.types';
import { 
  Calendar, 
  Users, 
  Landmark, 
  MapPin, 
  ArrowLeftRight,
  Layers
} from 'lucide-react';

interface PivotDimensionPickerProps {
  selectedDimension: PivotRowDimension;
  onChange: (dimension: PivotRowDimension) => void;
}

export function PivotDimensionPicker({
  selectedDimension,
  onChange,
}: PivotDimensionPickerProps) {
  const dimensions: Array<{
    id: PivotRowDimension;
    label: string;
    subtext: string;
    icon: React.ReactNode;
    tag?: string;
  }> = [
    {
      id: 'date',
      label: 'Row Labels (Date)',
      subtext: 'Daily breakdown (4/1/2026 ... 5/5/2026)',
      icon: <Calendar className="w-4 h-4" />,
      tag: 'Excel Image 1',
    },
    {
      id: 'customer',
      label: 'Phone & Customer Name',
      subtext: 'ເບີໂທ & ຊື່ ແລະ ນາມສະກຸນ',
      icon: <Users className="w-4 h-4" />,
      tag: 'Excel Image 2',
    },
    {
      id: 'bank',
      label: 'Banking Gateway',
      subtext: 'BCEL, LDB, JDB, u-money, M-Money',
      icon: <Landmark className="w-4 h-4" />,
    },
    {
      id: 'branch',
      label: 'Branch Location',
      subtext: 'Vientiane, Pakse, Luang Prabang...',
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: 'transaction_type',
      label: 'Transaction Type',
      subtext: 'BUY_GOLD, SALE_GOLD, WITHDRAW',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col gap-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0c4ca3]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Row Grouping Dimension (ແກນການຈັດກຸ່ມແຖວ)
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          Click to switch pivot hierarchy
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {dimensions.map((dim) => {
          const isActive = selectedDimension === dim.id;
          return (
            <button
              key={dim.id}
              onClick={() => onChange(dim.id)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 relative overflow-hidden ${
                isActive
                  ? 'bg-blue-50/80 border-[#0c4ca3] text-[#0c4ca3] shadow-xs ring-1 ring-[#0c4ca3]'
                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 text-slate-700'
              }`}
            >
              {dim.tag && (
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md self-start ${
                  isActive ? 'bg-[#0c4ca3] text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {dim.tag}
                </span>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={isActive ? 'text-[#0c4ca3]' : 'text-slate-400'}>
                  {dim.icon}
                </span>
                <span className="text-xs font-bold truncate">{dim.label}</span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{dim.subtext}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
