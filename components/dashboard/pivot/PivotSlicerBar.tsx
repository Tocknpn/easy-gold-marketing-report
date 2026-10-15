'use client';

import React from 'react';
import { PivotSlicerState } from '@/lib/types/pivotReport.types';
import { Filter, RotateCcw, Sparkles, Loader2 } from 'lucide-react';

interface PivotSlicerBarProps {
  slicers: PivotSlicerState;
  onChange: (updated: PivotSlicerState) => void;
  onReset: () => void;
  onExecuteQuery?: () => void;
  isCalculating?: boolean;
}

export function PivotSlicerBar({ slicers, onChange, onReset, onExecuteQuery, isCalculating }: PivotSlicerBarProps) {
  const updateField = <K extends keyof PivotSlicerState>(field: K, val: PivotSlicerState[K]) => {
    onChange({ ...slicers, [field]: val });
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#0c4ca3]" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Excel Pivot Slicers (ຕົວກອງຂໍ້ມູນ)
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Matches filter selectors from manual Excel model
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#0c4ca3] transition-colors px-2 py-1"
            title="Reset Slicers to Default"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>

          {onExecuteQuery && (
            <button
              onClick={onExecuteQuery}
              disabled={isCalculating}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-sm hover:shadow-md ring-1 ring-emerald-400/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Execute pivot calculation on Supabase"
            >
              {isCalculating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{isCalculating ? 'Calculating...' : 'Calculate Pivot (ຄຳນວນ)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Slicers Grid matching Image 1 & Image 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {/* 1. Month */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
            <span>Month</span>
          </label>
          <select
            value={slicers.month}
            onChange={(e) => updateField('month', e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
          >
            <option value="all">All Months</option>
            <option value="Apr'26">Apr'26 (ເດືອນ 4)</option>
            <option value="May'26">May'26 (ເດືອນ 5)</option>
            <option value="Jul'26">Jul'26 (ເດືອນ 7)</option>
            <option value="Aug'26">Aug'26 (ເດືອນ 8)</option>
            <option value="Sep'26">Sep'26 (ເດືອນ 9)</option>
            <option value="Oct'26">Oct'26 (ເດືອນ 10)</option>
          </select>
        </div>

        {/* 2. ຮູບແບບທຸລະກຳ (Transaction Type) */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600">
            <span>ຮູບແບບທຸລະກຳ</span>
          </label>
          <select
            value={slicers.tx_type}
            onChange={(e) => updateField('tx_type', e.target.value)}
            className="text-xs font-semibold bg-blue-50/60 border border-blue-200 text-[#0c4ca3] rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden"
          >
            <option value="all">All Types</option>
            <option value="BUY_GOLD">BUY_GOLD (ຊື້ຄຳ)</option>
            <option value="SALE_GOLD">SALE_GOLD (ຂາຍຄຳ)</option>
            <option value="WITHDRAW_GOLD">WITHDRAW_GOLD (ຖອນ)</option>
          </select>
        </div>

        {/* 3. 500K up */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600">
            <span>500K up</span>
          </label>
          <select
            value={slicers.is_500k_up}
            onChange={(e) => updateField('is_500k_up', e.target.value as any)}
            className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden ${
              slicers.is_500k_up === 'yes'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}
          >
            <option value="all">All</option>
            <option value="yes">Yes (&gt;= 500k)</option>
            <option value="no">No (&lt; 500k)</option>
          </select>
        </div>

        {/* 4. >=2.0G */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600">
            <span>&gt;= 2.0G</span>
          </label>
          <select
            value={slicers.is_2g_up}
            onChange={(e) => updateField('is_2g_up', e.target.value as any)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
          >
            <option value="all">All</option>
            <option value="yes">Yes (&gt;= 2.0g)</option>
            <option value="no">No</option>
          </select>
        </div>

        {/* 5. 3.75g */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600">
            <span>3.75g</span>
          </label>
          <select
            value={slicers.is_3_75g_up}
            onChange={(e) => updateField('is_3_75g_up', e.target.value as any)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
          >
            <option value="all">All</option>
            <option value="yes">Yes (&gt;= 3.75g)</option>
            <option value="no">No</option>
          </select>
        </div>

        {/* 6. 15G */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600">
            <span>15G</span>
          </label>
          <select
            value={slicers.is_15g_up}
            onChange={(e) => updateField('is_15g_up', e.target.value as any)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
          >
            <option value="all">All</option>
            <option value="yes">Yes (&gt;= 15g)</option>
            <option value="no">No</option>
          </select>
        </div>

        {/* 7. ສະຖານະ (Status) */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600">
            <span>ສະຖານະ (Status)</span>
          </label>
          <select
            value={slicers.status}
            onChange={(e) => updateField('status', e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
          >
            <option value="all">All Status</option>
            <option value="ສໍາເລັດ">ສໍາເລັດ (Completed)</option>
            <option value="ປະຕິເສດ">ປະຕິເສດ (Failed)</option>
          </select>
        </div>

        {/* 8. Day num */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-600">
            <span>Day num</span>
          </label>
          <select
            value={slicers.day_num}
            onChange={(e) => updateField('day_num', e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-[#0c4ca3] focus:outline-hidden text-slate-800"
          >
            <option value="all">All Days</option>
            <option value="weekday">Mon - Fri (ວັນລັດຖະການ)</option>
            <option value="weekend">Sat - Sun (ວັນເສົາ-ອາທິດ)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
