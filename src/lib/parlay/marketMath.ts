import { MARKETS, type Direction, type MarketLine } from "@/lib/types";

/**
 * Look up the market price for a line the user chose.
 * A whole-number line N on an over/under ("244+") settles exactly like the
 * half-point line N - 0.5, so both are checked. Returns undefined when the
 * market doesn't list that line — we never invent a price.
 */
export function marketOddsFor(market: MarketLine, direction: Direction, line: number | null): number | undefined {
  const valid = (n: number) => (Number.isFinite(n) ? n : undefined);
  if (MARKETS[market.market].kind === "yes_no") {
    return valid(direction === "no" ? market.underOdds : market.overOdds);
  }
  if (line === null) return undefined;
  const candidates = Number.isInteger(line) ? [line, line - 0.5] : [line];
  const pickPrice = (o: { overOdds: number; underOdds: number }) => valid(direction === "under" ? o.underOdds : o.overOdds);
  for (const c of candidates) {
    if (market.line === c) return pickPrice(market);
    const alt = market.alternates?.find((a) => a.line === c);
    if (alt) return pickPrice(alt);
  }
  return undefined;
}

export type LineComparison = { tone: "easier" | "harder" | "even"; delta: number };

/** How the user's line compares to the market main line, from the bettor's side. */
export function compareToMarket(market: MarketLine, direction: Direction, line: number | null): LineComparison | null {
  if (market.line === null || line === null) return null;
  // Normalize "244+" to 243.5 so it compares like-for-like with half-point lines.
  const effective = Number.isInteger(line) ? line - 0.5 : line;
  const raw = market.line - effective; // positive = user's line is lower than market
  const signed = direction === "under" ? -raw : raw;
  if (Math.abs(signed) < 0.5) return { tone: "even", delta: 0 };
  return { tone: signed > 0 ? "easier" : "harder", delta: Math.abs(raw) };
}

/** Sensible +/- step for the line stepper. */
export function lineStep(market: MarketLine): number {
  const unit = MARKETS[market.market].unit;
  return unit === "yds" ? 5 : 1;
}

/** Parse a user-typed American odds string. Empty string -> undefined; invalid -> null. */
export function parseOddsInput(input: string): number | undefined | null {
  const trimmed = input.trim();
  if (trimmed === "") return undefined;
  if (!/^[+-]?\d{3,5}$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Math.abs(n) >= 100 ? n : null;
}
