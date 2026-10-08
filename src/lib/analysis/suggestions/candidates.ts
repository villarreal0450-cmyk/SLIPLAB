import { marketOddsFor } from "@/lib/parlay/marketMath";
import type { SportsDataProvider } from "@/lib/sports/provider";
import { MARKETS, type Pick, type PickContext } from "@/lib/types";
import { buildPickContext } from "../context/buildPickContext";

export type Candidate = { pick: Pick; ctx: PickContext };

/**
 * Every main-line market in the given games as a ready-to-score pick.
 * Overs and "yes" only: that is how same-game parlays are built in practice,
 * and it keeps the search small. Odds come straight from the market.
 */
export async function loadCandidates(gameIds: string[], provider: SportsDataProvider): Promise<Candidate[]> {
  const perGame = await Promise.all(
    [...new Set(gameIds)].map(async (gameId) => {
      const [game, props] = await Promise.all([provider.getGame(gameId), provider.getPlayerProps(gameId)]);
      if (!game) return [];
      const players = await provider.getPlayersForGame(gameId);

      const built = await Promise.all(
        props.map(async (m): Promise<Candidate | null> => {
          const player = players.find((p) => p.id === m.playerId);
          if (!player) return null;
          const isYesNo = MARKETS[m.market].kind === "yes_no";
          const direction = isYesNo ? "yes" : "over";
          const opponentTeamId = player.teamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
          const draft: Pick = {
            id: `sg-${player.id}-${m.market}-${direction}-${m.line ?? "na"}`,
            sport: game.sport,
            gameId,
            playerId: player.id,
            playerName: player.name,
            teamId: player.teamId,
            opponentTeamId,
            market: m.market,
            direction,
            line: isYesNo ? null : m.line,
            odds: marketOddsFor(m, direction, isYesNo ? null : m.line),
            isAlternate: false,
          };
          try {
            const ctx = await buildPickContext(draft, provider);
            const pick: Pick = {
              ...draft,
              meta: { teamAbbr: ctx.team.abbreviation, opponentAbbr: ctx.opponent.abbreviation, position: player.position, teamColor: ctx.team.color },
            };
            return { pick, ctx: { ...ctx, pick } };
          } catch {
            return null;
          }
        }),
      );
      return built.filter((c): c is Candidate => c !== null);
    }),
  );
  return perGame.flat();
}
