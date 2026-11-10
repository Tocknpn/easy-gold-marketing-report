import React from 'react';
import { Skeleton } from '../Skeleton';

const SECTIONS = [
  { title: 'Platform Overview', color: 'bg-[#0b192c]' },
  { title: 'Buy Activity', color: 'bg-[#059669]' },
  { title: 'Sell Activity', color: 'bg-[#4338ca]' },
];

/** WoW body shown until real weekly data arrives: section titles stay, data shows skeletons. */
export function WeeklySkeleton() {
  return (
    <main className="flex-1 flex flex-col gap-3 sm:gap-3.5" aria-busy="true">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-3.5 w-full items-stretch">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            className="border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 bg-white shadow-xs flex flex-col"
          >
            <div
              className={`${s.color} text-white font-bold text-xs sm:text-sm tracking-wider px-3.5 py-2.5 rounded-xl mb-3 shadow-xs flex items-center justify-between`}
            >
              <span className="uppercase tracking-wide font-black">{s.title}</span>
              <span className="inline-block h-4 w-14 rounded-md bg-white/20 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
            <Skeleton className="h-28 w-full mt-3 rounded-xl" />
          </section>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
          8-Week Historical Performance Matrix &amp; Moving Average (MA4)
        </h3>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
