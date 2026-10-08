import { cacheLife } from "next/cache";
import { getSportsDataProvider } from "@/lib/sports";
import { SPORTS, type Game, type SportKey, type Team } from "@/lib/types";
import { UpcomingGamesClient } from "./UpcomingGamesClient";

export type UpcomingGamesData = {
  sports: { key: SportKey; label: string }[];
  games: Game[];
  teams: Record<string, Team>;
  isMock: boolean;
};

async function loadUpcomingGames(): Promise<UpcomingGamesData> {
  "use cache";
  cacheLife("hours");
  const provider = getSportsDataProvider();
  const sportKeys = Object.keys(SPORTS) as SportKey[];
  const [games, teamLists] = await Promise.all([
    provider.getGames(),
    Promise.all(sportKeys.map((s) => provider.getTeams(s))),
  ]);
  const teams: Record<string, Team> = {};
  for (const t of teamLists.flat()) teams[t.id] = t;
  return {
    sports: sportKeys.map((key) => ({ key, label: SPORTS[key].label })),
    games,
    teams,
    isMock: provider.info.isMock,
  };
}

/** Server component: loads the slate once (cached) and hands it to the client tabs. */
export async function UpcomingGames() {
  const data = await loadUpcomingGames();
  return <UpcomingGamesClient data={data} />;
}
