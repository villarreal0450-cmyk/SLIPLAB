import { SPORTS, type SportKey } from "@/lib/types";

/**
 * Ids for ESPN-backed entities. NFL ids keep their original, prefix-free form
 * (`espn-401…`, `nfl-dal`) so saved bets and slips keep working; every other
 * league carries its sport (`espn-nba-401…`, `nba-lal`, `ncaaf-2641`).
 */

const NAMESPACED = /^espn-(nba|nhl|mlb|ncaaf)-(\d+)$/;
const LEGACY = /^espn-(\d+)$/;

function encode(sport: SportKey, id: string) {
  return sport === "nfl" ? `espn-${id}` : `espn-${sport}-${id}`;
}

function decode(value: string): { sport: SportKey; id: string } | null {
  const ns = value.match(NAMESPACED);
  if (ns) return { sport: ns[1] as SportKey, id: ns[2] };
  const legacy = value.match(LEGACY);
  return legacy ? { sport: "nfl", id: legacy[1] } : null;
}

export const gameIdFor = (sport: SportKey, eventId: string) => encode(sport, eventId);
export const playerIdFor = (sport: SportKey, athleteId: string) => encode(sport, athleteId);
export const parseGameId = decode;
export const parsePlayerId = decode;

/**
 * College teams share abbreviations ("MIA" is Miami (FL); Miami (OH) is
 * "M-OH"), so college ids use ESPN's numeric team id. Pro leagues use the
 * abbreviation, which keeps ids readable.
 */
export function teamIdFor(sport: SportKey, team: { id: string; abbreviation: string }): string {
  return sport === "ncaaf" ? `ncaaf-${team.id}` : `${sport}-${team.abbreviation.toLowerCase()}`;
}

export function sportOfTeamId(teamId: string): SportKey | null {
  const prefix = teamId.split("-")[0];
  return prefix in SPORTS ? (prefix as SportKey) : null;
}
