import type { Injury, PlayerGameLog, PlayerSeasonStats, StatLine, TeamStats } from "@/lib/types";
import { teamId } from "./teams";

/* ---------- Game logs (most recent first) ---------- */

type LogSeed = { opp: string; date: string; home: boolean; stats: StatLine };

const logs = (playerId: string, seeds: LogSeed[]): PlayerGameLog[] =>
  seeds.map((s, i) => ({
    playerId,
    gameId: `nfl-2026-log-${playerId}-${i}`,
    opponentTeamId: teamId(s.opp),
    date: s.date,
    isHome: s.home,
    stats: s.stats,
  }));

export const gameLogs: PlayerGameLog[] = [
  ...logs("dak-prescott", [
    { opp: "HOU", date: "2026-10-01", home: true, stats: { passingYards: 335, passAttempts: 41, completions: 29, passingTds: 3, interceptions: 0 } },
    { opp: "LV", date: "2026-09-24", home: false, stats: { passingYards: 247, passAttempts: 33, completions: 22, passingTds: 1, interceptions: 1 } },
    { opp: "NYG", date: "2026-09-17", home: true, stats: { passingYards: 254, passAttempts: 36, completions: 25, passingTds: 2, interceptions: 0 } },
    { opp: "CHI", date: "2026-09-10", home: false, stats: { passingYards: 223, passAttempts: 31, completions: 20, passingTds: 1, interceptions: 1 } },
    { opp: "WAS", date: "2026-09-03", home: true, stats: { passingYards: 289, passAttempts: 38, completions: 27, passingTds: 2, interceptions: 0 } },
  ]),
  ...logs("ceedee-lamb", [
    { opp: "HOU", date: "2026-10-01", home: true, stats: { receivingYards: 110, receptions: 8, targets: 11, targetShare: 0.27, receivingTds: 1, anytimeTd: 1 } },
    { opp: "LV", date: "2026-09-24", home: false, stats: { receivingYards: 74, receptions: 6, targets: 9, targetShare: 0.27, receivingTds: 0, anytimeTd: 0 } },
    { opp: "NYG", date: "2026-09-17", home: true, stats: { receivingYards: 68, receptions: 7, targets: 8, targetShare: 0.22, receivingTds: 0, anytimeTd: 0 } },
    { opp: "CHI", date: "2026-09-10", home: false, stats: { receivingYards: 95, receptions: 9, targets: 12, targetShare: 0.39, receivingTds: 1, anytimeTd: 1 } },
    { opp: "WAS", date: "2026-09-03", home: true, stats: { receivingYards: 59, receptions: 5, targets: 7, targetShare: 0.18, receivingTds: 0, anytimeTd: 0 } },
  ]),
  ...logs("george-pickens", [
    { opp: "HOU", date: "2026-10-01", home: true, stats: { receivingYards: 85, receptions: 5, targets: 8, targetShare: 0.2, receivingTds: 1, anytimeTd: 1 } },
    { opp: "LV", date: "2026-09-24", home: false, stats: { receivingYards: 61, receptions: 4, targets: 7, targetShare: 0.21, receivingTds: 0, anytimeTd: 0 } },
    { opp: "NYG", date: "2026-09-17", home: true, stats: { receivingYards: 70, receptions: 5, targets: 7, targetShare: 0.19, receivingTds: 0, anytimeTd: 0 } },
    { opp: "CHI", date: "2026-09-10", home: false, stats: { receivingYards: 134, receptions: 7, targets: 9, targetShare: 0.29, receivingTds: 1, anytimeTd: 1 } },
    { opp: "WAS", date: "2026-09-03", home: true, stats: { receivingYards: 48, receptions: 3, targets: 6, targetShare: 0.16, receivingTds: 0, anytimeTd: 0 } },
  ]),
  ...logs("javonte-williams", [
    { opp: "HOU", date: "2026-10-01", home: true, stats: { rushingYards: 71, rushingAttempts: 16, rushingTds: 1, anytimeTd: 1, redZoneTouches: 4, receptions: 3, receivingYards: 18, snapShare: 0.61 } },
    { opp: "LV", date: "2026-09-24", home: false, stats: { rushingYards: 54, rushingAttempts: 14, rushingTds: 0, anytimeTd: 0, redZoneTouches: 2, receptions: 2, receivingYards: 12, snapShare: 0.58 } },
    { opp: "NYG", date: "2026-09-17", home: true, stats: { rushingYards: 88, rushingAttempts: 19, rushingTds: 1, anytimeTd: 1, redZoneTouches: 5, receptions: 1, receivingYards: 6, snapShare: 0.64 } },
    { opp: "CHI", date: "2026-09-10", home: false, stats: { rushingYards: 42, rushingAttempts: 12, rushingTds: 0, anytimeTd: 0, redZoneTouches: 1, receptions: 4, receivingYards: 27, snapShare: 0.55 } },
    { opp: "WAS", date: "2026-09-03", home: true, stats: { rushingYards: 63, rushingAttempts: 15, rushingTds: 0, anytimeTd: 0, redZoneTouches: 3, receptions: 2, receivingYards: 9, snapShare: 0.6 } },
  ]),
  ...logs("jake-ferguson", [
    { opp: "HOU", date: "2026-10-01", home: true, stats: { receivingYards: 41, receptions: 5, targets: 6, targetShare: 0.15, anytimeTd: 0 } },
    { opp: "LV", date: "2026-09-24", home: false, stats: { receivingYards: 33, receptions: 4, targets: 5, targetShare: 0.15, anytimeTd: 1 } },
    { opp: "NYG", date: "2026-09-17", home: true, stats: { receivingYards: 52, receptions: 6, targets: 7, targetShare: 0.19, anytimeTd: 0 } },
    { opp: "CHI", date: "2026-09-10", home: false, stats: { receivingYards: 28, receptions: 3, targets: 4, targetShare: 0.13, anytimeTd: 0 } },
    { opp: "WAS", date: "2026-09-03", home: true, stats: { receivingYards: 37, receptions: 4, targets: 5, targetShare: 0.13, anytimeTd: 0 } },
  ]),
  ...logs("baker-mayfield", [
    { opp: "SEA", date: "2026-10-01", home: false, stats: { passingYards: 261, passAttempts: 34, completions: 23, passingTds: 2, interceptions: 1 } },
    { opp: "PHI", date: "2026-09-24", home: true, stats: { passingYards: 238, passAttempts: 30, completions: 21, passingTds: 1, interceptions: 0 } },
    { opp: "NYJ", date: "2026-09-17", home: true, stats: { passingYards: 292, passAttempts: 38, completions: 26, passingTds: 3, interceptions: 0 } },
    { opp: "HOU", date: "2026-09-10", home: false, stats: { passingYards: 215, passAttempts: 29, completions: 19, passingTds: 1, interceptions: 2 } },
    { opp: "ATL", date: "2026-09-03", home: false, stats: { passingYards: 267, passAttempts: 35, completions: 24, passingTds: 2, interceptions: 0 } },
  ]),
  ...logs("mike-evans", [
    { opp: "SEA", date: "2026-10-01", home: false, stats: { receivingYards: 71, receptions: 5, targets: 8, targetShare: 0.24, anytimeTd: 1 } },
    { opp: "PHI", date: "2026-09-24", home: true, stats: { receivingYards: 48, receptions: 4, targets: 7, targetShare: 0.23, anytimeTd: 0 } },
    { opp: "NYJ", date: "2026-09-17", home: true, stats: { receivingYards: 96, receptions: 6, targets: 9, targetShare: 0.24, anytimeTd: 1 } },
    { opp: "HOU", date: "2026-09-10", home: false, stats: { receivingYards: 39, receptions: 3, targets: 6, targetShare: 0.21, anytimeTd: 0 } },
    { opp: "ATL", date: "2026-09-03", home: false, stats: { receivingYards: 82, receptions: 6, targets: 10, targetShare: 0.29, anytimeTd: 0 } },
  ]),
  ...logs("chris-godwin", [
    { opp: "SEA", date: "2026-10-01", home: false, stats: { receivingYards: 64, receptions: 7, targets: 9, targetShare: 0.26, anytimeTd: 0 } },
    { opp: "PHI", date: "2026-09-24", home: true, stats: { receivingYards: 58, receptions: 6, targets: 8, targetShare: 0.27, anytimeTd: 0 } },
    { opp: "NYJ", date: "2026-09-17", home: true, stats: { receivingYards: 77, receptions: 8, targets: 10, targetShare: 0.26, anytimeTd: 1 } },
    { opp: "HOU", date: "2026-09-10", home: false, stats: { receivingYards: 51, receptions: 5, targets: 7, targetShare: 0.24, anytimeTd: 0 } },
    { opp: "ATL", date: "2026-09-03", home: false, stats: { receivingYards: 69, receptions: 7, targets: 9, targetShare: 0.26, anytimeTd: 0 } },
  ]),
  ...logs("emeka-egbuka", [
    { opp: "SEA", date: "2026-10-01", home: false, stats: { receivingYards: 55, receptions: 4, targets: 6, targetShare: 0.18, anytimeTd: 1 } },
    { opp: "PHI", date: "2026-09-24", home: true, stats: { receivingYards: 41, receptions: 3, targets: 5, targetShare: 0.17, anytimeTd: 0 } },
    { opp: "NYJ", date: "2026-09-17", home: true, stats: { receivingYards: 63, receptions: 5, targets: 7, targetShare: 0.18, anytimeTd: 0 } },
    { opp: "HOU", date: "2026-09-10", home: false, stats: { receivingYards: 29, receptions: 2, targets: 4, targetShare: 0.14, anytimeTd: 0 } },
    { opp: "ATL", date: "2026-09-03", home: false, stats: { receivingYards: 47, receptions: 4, targets: 6, targetShare: 0.17, anytimeTd: 0 } },
  ]),
  ...logs("bucky-irving", [
    { opp: "SEA", date: "2026-10-01", home: false, stats: { rushingYards: 78, rushingAttempts: 17, rushingTds: 1, anytimeTd: 1, redZoneTouches: 4, receptions: 3, receivingYards: 22, snapShare: 0.66 } },
    { opp: "PHI", date: "2026-09-24", home: true, stats: { rushingYards: 59, rushingAttempts: 15, rushingTds: 0, anytimeTd: 0, redZoneTouches: 3, receptions: 4, receivingYards: 31, snapShare: 0.62 } },
    { opp: "NYJ", date: "2026-09-17", home: true, stats: { rushingYards: 94, rushingAttempts: 20, rushingTds: 1, anytimeTd: 1, redZoneTouches: 5, receptions: 2, receivingYards: 14, snapShare: 0.68 } },
    { opp: "HOU", date: "2026-09-10", home: false, stats: { rushingYards: 47, rushingAttempts: 13, rushingTds: 0, anytimeTd: 0, redZoneTouches: 2, receptions: 3, receivingYards: 19, snapShare: 0.6 } },
    { opp: "ATL", date: "2026-09-03", home: false, stats: { rushingYards: 83, rushingAttempts: 18, rushingTds: 1, anytimeTd: 1, redZoneTouches: 4, receptions: 2, receivingYards: 11, snapShare: 0.64 } },
  ]),
];

