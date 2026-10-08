import { cacheLife } from "next/cache";
import { DEFAULT_MARKETS_BY_POSITION, SPORTS, unpricedMarket, type Game, type GameOdds, type Injury, type MarketLine, type Player, type SportKey, type Team } from "@/lib/types";
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
  cacheLife("minutes");
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
    games: games.filter((g) => g.status !== "final"),
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
  /** True when at least one sportsbook quote is loaded for this game. */
  priced: boolean;
};

const POSITION_ORDER = ["QB", "RB", "WR", "TE"];
const unquoted = (p: BoardPlayer) => (p.props.some((m) => m.priced !== false) ? 0 : 1);
/** Players who won't play sink to the bottom; you can still find them. */
const unavailable = (p: BoardPlayer) => (p.injury && (p.injury.status === "out" || p.injury.status === "ir") ? 1 : 0);

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
      .map((player) => {
        const quoted = props.filter((m) => m.playerId === player.id);
        const quotedKeys = new Set(quoted.map((m) => m.market));
        // Every skill player is bettable: quoted markets first, then the usual markets for the position.
        const defaults = (DEFAULT_MARKETS_BY_POSITION[player.position] ?? [])
          .filter((k) => !quotedKeys.has(k))
          .map((k) => unpricedMarket(player.id, game.id, k));
        return { player, injury: injuries.find((i) => i.playerId === player.id) ?? null, props: [...quoted, ...defaults] };
      })
      .filter((p) => p.props.length > 0)
      // Position, then players with sportsbook quotes, then name.
      .sort(
        (a, b) =>
          unavailable(a) - unavailable(b) ||
          POSITION_ORDER.indexOf(a.player.position) - POSITION_ORDER.indexOf(b.player.position) ||
          unquoted(a) - unquoted(b) ||
          a.player.name.localeCompare(b.player.name),
      ),
  });

  return {
    game,
    home,
    away,
    odds,
    injuries,
    teams: [buildTeam(away, home), buildTeam(home, away)],
    isMock: provider.info.isMock,
    priced: props.length > 0,
  };
}

export async function listGameIds(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  const games = await getSportsDataProvider().getGames();
  return games.map((g) => g.id);
}
