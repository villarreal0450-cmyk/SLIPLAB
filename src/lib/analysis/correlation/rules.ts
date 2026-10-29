import { MARKETS, type CorrelationFinding, type PickContext } from "@/lib/types";
import { lastName } from "@/lib/format/names";

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
const last = (c: PickContext) => lastName(c.player.name);
const statOf = (c: PickContext) => MARKETS[c.pick.market].label.toLowerCase();

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
    return finding(this, a, b, "positive", 0.6, `${last(qb)}'s ${statOf(qb)} and ${last(wr)}'s ${statOf(wr)} come from the same throws — if one hits, the other is more likely to.`);
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

/* ---------- basketball ---------- */

const NBA_SCORING = new Set(["points", "pra", "points_rebounds", "points_assists", "threes"]);
const NBA_PLAYMAKING = new Set(["assists", "points_assists", "rebounds_assists"]);
const sport = (c: PickContext) => c.player.sport;

/** Two scorers on one team share the same shots. */
const usageCompetition: CorrelationRule = {
  key: "usage_competition",
  evaluate(a, b) {
    if (sport(a) !== "nba" || sport(b) !== "nba" || !sameTeam(a, b) || a.player.id === b.player.id) return null;
    if (!NBA_SCORING.has(a.pick.market) || !NBA_SCORING.has(b.pick.market) || !isOver(a) || !isOver(b)) return null;
    return finding(this, a, b, "competition", -0.15, `${last(a)} and ${last(b)} draw from the same shots; both going over needs a high-scoring night for ${a.team.city}.`);
  },
};

/** A playmaker's assists come from teammates' made shots. */
const assistToScorer: CorrelationRule = {
  key: "assist_to_scorer",
  evaluate(a, b) {
    if (sport(a) !== "nba" || sport(b) !== "nba" || !sameTeam(a, b) || a.player.id === b.player.id) return null;
    const [passer, scorer] = NBA_PLAYMAKING.has(a.pick.market) ? [a, b] : [b, a];
    if (!NBA_PLAYMAKING.has(passer.pick.market) || !NBA_SCORING.has(scorer.pick.market) || !isOver(passer) || !isOver(scorer)) return null;
    return finding(this, a, b, "positive", 0.25, `${last(passer)}'s assists turn into ${last(scorer)}'s points: a good shooting night helps both.`);
  },
};

/* ---------- hockey ---------- */

const NHL_SCORING = new Set(["nhl_points", "nhl_assists", "goals"]);

/** One goal can put up to three teammates on the scoresheet. */
const hockeyTeammates: CorrelationRule = {
  key: "hockey_teammates",
  evaluate(a, b) {
    if (sport(a) !== "nhl" || sport(b) !== "nhl" || !sameTeam(a, b) || a.player.id === b.player.id) return null;
    if (!NHL_SCORING.has(a.pick.market) || !NHL_SCORING.has(b.pick.market) || !isOver(a) || !isOver(b)) return null;
    return finding(this, a, b, "positive", 0.2, `A ${a.team.city} goal often credits more than one skater, so ${last(a)} and ${last(b)} tend to score together.`);
  },
};

/** Shots by one team are saves for the other team's goalie. */
const goalieVsShooter: CorrelationRule = {
  key: "goalie_vs_shooter",
  evaluate(a, b) {
    const [goalie, shooter] = a.pick.market === "saves" ? [a, b] : [b, a];
    if (goalie.pick.market !== "saves" || shooter.pick.market !== "shots_on_goal" || sameTeam(goalie, shooter) || !sameGame(goalie, shooter)) return null;
    if (isOver(goalie) !== isOver(shooter)) {
      return finding(this, a, b, "negative", -0.35, `${last(goalie)}'s saves and ${last(shooter)}'s shots pull in opposite directions.`);
    }
    return finding(this, a, b, "positive", 0.35, `Every shot ${last(shooter)} puts on net is a chance at a save for ${last(goalie)}.`);
  },
};

/* ---------- baseball ---------- */

const MLB_HITTING = new Set(["hits", "total_bases", "home_runs", "rbis", "runs", "hits_runs_rbis"]);
const MLB_DOMINANCE = new Set(["pitcher_strikeouts", "outs_recorded"]);
const MLB_DAMAGE = new Set(["hits_allowed", "earned_runs"]);

/** A starter's good night is the opposing lineup's bad one. */
const pitcherVsBatter: CorrelationRule = {
  key: "pitcher_vs_batter",
  evaluate(a, b) {
    const pitcherFirst = MLB_DOMINANCE.has(a.pick.market) || MLB_DAMAGE.has(a.pick.market);
    const [pitcher, batter] = pitcherFirst ? [a, b] : [b, a];
    if (!MLB_HITTING.has(batter.pick.market) || sameTeam(pitcher, batter) || !sameGame(pitcher, batter)) return null;
    const dominant = MLB_DOMINANCE.has(pitcher.pick.market);
    if (!dominant && !MLB_DAMAGE.has(pitcher.pick.market)) return null;
    // Dominance overs and hitting overs clash; damage overs and hitting overs agree.
    const agree = dominant ? isOver(pitcher) !== isOver(batter) : isOver(pitcher) === isOver(batter);
    return agree
      ? finding(this, a, b, "positive", 0.35, `${last(pitcher)}'s line and ${last(batter)}'s bat tell the same story about this matchup.`)
      : finding(this, a, b, "negative", -0.4, `${last(pitcher)} pitching well and ${last(batter)} hitting well against him pull against each other.`);
  },
};

/** Runs scored need someone to drive them in. */
const lineupTeammates: CorrelationRule = {
  key: "lineup_teammates",
  evaluate(a, b) {
    if (sport(a) !== "mlb" || sport(b) !== "mlb" || !sameTeam(a, b) || a.player.id === b.player.id) return null;
    if (!MLB_HITTING.has(a.pick.market) || !MLB_HITTING.has(b.pick.market) || !isOver(a) || !isOver(b)) return null;
    return finding(this, a, b, "positive", 0.2, `${last(a)} and ${last(b)} hit in the same lineup: a big inning for ${a.team.city} helps both.`);
  },
};

export const defaultCorrelationRules: readonly CorrelationRule[] = [
  qbReceiverStack,
  targetCompetition,
  passRunConflict,
  samePlayer,
  shootout,
  tdWithPassing,
  usageCompetition,
  assistToScorer,
  hockeyTeammates,
  goalieVsShooter,
  pitcherVsBatter,
  lineupTeammates,
];