/* ---------- Season averages ---------- */

const season = (playerId: string, gamesPlayed: number, averages: StatLine): PlayerSeasonStats => ({
  playerId,
  season: 2026,
  gamesPlayed,
  averages,
});

export const seasonStats: PlayerSeasonStats[] = [
  season("dak-prescott", 5, { passingYards: 269.6, passAttempts: 35.8, completions: 24.6, passingTds: 1.8, interceptions: 0.4 }),
  season("ceedee-lamb", 5, { receivingYards: 81.2, receptions: 7.0, targets: 9.4, targetShare: 0.27, receivingTds: 0.4, anytimeTd: 0.4 }),
  season("george-pickens", 5, { receivingYards: 79.6, receptions: 4.8, targets: 7.4, targetShare: 0.21, receivingTds: 0.4, anytimeTd: 0.4 }),
  season("javonte-williams", 5, { rushingYards: 63.6, rushingAttempts: 15.2, rushingTds: 0.4, anytimeTd: 0.4, redZoneTouches: 3.0, receptions: 2.4, receivingYards: 14.4, snapShare: 0.6 }),
  season("jake-ferguson", 5, { receivingYards: 38.2, receptions: 4.4, targets: 5.4, targetShare: 0.15, anytimeTd: 0.2 }),
  season("baker-mayfield", 5, { passingYards: 254.6, passAttempts: 33.2, completions: 22.6, passingTds: 1.8, interceptions: 0.6 }),
  season("mike-evans", 5, { receivingYards: 67.2, receptions: 4.8, targets: 8.0, targetShare: 0.24, anytimeTd: 0.4 }),
  season("chris-godwin", 5, { receivingYards: 63.8, receptions: 6.6, targets: 8.6, targetShare: 0.26, anytimeTd: 0.2 }),
  season("emeka-egbuka", 5, { receivingYards: 47.0, receptions: 3.6, targets: 5.6, targetShare: 0.17, anytimeTd: 0.2 }),
  season("bucky-irving", 5, { rushingYards: 72.2, rushingAttempts: 16.6, rushingTds: 0.6, anytimeTd: 0.6, redZoneTouches: 3.6, receptions: 2.8, receivingYards: 19.4, snapShare: 0.64 }),
];

