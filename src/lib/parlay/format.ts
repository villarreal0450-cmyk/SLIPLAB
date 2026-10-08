import { formatOdds } from "@/lib/odds";
import { MARKETS, type Direction, type MarketKey, type Pick } from "@/lib/types";

/**
 * Human label for a pick's line.
 *   over 244     -> "244+"      (whole-number lines read like sportsbook alt lines)
 *   over 265.5   -> "Over 265.5"
 *   under 265.5  -> "Under 265.5"
 *   anytime TD   -> "Yes" / "No"
 */
export function formatLine(market: MarketKey, direction: Direction, line: number | null): string {
  const def = MARKETS[market];
  if (def.kind === "yes_no" || line === null) return direction === "no" ? "No" : "Yes";
  if (direction === "over") return Number.isInteger(line) ? `${line}+` : `Over ${line}`;
  return `Under ${line}`;
}

/** Compact one-line description, e.g. "244+ Passing Yards" or "Anytime TD". */
export function describePick(pick: Pick): string {
  const def = MARKETS[pick.market];
  if (def.kind === "yes_no") return pick.direction === "no" ? `No ${def.shortLabel}` : def.label;
  return `${formatLine(pick.market, pick.direction, pick.line)} ${def.label}`;
}

export function formatPickOdds(pick: Pick): string {
  return pick.odds === undefined ? "" : formatOdds(pick.odds);
}

/** Stable identity for "same selection": one player, one market. */
export function selectionKey(pick: Pick | { playerId: string; market: MarketKey }): string {
  return `${pick.playerId}:${pick.market}`;
}
