'use client';

import React from 'react';
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
}

export function WeeklyComboChart({
  data,
  themeColor,
  isDecimal = false,
  selectedWeek,
}: WeeklyComboChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>;
  }

  // Dimensions
  const width = 300;
  const height = 135;
  const paddingBottom = 26;
  const paddingTop = 26;
  const paddingX = 24;

  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  // Find min and max for scaling
  const values = data.map((d) => d.value);
  const rawMax = Math.max(...values);
  const maxVal = rawMax > 0 ? rawMax * 1.15 : 10;
  const minVal = 0;

  // Accent colors
  const colorMap = {
    blue: {
      activeBar: '#1d4ed8',
      line: '#1d4ed8',
      dot: '#1d4ed8',
    },
    green: {
      activeBar: '#2e6930',
      line: '#2e6930',
      dot: '#2e6930',
    },
    red: {
      activeBar: '#991b1b',
      line: '#991b1b',
      dot: '#991b1b',
    },
  };

  const colors = colorMap[themeColor];
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;
  const barWidth = 22;

  // Calculate coordinates
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
    };
  });

  // SVG Line path
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  return (
    <div className="w-full h-full flex flex-col justify-end">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Baseline */}
        <line
          x1={paddingX - 10}
          y1={height - paddingBottom}
          x2={width - paddingX + 10}
          y2={height - paddingBottom}
          stroke="#475569"
          strokeWidth="1.2"
        />

        {/* Vertical Bars */}
        {points.map((p, i) => (
          <g key={`bar-${i}`}>
            <rect
              x={p.x - barWidth / 2}
              y={height - paddingBottom - p.barHeight}
              width={barWidth}
              height={p.barHeight}
              fill={p.isSelected ? colors.activeBar : '#d1d5db'}
              rx="1.5"
            />

            {/* Baseline tick */}
            <line
              x1={p.x}
              y1={height - paddingBottom}
              x2={p.x}
              y2={height - paddingBottom + 4}
              stroke="#475569"
              strokeWidth="1"
            />

            {/* Week Label */}
            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              className="text-[10px] font-medium fill-slate-700"
            >
              {p.week}
            </text>
          </g>
        ))}

        {/* Connecting Trend Line */}
        <path
          d={linePath}
          fill="none"
          stroke={colors.line}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points & Value labels */}
        {points.map((p, i) => (
          <g key={`point-${i}`}>
            {/* Value Label above dot */}
            <text
              x={p.x}
              y={p.y - 7}
              textAnchor="middle"
              className="text-[9.5px] font-semibold fill-slate-600"
            >
              {isDecimal
                ? p.value.toFixed(1)
                : p.value >= 1000
                ? p.value.toLocaleString()
                : p.value}
            </text>

            {/* Dot */}
            <circle
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill={colors.dot}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
