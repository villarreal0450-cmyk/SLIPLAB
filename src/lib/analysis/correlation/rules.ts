import type { CorrelationFinding, PickContext } from "@/lib/types";

/**
 * A correlation rule inspects a pair of picks and returns a finding when the
 * two legs are related. Rules are pure and order-independent; the engine runs
 * every rule over every pair. Add rules here as the product learns more.
 */
export interface CorrelationRule {
  key: string;
  evaluate(a: PickContext, b: PickContext): CorrelationFinding | null;
}

const PASSING = new Set(["passing_yards", "passing_tds", "completions"]);
const RECEIVING = new Set(["receiving_yards", "receptions"]);
const RUSHING = new Set(["rushing_yards", "rushing_attempts"]);

const isOver = (c: PickContext) => c.pick.direction === "over" || c.pick.direction === "yes";
const sameTeam = (a: PickContext, b: PickContext) => a.team.id === b.team.id;
const sameGame = (a: PickContext, b: PickContext) => a.game.id === b.game.id;
const last = (c: PickContext) => c.player.name.split(" ").slice(-1)[0];

function finding(rule: CorrelationRule, a: PickContext, b: PickContext, type: CorrelationFinding["type"], strength: number, explanation: string): CorrelationFinding {
  return { pickIds: [a.pick.id, b.pick.id], type, strength, explanation, ruleKey: rule.key };
}

/** QB passing over + same-team receiver over: the classic stack. */
const qbReceiverStack: CorrelationRule = {
  key: "qb_receiver_stack",
  evaluate(a, b) {
    const [qb, wr] = PASSING.has(a.pick.market) ? [a, b] : [b, a];
    if (!PASSING.has(qb.pick.market) || !RECEIVING.has(wr.pick.market)) return null;
    if (!sameTeam(qb, wr) || !sameGame(qb, wr)) return null;
    if (isOver(qb) !== isOver(wr)) {
      return finding(this, a, b, "negative", -0.5, `${last(qb)} ${qb.pick.direction} and ${last(wr)} ${wr.pick.direction} pull in opposite directions.`);
    }
    return finding(this, a, b, "positive", 0.6, `${last(qb)}'s passing yards and ${last(wr)}'s receiving yards come from the same throws — if one hits, the other is more likely to.`);
  },
};

/** Two receivers on the same team compete for targets. */
const targetCompetition: CorrelationRule = {
  key: "target_competition",
  evaluate(a, b) {
    if (!RECEIVING.has(a.pick.market) || !RECEIVING.has(b.pick.market)) return null;
    if (!sameTeam(a, b) || a.player.id === b.player.id) return null;
    if (!isOver(a) || !isOver(b)) return null;
    return finding(this, a, b, "competition", -0.25, `${last(a)} and ${last(b)} share the same target pool; both clearing their lines needs a big passing day.`);
  },
};

/** Same-team QB passing over + RB rushing over implies conflicting scripts. */
const passRunConflict: CorrelationRule = {
  key: "pass_run_conflict",
  evaluate(a, b) {
    const [qb, rb] = PASSING.has(a.pick.market) ? [a, b] : [b, a];
    if (!PASSING.has(qb.pick.market) || !RUSHING.has(rb.pick.market)) return null;
    if (!sameTeam(qb, rb) || !isOver(qb) || !isOver(rb)) return null;
    return finding(this, a, b, "negative", -0.3, `Heavy passing volume for ${last(qb)} and heavy rushing volume for ${last(rb)} usually don't happen in the same game script.`);
  },
};

/** Same player, multiple markets: strongly linked. */
const samePlayer: CorrelationRule = {
  key: "same_player",
  evaluate(a, b) {
    if (a.player.id !== b.player.id || a.pick.market === b.pick.market) return null;
    return finding(this, a, b, "positive", 0.5, `Both legs ride on ${a.player.name}'s day — a big game helps both, a quiet one sinks both.`);
  },
};

/** Opposing QBs both over: shootout script. */
const shootout: CorrelationRule = {
  key: "shootout",
  evaluate(a, b) {
    if (!PASSING.has(a.pick.market) || !PASSING.has(b.pick.market)) return null;
    if (!sameGame(a, b) || sameTeam(a, b) || !isOver(a) || !isOver(b)) return null;
    return finding(this, a, b, "positive", 0.3, `Both quarterbacks going over points to a shootout — plausible, but it needs the game to stay close.`);
  },
};

/** Anytime TD + same-team passing over: mild positive (more drives, more scoring). */
const tdWithPassing: CorrelationRule = {
  key: "td_with_passing",
  evaluate(a, b) {
    const [td, other] = a.pick.market === "anytime_td" ? [a, b] : [b, a];
    if (td.pick.market !== "anytime_td" || other.pick.market === "anytime_td") return null;
    if (!sameTeam(td, other) || td.player.id === other.player.id) return null;
    if (!PASSING.has(other.pick.market) && !RECEIVING.has(other.pick.market)) return null;
    return finding(this, a, b, "positive", 0.15, `A productive ${other.team.city} offense creates more scoring chances for ${last(td)}, but which player finishes the drive is still a coin flip.`);
  },
};

export const defaultCorrelationRules: readonly CorrelationRule[] = [
  qbReceiverStack,
  targetCompetition,
  passRunConflict,
  samePlayer,
  shootout,
  tdWithPassing,
];
