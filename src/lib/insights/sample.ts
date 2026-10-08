import { createSavedBet, markPlaced, settleLeg } from "@/lib/bets/model";
import { structureLabel } from "@/lib/analysis/parlay/analyzeParlay";
import { tierForScore, type LegStatus, type MarketKey, type Pick, type RiskLevel, type SavedBet } from "@/lib/types";

/**
 * A fixed, made-up betting history used only to preview the Insights screen
 * before someone has settled bets of their own. Always labelled as sample
 * data in the UI and never written into the user's bets.
 */

type LegTemplate = { pick: Omit<Pick, "id">; score: number };

const team = {
  DAL: { id: "nfl-dal", abbr: "DAL", color: "#041E42" },
  TB: { id: "nfl-tb", abbr: "TB", color: "#D50A0A" },
  ATL: { id: "nfl-atl", abbr: "ATL", color: "#A71930" },
  NO: { id: "nfl-no", abbr: "NO", color: "#D3BC8D" },
  KC: { id: "nfl-kc", abbr: "KC", color: "#E31837" },
  DEN: { id: "nfl-den", abbr: "DEN", color: "#FB4F14" },
} as const;
type T = keyof typeof team;
const GAMES: Record<string, string> = { DAL: "nfl-2026-w5-tb-dal", TB: "nfl-2026-w5-tb-dal", ATL: "nfl-2026-w5-atl-no", NO: "nfl-2026-w5-atl-no", KC: "nfl-2026-w5-kc-den", DEN: "nfl-2026-w5-kc-den" };
const OPP: Record<T, T> = { DAL: "TB", TB: "DAL", ATL: "NO", NO: "ATL", KC: "DEN", DEN: "KC" };

function leg(playerId: string, playerName: string, t: T, position: string, market: MarketKey, line: number | null, odds: number, score: number): LegTemplate {
  const opp = OPP[t];
  return {
    score,
    pick: {
      sport: "nfl",
      gameId: GAMES[t],
      playerId,
      playerName,
      teamId: team[t].id,
      opponentTeamId: team[opp].id,
      market,
      direction: line === null ? "yes" : "over",
      line,
      odds,
      meta: { teamAbbr: t, opponentAbbr: opp, position, teamColor: team[t].color },
    },
  };
}

const L = {
  dak244: leg("dak-prescott", "Dak Prescott", "DAL", "QB", "passing_yards", 244, -150, 8.7),
  dak265: leg("dak-prescott", "Dak Prescott", "DAL", "QB", "passing_yards", 265.5, -112, 7.4),
  lamb81: leg("ceedee-lamb", "CeeDee Lamb", "DAL", "WR", "receiving_yards", 81, 105, 6.5),
  lamb66: leg("ceedee-lamb", "CeeDee Lamb", "DAL", "WR", "receiving_yards", 66.5, -210, 8.6),
  pickens62: leg("george-pickens", "George Pickens", "DAL", "WR", "receiving_yards", 62, -115, 8.1),
  javTD: leg("javonte-williams", "Javonte Williams", "DAL", "RB", "anytime_td", null, -115, 4.6),
  lambTD: leg("ceedee-lamb", "CeeDee Lamb", "DAL", "WR", "anytime_td", null, 120, 5.2),
  evans64: leg("mike-evans", "Mike Evans", "TB", "WR", "receiving_yards", 64.5, -112, 7.2),
  godwin55: leg("chris-godwin", "Chris Godwin", "TB", "WR", "receptions", 5.5, -112, 7.3),
  bucky62: leg("bucky-irving", "Bucky Irving", "TB", "RB", "rushing_yards", 62.5, -112, 6.8),
  bijan84: leg("bijan-robinson", "Bijan Robinson", "ATL", "RB", "rushing_yards", 84.5, -112, 7.6),
  bijanTD: leg("bijan-robinson", "Bijan Robinson", "ATL", "RB", "anytime_td", null, -140, 6.1),
  london68: leg("drake-london", "Drake London", "ATL", "WR", "receiving_yards", 68.5, -112, 7.0),
  kelce52: leg("travis-kelce", "Travis Kelce", "KC", "TE", "receiving_yards", 52.5, -112, 7.7),
  mahomes258: leg("patrick-mahomes", "Patrick Mahomes", "KC", "QB", "passing_yards", 258.5, -112, 7.9),
  rice66: leg("rashee-rice", "Rashee Rice", "KC", "WR", "receiving_yards", 66.5, -112, 6.9),
  sutton61: leg("courtland-sutton", "Courtland Sutton", "DEN", "WR", "receiving_yards", 61.5, -112, 6.4),
};
type K = keyof typeof L;
type Outcome = [K, "W" | "L" | "V" | "P", number?];

