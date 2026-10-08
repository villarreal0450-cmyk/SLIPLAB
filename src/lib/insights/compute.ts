import { isSettled } from "@/lib/bets/model";
import { MARKETS, tierForScore, type MarketKey, type ProcessReview, type SavedBet, type ScoreTier } from "@/lib/types";

/**
 * Behavioral analytics over saved bets. The point is better decisions, not
 * more betting: no streaks, no "you're due", and every rate carries its
 * sample size so small numbers aren't over-read.
 */

/** Groups with fewer settled outcomes than this are shown but marked as a small sample. */
export const MIN_SAMPLE = 5;

export type Rate = { hits: number; total: number; rate: number | null };
export type Group = { key: string; label: string; rate: Rate };

export type Insights = {
  totals: {
    placed: number;
    open: number;
    settled: number;
    won: number;
    lost: number;
    void: number;
    bets: Rate;
    legs: Rate;
    avgLegs: number | null;
    staked: number;
    returned: number;
    net: number;
    stakedBets: number;
  };
  byMarket: Group[];
  byLegCount: Group[];
  bySport: Group[];
  byRisk: Group[];
  byGrade: Group[];
  process: Record<ProcessReview, number>;
  highlights: string[];
};

const rate = (hits: number, total: number): Rate => ({ hits, total, rate: total ? hits / total : null });
const pct = (r: Rate) => `${Math.round((r.rate ?? 0) * 100)}%`;

const LEG_BUCKETS: { key: string; label: string; test: (n: number) => boolean }[] = [
  { key: "1", label: "Singles", test: (n) => n === 1 },
  { key: "2", label: "2 legs", test: (n) => n === 2 },
  { key: "3-4", label: "3–4 legs", test: (n) => n >= 3 && n <= 4 },
  { key: "5-6", label: "5–6 legs", test: (n) => n >= 5 && n <= 6 },
  { key: "7+", label: "7+ legs", test: (n) => n >= 7 },
];

const GRADE_LABEL: Record<ScoreTier, string> = { strong: "Graded 8.5+", good: "Graded 7.5–8.4", risky: "Graded 6–7.4", avoid: "Graded under 6" };

function groupBy<T>(items: T[], keyOf: (t: T) => string | null, labelOf: (k: string) => string, hit: (t: T) => boolean | null): Group[] {
  const map = new Map<string, { hits: number; total: number }>();
  for (const item of items) {
    const key = keyOf(item);
    const h = hit(item);
    if (key === null || h === null) continue;
    const g = map.get(key) ?? { hits: 0, total: 0 };
    g.total += 1;
    if (h) g.hits += 1;
    map.set(key, g);
  }
  return [...map.entries()]
    .map(([key, g]) => ({ key, label: labelOf(key), rate: rate(g.hits, g.total) }))
    .sort((a, b) => b.rate.total - a.rate.total);
}

export function computeInsights(all: SavedBet[]): Insights {
  const placed = all.filter((b) => b.status !== "draft");
  const settled = placed.filter((b) => isSettled(b.status));
  const decided = settled.filter((b) => b.status !== "void");
  const won = settled.filter((b) => b.status === "won");
  const lost = settled.filter((b) => b.status === "lost");
  const legs = placed.flatMap((b) => b.legs.map((l) => ({ bet: b, leg: l })));
  const decidedLegs = legs.filter(({ leg }) => leg.status === "won" || leg.status === "lost");
  const legHit = ({ leg }: { leg: SavedBet["legs"][number] }) => (leg.status === "won" ? true : leg.status === "lost" ? false : null);
  const betHit = (b: SavedBet) => (b.status === "won" ? true : b.status === "lost" ? false : null);

  const stakedBets = settled.filter((b) => b.stake !== null);
  const staked = stakedBets.reduce((acc, b) => acc + (b.stake ?? 0), 0);
  const returned = stakedBets.reduce((acc, b) => acc + (b.status === "won" ? (b.potentialPayout ?? 0) : b.status === "void" ? (b.stake ?? 0) : 0), 0);

  const process: Record<ProcessReview, number> = { good_read: 0, good_process_bad_result: 0, bad_process: 0, high_variance_result: 0 };
  for (const { leg } of decidedLegs) if (leg.processReview) process[leg.processReview] += 1;

  const byMarket = groupBy(decidedLegs, ({ leg }) => leg.pick.market, (k) => MARKETS[k as MarketKey]?.label ?? k, legHit);
  const byLegCount = LEG_BUCKETS.map((bucket) => {
    const bets = decided.filter((b) => bucket.test(b.legs.length));
    return { key: bucket.key, label: bucket.label, rate: rate(bets.filter((b) => b.status === "won").length, bets.length) };
  }).filter((g) => g.rate.total > 0);
  const bySport = groupBy(decided, (b) => b.sport, (k) => k.toUpperCase(), betHit);
  const byRisk = groupBy(decided, (b) => b.analysis?.riskLevel ?? null, (k) => `${k[0].toUpperCase()}${k.slice(1)} risk`, betHit);
  const byGrade = (["strong", "good", "risky", "avoid"] as ScoreTier[])
    .map((tier) => {
      const g = decidedLegs.filter(({ leg }) => leg.analysisScore !== null && tierForScore(leg.analysisScore) === tier);
      return { key: tier, label: GRADE_LABEL[tier], rate: rate(g.filter(({ leg }) => leg.status === "won").length, g.length) };
    })
    .filter((g) => g.rate.total > 0);

  const insights: Insights = {
    totals: {
      placed: placed.length,
      open: placed.length - settled.length,
      settled: settled.length,
      won: won.length,
      lost: lost.length,
      void: settled.length - won.length - lost.length,
      bets: rate(won.length, decided.length),
      legs: rate(decidedLegs.filter(({ leg }) => leg.status === "won").length, decidedLegs.length),
      avgLegs: placed.length ? placed.reduce((acc, b) => acc + b.legs.length, 0) / placed.length : null,
      staked,
      returned,
      net: returned - staked,
      stakedBets: stakedBets.length,
    },
    byMarket,
    byLegCount,
    bySport,
    byRisk,
    byGrade,
    process,
    highlights: [],
  };
  insights.highlights = buildHighlights(insights, lost);
  return insights;
}

