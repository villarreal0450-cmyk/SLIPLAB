/** The parts of ESPN's public site API responses we read. Everything optional: the API is undocumented. */

export type EspnTeamRef = {
  id: string;
  abbreviation: string;
  displayName?: string;
  shortDisplayName?: string;
  location?: string;
  name?: string;
  color?: string;
  logo?: string;
  logos?: { href: string }[];
};

export type EspnScoreboard = {
  week?: { number?: number };
  season?: { year?: number; type?: number };
  events?: EspnEvent[];
};

export type EspnEvent = {
  id: string;
  date: string;
  shortName?: string;
  week?: { number?: number };
  weather?: { displayValue?: string; temperature?: number };
  status?: { type?: { state?: "pre" | "in" | "post"; name?: string; completed?: boolean } };
  competitions?: {
    venue?: { fullName?: string; indoor?: boolean };
    competitors?: { homeAway: "home" | "away"; score?: string; team: EspnTeamRef }[];
    odds?: {
      provider?: { name?: string };
      details?: string;
      overUnder?: number;
      spread?: number;
      homeTeamOdds?: { moneyLine?: number };
      awayTeamOdds?: { moneyLine?: number };
    }[];
  }[];
};

export type EspnTeams = { sports?: { leagues?: { teams?: { team: EspnTeamRef }[] }[] }[] };

export type EspnAthlete = {
  id: string;
  fullName: string;
  jersey?: string;
  position?: { abbreviation?: string };
  headshot?: { href?: string };
  status?: { type?: string };
};

export type EspnRoster = { athletes?: { position?: string; items?: EspnAthlete[] }[] };

export type EspnInjuries = {
  injuries?: {
    id: string;
    displayName?: string;
    injuries?: {
      status?: string;
      date?: string;
      shortComment?: string;
      type?: { abbreviation?: string; description?: string };
      details?: { type?: string; returnDate?: string };
      athlete?: { displayName?: string; links?: { href?: string }[]; position?: { abbreviation?: string } };
    }[];
  }[];
};

export type EspnGameLog = {
  names?: string[];
  events?: Record<string, { gameDate?: string; atVs?: string; opponent?: { id?: string; abbreviation?: string } }>;
  seasonTypes?: { displayName?: string; categories?: { events?: { eventId: string; stats: string[] }[] }[] }[];
};

export type EspnStat = { name: string; value?: number; perGameValue?: number };
export type EspnTeamStatistics = {
  results?: {
    stats?: { categories?: { name: string; stats?: EspnStat[] }[] } | { name: string; stats?: EspnStat[] }[];
    opponent?: { categories?: { name: string; stats?: EspnStat[] }[] } | { name: string; stats?: EspnStat[] }[];
  };
};
