import { cacheLife } from "next/cache";
import { SPORTS, type Game, type GameOdds, type Injury, type MarketLine, type Player, type SportKey, type Team } from "@/lib/types";
import { getSportsDataProvider } from ".";

/**
 * Cached read models for pages. Pages call these instead of the provider so
 * caching policy lives in one place. All return plain serializable objects.
 */

export type SlateData = {
  sports: { key: SportKey; label: string }[];
  games: Game[];
  teams: Record<string, Team>;
  isMock: boolean;
};

export async function loadSlate(): Promise<SlateData> {
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

export type BoardPlayer = {
  player: Player;
  injury: Injury | null;
  props: MarketLine[];
};

export type BoardTeam = {
  team: Team;
  opponent: Team;
  players: BoardPlayer[];
};

export type GameBoard = {
  game: Game;
  home: Team;
  away: Team;
  odds: GameOdds | null;
  injuries: Injury[];
  /** Away team first, matching "AWAY @ HOME". */
  teams: [BoardTeam, BoardTeam];
  isMock: boolean;
};

/** Everything the pick builder needs for one game. Null when the game doesn't exist. */
export async function loadGameBoard(gameId: string): Promise<GameBoard | null> {
  "use cache";
  cacheLife("minutes");
  const provider = getSportsDataProvider();
  const game = await provider.getGame(gameId);
  if (!game) return null;

  const [home, away, odds, players, props, homeInjuries, awayInjuries] = await Promise.all([
    provider.getTeam(game.homeTeamId),
    provider.getTeam(game.awayTeamId),
    provider.getGameOdds(game.id),
    provider.getPlayersForGame(game.id),
    provider.getPlayerProps(game.id),
    provider.getInjuries(game.homeTeamId),
    provider.getInjuries(game.awayTeamId),
  ]);
  if (!home || !away) return null;

  const injuries = [...awayInjuries, ...homeInjuries];
  const buildTeam = (team: Team, opponent: Team): BoardTeam => ({
    team,
    opponent,
    players: players
      .filter((p) => p.teamId === team.id)
      .map((player) => ({
        player,
        injury: injuries.find((i) => i.playerId === player.id) ?? null,
        props: props.filter((m) => m.playerId === player.id),
      }))
      // Only players with at least one market are pickable.
      .filter((p) => p.props.length > 0),
  });

  return {
    game,
    home,
    away,
    odds,
    injuries,
    teams: [buildTeam(away, home), buildTeam(home, away)],
    isMock: provider.info.isMock,
  };
}

export async function listGameIds(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  const games = await getSportsDataProvider().getGames();
  return games.map((g) => g.id);
}