function buildHighlights(i: Insights, lostBets: SavedBet[]): string[] {
  const out: string[] = [];
  const enough = (g: Group) => g.rate.total >= MIN_SAMPLE;

  // Touchdown legs inside losing parlays.
  const losingParlays = lostBets.filter((b) => b.legs.length >= 2);
  if (losingParlays.length >= 3) {
    const withTd = losingParlays.filter((b) => b.legs.some((l) => l.pick.market === "anytime_td" && l.status === "lost")).length;
    if (withTd > 0) out.push(`${Math.round((withTd / losingParlays.length) * 100)}% of your losing parlays included a failed touchdown prop.`);
  }

  // Best vs worst market.
  const markets = i.byMarket.filter(enough).sort((a, b) => (b.rate.rate ?? 0) - (a.rate.rate ?? 0));
  if (markets.length >= 2) {
    const best = markets[0];
    const worst = markets[markets.length - 1];
    if ((best.rate.rate ?? 0) - (worst.rate.rate ?? 0) >= 0.15) {
      out.push(`You hit ${best.label.toLowerCase()} props ${pct(best.rate)} of the time, versus ${pct(worst.rate)} on ${worst.label.toLowerCase()} props.`);
    }
  }

  // Leg count.
  const counts = i.byLegCount.filter((g) => g.rate.total >= 3).sort((a, b) => (b.rate.rate ?? 0) - (a.rate.rate ?? 0));
  if (counts.length >= 2 && counts[0].rate.rate !== counts[counts.length - 1].rate.rate) {
    const best = counts[0];
    const worst = counts[counts.length - 1];
    out.push(`${best.label} have been your best (${best.rate.hits} of ${best.rate.total} won); ${worst.label.toLowerCase()} your worst (${worst.rate.hits} of ${worst.rate.total}).`);
  }

  // How the analyst's grades held up.
  const high = i.byGrade.filter((g) => g.key === "strong" || g.key === "good");
  const low = i.byGrade.filter((g) => g.key === "risky" || g.key === "avoid");
  const sum = (gs: Group[]) => gs.reduce((acc, g) => ({ hits: acc.hits + g.rate.hits, total: acc.total + g.rate.total }), { hits: 0, total: 0 });
  const h = sum(high);
  const l = sum(low);
  if (h.total >= MIN_SAMPLE && l.total >= MIN_SAMPLE) {
    out.push(`Legs the analyst graded 7.5+ hit ${pct(rate(h.hits, h.total))} of the time; legs below 7.5 hit ${pct(rate(l.hits, l.total))}.`);
  }

  // Weakest-leg flags.
  const flagged = lostBets.filter((b) => b.analysis?.weakestLegId);
  if (flagged.length >= 3) {
    const sankIt = flagged.filter((b) => b.legs.find((x) => x.id === b.analysis!.weakestLegId)?.status === "lost").length;
    out.push(`In ${sankIt} of ${flagged.length} losses, the leg flagged as weakest was one that missed.`);
  }

  // Variance vs mistakes.
  if (i.process.good_process_bad_result >= 2) {
    out.push(`${i.process.good_process_bad_result} missed legs were good process, bad result — that's variance, not a mistake to fix.`);
  }
  return out;
}
