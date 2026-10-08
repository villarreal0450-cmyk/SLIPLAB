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
import type { SportsDataProvider } from "../provider";
import { gameOdds, games } from "./data/games";
import { marketLines } from "./data/markets";
import { players } from "./data/players";
import { gameLogs, injuries, seasonStats, teamStats } from "./data/stats";
import { teams } from "./data/teams";

/**
 * In-memory provider backed by hand-written demo data.
 *
 * It exists so the product can be built and demoed before any sports API is
 * wired up. Nothing here is live data, and `info.isMock` is true so the UI can
 * say so. The small artificial latency keeps loading states honest.
 */
export class MockSportsDataProvider implements SportsDataProvider {
  readonly info: DataSourceInfo = {
    provider: "mock",
    isMock: true,
    asOf: "2026-10-07T12:00:00Z",
  };

  constructor(private readonly latencyMs = 0) {}

  private async delay<T>(value: T): Promise<T> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
    return value;
  }

  getGames(params?: { sport?: SportKey; from?: string; to?: string }) {
    const list = games
      .filter((g) => !params?.sport || g.sport === params.sport)
      .filter((g) => !params?.from || g.startsAt >= params.from)
      .filter((g) => !params?.to || g.startsAt <= params.to)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return this.delay(list);
  }

  getGame(gameId: string) {
    return this.delay(games.find((g) => g.id === gameId) ?? null);
  }

  getTeams(sport: SportKey) {
    return this.delay(teams.filter((t) => t.sport === sport));
  }

  getTeam(teamId: string) {
    return this.delay(teams.find((t) => t.id === teamId) ?? null);
  }

  getTeamStats(teamId: string) {
    return this.delay(teamStats.find((t) => t.teamId === teamId) ?? null);
  }

  getPlayer(playerId: string) {
    return this.delay(players.find((p) => p.id === playerId) ?? null);
  }

  getPlayersForTeam(teamId: string) {
    return this.delay(players.filter((p) => p.teamId === teamId));
  }

  async getPlayersForGame(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game) return [];
    return players.filter((p) => p.teamId === game.homeTeamId || p.teamId === game.awayTeamId);
  }

  getPlayerGameLog(playerId: string, options?: { limit?: number }) {
    const list = gameLogs
      .filter((l) => l.playerId === playerId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return this.delay(options?.limit ? list.slice(0, options.limit) : list);
  }

  getPlayerSeasonStats(playerId: string) {
    return this.delay(seasonStats.find((s) => s.playerId === playerId) ?? null);
  }

  getInjuries(teamId: string) {
    return this.delay(injuries.filter((i) => i.teamId === teamId));
  }

  getPlayerProps(gameId: string) {
    return this.delay(marketLines.filter((m) => m.gameId === gameId));
  }

  getMarketLine(playerId: string, gameId: string, market: MarketKey) {
    return this.delay(
      marketLines.find((m) => m.playerId === playerId && m.gameId === gameId && m.market === market) ?? null,
    );
  }

  getGameOdds(gameId: string) {
    return this.delay(gameOdds.find((o) => o.gameId === gameId) ?? null);
  }
}

export type { Game, GameOdds, Injury, MarketLine, Player, PlayerGameLog, PlayerSeasonStats, Team, TeamStats };
