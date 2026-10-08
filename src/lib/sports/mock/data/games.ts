import type { Game, GameOdds } from "@/lib/types";
import { teamId } from "./teams";

/**
 * Upcoming slate. Dates are fixed so the demo is deterministic; the mock
 * provider does not shift them to "today".
 */
export const games: Game[] = [
  {
    id: "nfl-2026-w5-atl-no",
    sport: "nfl",
    homeTeamId: teamId("ATL"),
    awayTeamId: teamId("NO"),
    startsAt: "2026-10-09T18:15:00-05:00",
    status: "scheduled",
    venue: "Mercedes-Benz Stadium",
    week: 5,
    weather: { tempF: 72, windMph: 0, precipitationChance: 0, isDome: true },
  },
  {
    id: "nfl-2026-w5-tb-dal",
    sport: "nfl",
    homeTeamId: teamId("TB"),
    awayTeamId: teamId("DAL"),
    startsAt: "2026-10-08T19:15:00-05:00",
    status: "scheduled",
    venue: "Raymond James Stadium",
    week: 5,
    weather: { tempF: 81, windMph: 8, precipitationChance: 0.2, isDome: false },
  },
  {
    id: "nfl-2026-w5-kc-den",
    sport: "nfl",
    homeTeamId: teamId("KC"),
    awayTeamId: teamId("DEN"),
    startsAt: "2026-10-12T14:25:00-05:00",
    status: "scheduled",
    venue: "GEHA Field at Arrowhead Stadium",
    week: 5,
    weather: { tempF: 64, windMph: 12, precipitationChance: 0.1, isDome: false },
  },
];

export const gameOdds: GameOdds[] = [
  {
    gameId: "nfl-2026-w5-atl-no",
    homeSpread: -4.5,
    total: 44.5,
    homeMoneyline: -210,
    awayMoneyline: 175,
    updatedAt: "2026-10-07T12:00:00Z",
  },
  {
    gameId: "nfl-2026-w5-tb-dal",
    homeSpread: 2.5,
    total: 49.5,
    homeMoneyline: 115,
    awayMoneyline: -135,
    updatedAt: "2026-10-07T12:00:00Z",
  },
  {
    gameId: "nfl-2026-w5-kc-den",
    homeSpread: -3,
    total: 46.5,
    homeMoneyline: -160,
    awayMoneyline: 135,
    updatedAt: "2026-10-07T12:00:00Z",
  },
];
