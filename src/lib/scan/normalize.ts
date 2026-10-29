import { lastName } from "@/lib/format/names";
import { marketOddsFor } from "@/lib/parlay/marketMath";
import type { SportsDataProvider } from "@/lib/sports/provider";
import { defaultMarketsFor, MARKETS, type Direction, type MarketKey, type Pick, type SportKey } from "@/lib/types";
import type { CatalogGame, CatalogPlayer, NormalizedLeg, ParsedLeg, ParsedSlip } from "./types";

/**
 * Turn what was read off a slip into picks our engine understands, and say
 * exactly what the user needs to check. Nothing is silently guessed: any
 * inference shows up in `issues` and downgrades the leg to "review".
 */

/**
 * Market wording seen on US and Latin American books (DraftKings, FanDuel,
 * Caliente, Draftea, Codere…). Matched against accent-free lowercase text.
 * Order matters: specific phrases come before generic ones.
 */
const MARKET_SYNONYMS: [RegExp, MarketKey][] = [
  // Touchdown scorer — EN / ES
  [/anytime\s*(td|touchdown)|to score a (td|touchdown)|td scorer|touchdown scorer|anota(dor)?\b.*(cualquier|momento)|en cualquier momento|anotador de touchdown/, "anytime_td"],
  // Basketball combos come before their parts — EN / ES
  [/\bpra\b|pts\s*\+\s*reb\s*\+\s*ast|points,?\s*rebounds,?\s*(and|&|\+)?\s*assists|puntos\s*(\+|,)?\s*rebotes\s*(\+|y|,)\s*asistencias/, "pra"],
  [/pts\s*\+\s*reb|points\s*(\+|and|&)\s*rebounds|puntos\s*(\+|y)\s*rebotes/, "points_rebounds"],
  [/pts\s*\+\s*ast|points\s*(\+|and|&)\s*assists|puntos\s*(\+|y)\s*asistencias/, "points_assists"],
  [/reb(ounds)?\s*(\+|and|&)\s*ast|rebotes\s*(\+|y)\s*asistencias/, "rebounds_assists"],
  // Baseball — EN / ES (specific phrases before "hits" and "runs")
  [/hits\s*\+\s*runs\s*\+\s*rbis?|h\s*\+\s*r\s*\+\s*rbi|hits,?\s*carreras\s*(y|\+)\s*(carreras\s*)?impulsadas/, "hits_runs_rbis"],
  [/hits allowed|hits permitidos|imparables permitidos/, "hits_allowed"],
  [/earned runs|carreras limpias/, "earned_runs"],
  [/outs recorded|pitching outs|outs (registrados|lanzados)/, "outs_recorded"],
  [/strikeouts?|ponches|chocolates|\bks\b/, "pitcher_strikeouts"],
  [/total bases|bases totales/, "total_bases"],
  [/home runs?|\bhrs?\b|jonron(es)?|cuadrangular(es)?/, "home_runs"],
  [/\brbis?\b|carreras impulsadas|impulsadas/, "rbis"],
  [/runs scored|\bruns\b|carreras anotadas/, "runs"],
  [/\bhits?\b|imparables/, "hits"],
  // Hockey — EN / ES
  [/shots on goal|\bsog\b|tiros\s*(a|al)\s*(gol|puerta|marco|arco)/, "shots_on_goal"],
  [/saves|atajadas|paradas/, "saves"],
  [/goal\s*scorer|\bgoals?\b|goles|anotar (un )?gol/, "goals"],
  // Spanish yardage phrases ("YDS DE RECEPCION", "yardas por pase", "yardas terrestres")
  [/(yds|yardas)\s*(de|por)\s*recepci/, "receiving_yards"],
  [/(tds?|touchdowns?|anotaciones)\s*(de|por)\s*pase/, "passing_tds"],
  [/(yds|yardas)\s*(de|por)\s*pase|yardas aereas/, "passing_yards"],
  [/(yds|yardas)\s*(de\s*carrera|por\s*carrera|terrestres|por\s*tierra)/, "rushing_yards"],
  [/acarreos|intentos de carrera/, "rushing_attempts"],
  [/pases completos|completos/, "completions"],
  [/recepciones/, "receptions"],
  [/triples/, "threes"],
  [/rebotes/, "rebounds"],
  [/asistencias/, "assists"],
  [/robos/, "steals"],
  [/bloqueos|tapones/, "blocks"],
  [/puntos/, "points"],
  // English
  [/pass(ing)?\s*(yds|yards)/, "passing_yards"],
  [/pass(ing)?\s*(tds?|touchdowns?)/, "passing_tds"],
  [/completions?/, "completions"],
  [/rush(ing)?\s*(att|attempts|carries)|\bcarries\b/, "rushing_attempts"],
  [/rush(ing)?\s*(yds|yards)/, "rushing_yards"],
  [/rec(eiving)?\s*(yds|yards)/, "receiving_yards"],
  [/receptions?|\brec\b|catches/, "receptions"],
  [/three|3pm|3-pointers?/, "threes"],
  [/rebounds?|\breb\b/, "rebounds"],
  [/assists?|\bast\b/, "assists"],
  [/steals?|\bstl\b/, "steals"],
  [/blocks?|\bblk\b/, "blocks"],
  [/points?|\bpts\b/, "points"],
];

