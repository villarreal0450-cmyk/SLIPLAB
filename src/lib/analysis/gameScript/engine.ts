import { isFootball, type GameScript, type MarketKey, type PickContext, type Team } from "@/lib/types";

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
  switch (first.team.sport) {
    case "nba":
      return basketballScript(contexts);
    case "nhl":
      return hockeyScript(contexts);
    case "mlb":
      return baseballScript(contexts);
    default:
      return isFootball(first.team.sport) ? footballScript(contexts) : null;
  }
}

function footballScript(contexts: PickContext[]): GameScript {
  const first = contexts[0];
  const { game, gameOdds } = first;
  // Resolve the home team from the game itself; the first pick may be on either side.
  const home = first.team.id === game.homeTeamId ? first.team : first.opponent;
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
      breaker: helped.size ? "A low-scoring, run-heavy game would undercut the passing legs." : null,
    };
  }

  const favPassHeavy = (favStats?.offense?.passRate ?? 0.55) >= 0.58;
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
  beats.push(
    margin >= 3
      ? `${underdog.city} is forced into higher passing volume to keep pace.`
      : `${underdog.city} leans on the pass if ${favorite.city} scores early.`,
  );
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
  const favLegsHelped = contexts.some((c) => c.team.id === favorite.id && helped.has(c.pick.id));
  const breaker = !helped.size
    ? null
    : favLegsHelped
      ? `If ${underdog.city} controls the clock and keeps ${favorite.city}'s offense off the field, the volume these legs need never shows up.`
      : `If ${favorite.city} can't build a lead, ${underdog.city} never has to chase and the passing volume stays normal.`;
  return {
    gameId: game.id,
    beats,
    helpedPickIds: [...helped],
    hurtPickIds: [...hurt],
    confidence,
    summary: `${favorite.city} controls the game${margin >= 3 ? " and runs late" : ""}; ${underdog.city} throws to catch up.`,
    breaker,
  };
}

/* ---------- other sports ---------- */

const isOver = (c: PickContext) => c.pick.direction === "over" || c.pick.direction === "yes";

function sides(contexts: PickContext[]) {
  const first = contexts[0];
  const home = first.team.id === first.game.homeTeamId ? first.team : first.opponent;
  const away = home.id === first.team.id ? first.opponent : first.team;
  const odds = first.gameOdds;
  // Moneylines decide the favorite when posted (hockey, baseball); otherwise the spread does.
  let favorite: Team | null = null;
  if (odds?.homeMoneyline != null && odds.awayMoneyline != null && odds.homeMoneyline !== odds.awayMoneyline) {
    favorite = odds.homeMoneyline < odds.awayMoneyline ? home : away;
  } else if (odds && odds.homeSpread !== 0) {
    favorite = odds.homeSpread < 0 ? home : away;
  }
  const underdog = favorite ? (favorite.id === home.id ? away : home) : null;
  return { game: first.game, home, away, favorite, underdog, odds };
}

function script(gameId: string, beats: string[], helped: Set<string>, hurt: Set<string>, confidence: number, summary: string, breaker: string | null): GameScript {
  return { gameId, beats, helpedPickIds: [...helped], hurtPickIds: [...hurt], confidence, summary, breaker: helped.size ? breaker : null };
}

const NBA_SCORING = new Set<MarketKey>(["points", "threes", "pra", "points_rebounds", "points_assists"]);

function basketballScript(contexts: PickContext[]): GameScript {
  const { game, home, away, favorite, underdog, odds } = sides(contexts);
  const margin = Math.abs(odds?.homeSpread ?? 0);
  const total = odds?.total ?? 0;
  const beats: string[] = [];
  const helped = new Set<string>();
  const hurt = new Set<string>();

  if (favorite && underdog && margin >= 10) {
    beats.push(`${favorite.city} is a ${margin}-point favorite, so a blowout is a real possibility.`);
    beats.push("If it gets out of hand, starters on both sides sit for much of the fourth quarter.");
    for (const c of contexts) (isOver(c) ? hurt : helped).add(c.pick.id);
  } else if (margin <= 4.5) {
    beats.push(`${away.city} at ${home.city} projects as a close game, which keeps the starters on the floor late.`);
    for (const c of contexts) if (isOver(c)) helped.add(c.pick.id);
  } else if (favorite) {
    beats.push(`${favorite.city} is favored by ${margin}, enough for a comfortable lead but not a guaranteed blowout.`);
  }

  if (total >= 235) {
    beats.push(`A ${total} total points to a fast pace and plenty of possessions.`);
    for (const c of contexts) if (NBA_SCORING.has(c.pick.market)) (isOver(c) ? helped : hurt).add(c.pick.id);
  } else if (total > 0 && total <= 220) {
    beats.push(`A ${total} total suggests a slower, half-court game with fewer possessions.`);
    for (const c of contexts) if (NBA_SCORING.has(c.pick.market)) (isOver(c) ? hurt : helped).add(c.pick.id);
  }
  for (const id of helped) hurt.delete(id);

  const breaker =
    margin >= 10 ? `If ${underdog?.city ?? "the underdog"} keeps it within single digits, the starters play full minutes.` : "An early blowout would cut the starters' minutes and sink the overs.";
  return script(game.id, beats, helped, hurt, Math.min(0.75, 0.35 + margin * 0.03), margin >= 10 ? "Blowout risk: watch the starters' minutes." : "Starters should play normal minutes.", breaker);
}

