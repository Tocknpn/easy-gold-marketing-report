'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * Fixed A4-landscape page canvas used by the Executive PDF report.
 *
 * 1440 x 1018 px is exactly the A4 landscape ratio (297 / 210 = 1.4142), so the
 * html2canvas capture maps 1:1 onto the jsPDF page without any distortion.
 */
export const PDF_PAGE_W = 1440;
export const PDF_PAGE_H = 1018;

/** Never shrink content below this uniform scale; beyond it we flag overflow instead. */
const MIN_FIT_SCALE = 0.85;

interface PdfPageProps {
  id: string;
  pageNo: number;
  totalPages: number;
  badge: string;
  subtitle: string;
  title: string;
  asOfDate: string;
  footerNote: string;
  children: React.ReactNode;
}

export function PdfPage({
  id,
  pageNo,
  totalPages,
  badge,
  subtitle,
  title,
  asOfDate,
  footerNote,
  children,
}: PdfPageProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [overflow, setOverflow] = useState(false);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const inner = innerRef.current;
    if (!body || !inner) return;

    const measure = () => {
      const avail = body.clientHeight;
      // scrollHeight accurately reflects full content height including margins/grids
      const natural = inner.scrollHeight;
      if (avail <= 0 || natural <= 0) return;
      const s = natural > avail ? Math.max(MIN_FIT_SCALE, (avail - 4) / natural) : 1;
      setFit((prev) => (Math.abs(prev - s) > 0.002 ? s : prev));
      setOverflow(natural * s > avail + 2);
    };

    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(inner);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      id={id}
      data-pdf-page
      data-fit-scale={fit.toFixed(3)}
      className="pdf-page-container relative bg-white text-slate-900 flex flex-col shrink-0 shadow-lg ring-1 ring-slate-200"
      style={{ width: PDF_PAGE_W, height: PDF_PAGE_H, padding: '28px 36px 20px' }}
    >
      {/* Page Header */}
      <header className="border-b-2 border-slate-900 pb-2.5 mb-4 flex items-end justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#0c4ca3] text-white font-black text-xs uppercase tracking-wider">
              {badge}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Page {pageNo} of {totalPages} • {subtitle}
            </span>
          </div>
          <h1 className="text-[28px] leading-tight font-black text-slate-950 tracking-tight mt-1">{title}</h1>
        </div>

        <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
          <span className="font-bold text-slate-600">Data As-Of Date:</span>
          <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0c4ca3] font-black text-sm">
            {asOfDate}
          </span>
        </div>
      </header>

      {/* Page Body (natural, crisp 1:1 unscaled layout) */}
      <div ref={bodyRef} className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
        <div ref={innerRef} className="w-full flex-1 min-h-0 flex flex-col justify-between">
          {children}
        </div>
      </div>

      {/* Page Footer */}
      <footer className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
        <span>Easy Gold Marketing &amp; Business Intelligence • {footerNote}</span>
        <span className="font-bold text-slate-600">
          Page {pageNo} of {totalPages}
        </span>
      </footer>

      {/* Dev-only overflow warning — excluded from PDF capture */}
      {overflow && (
        <div
          data-html2canvas-ignore="true"
          className="no-print absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase"
        >
          Content overflow
        </div>
      )}
    </div>
  );
}

interface SectionTitleProps {
  num: number;
  title: string;
  subtitle?: string;
}

export function PdfSectionTitle({ num, title, subtitle }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
      <div className="w-6 h-6 rounded-md bg-[#0c4ca3] text-white flex items-center justify-center font-black text-xs shrink-0">
        {num}
      </div>
      <h2 className="text-[17px] font-black text-slate-900 tracking-tight">{title}</h2>
      {subtitle && <span className="text-xs font-semibold text-slate-500">{subtitle}</span>}
    </div>
  );
}
