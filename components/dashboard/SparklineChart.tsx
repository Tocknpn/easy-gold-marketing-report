'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { ThemeSectionColor } from '@/lib/types/dashboard.types';

interface SparklinePoint {
  week: string;
  value: number;
}

interface SparklineChartProps {
  data: SparklinePoint[];
  themeColor: ThemeSectionColor;
  selectedWeek?: string;
  isDecimal?: boolean;
  /** Pixel height of the plot area (value bubble + curve), week labels excluded. */
  height?: number;
}

// Line / area / bubble color per section theme
const SCHEMES: Record<string, { stroke: string; fill: string }> = {
  blue: { stroke: '#1d4ed8', fill: '29, 78, 216' },
  green: { stroke: '#059669', fill: '5, 150, 105' },
  indigo: { stroke: '#4338ca', fill: '67, 56, 202' },
  purple: { stroke: '#7c3aed', fill: '124, 58, 237' },
  red: { stroke: '#b91c1c', fill: '185, 28, 28' },
};

const PAD_X = 12; // keeps the end dots and bubble inside the card
const PAD_TOP = 24; // room for the value bubble above the highest point
const PAD_BOTTOM = 8;

/**
 * Smooth path through the points without overshoot (monotone cubic, Fritsch–Carlson),
 * so a dip never draws below its real value.
 */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const n = pts.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const tan: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tan[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  tan[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tan[i] = 0;
      tan[i + 1] = 0;
      continue;
    }
    const a = tan[i] / slope[i];
    const b = tan[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tan[i] = t * a * slope[i];
      tan[i + 1] = t * b * slope[i];
    }
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (tan[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (tan[i + 1] * dx[i]) / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

export function SparklineChart({
  data,
  themeColor,
  selectedWeek,
  isDecimal = false,
  height = 64,
}: SparklineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(240);
  const reactId = React.useId();

  // Draw in real pixels so dots stay round at any card width
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      if (w > 0) setWidth((prev) => (prev !== w ? w : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return <div className="h-9 flex items-center justify-center text-[10px] text-slate-400">No trend</div>;
  }

  const scheme = SCHEMES[themeColor] || SCHEMES.blue;
  const gradId = `spark-grad-${reactId.replace(/:/g, '')}`;

  // Fit the scale to the data with breathing room, so week-to-week change is visible.
  // A minimum span (8% of the high) keeps a nearly flat series from looking dramatic.
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = Math.max(maxVal - minVal, Math.abs(maxVal) * 0.08, isDecimal ? 0.1 : 1);
  const lo = Math.max(0, minVal - span * 0.15);
  const hi = lo + (maxVal - lo) + span * 0.1;

  const plotW = Math.max(40, width - PAD_X * 2);
  const plotH = Math.max(16, height - PAD_TOP - PAD_BOTTOM);
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;

  const points = data.map((d, index) => {
    const x = data.length > 1 ? PAD_X + index * stepX : width / 2;
    const t = (d.value - lo) / (hi - lo || 1);
    const y = PAD_TOP + (1 - Math.max(0, Math.min(1, t))) * plotH;
    const isSelected = selectedWeek ? d.week === selectedWeek : index === data.length - 1;
    return { x, y, week: d.week, value: d.value, isSelected, index };
  });

  const linePath = smoothPath(points);
  const baseY = height - 1;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseY} L ${points[0].x.toFixed(1)} ${baseY} Z`;

  const formatFull = (v: number) => (isDecimal ? v.toFixed(1) : Math.round(v).toLocaleString());

  // Bubble shows the hovered week, otherwise the selected (current) week
  const selected = points.find((p) => p.isSelected) ?? points[points.length - 1];
  const focus = hoveredIdx !== null ? points[hoveredIdx] : selected;
  const bubbleText = formatFull(focus.value);
  const bubbleW = bubbleText.length * 6.4 + 12;
  const bubbleX = Math.min(Math.max(focus.x - bubbleW / 2, 0), width - bubbleW);
  const bubbleY = Math.max(0, focus.y - 24);

  return (
    <div ref={wrapRef} className="w-full select-none" onMouseLeave={() => setHoveredIdx(null)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block overflow-visible"
        role="img"
        aria-label={`Trend ${data.map((d) => `${d.week} ${formatFull(d.value)}`).join(', ')}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`rgba(${scheme.fill}, 0.18)`} />
            <stop offset="100%" stopColor={`rgba(${scheme.fill}, 0)`} />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={scheme.stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Guide from the focused point down to the axis */}
        <line
          x1={focus.x}
          x2={focus.x}
          y1={focus.y + 6}
          y2={baseY}
          stroke={scheme.stroke}
          strokeOpacity={0.18}
          strokeDasharray="2 3"
        />

        {points.map((p) => {
          const isFocus = p.index === focus.index;
          return (
            <g key={p.week} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(p.index)}>
              <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
              {isFocus && <circle cx={p.x} cy={p.y} r={7} fill={`rgba(${scheme.fill}, 0.16)`} />}
              <circle
                cx={p.x}
                cy={p.y}
                r={isFocus ? 4.5 : 3.25}
                fill={isFocus ? scheme.stroke : '#ffffff'}
                stroke={isFocus ? '#ffffff' : scheme.stroke}
                strokeWidth={isFocus ? 1.75 : 1.75}
              />
            </g>
          );
        })}

        {/* Value bubble */}
        <g pointerEvents="none">
          <rect x={bubbleX} y={bubbleY} width={bubbleW} height={18} rx={5} fill={scheme.stroke} />
          <text
            x={bubbleX + bubbleW / 2}
            y={bubbleY + 12.5}
            textAnchor="middle"
            fontSize={11}
            fontWeight={800}
            fill="#ffffff"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {bubbleText}
          </text>
        </g>
      </svg>

      {/* Week labels, each centered under its point */}
      <div className="relative h-4 mt-0.5">
        {points.map((p) => {
          const isFocus = p.index === focus.index;
          return (
            <span
              key={p.week}
              onMouseEnter={() => setHoveredIdx(p.index)}
              className={`absolute top-0 -translate-x-1/2 text-[10px] leading-4 tabular-nums whitespace-nowrap ${
                isFocus || p.isSelected ? 'font-black text-slate-900' : 'font-semibold text-slate-400'
              }`}
              style={{ left: p.x }}
              title={`${p.week}: ${formatFull(p.value)}`}
            >
              {p.week}
            </span>
          );
        })}
      </div>
    </div>
  );
}
