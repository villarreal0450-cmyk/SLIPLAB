"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "cn";
import { PlayerAvatar } from "@/components/games/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { formatOdds } from "@/lib/odds";
import { MAX_LEGS } from "@/lib/parlay/draft";
import { formatLine } from "@/lib/parlay/format";
import { compareToMarket, lineStep, marketOddsFor, parseOddsInput } from "@/lib/parlay/marketMath";
import { useParlayDraft } from "@/lib/parlay/store";
import { MARKETS, type Direction, type MarketLine, type Pick, type Player, type Team } from "@/lib/types";

export type ComposerTarget = {
  player: Player;
  team: Team;
  opponent: Team;
  market: MarketLine;
};

type PickComposerProps = {
  target: ComposerTarget;
  /** The pick already in the slip for this player + market, if any. */
  existing: Pick | null;
  onDone: () => void;
};

/**
 * Form for one selection: direction, line and optional odds.
 * Mount with a `key` per target so initial state comes from props.
 */
export function PickComposer({ target, existing, onDone }: PickComposerProps) {
  const { player, team, opponent, market } = target;
  const def = MARKETS[market.market];
  const isYesNo = def.kind === "yes_no";
  const unpriced = market.priced === false;
  const { upsertPick, removePick } = useParlayDraft();
  const ids = { line: useId(), odds: useId(), error: useId() };

  const initialDirection: Direction = existing?.direction ?? (isYesNo ? "yes" : "over");
  const initialLine = existing ? existing.line : market.line;
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [lineInput, setLineInput] = useState(initialLine === null ? "" : String(initialLine));
  const [oddsInput, setOddsInput] = useState(() => {
    const odds = existing?.odds ?? marketOddsFor(market, initialDirection, initialLine);
    return odds === undefined ? "" : formatOdds(odds);
  });
  const [oddsTouched, setOddsTouched] = useState(existing?.odds !== undefined && existing.odds !== marketOddsFor(market, initialDirection, initialLine));
  const [error, setError] = useState<string | null>(null);

  const line = isYesNo ? null : lineInput.trim() === "" ? NaN : Number(lineInput);
  const lineValid = isYesNo || (Number.isFinite(line) && (line as number) > 0);
  const comparison = lineValid ? compareToMarket(market, direction, line) : null;
  const marketPrice = lineValid ? marketOddsFor(market, direction, line) : undefined;

  /** Re-sync the odds field with the market unless the user typed their own price. */
  function syncOdds(nextDirection: Direction, nextLine: number | null) {
    if (oddsTouched) return;
    const price = marketOddsFor(market, nextDirection, nextLine);
    setOddsInput(price === undefined ? "" : formatOdds(price));
  }

  function changeDirection(next: Direction) {
    setDirection(next);
    syncOdds(next, isYesNo ? null : Number.isFinite(line) ? (line as number) : null);
  }

  function changeLine(next: string) {
    setLineInput(next);
    setError(null);
    const n = Number(next);
    syncOdds(direction, next.trim() !== "" && Number.isFinite(n) ? n : null);
  }

  function step(delta: number) {
    const base = Number.isFinite(line) ? (line as number) : (market.line ?? (def.unit === "yds" ? 50 : 1));
    const next = Math.max(0.5, Math.round((base + delta) * 2) / 2);
    changeLine(String(next));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!lineValid) {
      setError("Enter a line greater than zero.");
      return;
    }
    const odds = parseOddsInput(oddsInput);
    if (odds === null) {
      setError("Odds should look like -115 or +140.");
      return;
    }
    const pick: Pick = {
      id: existing?.id ?? crypto.randomUUID(),
      sport: team.sport,
      gameId: market.gameId,
      playerId: player.id,
      playerName: player.name,
      teamId: team.id,
      opponentTeamId: opponent.id,
      market: market.market,
      direction,
      line: isYesNo ? null : (line as number),
      odds,
      isAlternate: unpriced || isYesNo ? undefined : line !== market.line,
      meta: { teamAbbr: team.abbreviation, opponentAbbr: opponent.abbreviation, position: player.position, teamColor: team.color, headshotUrl: player.headshotUrl },
    };
    const result = upsertPick(pick);
    if (result.error === "max_legs") {
      setError(`A slip can hold up to ${MAX_LEGS} legs.`);
      return;
    }
    onDone();
  }

  const directions: Direction[] = isYesNo ? ["yes", "no"] : ["over", "under"];
  const alternates = (market.alternates ?? []).filter((a) => a.line !== market.line);

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" aria-describedby={error ? ids.error : undefined}>
      <div className="flex items-center gap-3">
        <PlayerAvatar name={player.name} color={team.color} imageUrl={player.headshotUrl} size="lg" />
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight">{player.name}</p>
          <p className="text-sm text-muted-foreground">
            {team.abbreviation} · {player.position} · vs {opponent.abbreviation}
          </p>
        </div>
      </div>

      {unpriced && (
        <p className="-mb-2 rounded-2xl border border-border bg-surface-sunken p-3 text-xs leading-relaxed text-muted-foreground">
          No sportsbook line is loaded for this prop. Enter the line{isYesNo ? "" : " and odds"} from your slip; the analysis will use real stats and skip the market comparison.
        </p>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{def.label}</p>
        <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-sunken p-1">
          {directions.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => changeDirection(d)}
              className={cn(
                "rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors",
                direction === d ? "bg-surface-elevated text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d}
              {isYesNo && !unpriced && (
                <span className="ml-1.5 font-normal text-muted-foreground tabular">
                  {formatOdds(d === "yes" ? market.overOdds : market.underOdds)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {!isYesNo && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor={ids.line} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your line
            </label>
            {!unpriced && <span className="text-xs text-muted-foreground tabular">Market {market.line}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="icon-lg" className="size-12 rounded-2xl" onClick={() => step(-lineStep(market))} aria-label="Lower line">
              <Minus />
            </Button>
            <input
              id={ids.line}
              inputMode="decimal"
              value={lineInput}
              onChange={(e) => changeLine(e.target.value.replace(/[^\d.]/g, ""))}
              aria-invalid={!lineValid}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-input bg-surface-sunken text-center text-2xl font-semibold tracking-tight outline-none tabular focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            <Button type="button" variant="secondary" size="icon-lg" className="size-12 rounded-2xl" onClick={() => step(lineStep(market))} aria-label="Raise line">
              <Plus />
            </Button>
          </div>
          <p className="mt-2 min-h-5 text-center text-sm" aria-live="polite">
            {lineValid && (
              <span className="text-muted-foreground">
                {formatLine(market.market, direction, line)} {def.unit}
              </span>
            )}
            {comparison && comparison.tone !== "even" && (
              <span className={comparison.tone === "easier" ? "text-positive" : "text-caution"}>
                {" · "}
                {comparison.delta} {def.unit} {comparison.tone === "easier" ? "easier than market" : "more aggressive than market"}
              </span>
            )}
            {comparison?.tone === "even" && <span className="text-muted-foreground"> · at the market line</span>}
          </p>
          {alternates.length > 0 && (
            <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Alternate lines">
              {alternates.map((alt) => {
                const active = line === alt.line;
                return (
                  <button
                    key={alt.line}
                    type="button"
                    onClick={() => changeLine(String(alt.line))}
                    aria-pressed={active}
                    className={cn(
                      "shrink-0 rounded-xl border px-2.5 py-1.5 text-xs tabular transition-colors",
                      active ? "border-brand/50 bg-brand/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="font-semibold text-foreground">{alt.line}</span>{" "}
                    {formatOdds(direction === "under" ? alt.underOdds : alt.overOdds)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor={ids.odds} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Odds <span className="normal-case tracking-normal">(optional)</span>
          </label>
          {marketPrice !== undefined && !oddsTouched && <span className="text-xs text-muted-foreground">From market</span>}
        </div>
        <input
          id={ids.odds}
          inputMode="numeric"
          placeholder="e.g. -115"
          value={oddsInput}
          onChange={(e) => {
            setOddsTouched(true);
            setError(null);
            setOddsInput(e.target.value.replace(/[^\d+-]/g, ""));
          }}
          className="h-11 w-full rounded-2xl border border-input bg-surface-sunken px-4 text-base outline-none tabular placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </div>

      {error && (
        <p id={ids.error} role="alert" className="-mt-2 text-sm text-negative">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {existing && (
          <Button
            type="button"
            variant="secondary"
            className="h-12 rounded-2xl px-4"
            onClick={() => {
              removePick(existing.id);
              onDone();
            }}
            aria-label="Remove from parlay"
          >
            <Trash2 />
          </Button>
        )}
        <Button type="submit" className="h-12 flex-1 rounded-2xl text-base font-semibold">
          {existing ? "Update pick" : "Add to parlay"}
        </Button>
      </div>
    </form>
  );
}