/* ---------- Team stats ---------- */

const team = (abbr: string, offense: TeamStats["offense"], defense: TeamStats["defense"]): TeamStats => ({
  teamId: teamId(abbr),
  season: 2026,
  gamesPlayed: 5,
  offense,
  defense,
});

export const teamStats: TeamStats[] = [
  team(
    "DAL",
    { pointsPerGame: 27.4, passRate: 0.62, playsPerGame: 66, passYardsPerGame: 268, rushYardsPerGame: 104 },
    { pointsAllowedPerGame: 23.8, passYardsAllowedPerGame: 231, passYardsAllowedRank: 17, rushYardsAllowedPerGame: 128, rushYardsAllowedRank: 24, receivingYardsAllowedPerGame: 151, rushTdsAllowedPerGame: 1.0, sacksPerGame: 2.7 },
  ),
  team(
    "TB",
    { pointsPerGame: 24.6, passRate: 0.58, playsPerGame: 64, passYardsPerGame: 251, rushYardsPerGame: 118 },
    { pointsAllowedPerGame: 25.1, passYardsAllowedPerGame: 263, passYardsAllowedRank: 29, rushYardsAllowedPerGame: 112, rushYardsAllowedRank: 14, receivingYardsAllowedPerGame: 178, rushTdsAllowedPerGame: 1.1, sacksPerGame: 2.5 },
  ),
  team(
    "ATL",
    { pointsPerGame: 22.8, passRate: 0.54, playsPerGame: 63, passYardsPerGame: 224, rushYardsPerGame: 131 },
    { pointsAllowedPerGame: 21.2, passYardsAllowedPerGame: 218, passYardsAllowedRank: 12, rushYardsAllowedPerGame: 104, rushYardsAllowedRank: 9, receivingYardsAllowedPerGame: 142, rushTdsAllowedPerGame: 0.8, sacksPerGame: 2.9 },
  ),
  team(
    "NO",
    { pointsPerGame: 18.4, passRate: 0.57, playsPerGame: 61, passYardsPerGame: 205, rushYardsPerGame: 96 },
    { pointsAllowedPerGame: 26.6, passYardsAllowedPerGame: 246, passYardsAllowedRank: 23, rushYardsAllowedPerGame: 134, rushYardsAllowedRank: 27, receivingYardsAllowedPerGame: 166, rushTdsAllowedPerGame: 1.3, sacksPerGame: 2.3 },
  ),
  team(
    "KC",
    { pointsPerGame: 25.2, passRate: 0.63, playsPerGame: 67, passYardsPerGame: 262, rushYardsPerGame: 98 },
    { pointsAllowedPerGame: 19.8, passYardsAllowedPerGame: 212, passYardsAllowedRank: 10, rushYardsAllowedPerGame: 109, rushYardsAllowedRank: 12, receivingYardsAllowedPerGame: 139, rushTdsAllowedPerGame: 0.7, sacksPerGame: 3.0 },
  ),
  team(
    "DEN",
    { pointsPerGame: 23.6, passRate: 0.56, playsPerGame: 65, passYardsPerGame: 236, rushYardsPerGame: 121 },
    { pointsAllowedPerGame: 17.9, passYardsAllowedPerGame: 198, passYardsAllowedRank: 4, rushYardsAllowedPerGame: 97, rushYardsAllowedRank: 5, receivingYardsAllowedPerGame: 128, rushTdsAllowedPerGame: 0.6, sacksPerGame: 3.3 },
  ),
];