const NHL_SKATER = new Set<MarketKey>(["nhl_points", "nhl_assists", "goals", "shots_on_goal"]);

function hockeyScript(contexts: PickContext[]): GameScript {
  const { game, favorite, underdog, odds } = sides(contexts);
  const total = odds?.total ?? 0;
  const beats: string[] = [];
  const helped = new Set<string>();
  const hurt = new Set<string>();

  if (total >= 6.5) {
    beats.push(`A ${total} total points to an open, high-event game.`);
    for (const c of contexts) if (NHL_SKATER.has(c.pick.market)) (isOver(c) ? helped : hurt).add(c.pick.id);
  } else if (total > 0 && total <= 5.5) {
    beats.push(`A ${total} total points to a tight, low-scoring game.`);
    for (const c of contexts) if (NHL_SKATER.has(c.pick.market) && c.pick.market !== "shots_on_goal") (isOver(c) ? hurt : helped).add(c.pick.id);
  }
  if (favorite && underdog) {
    beats.push(`${favorite.city} is favored, so ${underdog.city}'s goalie should face more shots than ${favorite.city}'s.`);
    for (const c of contexts) {
      if (c.pick.market !== "saves") continue;
      const dogGoalie = c.team.id === underdog.id;
      (isOver(c) === dogGoalie ? helped : hurt).add(c.pick.id);
    }
  }
  return script(game.id, beats, helped, hurt, 0.4, favorite ? `${favorite.city} should control play.` : "No strong lean either way.", "A goaltending duel or an early lead that turns into a defensive shell would change the shot volume.");
}

const MLB_HITTER = new Set<MarketKey>(["hits", "total_bases", "home_runs", "rbis", "runs", "hits_runs_rbis"]);
const MLB_PITCHER_UP = new Set<MarketKey>(["pitcher_strikeouts", "outs_recorded"]);
const MLB_PITCHER_DOWN = new Set<MarketKey>(["hits_allowed", "earned_runs"]);

function baseballScript(contexts: PickContext[]): GameScript {
  const { game, favorite, odds } = sides(contexts);
  const total = odds?.total ?? 0;
  const beats: string[] = [];
  const helped = new Set<string>();
  const hurt = new Set<string>();
  const slugfest = total >= 9;
  const duel = total > 0 && total <= 7.5;

  if (slugfest || duel) {
    beats.push(slugfest ? `A ${total}-run total points to plenty of offense.` : `A ${total}-run total points to a pitchers' duel.`);
    for (const c of contexts) {
      const m = c.pick.market;
      const goodForBats = MLB_HITTER.has(m) || MLB_PITCHER_DOWN.has(m);
      const goodForArms = MLB_PITCHER_UP.has(m);
      if (!goodForBats && !goodForArms) continue;
      const helpsOver = slugfest ? goodForBats : goodForArms;
      (isOver(c) === helpsOver ? helped : hurt).add(c.pick.id);
    }
  }
  if (favorite) {
    beats.push(`${favorite.city} is the favorite, so its starter has the better chance of working deep.`);
    for (const c of contexts) if (c.pick.market === "outs_recorded" && c.team.id === favorite.id && isOver(c)) helped.add(c.pick.id);
  }
  return script(game.id, beats, helped, hurt, 0.35, slugfest ? "Offense-friendly game." : duel ? "Pitching-friendly game." : "Neutral run environment.", "One early blow-up inning or a quick hook for the starter flips the script.");
}
