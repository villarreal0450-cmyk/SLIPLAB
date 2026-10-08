import type { Parlay, Pick } from "@/lib/types";

const TB_DAL = "nfl-2026-w5-tb-dal";
const DAL = "nfl-dal";
const TB = "nfl-tb";

export const dakPassing: Pick = {
  id: "pick-dak",
  sport: "nfl",
  gameId: TB_DAL,
  playerId: "dak-prescott",
  playerName: "Dak Prescott",
  teamId: DAL,
  opponentTeamId: TB,
  market: "passing_yards",
  direction: "over",
  line: 244,
  odds: -150,
  isAlternate: true,
};

export const lambReceiving: Pick = {
  id: "pick-lamb",
  sport: "nfl",
  gameId: TB_DAL,
  playerId: "ceedee-lamb",
  playerName: "CeeDee Lamb",
  teamId: DAL,
  opponentTeamId: TB,
  market: "receiving_yards",
  direction: "over",
  line: 81,
  odds: 105,
};

export const pickensReceiving: Pick = {
  id: "pick-pickens",
  sport: "nfl",
  gameId: TB_DAL,
  playerId: "george-pickens",
  playerName: "George Pickens",
  teamId: DAL,
  opponentTeamId: TB,
  market: "receiving_yards",
  direction: "over",
  line: 62,
  odds: -115,
};

export const javonteTd: Pick = {
  id: "pick-javonte",
  sport: "nfl",
  gameId: TB_DAL,
  playerId: "javonte-williams",
  playerName: "Javonte Williams",
  teamId: DAL,
  opponentTeamId: TB,
  market: "anytime_td",
  direction: "yes",
  line: null,
  odds: -115,
};

/** The MVP demo parlay from the product brief. */
export const demoParlay: Parlay = {
  id: "parlay-demo",
  picks: [dakPassing, pickensReceiving, lambReceiving, javonteTd],
};
