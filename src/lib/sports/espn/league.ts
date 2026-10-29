import type { ExpertProjection, Game, GameOdds, Injury, MarketLine, MatchupSignal, Player, PlayerGameLog, PlayerSeasonStats, SignalKey, Team, TeamStats } from "@/lib/types";
import { fetchJson, HOUR, MINUTE } from "../http";
import type { TheOddsApi } from "../odds/theOddsApi";
import { gameIdFor, parseGameId, parsePlayerId, playerIdFor, teamIdFor } from "./ids";
import type { LeagueSpec } from "./leagues";
import {
  baseballSignals,
  basketballSignals,
  footballSignals,
  hockeySignals,
  mapAthlete,
  mapEvent,
  mapGameLog,
  mapInjuries,
  mapTeam,
  mapTeamLine,
  rankSignals,
  seasonAverages,
  type TeamLine,
} from "./map";
import { fetchFantasyProjections, toExpertProjection } from "./projections";
import { mapEspnPropBets, propBetsUrl, type EspnOddsList, type EspnPropBets } from "./props";
import type { EspnAthlete, EspnEvent, EspnGameLog, EspnInjuries, EspnRoster, EspnScoreboard, EspnTeamRef, EspnTeamStatistics, EspnTeams } from "./types";

const SITE = "https://site.api.espn.com/apis/site/v2/sports";
const WEB = "https://site.web.api.espn.com/apis/common/v3/sports";
const CORE = "https://sports.core.api.espn.com/v2/sports";

/** Below this many games this season, last season's games are blended in. */
const THIN_SEASON = 5;

type TeamIndex = { teams: Team[]; byId: Map<string, Team>; espnIdByTeamId: Map<string, string>; teamIdByEspnId: Map<string, string> };
type Slate = { games: Game[]; odds: Map<string, GameOdds>; seasonYear: number | null };
type LeagueTable = { signals: Map<string, Partial<Record<SignalKey, MatchupSignal>>>; lines: Map<string, TeamLine> };

/** One ESPN league (NFL, NBA, ...). The provider facade routes every call to the right one by id. */
export class EspnLeague {
  private table: { at: number; value: Promise<LeagueTable> } | null = null;

  constructor(
    readonly spec: LeagueSpec,
    private readonly odds: TheOddsApi | null,
    private readonly touch: () => void,
  ) {}

  private get site() {
    return `${SITE}/${this.spec.path}`;
  }
  private get web() {
    return `${WEB}/${this.spec.path}`;
  }
  private get core() {
    const [sport, league] = this.spec.path.split("/");
    return `${CORE}/${sport}/leagues/${league}`;
  }

  private get<T>(url: string, ttlMs: number) {
    return fetchJson<T>(url, { ttlMs }).then((v) => {
      this.touch();
      return v;
    });
  }

  /* ---------- teams ---------- */

