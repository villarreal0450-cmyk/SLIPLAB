import { z } from "zod";
import { MARKETS, SPORTS, type MarketKey, type Pick, type SportKey } from "@/lib/types";
import { MAX_LEGS } from "./draft";

/**
 * Validation for parlays arriving from the client. Server functions are
 * reachable by direct POST, so nothing from the browser is trusted.
 */

const sportKeys = Object.keys(SPORTS) as [SportKey, ...SportKey[]];
const marketKeys = Object.keys(MARKETS) as [MarketKey, ...MarketKey[]];
const id = z.string().min(1).max(100);

const pickMetaSchema = z.object({
  teamAbbr: z.string().max(8),
  opponentAbbr: z.string().max(8),
  position: z.string().max(8),
  teamColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),
  headshotUrl: z.string().url().startsWith("https://").max(300).optional(),
});

export const pickSchema = z
  .object({
    id,
    sport: z.enum(sportKeys),
    gameId: id,
    playerId: id,
    playerName: z.string().min(1).max(100),
    teamId: id,
    opponentTeamId: id,
    market: z.enum(marketKeys),
    direction: z.enum(["over", "under", "yes", "no"]),
    line: z.number().positive().max(100_000).nullable(),
    odds: z
      .number()
      .int()
      .refine((n) => Math.abs(n) >= 100 && Math.abs(n) <= 100_000, "Odds must be American odds like -115 or +140")
      .optional(),
    isAlternate: z.boolean().optional(),
    meta: pickMetaSchema.optional(),
  })
  .superRefine((pick, ctx) => {
    const kind = MARKETS[pick.market].kind;
    const yesNo = pick.direction === "yes" || pick.direction === "no";
    if (kind === "yes_no" && (!yesNo || pick.line !== null)) {
      ctx.addIssue({ code: "custom", message: "Yes/no markets take yes or no with no line", path: ["direction"] });
    }
    if (kind === "over_under" && (yesNo || pick.line === null)) {
      ctx.addIssue({ code: "custom", message: "Over/under markets need over or under and a line", path: ["line"] });
    }
  });

export const parlayInputSchema = z
  .object({ picks: z.array(pickSchema).min(1).max(MAX_LEGS) })
  .refine((v) => new Set(v.picks.map((p) => p.id)).size === v.picks.length, "Duplicate pick ids");

export type ParlayInput = { picks: Pick[] };

export function parseParlayInput(input: unknown) {
  return parlayInputSchema.safeParse(input);
}
