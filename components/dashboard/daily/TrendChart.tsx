'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { SeriesPoint, fmtInt, formatShortDate } from '@/lib/utils/dailyPerformance';

export const BRAND = '#0c53ac';
export const GOLD = '#e5a812';

export interface ChartSeries {
  name: string;
  color: string;
  points: SeriesPoint[];
  /** Fill a soft gradient under the line */
  area?: boolean;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Responsive SVG line/area chart. One or many series on a shared axis.
 * The last point is highlighted with its value so people read "today" at a glance.
 */
export function TrendChart({ series, legend = false }: { series: ChartSeries[]; legend?: boolean }) {
  const { ref, w, h } = useSize<HTMLDivElement>();
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);

  const dates = series[0]?.points.map((p) => p.date) ?? [];
  const n = dates.length;

  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 24;
  const innerW = Math.max(10, w - padL - padR);
  const innerH = Math.max(10, h - padT - padB);

  const { yMax, ticks } = useMemo(() => {
    const all = series.flatMap((s) => s.points.map((p) => p.value ?? 0));
    const max = niceMax(Math.max(...all, 1) * 1.08);
    return { yMax: max, ticks: [0, 0.25, 0.5, 0.75, 1].map((t) => max * t) };
  }, [series]);

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / yMax) * innerH;

  // Catmull-Rom to Cubic Bezier smooth spline
  const getSmoothPath = (pts: Array<{ x: number; y: number }>, tension = 0.16): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    if (pts.length === 2) {
      return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
    }

    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;

      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const pathFor = (s: ChartSeries) => {
    const segments: Array<Array<{ x: number; y: number }>> = [];
    let cur: Array<{ x: number; y: number }> = [];
    s.points.forEach((p, i) => {
      if (p.value === null) {
        if (cur.length > 0) {
          segments.push(cur);
          cur = [];
        }
      } else {
        cur.push({ x: x(i), y: y(p.value) });
      }
    });
    if (cur.length > 0) segments.push(cur);
    return segments.map((seg) => getSmoothPath(seg)).join(' ');
  };

  const areaFor = (s: ChartSeries) => {
    const valid = s.points
      .map((p, i) => (p.value !== null ? { x: x(i), y: y(p.value) } : null))
      .filter((pt): pt is { x: number; y: number } => pt !== null);
    if (valid.length < 2) return '';
    const first = valid[0];
    const last = valid[valid.length - 1];
    const curve = getSmoothPath(valid);
    return `${curve} L ${last.x.toFixed(1)},${y(0).toFixed(1)} L ${first.x.toFixed(1)},${y(0).toFixed(1)} Z`;
  };

  const labelEvery = n > 20 ? 5 : n > 10 ? 2 : 1;
  const activeIdx = hover; // only active when user hovers

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - padL) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      {legend && (
        <div className="flex items-center gap-4 pb-1 text-[0.85em] font-bold text-slate-600">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div
        ref={ref}
        className="flex-1 min-h-0 relative cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {w > 0 && h > 0 && (
          <svg
            width={w}
            height={h}
            role="img"
            aria-label="Daily trend chart"
            className="pointer-events-none"
          >
            <defs>
              {series.map((s, si) => (
                <linearGradient key={si} id={`${uid}-g${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>

            {/* grid + y labels */}
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={i === 0 ? '' : '3 4'} />
                <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="0.8em" fill="#64748b" fontWeight={600}>
                  {fmtInt(t)}
                </text>
              </g>
            ))}

            {/* x labels */}
            {dates.map((d, i) =>
              (n - 1 - i) % labelEvery === 0 ? (
                <text key={d} x={x(i)} y={h - 6} textAnchor="middle" fontSize="0.8em" fill="#64748b" fontWeight={600}>
                  {formatShortDate(d)}
                </text>
              ) : null
            )}

            {/* hover guide - only when user hovers */}
            {activeIdx !== null && (
              <line x1={x(activeIdx)} x2={x(activeIdx)} y1={padT} y2={padT + innerH} stroke={BRAND} strokeOpacity={0.25} strokeWidth={1.5} />
            )}

            {/* areas + lines */}
            {series.map((s, si) =>
              s.area ? <path key={`a${si}`} d={areaFor(s)} fill={`url(#${uid}-g${si})`} /> : null
            )}
            {series.map((s, si) => (
              <path
                key={`l${si}`}
                d={pathFor(s)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {/* dots on every day point so users can easily spot daily trends */}
            {series.map((s, si) => (
              <g key={`dots-${si}`}>
                {s.points.map((p, i) => {
                  if (p.value === null) return null;
                  return (
                    <circle
                      key={i}
                      cx={x(i)}
                      cy={y(p.value)}
                      r={2.5}
                      fill="#ffffff"
                      stroke={s.color}
                      strokeWidth={1.8}
                    />
                  );
                })}
              </g>
            ))}

            {/* active hover point highlight */}
            {activeIdx !== null &&
              series.map((s, si) => {
                const p = s.points[activeIdx];
                if (!p || p.value === null) return null;
                return (
                  <g key={`p${si}`}>
                    <circle cx={x(activeIdx)} cy={y(p.value)} r={6} fill="#fff" stroke={s.color} strokeWidth={3.5} />
                  </g>
                );
              })}
          </svg>
        )}

        {/* value tooltip when hovering */}
        {w > 0 && activeIdx !== null && (
          <div
            className="absolute pointer-events-none rounded-lg bg-slate-900/90 text-white px-2 py-1 text-[0.85em] leading-tight shadow-lg whitespace-nowrap z-20"
            style={{
              left: Math.min(Math.max(x(activeIdx) - 60, 0), Math.max(0, w - 170)),
              top: 0,
            }}
          >
            <div className="font-bold opacity-80">{dates[activeIdx] ? formatShortDate(dates[activeIdx]) : ''}</div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 font-black">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.name}: {fmtInt(s.points[activeIdx]?.value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
