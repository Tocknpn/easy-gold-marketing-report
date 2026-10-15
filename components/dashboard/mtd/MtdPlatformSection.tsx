'use client';

import React from 'react';
import { MtdMetricCard } from './MtdMetricCard';
import { MtdMetricItem } from '@/lib/types/mtd.types';

interface MtdPlatformSectionProps {
  newCustomers: MtdMetricItem;
  totalTransactions: MtdMetricItem;
  comparisonMonthLabel: string;
  elapsedDays?: number;
  totalDays?: number;
}

export function MtdPlatformSection({
  newCustomers,
  totalTransactions,
  comparisonMonthLabel,
  elapsedDays = 11,
  totalDays = 31,
}: MtdPlatformSectionProps) {
  return (
    <div className="border-[2px] border-dotted border-[#0c4ca3] rounded-2xl p-2.5 sm:p-3 bg-[#f5f8fd] flex flex-col h-full shadow-xs">
      {/* Blue Header Banner */}
      <div className="bg-[#0c4ca3] text-white font-black text-xs sm:text-sm tracking-wider px-3.5 py-1.5 rounded-lg uppercase mb-2.5 shadow-xs flex items-center justify-between">
        <span>PLATFORM OVERVIEW</span>
      </div>

      {/* 2 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 flex-1">
        <MtdMetricCard
          metric={newCustomers}
          comparisonMonthLabel={comparisonMonthLabel}
          elapsedDays={elapsedDays}
          totalDays={totalDays}
        />
        <MtdMetricCard
          metric={totalTransactions}
          comparisonMonthLabel={comparisonMonthLabel}
          elapsedDays={elapsedDays}
          totalDays={totalDays}
        />
      </div>
    </div>
  );
}
