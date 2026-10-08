"use client";

import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { useId } from "react";
import { cn } from "cn";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { formatOdds } from "@/lib/odds";
import { describePick } from "@/lib/parlay/format";
import { parseOddsInput } from "@/lib/parlay/marketMath";
import { pickFor } from "@/lib/scan/normalize";
import type { CatalogGame, CatalogPlayer, NormalizedLeg } from "@/lib/scan/types";
import { MARKETS, type Direction, type MarketKey, type Pick } from "@/lib/types";

export type ReviewState = {
  include: boolean;
  playerId: string | null;
  market: MarketKey | null;
  direction: Direction;
  lineInput: string;
  oddsInput: string;
};

export function initialReview(leg: NormalizedLeg): ReviewState {
  const p = leg.pick;
  return {
    include: leg.status !== "unmatched",
    playerId: p?.playerId ?? null,
    market: p?.market ?? null,
    direction: p?.direction ?? leg.raw.direction ?? "over",
    lineInput: p?.line != null ? String(p.line) : leg.raw.line != null ? String(leg.raw.line) : "",
    oddsInput: p?.odds !== undefined ? formatOdds(p.odds) : leg.raw.odds != null ? formatOdds(leg.raw.odds) : "",
  };
}

/** Resolve the edited state into a Pick, or explain what's still missing. */
export function resolveReview(state: ReviewState, players: CatalogPlayer[], id: string): { pick: Pick } | { problem: string } {
  const player = players.find((p) => p.id === state.playerId);
  if (!player) return { problem: "Choose a player." };
  if (!state.market) return { problem: "Choose a prop." };
  const def = MARKETS[state.market];
  const line = def.kind === "yes_no" ? null : Number(state.lineInput);
  if (def.kind === "over_under" && (!state.lineInput.trim() || !Number.isFinite(line) || (line as number) <= 0)) return { problem: "Add the line." };
  const odds = parseOddsInput(state.oddsInput);
  if (odds === null) return { problem: "Odds should look like -115 or +140." };
  const direction: Direction = def.kind === "yes_no" ? (state.direction === "no" ? "no" : "yes") : state.direction === "under" ? "under" : "over";
  return { pick: pickFor(player, state.market, direction, line, odds, id) };
}

type LegReviewCardProps = {
  leg: NormalizedLeg;
  state: ReviewState;
  catalog: CatalogGame[];
  onChange: (next: ReviewState) => void;
};

const STATUS = {
  ready: { icon: CircleCheck, label: "Ready", className: "text-positive" },
  review: { icon: CircleAlert, label: "Check this", className: "text-caution" },
  unmatched: { icon: CircleX, label: "Not found", className: "text-negative" },
} as const;

export function LegReviewCard({ leg, state, catalog, onChange }: LegReviewCardProps) {
  const ids = { player: useId(), market: useId(), line: useId(), odds: useId(), include: useId() };
  const players = catalog.flatMap((g) => g.players);
  const player = players.find((p) => p.id === state.playerId) ?? null;
  const markets = player?.markets ?? [];
  const def = state.market ? MARKETS[state.market] : null;
  const resolved = resolveReview(state, players, leg.id);
  const status = STATUS[leg.status];
  const StatusIcon = status.icon;

  const set = (patch: Partial<ReviewState>) => onChange({ ...state, ...patch });

  return (
    <li className={cn("surface flex flex-col gap-3 p-4 transition-opacity", !state.include && "opacity-60")}>
      <div className="flex items-start gap-3">
        <PlayerAvatar name={player?.name ?? leg.raw.player ?? "?"} color={player?.teamColor} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold tracking-tight">{"pick" in resolved ? resolved.pick.playerName : (leg.raw.player ?? "Unknown player")}</p>
          <p className="truncate text-xs text-muted-foreground">{"pick" in resolved ? describePick(resolved.pick) : leg.raw.raw_text}</p>
        </div>
        <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium", status.className)}>
          <StatusIcon className="size-3.5" aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <p className="rounded-xl bg-surface-sunken px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Read from slip:</span> {leg.raw.raw_text}
      </p>

      {leg.issues.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-caution">
          {leg.issues.map((i) => (
            <li key={i}>• {i}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label htmlFor={ids.player} className="col-span-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
          Player
          <select
            id={ids.player}
            value={state.playerId ?? ""}
            onChange={(e) => {
              const next = players.find((p) => p.id === e.target.value);
              const keepMarket = next?.markets.some((m) => m.market === state.market);
              set({ playerId: e.target.value || null, market: keepMarket ? state.market : (next?.markets[0]?.market ?? null) });
            }}
            className="h-10 rounded-xl border border-input bg-surface-sunken px-2 text-sm text-foreground outline-none focus-visible:border-ring"
          >
            <option value="">Choose…</option>
            {catalog.map((g) => (
              <optgroup key={g.gameId} label={g.label}>
                {g.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.teamAbbr} {p.position})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label htmlFor={ids.market} className="col-span-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
          Prop
          <select
            id={ids.market}
            value={state.market ?? ""}
            disabled={!player}
            onChange={(e) => {
              const market = (e.target.value || null) as MarketKey | null;
              const kind = market ? MARKETS[market].kind : null;
              set({ market, direction: kind === "yes_no" ? "yes" : state.direction === "yes" || state.direction === "no" ? "over" : state.direction });
            }}
            className="h-10 rounded-xl border border-input bg-surface-sunken px-2 text-sm text-foreground outline-none focus-visible:border-ring disabled:opacity-50"
          >
            <option value="">Choose…</option>
            {markets.map((m) => (
              <option key={m.market} value={m.market}>
                {MARKETS[m.market].label}
                {m.line !== null ? ` (market ${m.line})` : ""}
              </option>
            ))}
          </select>
        </label>
        {def?.kind === "over_under" && (
          <>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Side
              <select
                value={state.direction}
                onChange={(e) => set({ direction: e.target.value as Direction })}
                className="h-10 rounded-xl border border-input bg-surface-sunken px-2 text-sm text-foreground outline-none focus-visible:border-ring"
              >
                <option value="over">Over</option>
                <option value="under">Under</option>
              </select>
            </label>
            <label htmlFor={ids.line} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Line
              <input
                id={ids.line}
                inputMode="decimal"
                value={state.lineInput}
                onChange={(e) => set({ lineInput: e.target.value.replace(/[^\d.]/g, "") })}
                className="h-10 rounded-xl border border-input bg-surface-sunken px-2 text-sm text-foreground outline-none tabular focus-visible:border-ring"
              />
            </label>
          </>
        )}
        <label htmlFor={ids.odds} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Odds
          <input
            id={ids.odds}
            inputMode="numeric"
            placeholder="optional"
            value={state.oddsInput}
            onChange={(e) => set({ oddsInput: e.target.value.replace(/[^\d+-]/g, "") })}
            className="h-10 rounded-xl border border-input bg-surface-sunken px-2 text-sm text-foreground outline-none tabular focus-visible:border-ring"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label htmlFor={ids.include} className="flex items-center gap-2 text-sm">
          <input id={ids.include} type="checkbox" checked={state.include} onChange={(e) => set({ include: e.target.checked })} className="size-4 accent-[var(--brand)]" />
          Include in slip
        </label>
        {state.include && "problem" in resolved && <span className="text-xs text-negative">{resolved.problem}</span>}
      </div>
    </li>
  );
}
