import { lastName } from "@/lib/format/names";
import { marketOddsFor } from "@/lib/parlay/marketMath";
import type { SportsDataProvider } from "@/lib/sports/provider";
import { MARKETS, type Direction, type MarketKey, type Pick } from "@/lib/types";
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
  [/anytime|to score|td scorer|touchdown scorer|anota(dor)?\b.*(cualquier|momento)|en cualquier momento|anotador/, "anytime_td"],
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
  [/points?|\bpts\b/, "points"],
];

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

export function matchPlayer(name: string | null, players: CatalogPlayer[]): { player: CatalogPlayer; exact: boolean } | null {
  if (!name) return null;
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

/** Players and their available markets across the upcoming slate. */
export async function buildCatalog(provider: SportsDataProvider): Promise<CatalogGame[]> {
  const games = await provider.getGames();
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
        players: players
          .map((p): CatalogPlayer => {
            const team = teamOf(p.teamId);
            const opponentTeamId = p.teamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
            return {
              id: p.id,
              name: p.name,
              position: p.position,
              teamId: p.teamId,
              opponentTeamId,
              teamAbbr: team?.abbreviation ?? "",
              opponentAbbr: teamOf(opponentTeamId)?.abbreviation ?? "",
              teamColor: team?.color ?? "#3a3a40",
              gameId: game.id,
              markets: props
                .filter((m) => m.playerId === p.id)
                .map((m) => ({ market: m.market, line: m.line, overOdds: m.overOdds, underOdds: m.underOdds, alternates: m.alternates })),
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
    sport: "nfl",
    gameId: player.gameId,
    playerId: player.id,
    playerName: player.name,
    teamId: player.teamId,
    opponentTeamId: player.opponentTeamId,
    market,
    direction,
    line: MARKETS[market].kind === "yes_no" ? null : line,
    odds,
    isAlternate: m ? m.line !== line : undefined,
    meta: { teamAbbr: player.teamAbbr, opponentAbbr: player.opponentAbbr, position: player.position, teamColor: player.teamColor },
  };
}

export function normalizeSlip(slip: ParsedSlip, catalog: CatalogGame[], newId: () => string): NormalizedLeg[] {
  const players = catalog.flatMap((g) => g.players);
  return slip.legs.map((raw) => normalizeLeg(raw, players, newId()));
}

function normalizeLeg(raw: ParsedLeg, players: CatalogPlayer[], id: string): NormalizedLeg {
  const issues: string[] = [];
  const found = matchPlayer(raw.player, players);
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

  const market = matchMarket(raw.market);
  if (!market) {
    return { id, raw, status: "review", pick: null, issues: [...issues, raw.market ? `Didn't recognize the prop "${raw.market}". Pick it below.` : "No prop category was readable."] };
  }
  const def = MARKETS[market];
  const available = player.markets.find((m) => m.market === market);
  if (!available) issues.push(`No ${def.label.toLowerCase()} market for ${player.name} in our data.`);

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
    const marketPrice = marketOddsFor({ playerId: player.id, gameId: player.gameId, market, line: available.line, overOdds: available.overOdds, underOdds: available.underOdds, alternates: available.alternates, updatedAt: "" }, direction, line);
    if (marketPrice !== undefined) {
      odds = marketPrice;
      issues.push("Odds weren't printed; filled from the market price.");
    }
  }

  const ready = issues.length === 0 && (def.kind === "yes_no" || line !== null);
  return { id, raw, status: ready ? "ready" : "review", pick: line === null && def.kind === "over_under" ? null : pickFor(player, market, direction, line, odds, id), issues };
}
