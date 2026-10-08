import { MockSportsDataProvider } from "./mock/mockProvider";
import type { SportsDataProvider } from "./provider";

export type { SportsDataProvider } from "./provider";

let cached: SportsDataProvider | null = null;

/**
 * Resolve the active sports data provider.
 *
 * Selection is driven by `SPORTS_DATA_PROVIDER`. Only "mock" exists today; a
 * real provider is added by implementing `SportsDataProvider` and adding a case
 * here. Callers must never instantiate providers directly.
 */
export function getSportsDataProvider(): SportsDataProvider {
  if (cached) return cached;

  const kind = process.env.SPORTS_DATA_PROVIDER ?? "mock";
  switch (kind) {
    case "mock":
      cached = new MockSportsDataProvider();
      return cached;
    default:
      throw new Error(
        `Unknown SPORTS_DATA_PROVIDER "${kind}". Only "mock" is implemented. See src/lib/sports/index.ts.`,
      );
  }
}
