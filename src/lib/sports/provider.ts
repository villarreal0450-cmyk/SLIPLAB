import type {
  DataSourceInfo,
  Game,
  GameOdds,
  Injury,
  MarketKey,
  MarketLine,
  Player,
  PlayerGameLog,
  PlayerSeasonStats,
  SportKey,
  Team,
  TeamStats,
} from "@/lib/types";

/**
 * SportsDataProvider is the only way the app reads sports data.
 *
 * UI and analysis code depend on this interface, never on a vendor SDK, so a
 * real provider (e.g. SportsDataIO, The Odds API, ESPN) can be added later by
 * implementing this interface and registering it in `./index.ts`.
 *
 * Every method returns normalized domain types from `@/lib/types`.
 */
export interface SportsDataProvider {
  /** Where the data comes from. UI uses `isMock` to label demo data honestly. */
  readonly info: DataSourceInfo;

  getGames(params?: { sport?: SportKey; from?: string; to?: string }): Promise<Game[]>;
  getGame(gameId: string): Promise<Game | null>;

  getTeams(sport: SportKey): Promise<Team[]>;
  getTeam(teamId: string): Promise<Team | null>;
  getTeamStats(teamId: string): Promise<TeamStats | null>;

  getPlayer(playerId: string): Promise<Player | null>;
  getPlayersForTeam(teamId: string): Promise<Player[]>;
  getPlayersForGame(gameId: string): Promise<Player[]>;
  getPlayerGameLog(playerId: string, options?: { limit?: number }): Promise<PlayerGameLog[]>;
  getPlayerSeasonStats(playerId: string): Promise<PlayerSeasonStats | null>;

  getInjuries(teamId: string): Promise<Injury[]>;

  getPlayerProps(gameId: string): Promise<MarketLine[]>;
  getMarketLine(playerId: string, gameId: string, market: MarketKey): Promise<MarketLine | null>;
  getGameOdds(gameId: string): Promise<GameOdds | null>;
}
