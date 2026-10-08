import type { SportsDataProvider } from "@/lib/sports/provider";
import type { Pick, PickContext } from "@/lib/types";

/**
 * Gather everything the scoring engine (and later the LLM) needs for one pick.
 * This is the only place that talks to the provider on behalf of analysis, so
 * data collection stays separate from scoring and explanation.
 */
export async function buildPickContext(pick: Pick, provider: SportsDataProvider): Promise<PickContext> {
  const [player, team, opponent, game, gameOdds, recentGames, seasonStats, teamStats, opponentStats, ownInjuries, oppInjuries, marketLine] =
    await Promise.all([
      provider.getPlayer(pick.playerId),
      provider.getTeam(pick.teamId),
      provider.getTeam(pick.opponentTeamId),
      provider.getGame(pick.gameId),
      provider.getGameOdds(pick.gameId),
      provider.getPlayerGameLog(pick.playerId, { limit: 5 }),
      provider.getPlayerSeasonStats(pick.playerId),
      provider.getTeamStats(pick.teamId),
      provider.getTeamStats(pick.opponentTeamId),
      provider.getInjuries(pick.teamId),
      provider.getInjuries(pick.opponentTeamId),
      provider.getMarketLine(pick.playerId, pick.gameId, pick.market),
    ]);

  if (!player) throw new PickContextError(`Unknown player "${pick.playerId}"`, pick.id);
  if (!team || !opponent) throw new PickContextError(`Unknown team for pick "${pick.id}"`, pick.id);
  if (!game) throw new PickContextError(`Unknown game "${pick.gameId}"`, pick.id);

  return {
    pick,
    player,
    team,
    opponent,
    game,
    gameOdds,
    recentGames,
    seasonStats,
    teamStats,
    opponentStats,
    injuries: { own: ownInjuries, opponent: oppInjuries },
    marketLine,
    dataSource: provider.info,
  };
}

export class PickContextError extends Error {
  constructor(
    message: string,
    public readonly pickId: string,
  ) {
    super(message);
    this.name = "PickContextError";
  }
}
