import { isFootball, type MarketKey, type PickContext } from "@/lib/types";
import { clamp, directionSign } from "../math";
import { impactFor, type ScoringFactor } from "../types";

/**
 * Spread, total and weather shape volume. Favored teams run more late;
 * high totals mean more passing; wind outdoors suppresses passing.
 */
export const gameEnvironment: ScoringFactor = {
  key: "game_environment",
  label: "Game environment",
  weight: 0.5,
  evaluate(ctx) {
    const odds = ctx.gameOdds;
    if (!odds) return null;
    if (!isFootball(ctx.player.sport)) {
      const r = otherSports(ctx);
      if (!r) return null;
      // Adjustments describe the over; an under reads them the other way.
      const score = clamp(0.5 + r.adjustment * directionSign(ctx.pick.direction));
      return { key: this.key, label: this.label, score, weight: this.weight, impact: impactFor(score), explanation: r.notes.join(" "), evidence: { total: odds.total, spread: odds.homeSpread } };
    }
    const isHome = ctx.team.id === ctx.game.homeTeamId;
    const teamSpread = isHome ? odds.homeSpread : -odds.homeSpread; // negative = favored
    const favored = teamSpread < 0;
    const notes: string[] = [];
    let adjustment = 0;
    const m = ctx.pick.market;
    const isPassing = m === "passing_yards" || m === "passing_tds" || m === "completions" || m === "receiving_yards" || m === "receptions";
    const isRushing = m === "rushing_yards" || m === "rushing_attempts" || m === "anytime_td";

    if (odds.total >= 48) {
      if (isPassing) adjustment += 0.12;
      if (m === "anytime_td") adjustment += 0.08;
      notes.push(`High total (${odds.total}) points to a scoring-friendly game.`);
    } else if (odds.total <= 42) {
      if (isPassing) adjustment -= 0.1;
      notes.push(`Low total (${odds.total}) suggests a slower game.`);
    }

    if (favored && Math.abs(teamSpread) >= 3) {
      if (isRushing) adjustment += 0.12;
      if (isPassing) adjustment -= 0.05;
      notes.push(`${ctx.team.city} is favored by ${Math.abs(teamSpread)}, which favors late-game rushing volume.`);
    } else if (!favored && Math.abs(teamSpread) >= 3) {
      if (isPassing) adjustment += 0.08;
      if (isRushing) adjustment -= 0.08;
      notes.push(`${ctx.team.city} is a ${Math.abs(teamSpread)}-point underdog — expect more passing if trailing.`);
    } else {
      notes.push(`Near pick'em spread keeps both play-calling scripts open.`);
    }

    const w = ctx.game.weather;
    if (w && !w.isDome && w.windMph !== null && w.windMph >= 15 && isPassing) {
      adjustment -= 0.12;
      notes.push(`Wind at ${w.windMph} mph could hurt the passing game.`);
    }

    // Adjustments describe the over; an under reads them the other way.
    const score = clamp(0.5 + adjustment * directionSign(ctx.pick.direction));
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: notes.join(" "),
      evidence: { total: odds.total, teamSpread, isHome },
    };
  },
};

const NBA_SCORING = new Set<MarketKey>(["points", "threes", "pra", "points_rebounds", "points_assists"]);
const NHL_SCORING = new Set<MarketKey>(["nhl_points", "nhl_assists", "goals"]);
const MLB_HITTER = new Set<MarketKey>(["hits", "total_bases", "home_runs", "rbis", "runs", "hits_runs_rbis"]);

/** Total and favorite effects outside football. Adjustments are for the over. */
function otherSports(ctx: PickContext): { adjustment: number; notes: string[] } | null {
  const odds = ctx.gameOdds!;
  const m = ctx.pick.market;
  const isHome = ctx.team.id === ctx.game.homeTeamId;
  const notes: string[] = [];
  let adjustment = 0;

  if (ctx.player.sport === "nba") {
    const spread = Math.abs(odds.homeSpread);
    if (odds.total >= 235) {
      if (NBA_SCORING.has(m)) adjustment += 0.1;
      notes.push(`A ${odds.total} total points to a fast pace and extra possessions.`);
    } else if (odds.total > 0 && odds.total <= 220) {
      if (NBA_SCORING.has(m)) adjustment -= 0.08;
      notes.push(`A ${odds.total} total points to a slow, half-court game.`);
    }
    if (spread >= 10) {
      adjustment -= 0.08;
      notes.push(`A ${spread}-point spread brings blowout risk: starters can sit the fourth quarter.`);
    } else if (spread <= 4.5) {
      adjustment += 0.04;
      notes.push("A close spread keeps the starters on the floor late.");
    }
  } else if (ctx.player.sport === "nhl") {
    if (odds.total >= 6.5) {
      if (NHL_SCORING.has(m) || m === "shots_on_goal") adjustment += 0.08;
      notes.push(`A ${odds.total} total points to an open game.`);
    } else if (odds.total > 0 && odds.total <= 5.5) {
      if (NHL_SCORING.has(m)) adjustment -= 0.08;
      notes.push(`A ${odds.total} total points to a tight, low-scoring game.`);
    }
    if (m === "saves") {
      const own = isHome ? odds.homeMoneyline : odds.awayMoneyline;
      const other = isHome ? odds.awayMoneyline : odds.homeMoneyline;
      const underdog = own !== null ? own > 0 : other !== null ? other < 0 : null;
      if (underdog === true) {
        adjustment += 0.1;
        notes.push(`${ctx.team.city} is the underdog, so its goalie should see plenty of shots.`);
      } else if (underdog === false) {
        adjustment -= 0.05;
        notes.push(`${ctx.team.city} is favored, which usually means fewer shots against.`);
      }
    }
  } else if (ctx.player.sport === "mlb") {
    const pitcherUp = m === "pitcher_strikeouts" || m === "outs_recorded";
    const pitcherDown = m === "hits_allowed" || m === "earned_runs";
    if (odds.total >= 9) {
      if (MLB_HITTER.has(m) || pitcherDown) adjustment += 0.1;
      if (pitcherUp) adjustment -= 0.08;
      notes.push(`A ${odds.total}-run total points to plenty of offense.`);
    } else if (odds.total > 0 && odds.total <= 7.5) {
      if (MLB_HITTER.has(m) || pitcherDown) adjustment -= 0.08;
      if (pitcherUp) adjustment += 0.08;
      notes.push(`A ${odds.total}-run total points to a pitchers' duel.`);
    }
  }
  return notes.length ? { adjustment, notes } : null;
}
