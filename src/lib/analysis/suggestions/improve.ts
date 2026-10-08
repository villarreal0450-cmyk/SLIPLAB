import { lastName } from "@/lib/format/names";
import { americanToDecimal, formatOdds } from "@/lib/odds";
import { describePick, selectionKey } from "@/lib/parlay/format";
import { marketOddsFor } from "@/lib/parlay/marketMath";
import { MARKETS, type ParlayAnalysis, type ParlaySuggestion, type Pick, type PickAnalysis, type PickContext, type SuggestionChange } from "@/lib/types";
import type { Candidate } from "./candidates";
import { easierRungs, harderRungs, pickAnalysis, samePicks, toProjected, withLine, Workspace, type Rung } from "./workspace";

/**
 * "Improve my parlay": three rebuilt slips with a reason for every change.
 * Pure function over already-collected data, so it is fast and testable.
 * It only ever suggests lines and prices the market actually lists.
 */

type Input = {
  picks: Pick[];
  contexts: PickContext[];
  current: ParlayAnalysis;
  candidates: Candidate[];
};

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export function buildSuggestions({ picks, contexts, current, candidates }: Input): ParlaySuggestion[] {
  const ws = new Workspace(contexts);
  for (const c of candidates) ws.add(c.ctx);
  const a = (pickId: string) => pickAnalysis(current, pickId)!;

  const suggestions = [
    safer(picks, ws, a, candidates, current),
    balanced(picks, ws, a, candidates, current),
    aggressive(picks, ws, a, candidates, current),
  ];

  // Recommend the changed suggestion that grades best; ties go to balanced.
  const changed = suggestions.filter((s) => !s.unchanged);
  const best = changed.sort((x, y) => y.projected.score - x.projected.score || (x.profile === "balanced" ? -1 : 1))[0];
  return suggestions.map((s) => ({ ...s, recommended: s === best }));
}

/* ---------------- profiles ---------------- */

function safer(picks: Pick[], ws: Workspace, a: (id: string) => PickAnalysis, candidates: Candidate[], current: ParlayAnalysis): ParlaySuggestion {
  const changes: SuggestionChange[] = [];
  const out: Pick[] = [];
  const doomed = picks.filter((p) => {
    const pa = a(p.id);
    return pa.tier === "avoid" || (MARKETS[p.market].volatility >= 0.7 && pa.score < 7);
  });

  for (const p of picks) {
    const pa = a(p.id);
    const ctx = ws.contextFor(p);

    if (doomed.includes(p)) {
      const remaining = picks.length - doomed.length;
      if (remaining >= 2) {
        changes.push({ type: "remove", before: p, reason: removalReason(p, pa) });
        continue;
      }
      const repl = bestReplacement(p, picks, ws, candidates, (c) => MARKETS[c.market].volatility < 0.6);
      if (repl) {
        out.push(repl.pick);
        changes.push({ type: "replace", before: p, after: repl.pick, reason: replacementReason(p, pa, repl.pick, repl.score) });
        continue;
      }
    }

    if (pa.score >= 8.5 || p.line === null) {
      out.push(p);
      changes.push(keep(p, pa));
      continue;
    }

    const rungs = easierRungs(ctx, p);
    const aggressiveLine = pa.factors.find((f) => f.key === "line_value")?.impact === "negative";
    // Stretched lines get bought all the way down (within the juice cap); fine ones get one step of cushion.
    const rung: Rung | undefined = aggressiveLine ? rungs.at(-1) : rungs[0];
    if (!rung) {
      out.push(p);
      changes.push(keep(p, pa));
      continue;
    }
    const next = withLine(p, ctx, rung);
    out.push(next);
    changes.push({ type: "adjust_line", before: p, after: next, reason: lineDownReason(p, pa, ctx, rung) });
  }

  return finish("safer", "Safer", "Fewer ways to lose", picks, out, changes, ws, current, {
    closing: "It pays less, but it holds up in more game scripts.",
    caution: null,
  });
}

function balanced(picks: Pick[], ws: Workspace, a: (id: string) => PickAnalysis, candidates: Candidate[], current: ParlayAnalysis): ParlaySuggestion {
  const changes: SuggestionChange[] = [];
  const out: Pick[] = [];

  for (const p of picks) {
    const pa = a(p.id);
    const ctx = ws.contextFor(p);

    if (pa.tier === "avoid") {
      const repl = bestReplacement(p, picks, ws, candidates, () => true);
      if (repl && repl.parlayScore > current.score) {
        out.push(repl.pick);
        changes.push({ type: "replace", before: p, after: repl.pick, reason: replacementReason(p, pa, repl.pick, repl.score) });
        continue;
      }
      if (picks.length > 2) {
        changes.push({ type: "remove", before: p, reason: removalReason(p, pa) });
        continue;
      }
    }

    const lineFactor = pa.factors.find((f) => f.key === "line_value");
    const main = ctx.marketLine?.line;
    if (lineFactor?.impact === "negative" && pa.score < 8.5 && typeof main === "number") {
      const rung = easierRungs(ctx, p).find((r) => (p.direction === "under" ? r.line >= main : r.line <= main));
      if (rung) {
        const next = withLine(p, ctx, rung);
        out.push(next);
        changes.push({
          type: "adjust_line",
          before: p,
          after: next,
          reason: `${lastName(p.playerName)} at ${fmt(p.line!)} was stretched past the market's ${fmt(main)}. Moving to ${fmt(rung.line)} keeps the read and drops the extra risk.`,
        });
        continue;
      }
    }

    out.push(p);
    changes.push(keep(p, pa));
  }

  return finish("balanced", "Balanced", "Better balance", picks, out, changes, ws, current, {
    closing: "The story of the slip stays intact.",
    caution: null,
  });
}

