import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { Pick, SavedBet, SavedLeg, ScoreTier } from "@/lib/types";
import type { BetRepository } from "./repository";

type DB = SupabaseClient<Database>;
type BetRow = Database["public"]["Tables"]["bets"]["Row"];
type LegRow = Database["public"]["Tables"]["bet_legs"]["Row"];
type AnalysisRow = Database["public"]["Tables"]["parlay_analysis"]["Row"];

/**
 * Bets stored in Supabase. Row-level security scopes every query to the
 * signed-in user, and `user_id` is filled by the database (auth.uid()), so it
 * is never sent from the browser.
 *
 * NOTE: written against the migrations in /supabase but not yet exercised
 * against a live project (no credentials at the time of writing).
 */
export function createAccountBetRepository(sb: DB): BetRepository {
  return {
    kind: "account",

    async load() {
      const { data: bets, error } = await sb.from("bets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (!bets.length) return [];
      const ids = bets.map((b) => b.id);
      const [legs, analyses] = await Promise.all([
        sb.from("bet_legs").select("*").in("bet_id", ids).order("sort_order"),
        sb.from("parlay_analysis").select("*").in("bet_id", ids),
      ]);
      if (legs.error) throw legs.error;
      if (analyses.error) throw analyses.error;
      return bets.map((b) => fromRows(b, legs.data.filter((l) => l.bet_id === b.id), analyses.data.find((a) => a.bet_id === b.id) ?? null));
    },

    async save(bet) {
      const betRes = await sb.from("bets").upsert({
        id: bet.id,
        sport: bet.sport,
        event_id: singleGame(bet),
        sportsbook: bet.sportsbook,
        stake: bet.stake,
        odds: bet.odds,
        potential_payout: bet.potentialPayout,
        status: bet.status,
        analysis_score: bet.analysis?.score ?? null,
        cohesion_score: bet.analysis?.cohesion ?? null,
        risk_level: bet.analysis?.riskLevel ?? null,
        notes: bet.notes,
        settled_at: bet.settledAt,
        created_at: bet.createdAt,
      });
      if (betRes.error) throw betRes.error;

      const legRes = await sb.from("bet_legs").upsert(bet.legs.map((l, i) => toLegRow(bet.id, l, i)));
      if (legRes.error) throw legRes.error;

      const keep = bet.legs.map((l) => l.id);
      const pruned = await sb.from("bet_legs").delete().eq("bet_id", bet.id).not("id", "in", `(${keep.join(",")})`);
      if (pruned.error) throw pruned.error;

      if (bet.analysis) {
        const a = bet.analysis;
        const aRes = await sb.from("parlay_analysis").upsert({
          id: bet.id, // one snapshot per bet
          bet_id: bet.id,
          score: a.score,
          tier: a.tier,
          cohesion_score: a.cohesion,
          risk_level: a.riskLevel,
          weakest_leg_id: a.weakestLegId,
          summary: a.summary,
          data_source: { isMock: a.isMockData, analyzedAt: a.analyzedAt, label: a.label },
          created_at: a.analyzedAt,
        });
        if (aRes.error) throw aRes.error;
      }
    },

    async remove(id) {
      // Legs and analysis cascade on delete.
      const { error } = await sb.from("bets").delete().eq("id", id);
      if (error) throw error;
    },
  };
}

function singleGame(bet: SavedBet): string | null {
  const games = new Set(bet.legs.map((l) => l.pick.gameId));
  return games.size === 1 ? [...games][0] : null;
}

function toLegRow(betId: string, l: SavedLeg, i: number): Database["public"]["Tables"]["bet_legs"]["Insert"] {
  return {
    id: l.id,
    bet_id: betId,
    player_id: l.pick.playerId,
    player_name: l.pick.playerName,
    team: l.pick.meta?.teamAbbr ?? l.pick.teamId,
    opponent: l.pick.meta?.opponentAbbr ?? l.pick.opponentTeamId,
    market: l.pick.market,
    direction: l.pick.direction,
    line: l.pick.line,
    odds: l.pick.odds ?? null,
    status: l.status,
    result_value: l.resultValue,
    analysis_score: l.analysisScore,
    process_review: l.processReview,
    sort_order: i,
    selection: l.pick as unknown as Json,
  };
}

function fromRows(b: BetRow, legs: LegRow[], a: AnalysisRow | null): SavedBet {
  const source = (a?.data_source ?? {}) as { isMock?: boolean; analyzedAt?: string; label?: string };
  return {
    id: b.id,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    status: b.status,
    sport: b.sport,
    sportsbook: b.sportsbook,
    stake: b.stake,
    odds: b.odds,
    potentialPayout: b.potential_payout,
    notes: b.notes,
    settledAt: b.settled_at,
    legs: legs.map((l) => ({
      id: l.id,
      pick: pickFromRow(l),
      status: l.status,
      resultValue: l.result_value,
      analysisScore: l.analysis_score,
      processReview: l.process_review,
    })),
    analysis: a
      ? {
          score: a.score,
          tier: a.tier as ScoreTier,
          label: source.label ?? "",
          cohesion: a.cohesion_score,
          riskLevel: a.risk_level,
          summary: a.summary,
          weakestLegId: a.weakest_leg_id,
          analyzedAt: source.analyzedAt ?? a.created_at,
          isMockData: source.isMock ?? true,
        }
      : null,
  };
}

/** Prefer the stored selection; fall back to the flat columns for older rows. */
function pickFromRow(l: LegRow): Pick {
  const s = l.selection as Partial<Pick> | null;
  if (s && typeof s.id === "string" && typeof s.gameId === "string" && typeof s.playerId === "string") return s as Pick;
  return {
    id: l.id,
    sport: "nfl",
    gameId: "",
    playerId: l.player_id ?? "",
    playerName: l.player_name,
    teamId: l.team,
    opponentTeamId: l.opponent,
    market: l.market as Pick["market"],
    direction: l.direction,
    line: l.line,
    odds: l.odds ?? undefined,
  };
}
