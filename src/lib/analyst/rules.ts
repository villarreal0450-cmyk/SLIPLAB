import { lastName } from "@/lib/format/names";
import { formatOdds } from "@/lib/odds";
import { describePick } from "@/lib/parlay/format";
import type { Pick, PickAnalysis } from "@/lib/types";
import type { AnalystBriefing } from "./types";

/**
 * Rule-based analyst. Answers the common questions directly from the engine's
 * output, in the analyst's voice. It never invents numbers: every figure it
 * says comes from the briefing. Used when no language model is configured.
 */

type Intent = "weakest" | "safer" | "against" | "script" | "keep_three" | "correlation" | "replace" | "player" | "unknown";

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

export function detectIntent(question: string, briefing: AnalystBriefing): { intent: Intent; pick?: Pick } {
  const q = question.toLowerCase();
  if (has(q, "convince", "talk me out", "not to bet", "shouldn't bet", "should i not", "why not")) return { intent: "against" };
  if (has(q, "correlat", "cohes", "work together", "fit together")) return { intent: "correlation" };
  if (has(q, "safer", "safe", "less risk", "lower risk", "reduce risk")) return { intent: "safer" };
  if (has(q, "replace", "swap", "instead of", "substitute")) return { intent: "replace" };
  if (/\b(three|3)\b/.test(q) && has(q, "keep", "pick", "best", "would you")) return { intent: "keep_three" };
  if (has(q, "worr", "weakest", "weak leg", "cut", "concern", "riskiest", "worst")) return { intent: "weakest" };
  if (has(q, "early lead", "lead", "script", "blowout", "what happens if", "game flow", "trailing", "shootout")) return { intent: "script" };
  const pick = briefing.picks.find((p) => q.includes(lastName(p.playerName).toLowerCase()) || q.includes(p.playerName.toLowerCase()));
  if (pick) return { intent: "player", pick };
  return { intent: "unknown" };
}

export function answerWithRules(question: string, b: AnalystBriefing): string {
  const { intent, pick } = detectIntent(question, b);
  switch (intent) {
    case "weakest":
      return weakest(b);
    case "safer":
      return safer(b);
    case "against":
      return against(b);
    case "script":
      return script(b);
    case "keep_three":
      return keepThree(b);
    case "correlation":
      return correlation(b);
    case "replace":
      return replace(b);
    case "player":
      return player(b, pick!);
    default:
      return unknown(b);
  }
}

/* ---------------- helpers ---------------- */

const s1 = (n: number) => n.toFixed(1);
const legName = (p: Pick) => `${lastName(p.playerName)} ${describePick(p)}`;
const analysisOf = (b: AnalystBriefing, id: string) => b.analysis.picks.find((x) => x.pickId === id);
const pickOf = (b: AnalystBriefing, id: string) => b.picks.find((p) => p.id === id);
const demoNote = (b: AnalystBriefing) => (b.analysis.dataSource.isMock ? "\n\n(Heads up: this is demo data, not live stats or lines.)" : "");

function ranked(b: AnalystBriefing): { pick: Pick; a: PickAnalysis }[] {
  return b.picks
    .map((pick) => ({ pick, a: analysisOf(b, pick.id)! }))
    .filter((x) => x.a)
    .sort((x, y) => x.a.score - y.a.score);
}

/* ---------------- intents ---------------- */

function weakest(b: AnalystBriefing): string {
  const w = b.analysis.weakestLeg;
  if (!w) {
    const low = ranked(b)[0];
    if (!low) return "There's nothing in the slip yet.";
    return `Honestly, nothing here worries me much — every leg grades 7.5 or better. If I had to pick one, it's ${legName(low.pick)} at ${s1(low.a.score)}/10. The real risk is just that all ${b.picks.length} legs have to hit.${demoNote(b)}`;
  }
  const p = pickOf(b, w.pickId)!;
  const a = analysisOf(b, w.pickId)!;
  // A second, different reason: the most damaging factor other than market volatility (already covered).
  const extra = [...a.factors]
    .filter((f) => f.impact === "negative" && f.key !== "market_volatility" && !w.reason.includes(f.explanation))
    .sort((x, y) => x.score - y.score)[0]?.explanation;
  return `${legName(p)}. That's the leg I'd cut first — it grades ${s1(a.score)}/10, the lowest on the slip.\n\n${w.reason}${extra ? ` ${extra}` : ""}\n\nIf you keep it, know that it's the most likely reason this slip loses.${demoNote(b)}`;
}

