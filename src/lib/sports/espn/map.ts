import type { Game, GameOdds, Injury, InjuryStatus, MatchupSignal, Player, PlayerGameLog, Position, SignalKey, SportKey, StatKey, StatLine, Team } from "@/lib/types";
import { gameIdFor, playerIdFor, teamIdFor } from "./ids";
import type { LeagueSpec } from "./leagues";
import type { EspnAthlete, EspnEvent, EspnGameLog, EspnInjuries, EspnStat, EspnTeamRef, EspnTeamStatistics } from "./types";

/** Pure mapping from ESPN payloads to domain types. Kept separate so it can be unit-tested offline. */

export function mapTeam(sport: SportKey, t: EspnTeamRef): Team {
  return {
    id: teamIdFor(sport, t),
    sport,
    abbreviation: t.abbreviation,
    city: t.location ?? t.displayName?.replace(` ${t.name ?? ""}`, "") ?? t.abbreviation,
    name: t.name ?? t.shortDisplayName ?? t.abbreviation,
    color: t.color ? `#${t.color.replace("#", "")}` : "#3a3a40",
    logoUrl: t.logos?.[0]?.href ?? t.logo,
  };
}

const FALLBACK_POSITION: Record<SportKey, Position> = { nfl: "DEF", ncaaf: "DEF", nba: "F", nhl: "F", mlb: "IF" };

export const mapPosition = (spec: LeagueSpec, abbr: string | undefined): Position => spec.positions[(abbr ?? "").toUpperCase()] ?? FALLBACK_POSITION[spec.sport];

export function mapAthlete(spec: LeagueSpec, a: EspnAthlete, teamId: string): Player {
  const jersey = a.jersey ? Number(a.jersey) : NaN;
  return {
    id: playerIdFor(spec.sport, a.id),
    sport: spec.sport,
    teamId,
    name: a.fullName,
    position: mapPosition(spec, a.position?.abbreviation),
    jerseyNumber: Number.isFinite(jersey) ? jersey : undefined,
    headshotUrl: a.headshot?.href,
  };
}

function mapStatus(state: string | undefined, name: string | undefined): Game["status"] {
  if (name && /postponed|canceled|cancelled|suspended/i.test(name)) return "postponed";
  if (state === "in") return "live";
  if (state === "post") return "final";
  return "scheduled";
}

const scoreOf = (score: unknown): number | undefined => {
  if (typeof score === "string" && score !== "") return Number(score);
  if (typeof score === "number") return score;
  if (score && typeof score === "object" && typeof (score as { value?: unknown }).value === "number") return (score as { value: number }).value;
  return undefined;
};

export function mapEvent(spec: LeagueSpec, e: EspnEvent): { game: Game; odds: GameOdds | null; teams: Team[] } | null {
  const comp = e.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === "home");
  const away = comp?.competitors?.find((c) => c.homeAway === "away");
  if (!comp || !home || !away) return null;
  const homeTeam = mapTeam(spec.sport, home.team);
  const awayTeam = mapTeam(spec.sport, away.team);
  const indoor = comp.venue?.indoor ?? spec.sport === "nba";
  const outdoorSport = spec.sport === "nfl" || spec.sport === "ncaaf" || spec.sport === "mlb";
  const game: Game = {
    id: gameIdFor(spec.sport, e.id),
    sport: spec.sport,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startsAt: e.date,
    status: mapStatus(e.status?.type?.state, e.status?.type?.name),
    venue: comp.venue?.fullName,
    week: spec.schedule.mode === "week" ? e.week?.number : undefined,
    homeScore: scoreOf(home.score),
    awayScore: scoreOf(away.score),
    weather:
      outdoorSport && (e.weather?.temperature !== undefined || indoor)
        ? { tempF: e.weather?.temperature ?? 72, windMph: null, precipitationChance: null, isDome: indoor, conditions: e.weather?.displayValue }
        : undefined,
  };
  return { game, odds: mapOdds(spec, e, homeTeam.abbreviation), teams: [homeTeam, awayTeam] };
}

