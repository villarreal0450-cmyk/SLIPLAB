import type { SavedBet } from "@/lib/types";

/**
 * Where saved bets live. Guests keep them on the device; signed-in users keep
 * them in Supabase. UI code talks to this interface only.
 */
export interface BetRepository {
  readonly kind: "device" | "account";
  load(): Promise<SavedBet[]>;
  save(bet: SavedBet): Promise<void>;
  remove(id: string): Promise<void>;
}
