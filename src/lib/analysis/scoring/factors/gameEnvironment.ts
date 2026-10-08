import { clamp } from "../math";
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
    if (w && !w.isDome && w.windMph >= 15 && isPassing) {
      adjustment -= 0.12;
      notes.push(`Wind at ${w.windMph} mph could hurt the passing game.`);
    }

    const score = clamp(0.5 + adjustment);
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
