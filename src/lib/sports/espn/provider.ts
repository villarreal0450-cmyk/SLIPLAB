import type { DataSourceInfo, Game, GameOdds, Injury, MarketKey, MarketLine, Player, PlayerGameLog, PlayerSeasonStats, SportKey, Team, TeamStats } from "@/lib/types";
import { fetchJson, HOUR, MINUTE } from "../http";
import type { TheOddsApi } from "../odds/theOddsApi";
import type { SportsDataProvider } from "../provider";
import {
  athleteIdOf,
  eventIdOf,
  mapAthlete,
  mapEvent,
  mapGameLog,
  mapInjuries,
  mapTeam,
  mapTeamLine,
  PROP_POSITIONS,
  playerIdFor,
  seasonAverages,
  teamIdFor,
  type TeamLine,
} from "./map";
import { mapEspnPropBets, propBetsUrl, type EspnOddsList, type EspnPropBets } from "./props";
import type { EspnAthlete, EspnEvent, EspnGameLog, EspnInjuries, EspnRoster, EspnScoreboard, EspnTeamRef, EspnTeamStatistics, EspnTeams } from "./types";

/**
 * NFL data from ESPN's public site API: schedule, teams, rosters, injuries,
 * game logs and team stats. No key required. These endpoints are public but
 * undocumented, so every read is defensive and cached; swap in a licensed
 * feed before a large public launch.
 *
 * Player props come from The Odds API when a key is set and it has credits
 * (lines and prices). Otherwise they fall back to the sportsbook lines ESPN
 * republishes for free (lines only, no prices). Players either source leaves
 * out stay bettable with a line the user enters.
 */

const SITE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const WEB = "https://site.web.api.espn.com/apis/common/v3/sports/football/nfl";
const CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

type TeamIndex = { teams: Team[]; byId: Map<string, Team>; espnIdByTeamId: Map<string, string>; abbrByEspnId: Map<string, string> };

export class EspnSportsDataProvider implements SportsDataProvider {
  private lastUpdated: string | null = null;

  constructor(private readonly odds: TheOddsApi | null) {}

  get info(): DataSourceInfo {
    return { provider: this.odds ? "espn+the-odds-api" : "espn", isMock: false, asOf: this.lastUpdated ?? new Date(0).toISOString() };
  }

  private get<T>(url: string, ttlMs: number) {
    return fetchJson<T>(url, { ttlMs }).then((v) => {
      this.lastUpdated = new Date().toISOString();
      return v;
    });
  }

  /* ---------- teams ---------- */