/** Hockey uses the same words as basketball for points and assists; the player's sport decides. */
export function marketForSport(market: MarketKey, sport: SportKey): MarketKey {
  if (sport === "nhl") {
    if (market === "points") return "nhl_points";
    if (market === "assists") return "nhl_assists";
  }
  return market;
}

/** The leagues a parsed slip touches: what the reader said, else what the prop types imply. */
export function sportsForSlip(slip: ParsedSlip): SportKey[] {
  const out = new Set<SportKey>();
  for (const leg of slip.legs) {
    if (leg.sport) {
      out.add(leg.sport);
      continue;
    }
    const market = matchMarket(leg.market);
    if (market) for (const s of MARKETS[market].sport) out.add(s);
    if (market === "points" || market === "assists") out.add("nhl");
  }
  return out.size ? [...out] : ["nfl", "nba", "nhl", "mlb"];
}

/**
 * Variants that share words with supported markets but settle differently
 * ("Longest Reception", "First TD Scorer", "1st Half Passing Yards",
 * "Recepción más larga", "Primer anotador"). Checked first so they are never
 * mistaken for the base market.
 */
const UNSUPPORTED_VARIANTS =
  /longest|first|1st|2nd|last|half|quarter|\bq[1-4]\b|period|combined|\+\s*(rush|rec)|milestone|mas larg|primer|ultimo|mitad|cuarto|combinad/;

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function matchMarket(text: string | null): MarketKey | null {
  if (!text) return null;
  const t = fold(text);
  if (UNSUPPORTED_VARIANTS.test(t)) return null;
  return MARKET_SYNONYMS.find(([re]) => re.test(t))?.[1] ?? null;
}

const clean = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const TEAM_ALIASES: Record<string, string> = { WAS: "WSH", JAC: "JAX", LA: "LAR", ARZ: "ARI", NWE: "NE", KAN: "KC", SFO: "SF", GNB: "GB", NOR: "NO", TAM: "TB" };

/**
 * Match a printed name to a roster player. When the slip shows the team, the
 * search is narrowed to that roster first: across a full league, "J. Williams"
 * or "J. Daniels" alone is ambiguous.
 */
export function matchPlayer(name: string | null, players: CatalogPlayer[], team?: string | null): { player: CatalogPlayer; exact: boolean } | null {
  if (!name) return null;
  const abbr = team ? (TEAM_ALIASES[team.trim().toUpperCase()] ?? team.trim().toUpperCase()) : null;
  const onTeam = abbr ? players.filter((p) => p.teamAbbr.toUpperCase() === abbr) : [];
  if (onTeam.length) {
    const found = matchByName(name, onTeam);
    if (found) return found;
  }
  return matchByName(name, players);
}

