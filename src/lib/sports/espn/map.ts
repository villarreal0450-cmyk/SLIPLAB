import type { Game, GameOdds, Injury, InjuryStatus, Player, PlayerGameLog, Position, StatKey, StatLine, Team } from "@/lib/types";
import type { EspnAthlete, EspnEvent, EspnGameLog, EspnInjuries, EspnStat, EspnTeamRef, EspnTeamStatistics } from "./types";

/** Pure mapping from ESPN payloads to domain types. Kept separate so it can be unit-tested offline. */

export const teamIdFor = (abbr: string) => `nfl-${abbr.toLowerCase()}`;
export const gameIdFor = (eventId: string) => `espn-${eventId}`;
export const playerIdFor = (athleteId: string) => `espn-${athleteId}`;
export const eventIdOf = (gameId: string) => (gameId.startsWith("espn-") ? gameId.slice(5) : null);
export const athleteIdOf = (playerId: string) => (playerId.startsWith("espn-") ? playerId.slice(5) : null);

export function mapTeam(t: EspnTeamRef): Team {
  return {
    id: teamIdFor(t.abbreviation),
    sport: "nfl",
    abbreviation: t.abbreviation,
    city: t.location ?? t.displayName?.replace(` ${t.name ?? ""}`, "") ?? t.abbreviation,
    name: t.name ?? t.shortDisplayName ?? t.abbreviation,
    color: t.color ? `#${t.color.replace("#", "")}` : "#3a3a40",
    logoUrl: t.logos?.[0]?.href ?? t.logo,
  };
}

const POSITION_MAP: Record<string, Position> = {
  QB: "QB", RB: "RB", FB: "RB", HB: "RB", WR: "WR", TE: "TE", K: "K", PK: "K", P: "K",
  C: "OL", G: "OL", OG: "OL", T: "OL", OT: "OL", OL: "OL", LS: "OL",
  DE: "DL", DT: "DL", NT: "DL", DL: "DL", EDGE: "DL",
  LB: "LB", OLB: "LB", ILB: "LB", MLB: "LB",
  CB: "CB", S: "S", FS: "S", SS: "S", DB: "DB", SAF: "S",
};
export const mapPosition = (abbr: string | undefined): Position => POSITION_MAP[(abbr ?? "").toUpperCase()] ?? "DEF";

/** Positions that carry player props. */
export const PROP_POSITIONS = new Set<Position>(["QB", "RB", "WR", "TE"]);

export function mapAthlete(a: EspnAthlete, teamId: string): Player {
  const jersey = a.jersey ? Number(a.jersey) : NaN;
  return {
    id: playerIdFor(a.id),
    sport: "nfl",
    teamId,
    name: a.fullName,
    position: mapPosition(a.position?.abbreviation),
    jerseyNumber: Number.isFinite(jersey) ? jersey : undefined,
    headshotUrl: a.headshot?.href,
  };
}

function mapStatus(state: string | undefined): Game["status"] {
  if (state === "in") return "live";
  if (state === "post") return "final";
  return "scheduled";
}

export function mapEvent(e: EspnEvent): { game: Game; odds: GameOdds | null; teams: Team[] } | null {
  const comp = e.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === "home");
  const away = comp?.competitors?.find((c) => c.homeAway === "away");
  if (!comp || !home || !away) return null;
  const homeTeam = mapTeam(home.team);
  const awayTeam = mapTeam(away.team);
  const indoor = comp.venue?.indoor ?? false;
  const game: Game = {
    id: gameIdFor(e.id),
    sport: "nfl",
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startsAt: e.date,
    status: mapStatus(e.status?.type?.state),
    venue: comp.venue?.fullName,
    week: e.week?.number,
    homeScore: home.score !== undefined ? Number(home.score) : undefined,
    awayScore: away.score !== undefined ? Number(away.score) : undefined,
    weather:
      e.weather?.temperature !== undefined || indoor
        ? { tempF: e.weather?.temperature ?? 72, windMph: null, precipitationChance: null, isDome: indoor, conditions: e.weather?.displayValue }
        : undefined,
  };
  return { game, odds: mapOdds(e, homeTeam.abbreviation), teams: [homeTeam, awayTeam] };
}

/** "DAL -9.5" → home spread from the home team's perspective. */
export function mapOdds(e: EspnEvent, homeAbbr: string): GameOdds | null {
  const o = e.competitions?.[0]?.odds?.[0];
  if (!o || (o.details === undefined && o.overUnder === undefined)) return null;
  let homeSpread = 0;
  const m = o.details?.match(/^([A-Z]{2,4})\s+([+-]?\d+(\.\d+)?)$/);
  if (m) {
    const value = Math.abs(Number(m[2]));
    homeSpread = m[1] === homeAbbr ? -value : value;
  } else if (typeof o.spread === "number") {
    homeSpread = o.spread;
  }
  return {
    gameId: gameIdFor(e.id),
    homeSpread,
    total: o.overUnder ?? 0,
    homeMoneyline: o.homeTeamOdds?.moneyLine ?? null,
    awayMoneyline: o.awayTeamOdds?.moneyLine ?? null,
    updatedAt: new Date(0).toISOString(),
    source: o.provider?.name,
  };
}

const STAT_MAP: Partial<Record<string, StatKey>> = {
  completions: "completions",
  passingAttempts: "passAttempts",
  passingYards: "passingYards",
  passingTouchdowns: "passingTds",
  interceptions: "interceptions",
  rushingAttempts: "rushingAttempts",
  rushingYards: "rushingYards",
  rushingTouchdowns: "rushingTds",
  receptions: "receptions",
  receivingTargets: "targets",
  receivingYards: "receivingYards",
  receivingTouchdowns: "receivingTds",
};