/* ---------- Injuries ---------- */

export const injuries: Injury[] = [
  {
    playerId: "antoine-winfield",
    playerName: "Antoine Winfield Jr.",
    teamId: teamId("TB"),
    position: "S",
    status: "out",
    description: "Ankle — ruled out for Week 5",
    updatedAt: "2026-10-06T18:00:00Z",
  },
  {
    playerId: "jordan-morrison",
    playerName: "Jordan Morrison",
    teamId: teamId("TB"),
    position: "CB",
    status: "doubtful",
    description: "Hamstring — limited all week",
    updatedAt: "2026-10-06T18:00:00Z",
  },
  {
    playerId: "tyler-guyton",
    playerName: "Tyler Guyton",
    teamId: teamId("DAL"),
    position: "OL",
    status: "questionable",
    description: "Knee — full participant Friday",
    updatedAt: "2026-10-06T18:00:00Z",
  },
  {
    playerId: "chris-olave",
    playerName: "Chris Olave",
    teamId: teamId("NO"),
    position: "WR",
    status: "questionable",
    description: "Concussion protocol",
    updatedAt: "2026-10-06T18:00:00Z",
  },
  {
    playerId: "rashee-rice",
    playerName: "Rashee Rice",
    teamId: teamId("KC"),
    position: "WR",
    status: "probable",
    description: "Rest day Wednesday",
    updatedAt: "2026-10-06T18:00:00Z",
  },
];
