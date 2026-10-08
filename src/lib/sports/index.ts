import { EspnSportsDataProvider } from "./espn/provider";
import { MockSportsDataProvider } from "./mock/mockProvider";
import { TheOddsApi } from "./odds/theOddsApi";
import type { SportsDataProvider } from "./provider";

export type { SportsDataProvider } from "./provider";

let cached: SportsDataProvider | null = null;

/**
 * Resolve the active sports data provider.
 *
 * Selection is driven by `SPORTS_DATA_PROVIDER`:
 *   - "espn": live NFL schedule, rosters, injuries and stats (no key), plus
 *     player props from The Odds API when ODDS_API_KEY is set
 *   - "mock": the labelled demo slate (tests, offline work)
 * Callers must never instantiate providers directly.
 */
export function getSportsDataProvider(): SportsDataProvider {
  if (cached) return cached;

  const kind = process.env.SPORTS_DATA_PROVIDER ?? "mock";
  switch (kind) {
    case "mock":
      cached = new MockSportsDataProvider();
      return cached;
    case "espn": {
      const key = process.env.ODDS_API_KEY?.trim();
      cached = new EspnSportsDataProvider(key ? new TheOddsApi(key, process.env.ODDS_API_ALTERNATES === "true") : null);
      return cached;
    }
    default:
      throw new Error(
        `Unknown SPORTS_DATA_PROVIDER "${kind}". Use "espn" or "mock". See src/lib/sports/index.ts.`,
      );
  }
}