function aggressive(picks: Pick[], ws: Workspace, a: (id: string) => PickAnalysis, candidates: Candidate[], current: ParlayAnalysis): ParlaySuggestion {
  const changes: SuggestionChange[] = [];
  const out: Pick[] = [];

  for (const p of picks) {
    const pa = a(p.id);
    const ctx = ws.contextFor(p);

    if (pa.score >= 7.5 && p.line !== null && pa.projection) {
      const proj = pa.projection.value;
      const currentPrice = p.odds ?? marketOddsFor(ctx.marketLine!, p.direction, p.line) ?? null;
      // Up to two rungs harder, only where the projection still clears with a 4% margin
      // and the price is genuinely better than what the user has now.
      const rung = harderRungs(ctx, p)
        .slice(0, 2)
        .filter((r) => (p.direction === "under" ? proj <= r.line * 0.96 : proj >= r.line * 1.04))
        .filter((r) => currentPrice === null || americanToDecimal(r.odds) > americanToDecimal(currentPrice))
        .at(-1);
      if (rung) {
        const next = withLine(p, ctx, rung);
        out.push(next);
        changes.push({
          type: "adjust_line",
          before: p,
          after: next,
          reason: `Our projection of ${proj} still clears ${fmt(rung.line)} with room, so the harder line pays ${formatOdds(rung.odds)}${currentPrice !== null ? ` instead of ${formatOdds(currentPrice)}` : ""} without abandoning the read.`,
        });
        continue;
      }
    }

    if (pa.tier === "avoid") {
      const repl = bestReplacement(p, picks, ws, candidates, (c) => (c.odds ?? -1000) >= 100);
      if (repl && repl.score >= 6.5) {
        out.push(repl.pick);
        changes.push({ type: "replace", before: p, after: repl.pick, reason: `${replacementReason(p, pa, repl.pick, repl.score)} It still pays plus money.` });
        continue;
      }
      out.push(p);
      changes.push({ type: "keep", before: p, after: p, warning: true, reason: `Kept for the upside, but this is still the leg most likely to sink the slip (${pa.score.toFixed(1)}/10).` });
      continue;
    }

    out.push(p);
    changes.push(
      pa.tier === "risky"
        ? { type: "keep", before: p, after: p, warning: true, reason: `Kept at your line (${pa.score.toFixed(1)}/10). It's a stretch, and that stretch is the trade this version makes.` }
        : keep(p, pa),
    );
  }

  // Optionally add one correlated plus-money leg that grades well on its own.
  const taken = new Set(out.map(selectionKey));
  const add = candidates
    .filter((c) => !taken.has(selectionKey(c.pick)) && !out.some((p) => p.playerId === c.pick.playerId) && (c.pick.odds ?? -1000) >= 100 && picks.some((p) => p.gameId === c.pick.gameId))
    .map((c) => {
      const trial = ws.evaluate([...out, c.pick]);
      return { pick: c.pick, score: pickAnalysis(trial, c.pick.id)?.score ?? 0, cohesion: trial.cohesion.score };
    })
    .filter((x) => x.score >= 6.5)
    .sort((x, y) => y.score - x.score || y.cohesion - x.cohesion)[0];
  if (add && out.length < 6) {
    out.push(add.pick);
    changes.push({
      type: "add",
      after: add.pick,
      reason: `${add.pick.playerName} ${describePick(add.pick)} grades ${add.score.toFixed(1)}/10 on its own and fits the same game script, at ${formatOdds(add.pick.odds!)}.`,
    });
  }

  return finish("aggressive", "More aggressive", "Bigger payout, more variance", picks, out, changes, ws, current, {
    closing: "It leans harder into the legs the data likes most.",
    caution: "Higher payout, lower chance of hitting. Every harder line and extra leg compounds the variance — size the stake accordingly.",
  });
}

/* ---------------- helpers ---------------- */

