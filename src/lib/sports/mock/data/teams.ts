import type { Team } from "@/lib/types";

const nfl = (abbreviation: string, city: string, name: string, color: string): Team => ({
  id: `nfl-${abbreviation.toLowerCase()}`,
  sport: "nfl",
  abbreviation,
  city,
  name,
  color,
});

export const teams: Team[] = [
  nfl("DAL", "Dallas", "Cowboys", "#041E42"),
  nfl("TB", "Tampa Bay", "Buccaneers", "#D50A0A"),
  nfl("ATL", "Atlanta", "Falcons", "#A71930"),
  nfl("NO", "New Orleans", "Saints", "#D3BC8D"),
  nfl("KC", "Kansas City", "Chiefs", "#E31837"),
  nfl("DEN", "Denver", "Broncos", "#FB4F14"),
  // Opponents referenced only in game logs.
  nfl("HOU", "Houston", "Texans", "#03202F"),
  nfl("LV", "Las Vegas", "Raiders", "#A5ACAF"),
  nfl("NYG", "New York", "Giants", "#0B2265"),
  nfl("CHI", "Chicago", "Bears", "#0B162A"),
  nfl("WAS", "Washington", "Commanders", "#5A1414"),
  nfl("PHI", "Philadelphia", "Eagles", "#004C54"),
  nfl("SEA", "Seattle", "Seahawks", "#002244"),
  nfl("NYJ", "New York", "Jets", "#125740"),
  nfl("MIN", "Minnesota", "Vikings", "#4F2683"),
  nfl("CAR", "Carolina", "Panthers", "#0085CA"),
  nfl("LAC", "Los Angeles", "Chargers", "#0080C6"),
  nfl("BUF", "Buffalo", "Bills", "#00338D"),
  nfl("CIN", "Cincinnati", "Bengals", "#FB4F14"),
  nfl("TEN", "Tennessee", "Titans", "#0C2340"),
  nfl("JAX", "Jacksonville", "Jaguars", "#006778"),
];

export const teamId = (abbr: string) => `nfl-${abbr.toLowerCase()}`;
