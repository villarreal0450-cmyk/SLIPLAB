"use client";

import { useState } from "react";
import type { RecentGame } from "@/lib/analysis";
import { ChartTooltip } from "./ChartTooltip";

const W = 320;
const H = 170;
const TOP = 22;
const BASE = 132;
const PAD_X = 6;
const BAR_MAX = 24;

function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${BASE} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${BASE} Z`;
}

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Last N games as columns against the user's line. Hits are green; misses stay neutral. */
export function RecentGamesChart({ games, line, unit }: { games: RecentGame[]; line: number | null; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const values = games.map((g) => g.value ?? 0);
  const max = Math.max(...values, line ?? 0) * 1.12 || 1;
  const yOf = (v: number) => BASE - (v / max) * (BASE - TOP);
  const band = (W - PAD_X * 2) / games.length;
  const barW = Math.min(BAR_MAX, band - 2);
  const g = active !== null ? games[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Last ${games.length} games: ${games.map((x) => `${x.value ?? "no data"} vs ${x.opponentAbbr}`).join(", ")}${line !== null ? `. Your line is ${line}.` : "."}`}
        onMouseLeave={() => setActive(null)}
      >
        <line x1={PAD_X} x2={W - PAD_X} y1={BASE} y2={BASE} className="stroke-border-strong" strokeWidth={1} />

        {games.map((game, i) => {
          const v = game.value ?? 0;
          const h = Math.max(2, BASE - yOf(v));
          const cx = PAD_X + i * band + band / 2;
          return (
            <g
              key={`${game.date}-${i}`}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
              aria-label={`${shortDate(game.date)} ${game.isHome ? "vs" : "at"} ${game.opponentAbbr}: ${game.value ?? "no data"} ${unit}, ${game.hit ? "hit" : "miss"}`}
            >
              <rect x={PAD_X + i * band} y={TOP - 14} width={band} height={H - TOP} fill="transparent" />
              <path
                d={barPath(cx - barW / 2, BASE - h, barW, h)}
                className={game.hit ? "fill-positive" : "fill-foreground/20"}
                opacity={active === null || active === i ? 1 : 0.55}
              />
              <text x={cx} y={BASE - h - 6} textAnchor="middle" className="fill-foreground text-[11px] font-semibold tabular">
                {game.value ?? "–"}
              </text>
              <text x={cx} y={BASE + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {game.isHome ? "vs" : "@"} {game.opponentAbbr}
              </text>
              <text x={cx} y={BASE + 30} textAnchor="middle" className={`text-[10px] font-medium ${game.hit ? "fill-positive" : "fill-muted-foreground"}`}>
                {game.hit === null ? "" : game.hit ? "Hit" : "Miss"}
              </text>
            </g>
          );
        })}

        {line !== null && (
          <g aria-hidden="true">
            <line x1={PAD_X} x2={W - PAD_X} y1={yOf(line)} y2={yOf(line)} className="stroke-foreground/60" strokeWidth={1.5} />
          </g>
        )}
      </svg>

      {line !== null && (
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground tabular">
          <span aria-hidden="true" className="h-[1.5px] w-4 bg-foreground/60" />
          Your line {line}
        </p>
      )}

      {g && active !== null && (
        <ChartTooltip xPct={((PAD_X + (active + 0.5) * band) / W) * 100} yPct={(TOP / H) * 100}>
          <span className="text-muted-foreground">{shortDate(g.date)} · {g.isHome ? "vs" : "@"} {g.opponentAbbr}</span>
          <span className="ml-1.5 font-medium tabular">
            {g.value ?? "–"} {unit}
          </span>
        </ChartTooltip>
      )}
    </div>
  );
}