function safer(b: AnalystBriefing): string {
  const s = b.suggestions.find((x) => x.profile === "safer");
  if (!s || s.unchanged) return `This slip is already about as safe as the market lets it get. The cleanest way to lower risk from here is fewer legs, not different ones.${demoNote(b)}`;
  const changes = s.changes.filter((c) => c.type !== "keep");
  const lines = changes.map((c) => {
    if (c.type === "remove") return `- Cut ${legName(c.before!)}. ${c.reason}`;
    if (c.type === "adjust_line") return `- ${lastName(c.before!.playerName)}: ${describePick(c.before!)} → ${describePick(c.after!)}. ${c.reason}`;
    if (c.type === "replace") return `- Swap ${legName(c.before!)} for ${c.after!.playerName} ${describePick(c.after!)}. ${c.reason}`;
    return `- Add ${c.after!.playerName} ${describePick(c.after!)}. ${c.reason}`;
  });
  return `Here's how I'd make it safer — it grades ${s1(s.projected.score)} instead of ${s1(b.analysis.score)}:\n\n${lines.join("\n")}\n\nThe trade-off: it pays ${formatOdds(s.projected.odds)} instead of ${formatOdds(b.analysis.combinedOdds)}. You can apply it from Improve my parlay.${demoNote(b)}`;
}

function against(b: AnalystBriefing): string {
  const a = b.analysis;
  const points: string[] = [];
  if (b.picks.length >= 3) points.push(`- It's ${b.picks.length} legs. Even good legs miss — every one of them has to hit for this to cash.`);
  if (a.weakestLeg) {
    const p = pickOf(b, a.weakestLeg.pickId)!;
    points.push(`- ${legName(p)} grades ${s1(analysisOf(b, p.id)!.score)}/10. ${a.weakestLeg.reason}`);
  }
  const stretched = ranked(b).filter((x) => x.a.factors.find((f) => f.key === "line_value")?.impact === "negative" && x.pick.id !== a.weakestLeg?.pickId);
  for (const x of stretched) points.push(`- ${legName(x.pick)}: ${x.a.factors.find((f) => f.key === "line_value")!.explanation}`);
  const tension = a.cohesion.findings.filter((f) => f.strength < 0);
  for (const f of tension.slice(0, 2)) points.push(`- ${f.explanation}`);
  const breaker = a.gameScripts.find((s) => s.breaker)?.breaker;
  if (breaker) points.push(`- The story can break: ${breaker}`);
  if (new Set(b.picks.map((p) => p.gameId)).size === 1 && b.picks.length > 1) points.push(`- Everything rides on one game. If it goes sideways, every leg goes with it.`);
  if (points.length === 0) points.push("- Honestly, the case against is thin. The main risk is plain variance.");

  return `Alright, here's the case against it:\n\n${points.join("\n")}\n\nThe slip grades ${s1(a.score)}/10 (${a.label.toLowerCase()}). If you still like it after all that, keep the stake small.${demoNote(b)}`;
}

function script(b: AnalystBriefing): string {
  const s = b.analysis.gameScripts[0];
  if (!s) return `I don't have enough game context to project a script for this slip.${demoNote(b)}`;
  const names = (ids: string[]) => ids.map((id) => pickOf(b, id)).filter((p): p is Pick => !!p).map(legName);
  const helped = names(s.helpedPickIds);
  const hurt = names(s.hurtPickIds);
  return `Here's how I see it playing out:\n\n${s.beats.map((t) => `- ${t}`).join("\n")}\n\n${helped.length ? `That script helps ${helped.join(", ")}.` : "None of your legs lean on that script."}${hurt.length ? ` It hurts ${hurt.join(", ")}.` : ""}${s.breaker ? `\n\nWhat breaks it: ${s.breaker}` : ""}${b.analysis.gameScripts.length > 1 ? `\n\n(Your slip spans ${b.analysis.gameScripts.length} games; this is the first one.)` : ""}${demoNote(b)}`;
}