  private async index(): Promise<TeamIndex> {
    const data = await this.get<EspnTeams>(`${SITE}/teams`, 24 * HOUR);
    const refs = data.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) ?? [];
    const teams = refs.map(mapTeam);
    return {
      teams,
      byId: new Map(teams.map((t) => [t.id, t])),
      espnIdByTeamId: new Map(refs.map((r) => [teamIdFor(r.abbreviation), r.id])),
      abbrByEspnId: new Map(refs.map((r) => [r.id, r.abbreviation])),
    };
  }

  async getTeams(sport: SportKey) {
    return sport === "nfl" ? (await this.index()).teams : [];
  }

  async getTeam(teamId: string) {
    return (await this.index()).byId.get(teamId) ?? null;
  }

  /* ---------- schedule ---------- */

  private async slate(): Promise<{ games: Game[]; odds: Map<string, GameOdds> }> {
    const sb = await this.get<EspnScoreboard>(`${SITE}/scoreboard`, 5 * MINUTE);
    const games: Game[] = [];
    const odds = new Map<string, GameOdds>();
    for (const e of sb.events ?? []) {
      const mapped = mapEvent(e);
      if (!mapped) continue;
      games.push(mapped.game);
      if (mapped.odds) odds.set(mapped.game.id, mapped.odds);
    }
    return { games: games.sort((a, b) => a.startsAt.localeCompare(b.startsAt)), odds };
  }

  async getGames(params?: { sport?: SportKey; from?: string; to?: string }) {
    if (params?.sport && params.sport !== "nfl") return [];
    const { games } = await this.slate();
    return games.filter((g) => (!params?.from || g.startsAt >= params.from) && (!params?.to || g.startsAt <= params.to));
  }

  async getGame(gameId: string) {
    const fromSlate = (await this.slate()).games.find((g) => g.id === gameId);
    if (fromSlate) return fromSlate;
    // Older or future games (e.g. a saved bet from last week): read the game summary.
    const eventId = eventIdOf(gameId);
    if (!eventId) return null;
    try {
      const s = await this.get<{
        header?: { id: string; week?: number; competitions?: { date: string; competitors?: { homeAway: "home" | "away"; score?: string; team: EspnTeamRef }[]; status?: EspnEvent["status"] }[] };
        gameInfo?: { venue?: { fullName?: string } };
      }>(`${SITE}/summary?event=${eventId}`, 30 * MINUTE);
      const c = s.header?.competitions?.[0];
      if (!s.header || !c) return null;
      return (
        mapEvent({ id: s.header.id, date: c.date, week: { number: s.header.week }, status: c.status, competitions: [{ venue: s.gameInfo?.venue, competitors: c.competitors }] })?.game ?? null
      );
    } catch {
      return null;
    }
  }

  async getGameOdds(gameId: string) {
    return (await this.slate()).odds.get(gameId) ?? null;
  }

  /* ---------- players ---------- */

  async getPlayersForTeam(teamId: string): Promise<Player[]> {
    const espnId = (await this.index()).espnIdByTeamId.get(teamId);
    if (!espnId) return [];
    const roster = await this.get<EspnRoster>(`${SITE}/teams/${espnId}/roster`, 6 * HOUR);
    const offense = roster.athletes?.find((g) => g.position === "offense")?.items ?? [];
    return offense
      .filter((a) => !a.status?.type || a.status.type === "active")
      .map((a) => mapAthlete(a, teamId))
      .filter((p) => PROP_POSITIONS.has(p.position));
  }

  async getPlayersForGame(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game) return [];
    const [away, home] = await Promise.all([this.getPlayersForTeam(game.awayTeamId), this.getPlayersForTeam(game.homeTeamId)]);
    return [...away, ...home];
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const athleteId = athleteIdOf(playerId);
    if (!athleteId) return null;
    try {
      const data = await this.get<{ athlete?: EspnAthlete & { team?: { abbreviation?: string } } }>(`${WEB}/athletes/${athleteId}`, 6 * HOUR);
      const a = data.athlete;
      if (!a?.team?.abbreviation) return null;
      return mapAthlete(a, teamIdFor(a.team.abbreviation));
    } catch {
      return null;
    }
  }

  private async fullLog(playerId: string): Promise<PlayerGameLog[]> {
    const athleteId = athleteIdOf(playerId);
    if (!athleteId) return [];
    const [log, idx] = await Promise.all([this.get<EspnGameLog>(`${WEB}/athletes/${athleteId}/gamelog`, 2 * HOUR), this.index()]);
    return mapGameLog(playerIdFor(athleteId), log, idx.abbrByEspnId);
  }

  async getPlayerGameLog(playerId: string, options?: { limit?: number }) {
    const logs = await this.fullLog(playerId).catch(() => []);
    return options?.limit ? logs.slice(0, options.limit) : logs;
  }

  async getPlayerSeasonStats(playerId: string): Promise<PlayerSeasonStats | null> {
    const logs = await this.fullLog(playerId).catch(() => []);
    if (!logs.length) return null;
    return { playerId, season: Number(logs[0].date.slice(0, 4)), gamesPlayed: logs.length, averages: seasonAverages(logs) };
  }

  /* ---------- injuries ---------- */

  async getInjuries(teamId: string): Promise<Injury[]> {
    const [payload, idx] = await Promise.all([this.get<EspnInjuries>(`${SITE}/injuries`, 30 * MINUTE).catch(() => ({}) as EspnInjuries), this.index()]);
    return mapInjuries(payload, idx.abbrByEspnId).filter((i) => i.teamId === teamId);
  }

  /* ---------- team stats (ranked across the league) ---------- */

  private async league(): Promise<Map<string, TeamLine>> {
    const idx = await this.index();
    const entries = await Promise.all(
      [...idx.espnIdByTeamId.entries()].map(async ([teamId, espnId]) => {
        try {
          const line = mapTeamLine(await this.get<EspnTeamStatistics>(`${SITE}/teams/${espnId}/statistics`, 6 * HOUR));
          return line ? ([teamId, line] as const) : null;
        } catch {
          return null;
        }
      }),
    );
    return new Map(entries.filter((e): e is readonly [string, TeamLine] => e !== null));
  }

  async getTeamStats(teamId: string): Promise<TeamStats | null> {
    const league = await this.league();
    const line = league.get(teamId);
    if (!line) return null;
    // Rank 1 = stingiest defense (fewest yards allowed per game).
    const rankBy = (pick: (l: TeamLine) => number) => 1 + [...league.values()].filter((l) => pick(l) < pick(line)).length;
    const plays = line.passAttempts + line.rushAttempts;
    return {
      teamId,
      season: new Date().getFullYear(),
      gamesPlayed: line.games,
      offense: {
        pointsPerGame: line.pointsPerGame,
        passRate: plays ? Math.round((line.passAttempts / plays) * 100) / 100 : 0.55,
        playsPerGame: Math.round((line.plays / line.games) * 10) / 10,
        passYardsPerGame: line.passYardsPerGame,
        rushYardsPerGame: line.rushYardsPerGame,
      },
      defense: {
        pointsAllowedPerGame: line.allowed.points,
        passYardsAllowedPerGame: line.allowed.passYards,
        passYardsAllowedRank: rankBy((l) => l.allowed.passYards),
        rushYardsAllowedPerGame: line.allowed.rushYards,
        rushYardsAllowedRank: rankBy((l) => l.allowed.rushYards),
        receivingYardsAllowedPerGame: line.allowed.recYards,
        rushTdsAllowedPerGame: line.allowed.rushTds,
        sacksPerGame: line.sacksPerGame,
      },
    };
  }

  /* ---------- props ---------- */

  async getPlayerProps(gameId: string): Promise<MarketLine[]> {
    // Never spend odds credits or hammer ESPN while prerendering pages at build
    // time; pages fetch props on the first real request instead.
    if (process.env.NEXT_PHASE === "phase-production-build") return [];
    const game = await this.getGame(gameId);
    if (!game || game.status !== "scheduled") return [];

    const [priced, espn] = await Promise.all([this.pricedProps(game), this.espnProps(gameId)]);
    // Priced lines win; ESPN's lines fill in any player and market the odds source left out.
    const have = new Set(priced.map((m) => `${m.playerId}:${m.market}`));
    return [...priced, ...espn.filter((m) => !have.has(`${m.playerId}:${m.market}`))];
  }

  /** Lines with prices from The Odds API, or [] when it isn't configured, is out of credits or fails. */
  private async pricedProps(game: Game): Promise<MarketLine[]> {
    if (!this.odds) return [];
    const [home, away, players] = await Promise.all([this.getTeam(game.homeTeamId), this.getTeam(game.awayTeamId), this.getPlayersForGame(game.id)]);
    if (!home || !away) return [];
    try {
      return await this.odds.propsForGame(game.id, game.startsAt, home, away, players);
    } catch (error) {
      console.warn(`Priced player props unavailable, using ESPN lines: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /** Free sportsbook lines (no prices) that ESPN republishes. */
  private async espnProps(gameId: string): Promise<MarketLine[]> {
    const eventId = eventIdOf(gameId);
    if (!eventId) return [];
    try {
      const list = await this.get<EspnOddsList>(`${CORE}/events/${eventId}/competitions/${eventId}/odds?lang=en&region=us`, 30 * MINUTE);
      const source = propBetsUrl(list);
      if (!source) return [];
      return mapEspnPropBets(await this.get<EspnPropBets>(source.url, 30 * MINUTE), gameId);
    } catch (error) {
      console.warn(`ESPN player props unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getMarketLine(playerId: string, gameId: string, market: MarketKey) {
    return (await this.getPlayerProps(gameId)).find((m) => m.playerId === playerId && m.market === market) ?? null;
  }
}
