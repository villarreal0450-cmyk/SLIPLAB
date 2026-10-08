"use client";

import { useState } from "react";
import type { Direction, Projection } from "@/lib/types";
import { ChartTooltip } from "./ChartTooltip";

const W = 320;
const H = 150;
const PAD_X = 6;
const TOP = 26;
const BASE = 118;
const BAR_MAX = 24;

/** Rounded data-end on top, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${BASE} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${BASE} Z`;
}

function niceTicks(lo: number, hi: number) {
  const span = hi - lo;
  const step = [1, 2, 5, 10, 25, 50, 100].find((s) => span / s <= 5) ?? 100;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  return ticks;
}

type ProjectionChartProps = {
  projection: Projection;
  direction: Direction;
  unit: string;
};

/**
 * Model outcome distribution with the user's line marked. Bars that clear the
 * line are filled with the accent; the rest stay neutral. Deliberately no
 * percentages: the shape is a model sketch, not a probability guarantee.
 */
export function ProjectionChart({ projection, direction, unit }: ProjectionChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const buckets = projection.distribution;
  const lo = buckets[0].bucketStart;
  const hi = buckets[buckets.length - 1].bucketEnd;
  const xOf = (v: number) => PAD_X + ((v - lo) / (hi - lo)) * (W - PAD_X * 2);
  const band = (W - PAD_X * 2) / buckets.length;
  const barW = Math.min(BAR_MAX, band - 2);
  const maxW = Math.max(...buckets.map((b) => b.weight));
  const line = projection.line;
  const clears = (mid: number) => (line === null ? false : direction === "under" ? mid < line : mid >= line);
  const lineX = line === null ? null : Math.min(W - PAD_X, Math.max(PAD_X, xOf(line)));
  const activeBucket = active !== null ? buckets[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Projected outcomes for this pick, centered near ${projection.value} ${unit}${line !== null ? `, with your line at ${line}` : ""}.`}
        onMouseLeave={() => setActive(null)}
      >
        <line x1={PAD_X} x2={W - PAD_X} y1={BASE} y2={BASE} className="stroke-border-strong" strokeWidth={1} />

        {buckets.map((b, i) => {
          const h = Math.max(2, (b.weight / maxW) * (BASE - TOP));
          const x = PAD_X + i * band + (band - barW) / 2;
          const mid = (b.bucketStart + b.bucketEnd) / 2;
          const hit = clears(mid);
          return (
            <g
              key={b.bucketStart}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
              aria-label={`${b.bucketStart} to ${b.bucketEnd} ${unit}, ${hit ? "clears" : "short of"} your line`}
            >
              <rect x={PAD_X + i * band} y={TOP - 10} width={band} height={BASE - TOP + 10} fill="transparent" />
              <path
                d={barPath(x, BASE - h, barW, h)}
                className={hit ? "fill-brand" : "fill-foreground/15"}
                opacity={active === null || active === i ? 1 : 0.55}
              />
            </g>
          );
        })}

        {lineX !== null && (
          <g aria-hidden="true">
            <line x1={lineX} x2={lineX} y1={TOP - 12} y2={BASE} className="stroke-foreground/70" strokeWidth={1.5} />
            <text x={lineX} y={TOP - 16} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
              {line}
            </text>
          </g>
        )}

        {niceTicks(lo, hi).map((t) => (
          <text key={t} x={xOf(t)} y={BASE + 16} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular">
            {t}
          </text>
        ))}
      </svg>

      {activeBucket && active !== null && (
        <ChartTooltip xPct={((PAD_X + (active + 0.5) * band) / W) * 100} yPct={(TOP / H) * 100}>
          <span className="font-medium tabular">
            {activeBucket.bucketStart}–{activeBucket.bucketEnd} {unit}
          </span>
          <span className="ml-1.5 text-muted-foreground">
            {clears((activeBucket.bucketStart + activeBucket.bucketEnd) / 2) ? "clears your line" : "short of your line"}
          </span>
        </ChartTooltip>
      )}
    </div>
  );
}