/**
 * ESPN's `details` is a point spread in football and basketball ("DAL -9.5")
 * but a moneyline in hockey and baseball ("TB -238"). `spread` is the home
 * spread (or puck/run line) in every sport.
 */
export function mapOdds(spec: LeagueSpec, e: EspnEvent, homeAbbr: string): GameOdds | null {
  const o = e.competitions?.[0]?.odds?.[0];
  if (!o || (o.details === undefined && o.overUnder === undefined)) return null;
  const m = o.details?.match(/^([A-Z0-9&-]{2,6})\s+([+-]?\d+(\.\d+)?)$/);
  const moneylineSport = spec.sport === "nhl" || spec.sport === "mlb";

  let homeSpread = typeof o.spread === "number" ? o.spread : 0;
  let homeMoneyline = o.homeTeamOdds?.moneyLine ?? null;
  let awayMoneyline = o.awayTeamOdds?.moneyLine ?? null;
  if (m && !moneylineSport) {
    const value = Math.abs(Number(m[2]));
    homeSpread = m[1] === homeAbbr ? -value : value;
  } else if (m && moneylineSport && homeMoneyline === null && awayMoneyline === null) {
    const price = Number(m[2]);
    if (m[1] === homeAbbr) homeMoneyline = price;
    else awayMoneyline = price;
  }
  return {
    gameId: gameIdFor(spec.sport, e.id),
    homeSpread,
    total: o.overUnder ?? 0,
    homeMoneyline,
    awayMoneyline,
    updatedAt: new Date(0).toISOString(),
    source: o.provider?.name,
  };
}

