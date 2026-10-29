import { cacheLife } from "next/cache";
import { defaultMarketsFor, SPORTS, unpricedMarket, type Game, type GameOdds, type Injury, type MarketLine, type Player, type SportKey, type Team } from "@/lib/types";
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
  // Refresh within five minutes and never serve a slate older than 30.
  cacheLife({ stale: 60, revalidate: 5 * 60, expire: 30 * 60 });
  const provider = getSportsDataProvider();
  const sportKeys = Object.keys(SPORTS) as SportKey[];
  const all = (await provider.getGames()).filter((g) => g.status !== "final");
  const playing = new Set(all.flatMap((g) => [g.homeTeamId, g.awayTeamId]));
  const teamLists = await Promise.all(sportKeys.map((s) => provider.getTeams(s)));
  // Only the teams on the slate: college football alone has hundreds.
  const teams: Record<string, Team> = {};
  for (const t of teamLists.flat()) if (playing.has(t.id)) teams[t.id] = t;
  return {
    sports: sportKeys.map((key) => ({ key, label: SPORTS[key].label })),
    games: all,
    teams,
    isMock: provider.info.isMock,
  };
}

/** A game this long past its start is over even if a cached slate still says otherwise. */
const GAME_LENGTH_MS = 4.5 * 60 * 60 * 1000;

/** Drop games that must be over by now. Call at request time only. */
export function withoutFinishedGames(games: Game[], now = Date.now()): Game[] {
  return games.filter((g) => Date.parse(g.startsAt) + GAME_LENGTH_MS > now);
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

/** Roster order on the board, per sport: the positions that carry the most props first. */
const POSITION_ORDER: Record<SportKey, string[]> = {
  nfl: ["QB", "RB", "WR", "TE"],
  ncaaf: ["QB", "RB", "WR", "TE"],
  nba: ["PG", "G", "SG", "SF", "F", "PF", "C"],
  nhl: ["C", "LW", "RW", "F", "D", "G"],
  mlb: ["SP", "C", "IF", "OF", "DH", "RP"],
};
const positionRank = (p: Player) => {
  const i = POSITION_ORDER[p.sport].indexOf(p.position);
  return i < 0 ? 99 : i;
};
const unquoted = (p: BoardPlayer) => (p.props.some((m) => m.priced !== false) ? 0 : 1);
/** Players who won't play sink to the bottom; you can still find them. */
const unavailable = (p: BoardPlayer) => (p.injury && (p.injury.status === "out" || p.injury.status === "ir") ? 1 : 0);

/** Everything the pick builder needs for one game. Null when the game doesn't exist. */
export async function loadGameBoard(gameId: string): Promise<GameBoard | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 5 * 60, expire: 30 * 60 });
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
        const defaults = defaultMarketsFor(player.sport, player.position)
          .filter((k) => !quotedKeys.has(k))
          .map((k) => unpricedMarket(player.id, game.id, k));
        return { player, injury: injuries.find((i) => i.playerId === player.id) ?? null, props: [...quoted, ...defaults] };
      })
      .filter((p) => p.props.length > 0)
      // Position, then players with sportsbook quotes, then name.
      .sort(
        (a, b) =>
          unavailable(a) - unavailable(b) ||
          positionRank(a.player) - positionRank(b.player) ||
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
