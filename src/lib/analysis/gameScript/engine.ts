import type { GameScript, PickContext } from "@/lib/types";

const PASSING = new Set(["passing_yards", "passing_tds", "completions", "receiving_yards", "receptions"]);
const RUSHING = new Set(["rushing_yards", "rushing_attempts"]);

/**
 * Projects a plausible narrative for a game from spread, total and team
 * tendencies, then marks which picks that narrative helps or hurts.
 * Rule-based on purpose: it is explainable and cheap. An LLM can rewrite the
 * beats later, but should not change which picks are helped/hurt.
 */
export function buildGameScript(contexts: PickContext[]): GameScript | null {
  const first = contexts[0];
  if (!first) return null;
  const { game, gameOdds } = first;
  const home = contexts.find((c) => c.team.id === game.homeTeamId)?.team ?? first.opponent.id === game.homeTeamId ? first.opponent : first.team;
  const away = home.id === first.team.id ? first.opponent : first.team;

  const homeStats = contexts.find((c) => c.team.id === home.id)?.teamStats ?? contexts.find((c) => c.opponent.id === home.id)?.opponentStats ?? null;
  const awayStats = contexts.find((c) => c.team.id === away.id)?.teamStats ?? contexts.find((c) => c.opponent.id === away.id)?.opponentStats ?? null;

  const spread = gameOdds?.homeSpread ?? 0;
  const favorite = spread < 0 ? home : spread > 0 ? away : null;
  const underdog = favorite ? (favorite.id === home.id ? away : home) : null;
  const favStats = favorite?.id === home.id ? homeStats : awayStats;
  const margin = Math.abs(spread);
  const total = gameOdds?.total ?? 45;

  const beats: string[] = [];
  const helped = new Set<string>();
  const hurt = new Set<string>();

  if (!favorite || !underdog) {
    beats.push(`${away.city} at ${home.city} is close to a pick'em, so neither side's script dominates.`);
    beats.push(total >= 48 ? "A high total points to both offenses staying aggressive throughout." : "A modest total suggests a balanced, grind-it-out game.");
    for (const c of contexts) {
      if (PASSING.has(c.pick.market) && total >= 48) helped.add(c.pick.id);
    }
    return {
      gameId: game.id,
      beats,
      helpedPickIds: [...helped],
      hurtPickIds: [...hurt],
      confidence: 0.35,
      summary: "Tight spread — no strong script lean.",
    };
  }

  const favPassHeavy = (favStats?.offense.passRate ?? 0.55) >= 0.58;
  beats.push(
    favPassHeavy
      ? `${favorite.city} opens aggressively through the air — expect early passing volume.`
      : `${favorite.city} leans on a balanced attack early and lets the run game set the tone.`,
  );
  beats.push(
    margin >= 3
      ? `${favorite.city} builds a lead as the ${margin}-point favorite.`
      : `${favorite.city} is only a slight favorite, so the lead may never get comfortable.`,
  );
  beats.push(`${underdog.city} is forced into higher passing volume to keep pace.`);
  if (margin >= 3) beats.push(`With a lead, ${favorite.city} shifts toward the run in the second half.`);

  for (const c of contexts) {
    const isFav = c.team.id === favorite.id;
    const m = c.pick.market;
    const over = c.pick.direction === "over" || c.pick.direction === "yes";

    if (isFav) {
      if (PASSING.has(m) && favPassHeavy) (over ? helped : hurt).add(c.pick.id);
      if (PASSING.has(m) && !favPassHeavy && margin >= 3) (over ? hurt : helped).add(c.pick.id);
      if (RUSHING.has(m) && margin >= 3) (over ? helped : hurt).add(c.pick.id);
      if (m === "anytime_td") helped.add(c.pick.id);
    } else {
      if (PASSING.has(m)) (over ? helped : hurt).add(c.pick.id);
      if (RUSHING.has(m) && margin >= 3) (over ? hurt : helped).add(c.pick.id);
    }
  }

  // Favorite's receivers can be hurt by the late shift to the run when the lead is big.
  if (margin >= 6) {
    for (const c of contexts) {
      if (c.team.id === favorite.id && (c.pick.market === "receiving_yards" || c.pick.market === "receptions") && helped.has(c.pick.id)) {
        helped.delete(c.pick.id);
      }
    }
  }

  const confidence = Math.min(0.85, 0.4 + margin * 0.06 + (favStats ? 0.1 : 0));
  return {
    gameId: game.id,
    beats,
    helpedPickIds: [...helped],
    hurtPickIds: [...hurt],
    confidence,
    summary: `${favorite.city} controls the game${margin >= 3 ? " and runs late" : ""}; ${underdog.city} throws to catch up.`,
  };
}
