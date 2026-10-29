import type { MarketKey, MarketLine } from "@/lib/types";
import { playerIdFor } from "./ids";
import type { LeagueSpec } from "./leagues";

/**
 * ESPN's core API republishes one sportsbook's player props (DraftKings at the
 * time of writing) for free. It carries the line for each player and market
 * but no prices, so these lines have NaN odds: the engine can compare a pick to
 * the market line, but nothing shows or computes a payout from them.
 */

export type EspnOddsList = {
  items?: { provider?: { id?: string; name?: string }; propBets?: { $ref?: string } }[];
};

export type EspnPropBets = {
  pageCount?: number;
  items?: {
    athlete?: { $ref?: string };
    type?: { name?: string };
    lastUpdated?: string;
    current?: { target?: { value?: number } };
  }[];
};

/** The first sportsbook in the odds list that publishes player props, as an https URL for one page of them. */
export function propBetsUrl(list: EspnOddsList, page = 1): { url: string; book: string } | null {
  const item = list.items?.find((i) => i.propBets?.$ref);
  if (!item?.propBets?.$ref) return null;
  const url = new URL(item.propBets.$ref.replace(/^http:/, "https:"));
  url.searchParams.set("limit", "1000");
  if (page > 1) url.searchParams.set("page", String(page));
  return { url: url.toString(), book: item.provider?.name ?? "sportsbook" };
}

/**
 * Pure: ESPN prop bets → one priceless MarketLine per player and market.
 * Full-game totals win; an "N or more" milestone fills in when the book posts
 * no total for that market (its lowest rung becomes an N − 0.5 line).
 */
export function mapEspnPropBets(spec: LeagueSpec, data: EspnPropBets, gameId: string): MarketLine[] {
  const lines = new Map<string, MarketLine>();
  const milestones = new Map<string, { playerId: string; market: MarketKey; target: number; updatedAt: string }>();

  for (const item of data.items ?? []) {
    const name = item.type?.name ?? "";
    const athleteId = item.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1];
    const target = item.current?.target?.value;
    if (!athleteId || typeof target !== "number" || !Number.isFinite(target)) continue;
    const playerId = playerIdFor(spec.sport, athleteId);

    const market = spec.propTypes[name];
    if (market) {
      const key = `${playerId}:${market}`;
      if (lines.has(key)) continue; // ESPN lists each total twice, once per side.
      lines.set(key, { playerId, gameId, market, line: target, overOdds: Number.NaN, underOdds: Number.NaN, updatedAt: item.lastUpdated ?? "" });
      continue;
    }
    const milestone = spec.milestoneTypes[name];
    if (milestone) {
      const key = `${playerId}:${milestone}`;
      const prev = milestones.get(key);
      if (!prev || target < prev.target) milestones.set(key, { playerId, market: milestone, target, updatedAt: item.lastUpdated ?? "" });
    }
  }

  for (const [key, m] of milestones) {
    if (lines.has(key)) continue;
    const line = Number.isInteger(m.target) ? m.target - 0.5 : m.target;
    if (line <= 0) continue;
    lines.set(key, { playerId: m.playerId, gameId, market: m.market, line, overOdds: Number.NaN, underOdds: Number.NaN, updatedAt: m.updatedAt, milestone: true });
  }
  return [...lines.values()];
}
