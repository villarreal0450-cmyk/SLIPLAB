import type { MarketKey, MarketLine } from "@/lib/types";

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
  items?: {
    athlete?: { $ref?: string };
    type?: { name?: string };
    lastUpdated?: string;
    current?: { target?: { value?: number } };
  }[];
};

/** ESPN prop type name → our market. Full-game totals only; halves, quarters and milestones are skipped. */
const PROP_TYPES: Record<string, MarketKey> = {
  "Total Passing Yards (incl. overtime)": "passing_yards",
  "Total Pass Completions (incl. overtime)": "completions",
  "Total Passing Touchdowns (incl. overtime)": "passing_tds",
  "Total Rushing Yards (incl. overtime)": "rushing_yards",
  "Total Carries (incl. overtime)": "rushing_attempts",
  "Total Receiving Yards (incl. overtime)": "receiving_yards",
  "Total Receptions (incl. overtime)": "receptions",
};

/** The first sportsbook in the odds list that publishes player props, as an https URL listing all of them. */
export function propBetsUrl(list: EspnOddsList): { url: string; book: string } | null {
  const item = list.items?.find((i) => i.propBets?.$ref);
  if (!item?.propBets?.$ref) return null;
  const url = new URL(item.propBets.$ref.replace(/^http:/, "https:"));
  url.searchParams.set("limit", "1000");
  return { url: url.toString(), book: item.provider?.name ?? "sportsbook" };
}

/** Pure: ESPN prop bets → one priceless MarketLine per player and market (exported for tests). */
export function mapEspnPropBets(data: EspnPropBets, gameId: string): MarketLine[] {
  const lines = new Map<string, MarketLine>();
  for (const item of data.items ?? []) {
    const market = PROP_TYPES[item.type?.name ?? ""];
    const athleteId = item.athlete?.$ref?.match(/athletes\/(\d+)/)?.[1];
    const line = item.current?.target?.value;
    if (!market || !athleteId || typeof line !== "number" || !Number.isFinite(line)) continue;
    const playerId = `espn-${athleteId}`;
    const key = `${playerId}:${market}`;
    if (lines.has(key)) continue; // ESPN lists each prop twice, once per side.
    lines.set(key, {
      playerId,
      gameId,
      market,
      line,
      overOdds: Number.NaN,
      underOdds: Number.NaN,
      updatedAt: item.lastUpdated ?? "",
    });
  }
  return [...lines.values()];
}