function matchByName(name: string, players: CatalogPlayer[]): { player: CatalogPlayer; exact: boolean } | null {
  const target = clean(name);
  const exact = players.find((p) => clean(p.name) === target);
  if (exact) return { player: exact, exact: true };

  // "J. Williams" style (initial + last name), common on Latin American books.
  const [first, ...rest] = target.split(" ");
  if (first?.length === 1 && rest.length) {
    const last = rest.join(" ");
    const initialMatches = players.filter((p) => {
      const parts = clean(p.name).split(" ");
      return parts[0]?.[0] === first && parts.slice(1).join(" ") === last;
    });
    if (initialMatches.length === 1) return { player: initialMatches[0], exact: true };
  }

  const byLast = players.filter((p) => clean(lastName(p.name)) === clean(lastName(name)));
  return byLast.length === 1 ? { player: byLast[0], exact: false } : null;
}

/**
 * Players and their available markets across the upcoming slate, limited to
 * the leagues on the slip. College football has dozens of games a week, so it
 * is narrowed to the teams the slip names when it names any.
 */
export async function buildCatalog(provider: SportsDataProvider, filter: { sports?: SportKey[]; teamHints?: string[] } = {}): Promise<CatalogGame[]> {
  const sports = filter.sports ? new Set(filter.sports) : null;
  let games = (await provider.getGames()).filter((g) => g.status === "scheduled" && (!sports || sports.has(g.sport)));
  const hints = (filter.teamHints ?? []).map((h) => fold(h).trim()).filter((h) => h.length >= 2);
  if (hints.length && games.some((g) => g.sport === "ncaaf")) {
    const teams = new Map((await provider.getTeams("ncaaf")).map((t) => [t.id, t]));
    const named = (id: string) => {
      const t = teams.get(id);
      if (!t) return false;
      const words = [t.abbreviation, t.city, t.name, `${t.city} ${t.name}`].map((w) => fold(w));
      return hints.some((h) => words.some((w) => w === h || (h.length >= 4 && w.includes(h))));
    };
    games = games.filter((g) => g.sport !== "ncaaf" || named(g.homeTeamId) || named(g.awayTeamId));
  }
  return Promise.all(
    games.map(async (game) => {
      const [players, props, home, away] = await Promise.all([
        provider.getPlayersForGame(game.id),
        provider.getPlayerProps(game.id),
        provider.getTeam(game.homeTeamId),
        provider.getTeam(game.awayTeamId),
      ]);
      const teamOf = (id: string) => (id === home?.id ? home : away);
      return {
        gameId: game.id,
        label: `${away?.abbreviation ?? "AWAY"} @ ${home?.abbreviation ?? "HOME"}`,
        startsAt: game.startsAt,
        priced: props.length > 0,
        players: players
          .map((p): CatalogPlayer => {
            const team = teamOf(p.teamId);
            const opponentTeamId = p.teamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
            const quoted = props
              .filter((m) => m.playerId === p.id)
              .map((m) => ({ market: m.market, line: m.line, overOdds: m.overOdds, underOdds: m.underOdds, alternates: m.alternates, priced: m.priced !== false }));
            const extra = defaultMarketsFor(p.sport, p.position)
              .filter((k) => !quoted.some((q) => q.market === k))
              .map((k) => ({ market: k, line: null, overOdds: Number.NaN, underOdds: Number.NaN, priced: false }));
            return {
              id: p.id,
              sport: p.sport,
              name: p.name,
              position: p.position,
              teamId: p.teamId,
              opponentTeamId,
              teamAbbr: team?.abbreviation ?? "",
              opponentAbbr: teamOf(opponentTeamId)?.abbreviation ?? "",
              teamColor: team?.color ?? "#3a3a40",
              headshotUrl: p.headshotUrl,
              gameId: game.id,
              markets: [...quoted, ...extra],
            };
          })
          .filter((p) => p.markets.length > 0),
      };
    }),
  );
}

