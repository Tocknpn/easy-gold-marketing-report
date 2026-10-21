'use client';

import React from 'react';
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
  if (!data || data.length === 0) {
    return <div className="h-9 flex items-center justify-center text-[10px] text-slate-400 font-mono">No trend</div>;
  }

  const width = 160;
  const paddingX = 6;
  const paddingTop = 6;
  const paddingBottom = 6;
  const chartHeight = height - paddingTop - paddingBottom;
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
    return { x, y, week: d.week, value: d.value, isSelected };
  });

  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  const activePoint = points.find((p) => p.isSelected) || points[points.length - 1];

  const formatEdge = (v: number) => {
    if (isDecimal) return v.toFixed(1);
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toLocaleString();
  };

  const reactId = React.useId();
  const gradId = `spark-grad-${themeColor}-${reactId.replace(/:/g, '')}`;

  // Meaningful screen-reader description derived from actual chart data
  const trendDescription = React.useMemo(() => {
    if (!data || data.length < 2) {
      return 'Single point of data available; trend trajectory cannot be determined.';
    }
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const delta = last - first;
    const pctChange = first !== 0 ? Math.round((delta / first) * 100) : 0;
    
    let directionText = 'holding stable';
    if (Math.abs(pctChange) >= 2) {
      directionText = delta > 0 ? `trending upward by +${pctChange}%` : `trending downward by ${pctChange}%`;
    }

    const startWeek = data[0].week;
    const endWeek = data[data.length - 1].week;
    return `${data.length}-week trend from ${startWeek} (${formatEdge(first)}) to ${endWeek} (${formatEdge(last)}), ${directionText}. Historical low: ${formatEdge(minVal)}, high: ${formatEdge(maxVal)}.`;
  }, [data, minVal, maxVal, isDecimal]);

  return (
    <div className="w-full flex items-center justify-between gap-2">
      {/* Accessible description for screen readers */}
      <span className="sr-only">{trendDescription}</span>

      {/* Min Value Callout */}
      <span aria-hidden="true" className="text-[9px] font-mono text-slate-400 tabular-nums shrink-0" title={`5-Week Low: ${formatEdge(minVal)}`}>
        {formatEdge(minVal)}
      </span>

      {/* SVG Sparkline Curve */}
      <div className="flex-1 h-9 relative" aria-hidden="true">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={scheme.fillStart} />
              <stop offset="100%" stopColor={scheme.fillEnd} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path d={linePath} fill="none" stroke={scheme.stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          {/* Active / Current Week Marker */}
          {activePoint && (
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="3"
              fill="#ffffff"
              stroke={scheme.stroke}
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {/* Max Value Callout */}
      <span aria-hidden="true" className="text-[9px] font-mono font-bold text-slate-600 tabular-nums shrink-0" title={`5-Week High: ${formatEdge(maxVal)}`}>
        {formatEdge(maxVal)}
      </span>
    </div>
  );
}