function keepThree(b: AnalystBriefing): string {
  if (b.picks.length <= 3) return `You only have ${b.picks.length} ${b.picks.length === 1 ? "leg" : "legs"}, so there's nothing to trim. ${weakest(b)}`;
  if (!b.topThree) return unknown(b);
  const t = b.topThree;
  const lines = t.picks.map((p) => `- ${legName(p)} (${s1(analysisOf(b, p.id)?.score ?? 0)}/10)`);
  const dropped = b.picks.filter((p) => !t.picks.some((k) => k.id === p.id)).map(legName);
  return `I'd keep these three:\n\n${lines.join("\n")}\n\nTogether they grade ${s1(t.analysis.score)}/10${t.analysis.combinedOdds !== null ? ` at ${formatOdds(t.analysis.combinedOdds)}` : ""}. I'd drop ${dropped.join(" and ")}.${demoNote(b)}`;
}

function correlation(b: AnalystBriefing): string {
  const c = b.analysis.cohesion;
  const findings = c.findings.map((f) => `- ${lastName(pickOf(b, f.pickIds[0])?.playerName ?? "")} + ${lastName(pickOf(b, f.pickIds[1])?.playerName ?? "")}: ${f.explanation}`);
  const oneGame = new Set(b.picks.map((p) => p.gameId)).size === 1 && b.picks.length > 1;
  const verdict =
    c.score >= 80
      ? `Correlated, yes — but mostly in the good way. The legs tell one story, which is what you want in a parlay.${oneGame ? " The catch is concentration: it's all one game, so if that story is wrong, it's wrong everywhere." : ""}`
      : c.score >= 60
        ? "Mostly coherent, with some tension between legs."
        : "Not too correlated — the problem is the opposite. The legs pull in different directions.";
  return `Cohesion is ${c.score}/100 (${c.label.toLowerCase()}). ${verdict}${findings.length ? `\n\n${findings.join("\n")}` : ""}${demoNote(b)}`;
}

function replace(b: AnalystBriefing): string {
  const w = b.analysis.weakestLeg;
  if (!w) return `I wouldn't replace anything — every leg grades 7.5 or better. If you want less risk, drop a leg instead of swapping one.${demoNote(b)}`;
  const p = pickOf(b, w.pickId)!;
  if (b.replaceOptions.length === 0) return `I'd replace ${legName(p)}, but nothing else in this game's markets grades better. Cutting it is the cleanest fix.${demoNote(b)}`;
  const opts = b.replaceOptions.slice(0, 2).map((o) => `- ${o.pick.playerName} ${describePick(o.pick)} (${formatOdds(o.pick.odds)}): ${o.reason} Slip goes to ${s1(o.parlayAfter.score)}.`);
  return `I'd replace ${legName(p)}. From the same game, these fit better:\n\n${opts.join("\n")}\n\nYou can swap either one in from the weakest-leg card.${demoNote(b)}`;
}

function player(b: AnalystBriefing, p: Pick): string {
  const a = analysisOf(b, p.id);
  if (!a) return unknown(b);
  const proj = a.projection && a.projection.line !== null ? ` I project ${a.projection.value} against your ${a.projection.line}.` : "";
  return `${legName(p)}: ${a.verdict.toLowerCase()} at ${s1(a.score)}/10.${proj}\n\n${a.bullCase[0] ? `For it: ${a.bullCase[0]}` : "Nothing in the data argues strongly for it."}\n${a.bearCase[0] ? `Against it: ${a.bearCase[0]}` : "No major red flags."}${a.missingData.length ? `\n\nI'm missing data on ${a.missingData.join(", ").toLowerCase()}, so take this with some salt.` : ""}${demoNote(b)}`;
}

function unknown(b: AnalystBriefing): string {
  const sample = lastName(b.picks[0]?.playerName ?? "a player");
  return `I can't answer that one yet. Right now I can only talk about what's in this slip — no outside news, no other games.\n\nTry asking which leg worries me, how to make it safer, whether it's too correlated, what happens in a different game script, or about a specific player like "${sample}".`;
}
