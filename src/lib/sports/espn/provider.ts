import { SPORTS, type DataSourceInfo, type MarketKey, type SportKey } from "@/lib/types";
import type { TheOddsApi } from "../odds/theOddsApi";
import type { SportsDataProvider } from "../provider";
import { parseGameId, parsePlayerId, sportOfTeamId } from "./ids";
import { EspnLeague } from "./league";
import { LEAGUES } from "./leagues";

export { nextWeekOf } from "./league";

/**
 * Live data for every league from ESPN's public site API: schedules, teams,
 * rosters, injuries, game logs and team stats. No key required. These
 * endpoints are public but undocumented, so every read is defensive and
 * cached; swap in a licensed feed before a large public launch.
 *
 * Player props come from The Odds API when a key is set and it has credits
 * (lines and prices). Otherwise they fall back to the sportsbook lines ESPN
 * republishes for free (lines only, no prices). Players either source leaves
 * out stay bettable with a line the user enters.
 */
export class EspnSportsDataProvider implements SportsDataProvider {
  private lastUpdated: string | null = null;
  private readonly leagues: Record<SportKey, EspnLeague>;

  constructor(private readonly odds: TheOddsApi | null) {
    const touch = () => {
      this.lastUpdated = new Date().toISOString();
    };
    this.leagues = Object.fromEntries((Object.keys(SPORTS) as SportKey[]).map((s) => [s, new EspnLeague(LEAGUES[s], odds, touch)])) as Record<SportKey, EspnLeague>;
  }

  get info(): DataSourceInfo {
    return { provider: this.odds ? "espn+the-odds-api" : "espn", isMock: false, asOf: this.lastUpdated ?? new Date(0).toISOString() };
  }

  private byGame(gameId: string) {
    const parsed = parseGameId(gameId);
    return parsed ? this.leagues[parsed.sport] : null;
  }
  private byPlayer(playerId: string) {
    const parsed = parsePlayerId(playerId);
    return parsed ? this.leagues[parsed.sport] : null;
  }
  private byTeam(teamId: string) {
    const sport = sportOfTeamId(teamId);
    return sport ? this.leagues[sport] : null;
  }

  async getGames(params?: { sport?: SportKey; from?: string; to?: string }) {
    const leagues = params?.sport ? [this.leagues[params.sport]] : Object.values(this.leagues);
    // One league being down (or out of season) never empties the others.
    const lists = await Promise.all(
      leagues.map((l) =>
        l.getGames().catch((error) => {
          console.warn(`ESPN ${l.spec.sport} schedule unavailable: ${error instanceof Error ? error.message : String(error)}`);
          return [];
        }),
      ),
    );
    return lists
      .flat()
      .filter((g) => (!params?.from || g.startsAt >= params.from) && (!params?.to || g.startsAt <= params.to))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  async getGame(gameId: string) {
    return (await this.byGame(gameId)?.getGame(gameId)) ?? null;
  }
  async getGameOdds(gameId: string) {
    return (await this.byGame(gameId)?.getGameOdds(gameId)) ?? null;
  }

  async getTeams(sport: SportKey) {
    return this.leagues[sport].getTeams().catch(() => []);
  }
  async getTeam(teamId: string) {
    return (await this.byTeam(teamId)?.getTeam(teamId)) ?? null;
  }
  async getTeamStats(teamId: string) {
    return (await this.byTeam(teamId)?.getTeamStats(teamId).catch(() => null)) ?? null;
  }

  async getPlayer(playerId: string) {
    return (await this.byPlayer(playerId)?.getPlayer(playerId)) ?? null;
  }
  async getPlayersForTeam(teamId: string) {
    return (await this.byTeam(teamId)?.getPlayersForTeam(teamId)) ?? [];
  }
  async getPlayersForGame(gameId: string) {
    return (await this.byGame(gameId)?.getPlayersForGame(gameId)) ?? [];
  }
  async getPlayerGameLog(playerId: string, options?: { limit?: number }) {
    return (await this.byPlayer(playerId)?.getPlayerGameLog(playerId, options)) ?? [];
  }
  async getPlayerSeasonStats(playerId: string) {
    return (await this.byPlayer(playerId)?.getPlayerSeasonStats(playerId)) ?? null;
  }

  async getInjuries(teamId: string) {
    return (await this.byTeam(teamId)?.getInjuries(teamId)) ?? [];
  }

  async getExpertProjection(playerId: string, gameId: string) {
    return (await this.byGame(gameId)?.getExpertProjection(playerId, gameId).catch(() => null)) ?? null;
  }

  async getPlayerProps(gameId: string) {
    return (await this.byGame(gameId)?.getPlayerProps(gameId)) ?? [];
  }
  async getMarketLine(playerId: string, gameId: string, market: MarketKey) {
    return (await this.getPlayerProps(gameId)).find((m) => m.playerId === playerId && m.market === market) ?? null;
  }
}