/** Game log, most recent first, skipping preseason. Opponent ESPN ids resolve to our team ids. */
export function mapGameLog(spec: LeagueSpec, playerId: string, log: EspnGameLog, teamIdByEspnId: Map<string, string>): PlayerGameLog[] {
  const row = spec.statRow(log.names ?? []);
  const seen = new Set<string>();
  const out: PlayerGameLog[] = [];
  for (const st of log.seasonTypes ?? []) {
    if (st.displayName && spec.skipSeasonTypes.test(st.displayName)) continue;
    for (const cat of st.categories ?? []) {
      for (const ev of cat.events ?? []) {
        if (seen.has(ev.eventId)) continue;
        seen.add(ev.eventId);
        const meta = log.events?.[ev.eventId];
        const opp = meta?.opponent;
        const opponentTeamId =
          (opp?.id && teamIdByEspnId.get(opp.id)) || (opp?.abbreviation ? teamIdFor(spec.sport, { id: opp.id ?? opp.abbreviation, abbreviation: opp.abbreviation }) : `${spec.sport}-unknown`);
        out.push({
          playerId,
          gameId: gameIdFor(spec.sport, ev.eventId),
          opponentTeamId,
          date: (meta?.gameDate ?? "").slice(0, 10),
          isHome: meta?.atVs !== "@",
          stats: row(ev.stats),
        });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function seasonAverages(logs: PlayerGameLog[]): StatLine {
  const totals: Partial<Record<StatKey, { sum: number; n: number }>> = {};
  for (const g of logs) {
    for (const [k, v] of Object.entries(g.stats) as [StatKey, number][]) {
      const t = (totals[k] ??= { sum: 0, n: 0 });
      t.sum += v;
      t.n += 1;
    }
  }
  const avg: StatLine = {};
  for (const [k, t] of Object.entries(totals) as [StatKey, { sum: number; n: number }][]) avg[k] = Math.round((t.sum / t.n) * 10) / 10;
  // A rate, not an average count: share of games with at least one TD.
  if (logs.length && avg.anytimeTd !== undefined) {
    avg.anytimeTd = Math.round((logs.filter((g) => (g.stats.anytimeTd ?? 0) >= 1).length / logs.length) * 100) / 100;
  }
  return avg;
}

const INJURY_STATUS: [RegExp, InjuryStatus][] = [
  [/injured reserve|\bir\b|pup|physically unable|suspen|non-football|injured list|\bil\b/i, "ir"],
  [/^out/i, "out"],
  [/doubt/i, "doubtful"],
  [/question|day-to-day|game-time/i, "questionable"],
  [/probable/i, "probable"],
];

export function mapInjuries(spec: LeagueSpec, payload: EspnInjuries, teamIdByEspnId: Map<string, string>): Injury[] {
  const out: Injury[] = [];
  for (const team of payload.injuries ?? []) {
    const teamId = teamIdByEspnId.get(team.id);
    if (!teamId) continue;
    for (const i of team.injuries ?? []) {
      const status = INJURY_STATUS.find(([re]) => re.test(i.status ?? ""))?.[1];
      if (!status || !i.athlete?.displayName) continue;
      const athleteId = i.athlete.links?.map((l) => l.href?.match(/\/id\/(\d+)/)?.[1]).find(Boolean);
      const part = i.details?.type ? `${i.details.type}` : "Injury";
      const comment = i.shortComment ? ` — ${i.shortComment.length > 140 ? `${i.shortComment.slice(0, 137)}…` : i.shortComment}` : "";
      out.push({
        playerId: athleteId ? playerIdFor(spec.sport, athleteId) : `espn-name-${i.athlete.displayName}`,
        playerName: i.athlete.displayName,
        teamId,
        position: mapPosition(spec, i.athlete.position?.abbreviation),
        status,
        description: `${part}${comment}`,
        updatedAt: i.date ?? new Date(0).toISOString(),
      });
    }
  }
  return out;
}

/* ---------- team stats ---------- */

type Category = { name: string; stats?: EspnStat[] };

function categories(block: unknown): Category[] {
  if (Array.isArray(block)) return block as Category[];
  if (block && typeof block === "object" && Array.isArray((block as { categories?: unknown }).categories)) {
    return (block as { categories: Category[] }).categories;
  }
  return [];
}

function stat(cats: Category[], category: string, name: string): number | null {
  const s = cats.find((c) => c.name === category)?.stats?.find((x) => x.name === name);
  return typeof s?.value === "number" ? s.value : null;
}

/** Raw per-game numbers for one football team; ranks are computed across the league by the provider. */
export type TeamLine = {
  games: number;
  pointsPerGame: number;
  passAttempts: number;
  rushAttempts: number;
  plays: number;
  passYardsPerGame: number;
  rushYardsPerGame: number;
  sacksPerGame: number | null;
  allowed: { points: number; passYards: number; rushYards: number; recYards: number; rushTds: number };
};

export function mapTeamLine(payload: EspnTeamStatistics): TeamLine | null {
  const own = categories(payload.results?.stats);
  const opp = categories(payload.results?.opponent);
  const games = stat(own, "general", "gamesPlayed") ?? stat(opp, "general", "gamesPlayed") ?? stat(own, "rushing", "teamGamesPlayed");
  if (!games) return null;
  const per = (v: number | null) => (v === null ? 0 : Math.round((v / games) * 10) / 10);
  const passAttempts = stat(own, "passing", "passingAttempts") ?? 0;
  const rushAttempts = stat(own, "rushing", "rushingAttempts") ?? 0;
  const sacks = stat(own, "defensive", "sacks");
  return {
    games,
    pointsPerGame: per(stat(own, "scoring", "totalPoints")) || (stat(own, "rushing", "totalPointsPerGame") ?? 0),
    passAttempts,
    rushAttempts,
    plays: stat(own, "rushing", "totalOffensivePlays") ?? passAttempts + rushAttempts,
    passYardsPerGame: per(stat(own, "passing", "netPassingYards")),
    rushYardsPerGame: per(stat(own, "rushing", "rushingYards")),
    sacksPerGame: sacks === null ? null : per(sacks),
    allowed: {
      points: per(stat(opp, "scoring", "totalPoints")) || (stat(opp, "rushing", "totalPointsPerGame") ?? 0),
      passYards: per(stat(opp, "passing", "netPassingYards")),
      rushYards: per(stat(opp, "rushing", "rushingYards")),
      recYards: per(stat(opp, "receiving", "receivingYards")),
      rushTds: per(stat(opp, "rushing", "rushingTouchdowns")),
    },
  };
}

export const footballSignals = (l: TeamLine): Partial<Record<SignalKey, number>> => ({
  passYardsAllowed: l.allowed.passYards,
  receivingYardsAllowed: l.allowed.recYards,
  rushYardsAllowed: l.allowed.rushYards,
  rushTdsAllowed: l.allowed.rushTds,
  pointsAllowed: l.allowed.points,
  ...(l.sacksPerGame !== null ? { sacks: l.sacksPerGame } : {}),
});

/** Hockey: goals and shots allowed, shots taken. */
export function hockeySignals(payload: EspnTeamStatistics): Partial<Record<SignalKey, number>> | null {
  const own = categories(payload.results?.stats);
  const games = stat(own, "general", "games");
  if (!games) return null;
  const per = (v: number | null) => (v === null ? undefined : Math.round((v / games) * 10) / 10);
  return compact({
    goalsAllowed: per(stat(own, "defensive", "goalsAgainst")),
    shotsAllowed: per(stat(own, "defensive", "shotsAgainst")),
    shotsFor: per(stat(own, "offensive", "shotsTotal")),
  });
}

/** Baseball: what the pitching staff allows and what the lineup does. */
export function baseballSignals(payload: EspnTeamStatistics): Partial<Record<SignalKey, number>> | null {
  const own = categories(payload.results?.stats);
  const games = stat(own, "batting", "teamGamesPlayed") ?? stat(own, "pitching", "teamGamesPlayed");
  if (!games) return null;
  const per = (v: number | null) => (v === null ? undefined : Math.round((v / games) * 100) / 100);
  return compact({
    hitsAllowed: per(stat(own, "pitching", "hits")),
    runsAllowed: per(stat(own, "pitching", "earnedRuns")),
    homeRunsAllowed: per(stat(own, "pitching", "homeRuns")),
    battingStrikeouts: per(stat(own, "batting", "strikeouts")),
    battingHits: per(stat(own, "batting", "hits")),
    battingRuns: per(stat(own, "batting", "runs")),
  });
}

/** Basketball: points allowed per completed game, from a team schedule. */
export function basketballSignals(schedule: { events?: EspnEvent[] }, espnTeamId: string): Partial<Record<SignalKey, number>> | null {
  const allowed: number[] = [];
  for (const e of schedule.events ?? []) {
    const comp = e.competitions?.[0];
    if (comp?.status?.type?.state !== "post" && e.status?.type?.state !== "post") continue;
    const opp = comp?.competitors?.find((c) => c.team.id !== espnTeamId);
    const score = scoreOf(opp?.score);
    if (score !== undefined && Number.isFinite(score)) allowed.push(score);
  }
  if (!allowed.length) return null;
  return { pointsAllowed: Math.round((allowed.reduce((a, b) => a + b, 0) / allowed.length) * 10) / 10 };
}

function compact(o: Partial<Record<SignalKey, number | undefined>>): Partial<Record<SignalKey, number>> | null {
  const out: Partial<Record<SignalKey, number>> = {};
  for (const [k, v] of Object.entries(o) as [SignalKey, number | undefined][]) if (v !== undefined && Number.isFinite(v)) out[k] = v;
  return Object.keys(out).length ? out : null;
}

/** Rank every signal across the league. Rank 1 = lowest value. */
export function rankSignals(raw: Map<string, Partial<Record<SignalKey, number>>>): Map<string, Partial<Record<SignalKey, MatchupSignal>>> {
  const out = new Map<string, Partial<Record<SignalKey, MatchupSignal>>>();
  const all = [...raw.values()];
  for (const [teamId, signals] of raw) {
    const ranked: Partial<Record<SignalKey, MatchupSignal>> = {};
    for (const [key, value] of Object.entries(signals) as [SignalKey, number][]) {
      const peers = all.map((s) => s[key]).filter((v): v is number => typeof v === "number");
      ranked[key] = { perGame: value, rank: 1 + peers.filter((v) => v < value).length, leagueSize: peers.length };
    }
    out.set(teamId, ranked);
  }
  return out;
}
