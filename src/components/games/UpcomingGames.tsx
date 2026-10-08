import { loadSlate } from "@/lib/sports/queries";
import { UpcomingGamesClient } from "./UpcomingGamesClient";

/** Server component: loads the slate once (cached) and hands it to the client tabs. */
export async function UpcomingGames() {
  const data = await loadSlate();
  return <UpcomingGamesClient data={data} />;
}