function finish(
  profile: ParlaySuggestion["profile"],
  title: string,
  tagline: string,
  before: Pick[],
  after: Pick[],
  changes: SuggestionChange[],
  ws: Workspace,
  current: ParlayAnalysis,
  copy: { closing: string; caution: string | null },
): ParlaySuggestion {
  const unchanged = samePicks(before, after);
  const projected = unchanged ? toProjected(current) : toProjected(ws.evaluate(after));
  return {
    profile,
    title,
    tagline,
    picks: after,
    changes,
    projected,
    rationale: unchanged ? "Your slip already fits this profile. Nothing here needs to change." : composeRationale(changes, copy.closing),
    caution: copy.caution,
    unchanged,
    recommended: false,
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Describe what this version actually does, from its real changes. */
function composeRationale(changes: SuggestionChange[], closing: string): string {
  const count = (t: SuggestionChange["type"]) => changes.filter((c) => c.type === t).length;
  const lineChanges = changes.filter((c) => c.type === "adjust_line");
  const easier = lineChanges.filter((c) => (c.before!.direction === "under" ? c.after!.line! > c.before!.line! : c.after!.line! < c.before!.line!)).length;
  const harder = lineChanges.length - easier;
  const parts: string[] = [];
  if (count("remove")) parts.push(`cuts ${plural(count("remove"), "leg")} the data doesn't support`);
  if (count("replace")) parts.push(`swaps ${plural(count("replace"), "weak leg")} for a better fit from the same game`);
  if (easier) parts.push(`buys cushion on ${plural(easier, "line")}`);
  if (harder) parts.push(`steps up ${plural(harder, "line")} the projection still clears`);
  if (count("add")) parts.push(`adds ${plural(count("add"), "plus-money leg")}`);
  const body = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `This version ${body}. ${closing}`;
}

function keep(p: Pick, pa: PickAnalysis): SuggestionChange {
  const reason =
    pa.score >= 8.5
      ? `One of the strongest legs here (${pa.score.toFixed(1)}/10).`
      : pa.score >= 7.5
        ? `Solid leg (${pa.score.toFixed(1)}/10); nothing to fix.`
        : `Not perfect (${pa.score.toFixed(1)}/10), but the market doesn't offer a cleaner version of it.`;
  return { type: "keep", before: p, after: p, reason };
}

function removalReason(p: Pick, pa: PickAnalysis): string {
  const def = MARKETS[p.market];
  if (def.volatility >= 0.7) {
    return `${def.key === "anytime_td" ? "Touchdowns" : def.label} are a coin flip even with good usage. At ${pa.score.toFixed(1)}/10 this is the leg most likely to sink the slip.`;
  }
  return `At ${pa.score.toFixed(1)}/10 the data doesn't support this leg. ${pa.bearCase[0] ?? ""}`.trim();
}

function replacementReason(old: Pick, oldA: PickAnalysis, next: Pick, nextScore: number): string {
  return `Swaps ${lastName(old.playerName)} ${describePick(old)} (${oldA.score.toFixed(1)}/10) for ${next.playerName} ${describePick(next)} (${nextScore.toFixed(1)}/10) from the same game.`;
}

function lineDownReason(p: Pick, pa: PickAnalysis, ctx: PickContext, rung: Rung): string {
  const main = ctx.marketLine?.line;
  const unit = MARKETS[p.market].unit;
  const proj = pa.projection?.value;
  const stretched = typeof main === "number" && p.line !== null && (p.direction === "under" ? p.line < main : p.line > main);
  const base = stretched
    ? `${fmt(p.line!)} sits ${fmt(Math.abs(p.line! - main!))} ${unit} past the market's ${fmt(main!)}. Buying down to ${fmt(rung.line)} gives the leg real cushion`
    : `Dropping to ${fmt(rung.line)} adds cushion against a quiet game`;
  return `${base}${proj ? ` — our projection is ${proj}` : ""}. Price: ${formatOdds(rung.odds)}.`;
}

/** Best same-game swap for a leg, judged by the whole parlay's score after the swap. */
export function bestReplacement(
  target: Pick,
  picks: Pick[],
  ws: Workspace,
  candidates: Candidate[],
  allow: (c: Pick) => boolean,
): { pick: Pick; score: number; parlayScore: number } | null {
  const taken = new Set(picks.map(selectionKey));
  // Don't pile more risk onto a player who is already carrying another leg.
  const busyPlayers = new Set(picks.filter((p) => p.id !== target.id).map((p) => p.playerId));
  let best: { pick: Pick; score: number; parlayScore: number } | null = null;
  for (const c of candidates) {
    if (c.pick.gameId !== target.gameId || taken.has(selectionKey(c.pick)) || busyPlayers.has(c.pick.playerId) || !allow(c.pick)) continue;
    const trialPicks = picks.map((p) => (p.id === target.id ? c.pick : p));
    const trial = ws.evaluate(trialPicks);
    const score = pickAnalysis(trial, c.pick.id)?.score ?? 0;
    if (score < 7) continue;
    if (!best || trial.score > best.parlayScore) best = { pick: c.pick, score, parlayScore: trial.score };
  }
  return best;
}
