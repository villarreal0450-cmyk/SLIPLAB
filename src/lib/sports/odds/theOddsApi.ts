import type { MarketKey, MarketLine, Player, SportKey, Team } from "@/lib/types";
import { fetchJson, HOUR } from "../http";

/**
 * Player props from The Odds API (the-odds-api.com). Requires ODDS_API_KEY.
 *
 * Cost control: listing events is free; each event-odds call costs
 * [markets returned] × [regions]. Props are fetched per game on demand and
 * cached for 3 hours, so the free tier lasts.
 */

const ROOT = "https://api.the-odds-api.com/v4/sports";

const FOOTBALL: Record<string, MarketKey> = {
  player_pass_yds: "passing_yards",
  player_pass_tds: "passing_tds",
  player_pass_completions: "completions",
  player_rush_yds: "rushing_yards",
  player_rush_attempts: "rushing_attempts",
  player_reception_yds: "receiving_yards",
  player_receptions: "receptions",
  player_anytime_td: "anytime_td",
};
const FOOTBALL_ALTERNATES: Record<string, MarketKey> = {
  player_pass_yds_alternate: "passing_yards",
  player_rush_yds_alternate: "rushing_yards",
  player_reception_yds_alternate: "receiving_yards",
  player_receptions_alternate: "receptions",
};

/** The Odds API sport key and market keys for each league we cover. */
const LEAGUES: Record<SportKey, { key: string; markets: Record<string, MarketKey>; alternates: Record<string, MarketKey> }> = {
  nfl: { key: "americanfootball_nfl", markets: FOOTBALL, alternates: FOOTBALL_ALTERNATES },
  ncaaf: { key: "americanfootball_ncaaf", markets: FOOTBALL, alternates: FOOTBALL_ALTERNATES },
  nba: {
    key: "basketball_nba",
    markets: {
      player_points: "points",
      player_rebounds: "rebounds",
      player_assists: "assists",
      player_threes: "threes",
      player_points_rebounds_assists: "pra",
      player_points_rebounds: "points_rebounds",
      player_points_assists: "points_assists",
      player_rebounds_assists: "rebounds_assists",
      player_steals: "steals",
      player_blocks: "blocks",
    },
    alternates: { player_points_alternate: "points", player_rebounds_alternate: "rebounds", player_assists_alternate: "assists", player_threes_alternate: "threes" },
  },
  nhl: {
    key: "icehockey_nhl",
    markets: { player_points: "nhl_points", player_assists: "nhl_assists", player_goals: "goals", player_shots_on_goal: "shots_on_goal", player_total_saves: "saves" },
    alternates: {},
  },
  mlb: {
    key: "baseball_mlb",
    markets: {
      batter_hits: "hits",
      batter_total_bases: "total_bases",
      batter_home_runs: "home_runs",
      batter_rbis: "rbis",
      batter_runs_scored: "runs",
      batter_hits_runs_rbis: "hits_runs_rbis",
      pitcher_strikeouts: "pitcher_strikeouts",
      pitcher_hits_allowed: "hits_allowed",
      pitcher_earned_runs: "earned_runs",
      pitcher_outs: "outs_recorded",
    },
    alternates: {},
  },
};

/** First book that prices a player's market wins; this order sets preference. */
const BOOKS = ["draftkings", "fanduel", "betmgm", "williamhill_us", "espnbet"];

type OddsEvent = { id: string; commence_time: string; home_team: string; away_team: string };
type Outcome = { name: string; description?: string; price: number; point?: number };
type EventOdds = { id: string; bookmakers?: { key: string; markets?: { key: string; last_update?: string; outcomes?: Outcome[] }[] }[] };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Once the plan runs out of credits (or the key is rejected), stop calling for
 * a while instead of failing on every page load. Callers fall back to free lines.
 */
const PAUSE_MS = 6 * HOUR;
let pausedUntil = 0;

export class TheOddsApi {
  constructor(
    private readonly apiKey: string,
    private readonly includeAlternates = false,
  ) {}

  private url(sport: SportKey, path: string, params: Record<string, string> = {}) {
    const q = new URLSearchParams({ ...params, apiKey: this.apiKey });
    return `${ROOT}/${LEAGUES[sport].key}${path}?${q}`;
  }

  private async events(sport: SportKey): Promise<OddsEvent[]> {
    // Free endpoint; refresh hourly.
    return fetchJson<OddsEvent[]>(this.url(sport, "/events"), { ttlMs: HOUR, key: `${ROOT}/${LEAGUES[sport].key}/events` });
  }

