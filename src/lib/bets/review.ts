import { lastName } from "@/lib/format/names";
import { describePick } from "@/lib/parlay/format";
import { MARKETS, type ProcessReview, type SavedBet, type SavedLeg } from "@/lib/types";

/**
 * Post-game autopsy. Judges each settled leg on process (the analyst's grade
 * before the game) separately from the result, so a good read that missed
 * isn't treated like a bad bet, and a lucky hit isn't treated like skill.
 */

export const REVIEW_LABEL: Record<ProcessReview, string> = {
  good_read: "Good read",
  good_process_bad_result: "Good process, bad result",
  bad_process: "Bad process",
  high_variance_result: "High-variance result",
};

export type LegReview = { category: ProcessReview; explanation: string };

const s1 = (n: number) => n.toFixed(1);

/** Classify a settled leg. Returns null for pending/void legs or legs without a pre-game grade. */
export function reviewLeg(leg: SavedLeg): LegReview | null {
  if ((leg.status !== "won" && leg.status !== "lost") || leg.analysisScore === null) return null;
  const score = leg.analysisScore;
  const def = MARKETS[leg.pick.market];
  const volatile = def.volatility >= 0.7;
  const who = lastName(leg.pick.playerName);
  const what = describePick(leg.pick);
  const line = leg.pick.line;
  const result = leg.resultValue;
  const margin = line !== null && result !== null ? (result - line) / line : null;
  const nearMiss = margin !== null && Math.abs(margin) <= 0.1;
  const finished = result !== null && def.kind === "over_under" ? ` finished at ${result} ${def.unit}` : "";

  if (leg.status === "won") {
    if (score >= 7.5) return { category: "good_read", explanation: `${who} ${what}${finished ? ` —${finished}` : ""}. Graded ${s1(score)}/10 before the game, and it played out. That's the kind of leg to keep building around.` };
    if (score < 6) return { category: "bad_process", explanation: `${who} ${what} hit, but it graded ${s1(score)}/10 going in. Don't let a win teach the wrong lesson — the process was weak.` };
    return volatile
      ? { category: "high_variance_result", explanation: `${who} ${what} came through, but ${def.label.toLowerCase()} is a coin-flip market. Count this as variance on your side, not proof the read was strong.` }
      : { category: "good_read", explanation: `${who} ${what}${finished ? ` —${finished}` : ""}. A ${s1(score)}/10 leg that delivered.` };
  }

  // Lost
  if (score >= 7.5) {
    return {
      category: "good_process_bad_result",
      explanation: `${who} ${what}${finished ? ` —${finished}` : ""}. It graded ${s1(score)}/10 going in${nearMiss ? " and only just missed" : ""}. Reasonable process; the result didn't follow. That happens.`,
    };
  }
  if (volatile) {
    return { category: "high_variance_result", explanation: `${who} ${what} missed. ${def.label} legs swing on a single play, which is why it graded ${s1(score)}/10 — this is the risk you were warned about.` };
  }
  if (score < 6) return { category: "bad_process", explanation: `${who} ${what}${finished ? ` —${finished}` : ""}. It graded ${s1(score)}/10 before the game; the data didn't support it.` };
  return nearMiss
    ? { category: "high_variance_result", explanation: `${who} ${what}${finished ? ` —${finished}` : ""}, a near miss on a ${s1(score)}/10 leg. Close enough that variance decided it.` }
    : { category: "bad_process", explanation: `${who} ${what}${finished ? ` —${finished}` : ""}. A ${s1(score)}/10 leg that missed by a real margin — the line asked for more than the matchup gave.` };
}

export type BetReview = { headline: string; legs: { leg: SavedLeg; review: LegReview | null }[] };

/** Whole-bet autopsy for settled bets. */
export function reviewBet(bet: SavedBet): BetReview | null {
  if (bet.status !== "won" && bet.status !== "lost") return null;
  const legs = bet.legs.map((leg) => ({ leg, review: reviewLeg(leg) }));
  const lost = bet.legs.filter((l) => l.status === "lost");
  const flagged = bet.analysis?.weakestLegId ? bet.legs.find((l) => l.id === bet.analysis!.weakestLegId) : undefined;
  const reviews = legs.map((l) => l.review).filter((r): r is LegReview => r !== null);
  const badProcess = reviews.filter((r) => r.category === "bad_process").length;

  let headline: string;
  if (bet.status === "won") {
    headline = badProcess
      ? `It cashed, but ${badProcess} ${badProcess === 1 ? "leg was" : "legs were"} weak going in. Enjoy it, and don't copy the process.`
      : "It cashed, and the process held up. This is what a good slip looks like.";
  } else {
    // Judge the misses by how they graded before the game, not by how they lost.
    const weakMisses = lost.filter((l) => (l.analysisScore ?? 10) < 7);
    const flaggedMissed = flagged !== undefined && lost.some((l) => l.id === flagged.id);
    const parts: string[] = [];
    if (flaggedMissed) {
      const others = lost.length - 1;
      parts.push(`The leg flagged as weakest — ${lastName(flagged.pick.playerName)} ${describePick(flagged.pick)} — missed${others ? `, along with ${others} other${others > 1 ? "s" : ""}` : ""}.`);
    } else {
      parts.push(`${lost.length === 1 ? "One leg" : `${lost.length} legs`} missed.`);
    }
    if (weakMisses.length === 0) parts.push("Every leg that missed graded 7+ going in: good process, bad result.");
    else if (weakMisses.length === 1 && flaggedMissed && lost.length === 1) parts.push("It was the riskiest part of the slip before kickoff.");
    else parts.push(`${weakMisses.length} of the misses graded below 7 before the game — that's where the slip was thin.`);
    headline = parts.join(" ");
  }
  return { headline, legs };
}