  private async index(): Promise<TeamIndex> {
    const data = await this.get<EspnTeams>(`${this.site}/teams?limit=1000`, 24 * HOUR);
    const refs = data.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) ?? [];
    const teams = refs.map((r) => mapTeam(this.spec.sport, r));
    return {
      teams,
      byId: new Map(teams.map((t) => [t.id, t])),
      espnIdByTeamId: new Map(refs.map((r) => [teamIdFor(this.spec.sport, r), r.id])),
      teamIdByEspnId: new Map(refs.map((r) => [r.id, teamIdFor(this.spec.sport, r)])),
    };
  }

  async getTeams(): Promise<Team[]> {
    return (await this.index()).teams;
  }

  async getTeam(teamId: string) {
    return (await this.index()).byId.get(teamId) ?? null;
  }

  /* ---------- schedule ---------- */

  async slate(): Promise<Slate> {
    const events = await this.events();
    const games: Game[] = [];
    const odds = new Map<string, GameOdds>();
    for (const e of events.list) {
      const mapped = mapEvent(this.spec, e);
      if (!mapped) continue;
      games.push(mapped.game);
      if (mapped.odds) odds.set(mapped.game.id, mapped.odds);
    }
    return { games: games.sort((a, b) => a.startsAt.localeCompare(b.startsAt)), odds, seasonYear: events.seasonYear };
  }

  private async events(): Promise<{ list: EspnEvent[]; seasonYear: number | null }> {
    const schedule = this.spec.schedule;
    if (schedule.mode === "week") {
      const q = schedule.query ? `?${schedule.query}` : "";
      let sb = await this.get<EspnScoreboard>(`${this.site}/scoreboard${q}`, 5 * MINUTE);
      // ESPN keeps showing a finished week until midweek. Once every game in it
      // is over, load the next week right away.
      const next = nextWeekOf(sb, schedule.lastRegularWeek);
      if (next) {
        try {
          const sep = q ? "&" : "?";
          const upcoming = await this.get<EspnScoreboard>(`${this.site}/scoreboard${q}${sep}seasontype=${next.seasonType}&week=${next.week}`, 5 * MINUTE);
          if (upcoming.events?.length) sb = upcoming;
        } catch {
          // Keep the finished week; it is filtered out downstream.
        }
      }
      return { list: sb.events ?? [], seasonYear: sb.season?.year ?? null };
    }

    // Daily leagues: today and the next few days (US Eastern dates, as ESPN uses).
    const days = Array.from({ length: schedule.days }, (_, i) => easternDate(i));
    const boards = await Promise.all(days.map((d) => this.get<EspnScoreboard>(`${this.site}/scoreboard?dates=${d}`, 5 * MINUTE).catch(() => null)));
    const seen = new Set<string>();
    const list: EspnEvent[] = [];
    for (const b of boards) {
      for (const e of b?.events ?? []) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        list.push(e);
      }
    }
    return { list, seasonYear: boards.find((b) => b?.season?.year)?.season?.year ?? null };
  }

  async getGames() {
    return (await this.slate()).games;
  }

  async getGame(gameId: string): Promise<Game | null> {
    const fromSlate = (await this.slate()).games.find((g) => g.id === gameId);
    if (fromSlate) return fromSlate;
    // Older or future games (e.g. a saved bet from last week): read the game summary.
    const eventId = parseGameId(gameId)?.id;
    if (!eventId) return null;
    try {
      const s = await this.get<{
        header?: {
          id: string;
          week?: number;
          competitions?: { date: string; competitors?: { homeAway: "home" | "away"; score?: string; team: EspnTeamRef }[]; status?: EspnEvent["status"] }[];
        };
        gameInfo?: { venue?: { fullName?: string } };
      }>(`${this.site}/summary?event=${eventId}`, 30 * MINUTE);
      const c = s.header?.competitions?.[0];
      if (!s.header || !c) return null;
      return (
        mapEvent(this.spec, { id: s.header.id, date: c.date, week: { number: s.header.week }, status: c.status, competitions: [{ venue: s.gameInfo?.venue, competitors: c.competitors }] })?.game ??
        null
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
    const roster = await this.get<EspnRoster | { athletes?: EspnAthlete[] }>(`${this.site}/teams/${espnId}/roster`, 6 * HOUR);
    const raw = (roster.athletes ?? []) as (EspnAthlete | { position?: string; items?: EspnAthlete[] })[];
    const grouped = raw.some((g) => "items" in g);
    const athletes: EspnAthlete[] = grouped
      ? (raw as { position?: string; items?: EspnAthlete[] }[])
          .filter((g) => !this.spec.rosterGroups || this.spec.rosterGroups.includes(g.position ?? ""))
          .flatMap((g) => g.items ?? [])
      : (raw as EspnAthlete[]);
    return athletes
      .filter((a) => !a.status?.type || a.status.type === "active")
      .map((a) => mapAthlete(this.spec, a, teamId))
      .filter((p) => this.spec.propPositions.has(p.position));
  }

  async getPlayersForGame(gameId: string) {
    const game = await this.getGame(gameId);
    if (!game) return [];
    const [away, home] = await Promise.all([this.getPlayersForTeam(game.awayTeamId), this.getPlayersForTeam(game.homeTeamId)]);
    return [...away, ...home];
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const athleteId = parsePlayerId(playerId)?.id;
    if (!athleteId) return null;
    try {
      const data = await this.get<{ athlete?: EspnAthlete & { team?: { id?: string; abbreviation?: string } } }>(`${this.web}/athletes/${athleteId}`, 6 * HOUR);
      const a = data.athlete;
      if (!a?.team?.abbreviation) return null;
      return mapAthlete(this.spec, a, teamIdFor(this.spec.sport, { id: a.team.id ?? a.team.abbreviation, abbreviation: a.team.abbreviation }));
    } catch {
      return null;
    }
  }

  /**
   * This season's games, plus last season's when this season is too thin to
   * read (a player back from injury, the first weeks of a season).
   */
  async fullLog(playerId: string): Promise<{ logs: PlayerGameLog[]; lastSeasonGames: number }> {
    const athleteId = parsePlayerId(playerId)?.id;
    if (!athleteId) return { logs: [], lastSeasonGames: 0 };
    const idx = await this.index();
    const id = playerIdFor(this.spec.sport, athleteId);
    const log = await this.get<EspnGameLog>(`${this.web}/athletes/${athleteId}/gamelog`, 2 * HOUR);
    const current = mapGameLog(this.spec, id, log, idx.teamIdByEspnId);
    if (current.length >= THIN_SEASON) return { logs: current, lastSeasonGames: 0 };

    const year = seasonYearOf(log) ?? (await this.currentSeasonYear());
    if (!year) return { logs: current, lastSeasonGames: 0 };
    try {
      const prevLog = await this.get<EspnGameLog>(`${this.web}/athletes/${athleteId}/gamelog?season=${year - 1}`, 24 * HOUR);
      const have = new Set(current.map((g) => g.gameId));
      const previous = mapGameLog(this.spec, id, prevLog, idx.teamIdByEspnId).filter((g) => !have.has(g.gameId));
      return { logs: [...current, ...previous], lastSeasonGames: previous.length };
    } catch {
      return { logs: current, lastSeasonGames: 0 };
    }
  }

  /** The league's current season year as ESPN numbers it (NBA 2026-27 is 2027). */
  private async currentSeasonYear(): Promise<number | null> {
    try {
      const sb = await this.get<EspnScoreboard>(`${this.site}/scoreboard`, 6 * HOUR);
      return sb.season?.year ?? null;
    } catch {
      return null;
    }
  }

  async getPlayerGameLog(playerId: string, options?: { limit?: number }) {
    const { logs } = await this.fullLog(playerId).catch(() => ({ logs: [] as PlayerGameLog[] }));
    return options?.limit ? logs.slice(0, options.limit) : logs;
  }

  async getPlayerSeasonStats(playerId: string): Promise<PlayerSeasonStats | null> {
    const { logs, lastSeasonGames } = await this.fullLog(playerId).catch(() => ({ logs: [] as PlayerGameLog[], lastSeasonGames: 0 }));
    if (!logs.length) return null;
    return {
      playerId,
      season: Number(logs[0].date.slice(0, 4)),
      gamesPlayed: logs.length - lastSeasonGames,
      averages: seasonAverages(logs),
      ...(lastSeasonGames ? { lastSeasonGames } : {}),
    };
  }

  /* ---------- injuries ---------- */

  async getInjuries(teamId: string): Promise<Injury[]> {
    const [payload, idx] = await Promise.all([this.get<EspnInjuries>(`${this.site}/injuries`, 30 * MINUTE).catch(() => ({}) as EspnInjuries), this.index()]);
    return mapInjuries(this.spec, payload, idx.teamIdByEspnId).filter((i) => i.teamId === teamId);
  }

  /* ---------- team stats (ranked across the league) ---------- */

  private async leagueTable(): Promise<LeagueTable> {
    if (this.table && Date.now() - this.table.at < 6 * HOUR) return this.table.value;
    const value = this.buildTable();
    this.table = { at: Date.now(), value };
    value.catch(() => (this.table = null));
    return value;
  }

  private async buildTable(): Promise<LeagueTable> {
    const idx = await this.index();
    // College football has hundreds of teams: rank the ones on this slate.
    let teamIds = [...idx.espnIdByTeamId.keys()];
    if (this.spec.sport === "ncaaf") {
      const games = (await this.slate()).games;
      teamIds = [...new Set(games.flatMap((g) => [g.homeTeamId, g.awayTeamId]))];
    }
    const raw = new Map<string, Partial<Record<SignalKey, number>>>();
    const lines = new Map<string, TeamLine>();
    await mapLimit(teamIds, 8, async (teamId) => {
      const espnId = idx.espnIdByTeamId.get(teamId);
      if (!espnId) return;
      try {
        switch (this.spec.teamStats) {
          case "football": {
            const line = mapTeamLine(await this.get<EspnTeamStatistics>(`${this.site}/teams/${espnId}/statistics`, 6 * HOUR));
            if (line) {
              lines.set(teamId, line);
              raw.set(teamId, footballSignals(line));
            }
            break;
          }
          case "basketball": {
            const signals = basketballSignals(await this.get<{ events?: EspnEvent[] }>(`${this.site}/teams/${espnId}/schedule`, 6 * HOUR), espnId);
            if (signals) raw.set(teamId, signals);
            break;
          }
          case "hockey": {
            const signals = hockeySignals(await this.get<EspnTeamStatistics>(`${this.site}/teams/${espnId}/statistics`, 6 * HOUR));
            if (signals) raw.set(teamId, signals);
            break;
          }
          case "baseball": {
            const signals = baseballSignals(await this.get<EspnTeamStatistics>(`${this.site}/teams/${espnId}/statistics`, 6 * HOUR));
            if (signals) raw.set(teamId, signals);
            break;
          }
        }
      } catch {
        // One team's missing stats shouldn't sink the table.
      }
    });
    return { signals: rankSignals(raw), lines };
  }

  async getTeamStats(teamId: string): Promise<TeamStats | null> {
    const table = await this.leagueTable();
    const signals = table.signals.get(teamId);
    if (!signals) return null;
    const line = table.lines.get(teamId);
    const plays = line ? line.passAttempts + line.rushAttempts : 0;
    return {
      teamId,
      season: new Date().getFullYear(),
      gamesPlayed: line?.games ?? 0,
      signals,
      ...(line
        ? {
            offense: {
              pointsPerGame: line.pointsPerGame,
              passRate: plays ? Math.round((line.passAttempts / plays) * 100) / 100 : 0.55,
              playsPerGame: Math.round((line.plays / line.games) * 10) / 10,
              passYardsPerGame: line.passYardsPerGame,
              rushYardsPerGame: line.rushYardsPerGame,
            },
          }
        : {}),
    };
  }

  /* ---------- expert projections (NFL) ---------- */

  async getExpertProjection(playerId: string, gameId: string): Promise<ExpertProjection | null> {
    if (this.spec.sport !== "nfl" || process.env.NEXT_PHASE === "phase-production-build") return null;
    const athleteId = parsePlayerId(playerId)?.id;
    const slate = await this.slate();
    const game = slate.games.find((g) => g.id === gameId);
    if (!athleteId || !game?.week || !slate.seasonYear || game.status !== "scheduled") return null;
    try {
      // One request covers everyone in the game, so the whole board shares it.
      const players = await this.getPlayersForGame(gameId);
      const ids = [...new Set([athleteId, ...players.map((p) => parsePlayerId(p.id)?.id).filter((x): x is string => Boolean(x))])];
      const byId = await fetchFantasyProjections(slate.seasonYear, game.week, ids);
      return toExpertProjection(byId.get(athleteId));
    } catch (error) {
      console.warn(`Expert projections unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
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
      return await this.odds.propsForGame(this.spec.sport, game.id, game.startsAt, home, away, players);
    } catch (error) {
      console.warn(`Priced player props unavailable, using ESPN lines: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /** Free sportsbook lines (no prices) that ESPN republishes, every page of them. */
  private async espnProps(gameId: string): Promise<MarketLine[]> {
    const eventId = parseGameId(gameId)?.id;
    if (!eventId) return [];
    try {
      const list = await this.get<EspnOddsList>(`${this.core}/events/${eventId}/competitions/${eventId}/odds?lang=en&region=us`, 30 * MINUTE);
      const first = propBetsUrl(list);
      if (!first) return [];
      const page1 = await this.get<EspnPropBets>(first.url, 30 * MINUTE);
      const pages = Math.min(page1.pageCount ?? 1, 5);
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) => this.get<EspnPropBets>(propBetsUrl(list, i + 2)!.url, 30 * MINUTE).catch(() => ({ items: [] }) as EspnPropBets)),
      );
      const items = [page1, ...rest].flatMap((p) => p.items ?? []);
      return mapEspnPropBets(this.spec, { items }, gameIdFor(this.spec.sport, eventId));
    } catch (error) {
      console.warn(`ESPN player props unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

/**
 * The week after ESPN's current one, but only when every game in the current
 * week is over. Regular season is season type 2; the playoffs are type 3.
 * Returns null mid-week or when the season has ended.
 */
export function nextWeekOf(sb: EspnScoreboard, lastRegularWeek = 18): { seasonType: number; week: number } | null {
  const events = sb.events ?? [];
  const week = sb.week?.number;
  const type = sb.season?.type;
  if (!events.length || !week || !type) return null;
  if (!events.every((e) => e.status?.type?.state === "post")) return null;
  if (type === 2) return week < lastRegularWeek ? { seasonType: 2, week: week + 1 } : { seasonType: 3, week: 1 };
  if (type === 3 && week < 5) return { seasonType: 3, week: week + 1 };
  return null;
}

/** "2026-27 Regular Season" → 2027, "2026 Regular Season" → 2026 (ESPN numbers a season by the year it ends). */
export function seasonYearOf(log: EspnGameLog): number | null {
  for (const st of log.seasonTypes ?? []) {
    const m = st.displayName?.match(/(\d{4})(?:-(\d{2}))?/);
    if (m) return m[2] ? Math.floor(Number(m[1]) / 100) * 100 + Number(m[2]) : Number(m[1]);
  }
  return null;
}

/** YYYYMMDD in US Eastern time, `offset` days from today. */
export function easternDate(offset: number, now = new Date()): string {
  const d = new Date(now.getTime() + offset * 24 * HOUR);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts.replaceAll("-", "");
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}
