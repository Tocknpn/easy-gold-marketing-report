'use client';

import React, { useState } from 'react';
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
  height?: number;
}

export function SparklineChart({
  data,
  themeColor,
  selectedWeek,
  isDecimal = false,
  height = 36,
}: SparklineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-9 flex items-center justify-center text-[10px] text-slate-400 font-mono">No trend</div>;
  }

  const width = 180;
  const paddingX = 8;
  const paddingTop = 6;
  const paddingBottom = 6;
  const chartHeight = Math.max(14, height - paddingTop - paddingBottom);
  const chartWidth = width - paddingX * 2;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  // Curated Institutional Color Schemes
  const colorSchemes: Record<string, { stroke: string; fillStart: string; fillEnd: string; activeDot: string }> = {
    blue: {
      stroke: '#1d4ed8', // Navy / Deep Blue
      fillStart: 'rgba(29, 78, 216, 0.20)',
      fillEnd: 'rgba(29, 78, 216, 0.00)',
      activeDot: '#1e3a8a',
    },
    green: {
      stroke: '#059669', // Emerald Inflow
      fillStart: 'rgba(5, 150, 105, 0.22)',
      fillEnd: 'rgba(5, 150, 105, 0.00)',
      activeDot: '#065f46',
    },
    indigo: {
      stroke: '#4338ca', // Trading Outflow / Amethyst
      fillStart: 'rgba(67, 56, 202, 0.22)',
      fillEnd: 'rgba(67, 56, 202, 0.00)',
      activeDot: '#3730a3',
    },
    purple: {
      stroke: '#7c3aed',
      fillStart: 'rgba(124, 58, 237, 0.22)',
      fillEnd: 'rgba(124, 58, 237, 0.00)',
      activeDot: '#5b21b6',
    },
    red: {
      stroke: '#b91c1c', // Reserved strictly for deficits
      fillStart: 'rgba(185, 28, 28, 0.20)',
      fillEnd: 'rgba(185, 28, 28, 0.00)',
      activeDot: '#991b1b',
    },
  };

  const scheme = colorSchemes[themeColor] || colorSchemes.blue;

  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((d, index) => {
    const x = paddingX + index * stepX;
    const normalizedY = (d.value - minVal) / valRange;
    const y = height - paddingBottom - normalizedY * chartHeight;
    const isSelected = selectedWeek ? d.week === selectedWeek : index === data.length - 1;
    return { x, y, week: d.week, value: d.value, isSelected, index };
  });

  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  const formatEdge = (v: number) => {
    if (isDecimal) return v.toFixed(1);
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toLocaleString();
  };

  const formatFull = (v: number) => {
    if (isDecimal) return v.toFixed(2);
    return Math.round(v).toLocaleString();
  };

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  const reactId = React.useId();
  const gradId = `spark-grad-${themeColor}-${reactId.replace(/:/g, '')}`;

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Top Value Context: Explicit Low (Min) / High (Max) or Interactive Hover Value */}
      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums leading-none min-h-[16px]">
        {hoveredPoint ? (
          <div className="flex items-center justify-between w-full bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            <span className="font-bold text-slate-700">{hoveredPoint.week} value:</span>
            <span className="font-black text-slate-900">{formatFull(hoveredPoint.value)}</span>
          </div>
        ) : (
          <>
            <span className="text-slate-400 font-medium" title="5-Week Low">
              Low: <span className="text-slate-600 font-bold">{formatEdge(minVal)}</span>
            </span>
            <span className="text-slate-400 font-medium" title="5-Week High">
              High: <span className="text-slate-700 font-bold">{formatEdge(maxVal)}</span>
            </span>
          </>
        )}
      </div>

      {/* SVG Sparkline Curve with Dots on Every Week */}
      <div className="w-full h-9 relative" onMouseLeave={() => setHoveredIdx(null)}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={scheme.fillStart} />
              <stop offset="100%" stopColor={scheme.fillEnd} />
            </linearGradient>
          </defs>

          {/* Shaded Area Under Curve */}
          <path d={areaPath} fill={`url(#${gradId})`} />

          {/* Trend Line Curve */}
          <path
            d={linePath}
            fill="none"
            stroke={scheme.stroke}
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Visible Interactive Dots for Every Week */}
          {points.map((p) => {
            const isCur = p.isSelected;
            const isHov = hoveredIdx === p.index;

            return (
              <g
                key={p.week}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(p.index)}
              >
                {/* Generous invisible hover target area */}
                <circle cx={p.x} cy={p.y} r="12" fill="transparent" />

                {/* Outer highlight ring for active / hovered point */}
                {(isCur || isHov) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHov ? 5.5 : 4.5}
                    fill="none"
                    stroke={scheme.stroke}
                    strokeWidth="1.5"
                    strokeOpacity={isHov ? 0.9 : 0.4}
                  />
                )}

                {/* Core dot on each week point */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHov ? 3.5 : isCur ? 3 : 2.5}
                  fill={isCur || isHov ? scheme.stroke : '#ffffff'}
                  stroke={scheme.stroke}
                  strokeWidth={isCur || isHov ? 1.5 : 1.75}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Timeline Axis: Week labels for each point */}
      <div className="flex justify-between items-center text-[9px] font-mono font-medium text-slate-500 px-0.5 pt-1 border-t border-slate-100 min-h-[16px] shrink-0">
        {points.map((p) => {
          const isCur = p.isSelected;
          const isHov = hoveredIdx === p.index;
          return (
            <span
              key={p.week}
              onMouseEnter={() => setHoveredIdx(p.index)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`px-0.5 rounded leading-none select-none ${
                isHov || isCur
                  ? 'font-black text-slate-900'
                  : 'text-slate-400 font-semibold'
              }`}
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
