import { z } from "zod";
import type { Direction, MarketKey, Pick } from "@/lib/types";

/**
 * What a parser reads off a betslip image, before any matching to our data.
 * Kept close to what is printed on the slip; normalization happens later.
 * This schema is also the structured-output format the vision model fills.
 */
export const parsedLegSchema = z.object({
  raw_text: z.string().describe("The leg exactly as printed, one line"),
  player: z.string().nullable().describe("Player name as printed, or null"),
  team: z.string().nullable().describe("Team abbreviation or name if shown, else null"),
  market: z.string().nullable().describe("Prop category as printed, e.g. 'Passing Yards' or 'Anytime TD Scorer'"),
  line: z.number().nullable().describe("Numeric line, e.g. 244 for '244+' or 265.5 for 'Over 265.5'; null for yes/no props"),
  direction: z.enum(["over", "under", "yes", "no"]).nullable().describe("'over' for N+ or Over, 'under' for Under, 'yes' for scorer props"),
  odds: z.number().nullable().describe("American odds for this leg if printed, e.g. -115 or 140"),
});

export const parsedSlipSchema = z.object({
  is_betslip: z.boolean().describe("False if the image is not a sportsbook bet slip"),
  sportsbook: z.string().nullable(),
  event: z.string().nullable().describe("Game as printed, e.g. 'DAL @ TB'"),
  legs: z.array(parsedLegSchema),
  combined_odds: z.number().nullable(),
  stake: z.number().nullable(),
});

export type ParsedLeg = z.infer<typeof parsedLegSchema>;
export type ParsedSlip = z.infer<typeof parsedSlipSchema>;

export type ScanSource = "vision" | "sample";

export type SlipImage = { data: string; mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" };

/** Reads a betslip image into a ParsedSlip. Swap implementations without touching UI or normalization. */
export interface BetSlipParser {
  readonly source: ScanSource;
  parse(image: SlipImage | null): Promise<ParsedSlip>;
}

/* ---------- Normalized result ---------- */

export type CatalogMarket = {
  market: MarketKey;
  line: number | null;
  overOdds: number;
  underOdds: number;
  alternates?: { line: number; overOdds: number; underOdds: number }[];
};
export type CatalogPlayer = {
  id: string;
  name: string;
  position: string;
  teamId: string;
  opponentTeamId: string;
  teamAbbr: string;
  opponentAbbr: string;
  teamColor: string;
  gameId: string;
  markets: CatalogMarket[];
};
export type CatalogGame = { gameId: string; label: string; startsAt: string; players: CatalogPlayer[] };

export type LegStatus = "ready" | "review" | "unmatched";

export type NormalizedLeg = {
  id: string;
  raw: ParsedLeg;
  status: LegStatus;
  /** Best guess at the selection; null when the player couldn't be matched. */
  pick: Pick | null;
  /** Plain-language notes the user should check before analysis. */
  issues: string[];
};

export type ScanResult =
  | {
      ok: true;
      source: ScanSource;
      slip: ParsedSlip;
      legs: NormalizedLeg[];
      catalog: CatalogGame[];
    }
  | { ok: false; reason: "not_configured" | "invalid" | "not_a_slip" | "failed"; error: string };

export type DirectionGuess = Direction;
