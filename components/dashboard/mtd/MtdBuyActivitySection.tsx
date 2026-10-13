'use client';

import React from 'react';
import { MtdMetricCard } from './MtdMetricCard';
import { MtdMetricItem } from '@/lib/types/mtd.types';

interface MtdBuyActivitySectionProps {
  buyWeight: MtdMetricItem;
  buyTransactions: MtdMetricItem;
  comparisonMonthLabel: string;
}

export function MtdBuyActivitySection({
  buyWeight,
  buyTransactions,
  comparisonMonthLabel,
}: MtdBuyActivitySectionProps) {
  return (
    <div className="border-[2px] border-dotted border-[#2e7d32] rounded-2xl p-2.5 sm:p-3 bg-[#f5f9f5] flex flex-col h-full shadow-xs">
      {/* Green Header Banner */}
      <div className="bg-[#2e7d32] text-white font-black text-xs sm:text-sm tracking-wider px-3.5 py-1.5 rounded-lg uppercase mb-2.5 shadow-xs flex items-center justify-between">
        <span>BUY ACTIVITY</span>
      </div>

      {/* 2 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 flex-1">
        <MtdMetricCard
          metric={buyWeight}
          comparisonMonthLabel={comparisonMonthLabel}
        />
        <MtdMetricCard
          metric={buyTransactions}
          comparisonMonthLabel={comparisonMonthLabel}
        />
      </div>
    </div>
  );
}