  /** Props for one game, matched to the roster we already have. Returns [] when the book hasn't posted any. */
  async propsForGame(sport: SportKey, gameId: string, startsAt: string, home: Team, away: Team, players: Player[]): Promise<MarketLine[]> {
    if (Date.now() < pausedUntil) return [];
    const league = LEAGUES[sport];
    const events = await this.events(sport);
    const homeName = norm(`${home.city} ${home.name}`);
    const awayName = norm(`${away.city} ${away.name}`);
    const event = events.find(
      (e) => norm(e.home_team) === homeName && norm(e.away_team) === awayName && Math.abs(Date.parse(e.commence_time) - Date.parse(startsAt)) < 12 * HOUR,
    );
    if (!event) return [];

    const keys = [...Object.keys(league.markets), ...(this.includeAlternates ? Object.keys(league.alternates) : [])];
    const odds = await fetchJson<EventOdds>(
      this.url(sport, `/events/${event.id}/odds`, { regions: "us", markets: keys.join(","), oddsFormat: "american", bookmakers: BOOKS.join(",") }),
      {
        ttlMs: 3 * HOUR,
        key: `${ROOT}/${league.key}/events/${event.id}/odds:${keys.join(",")}`,
        onResponse: (res) => {
          const left = res.headers.get("x-requests-remaining");
          if (left !== null && Number(left) < 50) console.warn(`The Odds API: ${left} credits left this month`);
          if (res.status === 401 || res.status === 429 || (left !== null && Number(left) <= 0)) {
            pausedUntil = Date.now() + PAUSE_MS;
            console.warn("The Odds API is out of credits or rejected the key; using free lines for the next 6 hours.");
          }
        },
      },
    );
    return toMarketLines(odds, gameId, players, sport);
  }
}

/** Pure: bookmaker outcomes → one MarketLine per player + market (exported for tests). */
export function toMarketLines(odds: EventOdds, gameId: string, players: Player[], sport: SportKey = "nfl"): MarketLine[] {
  const { markets: MARKETS, alternates: ALTERNATES } = LEAGUES[sport];
  const byName = new Map(players.map((p) => [norm(p.name), p]));
  const lines = new Map<string, MarketLine>();
  const books = [...(odds.bookmakers ?? [])].sort((a, b) => rank(a.key) - rank(b.key));

  for (const book of books) {
    for (const market of book.markets ?? []) {
      const main = MARKETS[market.key];
      const alt = ALTERNATES[market.key];
      const key = main ?? alt;
      if (!key) continue;

      // Group outcomes by player.
      const grouped = new Map<string, Outcome[]>();
      for (const o of market.outcomes ?? []) {
        if (!o.description) continue;
        grouped.set(o.description, [...(grouped.get(o.description) ?? []), o]);
      }

      for (const [name, outcomes] of grouped) {
        const player = byName.get(norm(name));
        if (!player) continue;
        const id = `${player.id}:${key}`;
        const updatedAt = market.last_update ?? new Date(0).toISOString();

        if (alt) {
          const existing = lines.get(id);
          if (!existing) continue; // alternates only extend a main line
          const points = new Map<number, { over?: number; under?: number }>();
          for (const o of outcomes) {
            if (o.point === undefined) continue;
            const p = points.get(o.point) ?? {};
            if (o.name === "Over") p.over = o.price;
            if (o.name === "Under") p.under = o.price;
            points.set(o.point, p);
          }
          const known = new Set((existing.alternates ?? []).map((a) => a.line));
          const extra = [...points.entries()]
            .filter(([line, p]) => p.over !== undefined && !known.has(line))
            .map(([line, p]) => ({ line, overOdds: p.over!, underOdds: p.under ?? Number.NaN }));
          existing.alternates = [...(existing.alternates ?? []), ...extra].sort((a, b) => a.line - b.line);
          continue;
        }

        if (lines.has(id)) continue; // a preferred book already priced it
        if (key === "anytime_td") {
          const yes = outcomes.find((o) => o.name === "Yes" || o.name === "Over");
          if (!yes) continue;
          const no = outcomes.find((o) => o.name === "No" || o.name === "Under");
          lines.set(id, { playerId: player.id, gameId, market: key, line: null, overOdds: yes.price, underOdds: no?.price ?? Number.NaN, updatedAt });
        } else {
          const over = outcomes.find((o) => o.name === "Over");
          const under = outcomes.find((o) => o.name === "Under");
          if (!over || over.point === undefined) continue;
          lines.set(id, { playerId: player.id, gameId, market: key, line: over.point, overOdds: over.price, underOdds: under?.price ?? Number.NaN, updatedAt });
        }
      }
    }
  }
  return [...lines.values()];
}

function rank(book: string) {
  const i = BOOKS.indexOf(book);
  return i === -1 ? BOOKS.length : i;
}
