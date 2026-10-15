'use client';

import React from 'react';
import { MtdMetricCard } from './MtdMetricCard';
import { MtdMetricItem } from '@/lib/types/mtd.types';

interface MtdSellActivitySectionProps {
  sellWeight: MtdMetricItem;
  sellTransactions: MtdMetricItem;
  withdraw15g: MtdMetricItem;
  comparisonMonthLabel: string;
  elapsedDays?: number;
  totalDays?: number;
}

export function MtdSellActivitySection({
  sellWeight,
  sellTransactions,
  withdraw15g,
  comparisonMonthLabel,
  elapsedDays = 11,
  totalDays = 31,
}: MtdSellActivitySectionProps) {
  return (
    <div className="border-[2px] border-dotted border-[#a33333] rounded-2xl p-2.5 sm:p-3 bg-[#fdf7f7] flex flex-col h-full shadow-xs">
      {/* Red Header Banner */}
      <div className="bg-[#a33333] text-white font-black text-xs sm:text-sm tracking-wider px-3.5 py-1.5 rounded-lg uppercase mb-2.5 shadow-xs flex items-center justify-between">
        <span>SELL ACTIVITY</span>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 flex-1">
        <MtdMetricCard
          metric={sellWeight}
          comparisonMonthLabel={comparisonMonthLabel}
          elapsedDays={elapsedDays}
          totalDays={totalDays}
        />
        <MtdMetricCard
          metric={sellTransactions}
          comparisonMonthLabel={comparisonMonthLabel}
          elapsedDays={elapsedDays}
          totalDays={totalDays}
        />
        <MtdMetricCard
          metric={withdraw15g}
          comparisonMonthLabel={comparisonMonthLabel}
          elapsedDays={elapsedDays}
          totalDays={totalDays}
        />
      </div>
    </div>
  );
}