const SPECS: { legs: Outcome[]; stake: number; odds: number; risk: RiskLevel; daysAgo: number }[] = [
  { legs: [["dak244", "W", 289], ["pickens62", "W", 85], ["lamb81", "L", 73], ["javTD", "L", 0]], stake: 25, odds: 1094, risk: "medium", daysAgo: 2 },
  { legs: [["dak244", "W", 301], ["pickens62", "W", 70], ["lamb66", "W", 74]], stake: 25, odds: 302, risk: "medium", daysAgo: 3 },
  { legs: [["kelce52", "W", 61], ["mahomes258", "W", 274]], stake: 20, odds: 240, risk: "low", daysAgo: 4 },
  { legs: [["bijan84", "L", 71], ["bijanTD", "L", 0]], stake: 15, odds: 310, risk: "high", daysAgo: 5 },
  { legs: [["javTD", "W", 1]], stake: 10, odds: -115, risk: "high", daysAgo: 6 },
  { legs: [["dak265", "L", 251], ["lamb81", "W", 88], ["pickens62", "W", 66], ["evans64", "L", 52], ["lambTD", "L", 0], ["javTD", "W", 1], ["bijanTD", "L", 0]], stake: 5, odds: 4800, risk: "high", daysAgo: 7 },
  { legs: [["godwin55", "W", 7], ["evans64", "W", 71], ["bucky62", "W", 66]], stake: 20, odds: 595, risk: "medium", daysAgo: 8 },
  { legs: [["london68", "W", 77], ["bijan84", "W", 96]], stake: 20, odds: 264, risk: "medium", daysAgo: 9 },
  { legs: [["kelce52", "L", 44], ["rice66", "W", 81], ["sutton61", "L", 49], ["mahomes258", "W", 266]], stake: 15, odds: 1228, risk: "medium", daysAgo: 10 },
  { legs: [["dak244", "W", 262], ["lamb66", "W", 70], ["pickens62", "L", 55]], stake: 25, odds: 302, risk: "low", daysAgo: 11 },
  { legs: [["mahomes258", "W", 290], ["kelce52", "W", 58], ["rice66", "W", 72]], stake: 20, odds: 595, risk: "medium", daysAgo: 12 },
  { legs: [["lambTD", "W", 1], ["pickens62", "W", 81]], stake: 10, odds: 361, risk: "high", daysAgo: 13 },
  { legs: [["javTD", "L", 0], ["dak244", "W", 270], ["lamb81", "L", 79], ["evans64", "W", 70], ["godwin55", "W", 6], ["bucky62", "W", 66], ["bijanTD", "L", 0], ["london68", "W", 72]], stake: 5, odds: 9200, risk: "high", daysAgo: 14 },
  { legs: [["evans64", "W", 68], ["godwin55", "W", 8]], stake: 20, odds: 264, risk: "low", daysAgo: 15 },
  { legs: [["sutton61", "W", 66], ["rice66", "L", 51]], stake: 15, odds: 264, risk: "medium", daysAgo: 16 },
  { legs: [["bijan84", "W", 101], ["london68", "L", 60], ["bijanTD", "W", 1]], stake: 10, odds: 520, risk: "high", daysAgo: 17 },
  { legs: [["dak265", "W", 281], ["lamb81", "W", 96]], stake: 15, odds: 330, risk: "medium", daysAgo: 18 },
  { legs: [["kelce52", "W", 55], ["mahomes258", "L", 241]], stake: 20, odds: 264, risk: "low", daysAgo: 19 },
  { legs: [["lamb66", "V"], ["dak244", "W", 279]], stake: 20, odds: -150, risk: "low", daysAgo: 20 },
  { legs: [["dak244", "W", 258], ["pickens62", "L", 41], ["lamb66", "W", 80], ["evans64", "W", 77], ["godwin55", "L", 4], ["kelce52", "W", 60], ["javTD", "L", 0]], stake: 5, odds: 3900, risk: "high", daysAgo: 21 },
  { legs: [["dak244", "W", 266], ["pickens62", "W", 71], ["evans64", "W", 66], ["kelce52", "W", 57], ["mahomes258", "L", 238]], stake: 10, odds: 1450, risk: "high", daysAgo: 22 },
  { legs: [["dak244", "P"], ["pickens62", "P"]], stake: 20, odds: 160, risk: "low", daysAgo: 0 },
];

const STATUS: Record<"W" | "L" | "V" | "P", LegStatus> = { W: "won", L: "lost", V: "void", P: "pending" };

export function sampleHistory(now = new Date("2026-10-08T12:00:00Z")): SavedBet[] {
  let n = 0;
  const newId = () => `sample-${++n}`;
  return SPECS.map((spec) => {
    const created = new Date(now.getTime() - spec.daysAgo * 86_400_000).toISOString();
    const settled = new Date(now.getTime() - (spec.daysAgo - 1) * 86_400_000).toISOString();
    const picks = spec.legs.map(([k], i) => ({ ...L[k].pick, id: `${k}-${i}` }));
    const scores = spec.legs.map(([k]) => L[k].score);
    const score = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length - Math.max(0, picks.length - 4) * 0.3) * 10) / 10;
    let bet = createSavedBet({ picks, analysis: null, stake: spec.stake, odds: spec.odds, sportsbook: "Sample", notes: null, placed: true, now: created, newId });
    const weakest = scores.indexOf(Math.min(...scores));
    bet = {
      ...bet,
      legs: bet.legs.map((l, i) => ({ ...l, analysisScore: scores[i] })),
      analysis: {
        score,
        tier: tierForScore(score),
        label: structureLabel(score),
        cohesion: 75,
        riskLevel: spec.risk,
        summary: "Sample bet.",
        weakestLegId: scores[weakest] < 7.5 && picks.length > 1 ? bet.legs[weakest].id : null,
        analyzedAt: created,
        isMockData: true,
      },
    };
    bet = markPlaced(bet, created);
    spec.legs.forEach(([, outcome, value], i) => {
      if (outcome !== "P") bet = settleLeg(bet, bet.legs[i].id, STATUS[outcome], value ?? null, settled);
    });
    return bet;
  });
}
