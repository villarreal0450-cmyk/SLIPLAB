import { formatMoney } from "@/lib/format/money";
import type { RiskLevel, SavedBet } from "@/lib/types";

/**
 * Bankroll context for stakes. Everything here informs; nothing blocks a
 * bet, and nothing ever suggests staking more.
 */

export type BankrollSettings = {
  bankroll: number;
  /** One unit in currency. Defaults to 1% of bankroll. */
  unitSize: number;
  /** Single-bet exposure above this % of bankroll gets a warning. */
  maxExposurePct: number;
};

export const DEFAULT_MAX_EXPOSURE_PCT = 5;

export function defaultUnit(bankroll: number) {
  return Math.max(1, Math.round(bankroll * 0.01 * 100) / 100);
}

/** Suggested exposure by parlay risk. Riskier slips get smaller stakes, never larger ones. */
export const SUGGESTED_UNITS: Record<RiskLevel, number> = { low: 1, medium: 0.5, high: 0.25 };

export type ExposureLevel = "ok" | "elevated" | "over";

export type ExposureCheck = {
  pctOfBankroll: number;
  units: number;
  level: ExposureLevel;
  suggestedUnits: number;
  suggestedStake: number;
  notes: string[];
};

const pct = (n: number) => (n < 1 ? n.toFixed(1) : Math.round(n).toString());
const u = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, ""));

export function checkExposure(
  stake: number,
  settings: BankrollSettings,
  risk: RiskLevel,
  history: SavedBet[] = [],
  now = Date.now(),
): ExposureCheck {
  const pctOfBankroll = (stake / settings.bankroll) * 100;
  const units = stake / settings.unitSize;
  const suggestedUnits = SUGGESTED_UNITS[risk];
  const suggestedStake = Math.round(suggestedUnits * settings.unitSize * 100) / 100;
  const notes: string[] = [];

  let level: ExposureLevel = "ok";
  if (pctOfBankroll > settings.maxExposurePct) {
    level = "over";
    notes.push(`This bet is ${pct(pctOfBankroll)}% of your bankroll${risk !== "low" ? ` on a ${risk}-risk slip` : ""}, above your ${settings.maxExposurePct}% limit.`);
  } else if (units > suggestedUnits * 2) {
    level = "elevated";
    notes.push(`That's ${u(units)} units on a ${risk}-risk slip.`);
  }
  if (level !== "ok") notes.push(`For this risk level, ${u(suggestedUnits)} ${suggestedUnits === 1 ? "unit" : "units"} (${formatMoney(suggestedStake)}) is a more typical stake.`);

  // Loss-chasing check: stakes creeping up right after losses.
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recentLosses = history.filter((b) => b.status === "lost" && b.settledAt && Date.parse(b.settledAt) >= dayAgo).length;
  const stakes = history.map((b) => b.stake).filter((s): s is number => typeof s === "number" && s > 0).sort((a, b) => a - b);
  const median = stakes.length ? stakes[Math.floor(stakes.length / 2)] : null;
  if (recentLosses >= 2 && median !== null && stake > median * 1.5) {
    notes.push(`You've had ${recentLosses} losses in the last day and this stake is above your usual. Bigger stakes after losses rarely end well — consider sitting this one out.`);
    if (level === "ok") level = "elevated";
  }

  return { pctOfBankroll, units, level, suggestedUnits, suggestedStake, notes };
}

export function parseBankroll(raw: unknown): BankrollSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<BankrollSettings>;
  if (typeof v.bankroll !== "number" || v.bankroll <= 0) return null;
  const unitSize = typeof v.unitSize === "number" && v.unitSize > 0 ? v.unitSize : defaultUnit(v.bankroll);
  const maxExposurePct = typeof v.maxExposurePct === "number" && v.maxExposurePct > 0 && v.maxExposurePct <= 100 ? v.maxExposurePct : DEFAULT_MAX_EXPOSURE_PCT;
  return { bankroll: v.bankroll, unitSize, maxExposurePct };
}
