'use client';

import React, { useState } from 'react';
import { ThemeSectionColor } from '@/lib/types/dashboard.types';

interface ChartPoint {
  week: string; // e.g. 'W37'
  value: number; // e.g. 40663
}

interface WeeklyComboChartProps {
  data: ChartPoint[];
  themeColor: ThemeSectionColor;
  isDecimal?: boolean;
  selectedWeek?: string;
  height?: number;
}

export function WeeklyComboChart({
  data,
  themeColor,
  isDecimal = false,
  selectedWeek,
  height = 100,
}: WeeklyComboChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>;
  }

  // Dimensions
  const width = 300;
  const paddingBottom = 22;
  const paddingTop = 22;
  const paddingX = 22;

  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  // Scaling
  const values = data.map((d) => d.value);
  const rawMax = Math.max(...values);
  const maxVal = rawMax > 0 ? rawMax * 1.18 : 10;
  const minVal = 0;

  // Color schemes
  const colorSchemes = {
    blue: {
      activeGradientStart: '#3b82f6',
      activeGradientEnd: '#1d4ed8',
      line: '#2563eb',
      dot: '#1d4ed8',
      dotBorder: '#ffffff',
      glow: 'rgba(37, 99, 235, 0.25)',
      inactiveBar: '#e2e8f0',
      inactiveHover: '#cbd5e1',
    },
    green: {
      activeGradientStart: '#22c55e',
      activeGradientEnd: '#15803d',
      line: '#16a34a',
      dot: '#15803d',
      dotBorder: '#ffffff',
      glow: 'rgba(22, 163, 74, 0.25)',
      inactiveBar: '#e2e8f0',
      inactiveHover: '#cbd5e1',
    },
    red: {
      activeGradientStart: '#f43f5e',
      activeGradientEnd: '#be123c',
      line: '#e11d48',
      dot: '#be123c',
      dotBorder: '#ffffff',
      glow: 'rgba(225, 29, 72, 0.25)',
      inactiveBar: '#e2e8f0',
      inactiveHover: '#cbd5e1',
    },
    indigo: {
      activeGradientStart: '#6366f1',
      activeGradientEnd: '#4338ca',
      line: '#4f46e5',
      dot: '#4338ca',
      dotBorder: '#ffffff',
      glow: 'rgba(79, 70, 229, 0.25)',
      inactiveBar: '#e2e8f0',
      inactiveHover: '#cbd5e1',
    },
    purple: {
      activeGradientStart: '#a855f7',
      activeGradientEnd: '#7e22ce',
      line: '#9333ea',
      dot: '#7e22ce',
      dotBorder: '#ffffff',
      glow: 'rgba(147, 51, 234, 0.25)',
      inactiveBar: '#e2e8f0',
      inactiveHover: '#cbd5e1',
    },
  };

  const scheme = colorSchemes[themeColor] || colorSchemes.blue;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;
  const barWidth = 20;

  // Format values cleanly
  const formatVal = (v: number) => {
    if (isDecimal) return v.toFixed(1);
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
    return v.toLocaleString();
  };

  // Coordinates
  const points = data.map((d, index) => {
    const x = paddingX + index * stepX;
    const normalizedY = (d.value - minVal) / (maxVal - minVal);
    const y = height - paddingBottom - normalizedY * chartHeight;
    const barHeight = Math.max(normalizedY * chartHeight, 4);
    const isSelected = selectedWeek ? d.week === selectedWeek : index === data.length - 1;
    return {
      x,
      y,
      barHeight,
      week: d.week,
      value: d.value,
      isSelected,
      index,
    };
  });

  // Smooth or straight SVG line path
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Subtle gradient id unique per color
  const gradientId = `barGrad-${themeColor}`;

  return (
    <div className="w-full h-full flex flex-col justify-end relative group">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scheme.activeGradientStart} />
            <stop offset="100%" stopColor={scheme.activeGradientEnd} />
          </linearGradient>
          <filter id={`glow-${themeColor}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={scheme.line} floodOpacity="0.28" />
          </filter>
        </defs>

        {/* Baseline Guide */}
        <line
          x1={paddingX - 8}
          y1={height - paddingBottom}
          x2={width - paddingX + 8}
          y2={height - paddingBottom}
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Vertical Bars */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g 
              key={`bar-${i}`}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <rect
                x={p.x - barWidth / 2}
                y={height - paddingBottom - p.barHeight}
                width={barWidth}
                height={p.barHeight}
                fill={p.isSelected ? `url(#${gradientId})` : isHovered ? scheme.inactiveHover : scheme.inactiveBar}
                rx="3"
                ry="3"
                className="transition-colors duration-150"
              />

              {/* Week Label */}
              <text
                x={p.x}
                y={height - 5}
                textAnchor="middle"
                className={`text-[9.5px] font-sans transition-all ${
                  p.isSelected
                    ? 'font-black fill-slate-900'
                    : 'font-semibold fill-slate-500'
                }`}
              >
                {p.week}
              </text>
            </g>
          );
        })}

        {/* Connecting Trend Line */}
        <path
          d={linePath}
          fill="none"
          stroke={scheme.line}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${themeColor})`}
        />

        {/* Data points & Value labels */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g 
              key={`point-${i}`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              {/* Value Label above dot */}
              <text
                x={p.x}
                y={p.y - 7}
                textAnchor="middle"
                className={`text-[9px] font-sans transition-all ${
                  p.isSelected || isHovered
                    ? 'font-black fill-slate-900'
                    : 'font-bold fill-slate-600'
                }`}
              >
                {formatVal(p.value)}
              </text>

              {/* Outer white ring */}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.isSelected || isHovered ? "4.5" : "3.5"}
                fill={scheme.dot}
                stroke={scheme.dotBorder}
                strokeWidth="1.5"
                className="transition-all duration-150"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