/** Regular-season game log, most recent first. `opponentTeamId` resolves ESPN's team ids to ours. */
export function mapGameLog(playerId: string, log: EspnGameLog, teamAbbrByEspnId: Map<string, string>): PlayerGameLog[] {
  const names = log.names ?? [];
  const seen = new Set<string>();
  const out: PlayerGameLog[] = [];
  for (const st of log.seasonTypes ?? []) {
    if (st.displayName && !/regular/i.test(st.displayName)) continue;
    for (const cat of st.categories ?? []) {
      for (const ev of cat.events ?? []) {
        if (seen.has(ev.eventId)) continue;
        seen.add(ev.eventId);
        const meta = log.events?.[ev.eventId];
        const stats: StatLine = {};
        names.forEach((name, i) => {
          const key = STAT_MAP[name];
          const v = Number(ev.stats[i]);
          if (key && Number.isFinite(v)) stats[key] = v;
        });
        const tds = (stats.rushingTds ?? 0) + (stats.receivingTds ?? 0);
        stats.anytimeTd = tds;
        const oppAbbr = meta?.opponent?.abbreviation ?? (meta?.opponent?.id ? teamAbbrByEspnId.get(meta.opponent.id) : undefined);
        out.push({
          playerId,
          gameId: gameIdFor(ev.eventId),
          opponentTeamId: oppAbbr ? teamIdFor(oppAbbr) : "nfl-unknown",
          date: (meta?.gameDate ?? "").slice(0, 10),
          isHome: meta?.atVs !== "@",
          stats,
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
  for (const [k, t] of Object.entries(totals) as [StatKey, { sum: number; n: number }][]) avg[k] = Math.round((t.sum / logs.length) * 10) / 10;
  // A rate, not an average count: share of games with at least one TD.
  if (logs.length) avg.anytimeTd = Math.round((logs.filter((g) => (g.stats.anytimeTd ?? 0) >= 1).length / logs.length) * 100) / 100;
  return avg;
}

const INJURY_STATUS: [RegExp, InjuryStatus][] = [
  [/injured reserve|\bir\b|pup|physically unable|suspen|non-football/i, "ir"],
  [/^out/i, "out"],
  [/doubt/i, "doubtful"],
  [/question|day-to-day/i, "questionable"],
  [/probable/i, "probable"],
];

export function mapInjuries(payload: EspnInjuries, teamAbbrByEspnId: Map<string, string>): Injury[] {
  const out: Injury[] = [];
  for (const team of payload.injuries ?? []) {
    const abbr = teamAbbrByEspnId.get(team.id);
    if (!abbr) continue;
    for (const i of team.injuries ?? []) {
      const status = INJURY_STATUS.find(([re]) => re.test(i.status ?? ""))?.[1];
      if (!status || !i.athlete?.displayName) continue;
      const athleteId = i.athlete.links?.map((l) => l.href?.match(/\/id\/(\d+)/)?.[1]).find(Boolean);
      const part = i.details?.type ? `${i.details.type}` : "Injury";
      const comment = i.shortComment ? ` — ${i.shortComment.length > 140 ? `${i.shortComment.slice(0, 137)}…` : i.shortComment}` : "";
      out.push({
        playerId: athleteId ? playerIdFor(athleteId) : `espn-name-${i.athlete.displayName}`,
        playerName: i.athlete.displayName,
        teamId: teamIdFor(abbr),
        position: mapPosition(i.athlete.position?.abbreviation),
        status,
        description: `${part}${comment}`,
        updatedAt: i.date ?? new Date(0).toISOString(),
      });
    }
  }
  return out;
}

function categories(block: unknown): { name: string; stats?: EspnStat[] }[] {
  if (Array.isArray(block)) return block as { name: string; stats?: EspnStat[] }[];
  if (block && typeof block === "object" && Array.isArray((block as { categories?: unknown }).categories)) {
    return (block as { categories: { name: string; stats?: EspnStat[] }[] }).categories;
  }
  return [];
}

function stat(cats: { name: string; stats?: EspnStat[] }[], category: string, name: string): number | null {
  const s = cats.find((c) => c.name === category)?.stats?.find((x) => x.name === name);
  return typeof s?.value === "number" ? s.value : null;
}

/** Raw per-game numbers for one team; ranks are computed across the league by the provider. */
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
  const games = stat(own, "general", "gamesPlayed") ?? stat(opp, "general", "gamesPlayed");
  if (!games) return null;
  const per = (v: number | null) => (v === null ? 0 : Math.round((v / games) * 10) / 10);
  const passAttempts = stat(own, "passing", "passingAttempts") ?? 0;
  const rushAttempts = stat(own, "rushing", "rushingAttempts") ?? 0;
  const sacks = stat(own, "defensive", "sacks");
  return {
    games,
    pointsPerGame: per(stat(own, "scoring", "totalPoints")),
    passAttempts,
    rushAttempts,
    plays: stat(own, "rushing", "totalOffensivePlays") ?? passAttempts + rushAttempts,
    passYardsPerGame: per(stat(own, "passing", "netPassingYards")),
    rushYardsPerGame: per(stat(own, "rushing", "rushingYards")),
    sacksPerGame: sacks === null ? null : per(sacks),
    allowed: {
      points: per(stat(opp, "scoring", "totalPoints")),
      passYards: per(stat(opp, "passing", "netPassingYards")),
      rushYards: per(stat(opp, "rushing", "rushingYards")),
      recYards: per(stat(opp, "receiving", "receivingYards")),
      rushTds: per(stat(opp, "rushing", "rushingTouchdowns")),
    },
  };
}
