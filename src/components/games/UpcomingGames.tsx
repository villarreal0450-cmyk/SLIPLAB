import { connection } from "next/server";
import { loadSlate, withoutFinishedGames } from "@/lib/sports/queries";
import { UpcomingGamesClient } from "./UpcomingGamesClient";

/**
 * Server component: loads the slate (cached for a few minutes) on every
 * request and hands it to the client tabs. Rendering per request means a
 * visitor never gets a days-old prerendered list after a quiet stretch.
 */
export async function UpcomingGames() {
  await connection();
  const data = await loadSlate();
  return <UpcomingGamesClient data={{ ...data, games: withoutFinishedGames(data.games) }} />;
}