/** Build a Pick for a catalog player. Shared by normalization and the review editor. */
export function pickFor(player: CatalogPlayer, market: MarketKey, direction: Direction, line: number | null, odds: number | undefined, id: string): Pick {
  const m = player.markets.find((x) => x.market === market);
  return {
    id,
    sport: player.sport,
    gameId: player.gameId,
    playerId: player.id,
    playerName: player.name,
    teamId: player.teamId,
    opponentTeamId: player.opponentTeamId,
    market,
    direction,
    line: MARKETS[market].kind === "yes_no" ? null : line,
    odds,
    isAlternate: m?.priced && MARKETS[market].kind === "over_under" ? m.line !== line : undefined,
    meta: { teamAbbr: player.teamAbbr, opponentAbbr: player.opponentAbbr, position: player.position, teamColor: player.teamColor, headshotUrl: player.headshotUrl },
  };
}

export function normalizeSlip(slip: ParsedSlip, catalog: CatalogGame[], newId: () => string): NormalizedLeg[] {
  const players = catalog.flatMap((g) => g.players);
  const pricedGames = new Set(catalog.filter((g) => g.priced).map((g) => g.gameId));
  return slip.legs.map((raw) => normalizeLeg(raw, players, pricedGames, newId()));
}

function normalizeLeg(raw: ParsedLeg, allPlayers: CatalogPlayer[], pricedGames: Set<string>, id: string): NormalizedLeg {
  const issues: string[] = [];
  // When the reader named the league, don't let a same-named player in another sport win.
  const inSport = raw.sport ? allPlayers.filter((p) => p.sport === raw.sport) : allPlayers;
  const found = matchPlayer(raw.player, inSport.length ? inSport : allPlayers, raw.team);
  if (!found) {
    return {
      id,
      raw,
      status: "unmatched",
      pick: null,
      issues: [raw.player ? `Couldn't find ${raw.player} in the upcoming games.` : "No player name was readable."],
    };
  }
  const { player } = found;
  if (!found.exact) issues.push(`Matched "${raw.player}" to ${player.name} by last name.`);

  const matched = matchMarket(raw.market);
  const market = matched ? marketForSport(matched, player.sport) : null;
  if (!market) {
    return { id, raw, status: "review", pick: null, issues: [...issues, raw.market ? `Didn't recognize the prop "${raw.market}". Pick it below.` : "No prop category was readable."] };
  }
  const def = MARKETS[market];
  if (!def.sport.includes(player.sport)) {
    return { id, raw, status: "review", pick: null, issues: [...issues, `"${raw.market}" isn't a ${player.sport.toUpperCase()} prop we track for ${player.name}. Pick it below.`] };
  }
  const listed = player.markets.find((m) => m.market === market);
  const available = listed?.priced ? listed : undefined;
  // Only worth flagging when this game has sportsbook quotes and this prop isn't among them.
  if (!available && pricedGames.has(player.gameId)) issues.push(`No sportsbook line for ${player.name}'s ${def.label.toLowerCase()} in our data.`);

  let direction: Direction;
  if (def.kind === "yes_no") {
    direction = raw.direction === "no" ? "no" : "yes";
  } else if (raw.direction === "over" || raw.direction === "under") {
    direction = raw.direction;
  } else {
    direction = "over";
    issues.push("Over/under wasn't printed; assumed over.");
  }

  const line = def.kind === "yes_no" ? null : raw.line;
  if (def.kind === "over_under" && line === null) issues.push("No line was readable. Add it below.");

  let odds = raw.odds ?? undefined;
  if (odds !== undefined && Math.abs(odds) < 100) {
    issues.push(`Ignored odds "${odds}" — they don't look like American odds.`);
    odds = undefined;
  }
  if (odds === undefined && available && line !== undefined) {
    const marketPrice = marketOddsFor(
      { playerId: player.id, gameId: player.gameId, market, line: available.line, overOdds: available.overOdds, underOdds: available.underOdds, alternates: available.alternates, updatedAt: "" },
      direction,
      line,
    );
    if (marketPrice !== undefined) {
      odds = marketPrice;
      issues.push("Odds weren't printed; filled from the market price.");
    }
  }

  const ready = issues.length === 0 && (def.kind === "yes_no" || line !== null);
  return { id, raw, status: ready ? "ready" : "review", pick: line === null && def.kind === "over_under" ? null : pickFor(player, market, direction, line, odds, id), issues };
}
