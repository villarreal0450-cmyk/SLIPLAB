import type { ExpertProjection, StatKey, StatLine } from "@/lib/types";
import { fetchJson, HOUR } from "../http";

/**
 * Weekly player projections from ESPN's fantasy football analysts. Public,
 * keyless, and published for every NFL player each week. The numbers are
 * shown to the user with their source and blended into our projection; they
 * are never presented as our own.
 */

const BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";

/** ESPN fantasy stat ids → our stat keys. */
const STAT_IDS: Record<string, StatKey> = {
  "0": "passAttempts",
  "1": "completions",
  "3": "passingYards",
  "4": "passingTds",
  "20": "interceptions",
  "23": "rushingAttempts",
  "24": "rushingYards",
  "25": "rushingTds",
  "53": "receptions",
  "42": "receivingYards",
  "43": "receivingTds",
  "58": "targets",
};

type FantasyPlayers = {
  players?: {
    id?: number;
    player?: { id?: number; stats?: { statSourceId?: number; statSplitTypeId?: number; scoringPeriodId?: number; stats?: Record<string, number> }[] };
  }[];
};

/** Pure: one week's projected stat lines by ESPN athlete id (exported for tests). */
export function mapFantasyProjections(data: FantasyPlayers, week: number): Map<string, StatLine> {
  const out = new Map<string, StatLine>();
  for (const entry of data.players ?? []) {
    const id = entry.player?.id ?? entry.id;
    // statSourceId 1 = projection, split 1 = single week.
    const proj = entry.player?.stats?.find((s) => s.statSourceId === 1 && s.statSplitTypeId === 1 && s.scoringPeriodId === week);
    if (!id || !proj?.stats) continue;
    const line: StatLine = {};
    for (const [statId, value] of Object.entries(proj.stats)) {
      const key = STAT_IDS[statId];
      if (key && Number.isFinite(value)) line[key] = Math.round(value * 10) / 10;
    }
    // Chance of at least one touchdown, from expected rushing + receiving TDs.
    const tds = (line.rushingTds ?? 0) + (line.receivingTds ?? 0);
    if (tds > 0) line.anytimeTd = Math.round((1 - Math.exp(-tds)) * 100) / 100;
    // An all-zero line means the analysts expect the player not to play.
    if (Object.values(line).some((v) => (v ?? 0) > 0)) out.set(String(id), line);
  }
  return out;
}

/** Projections for a set of ESPN athlete ids in one request (cached for a few hours). */
export async function fetchFantasyProjections(seasonYear: number, week: number, athleteIds: string[]): Promise<Map<string, StatLine>> {
  if (!athleteIds.length) return new Map();
  const ids = [...new Set(athleteIds)].sort();
  const filter = {
    players: {
      filterIds: { value: ids.map(Number) },
      filterStatsForTopScoringPeriodIds: { value: 2, additionalValue: [`11${seasonYear}${week}`] },
    },
  };
  const url = `${BASE}/${seasonYear}/segments/0/leaguedefaults/3?view=kona_player_info&scoringPeriodId=${week}`;
  const data = await fetchJson<FantasyPlayers>(url, {
    ttlMs: 3 * HOUR,
    key: `${url}#${ids.join(",")}`,
    headers: { "X-Fantasy-Filter": JSON.stringify(filter) },
  });
  return mapFantasyProjections(data, week);
}

export const ESPN_ANALYSTS = "ESPN fantasy analysts";

export function toExpertProjection(stats: StatLine | undefined): ExpertProjection | null {
  return stats ? { source: ESPN_ANALYSTS, stats } : null;
}
