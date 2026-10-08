import type { SavedBet } from "@/lib/types";
import { parseBets } from "./model";
import type { BetRepository } from "./repository";

export const DEVICE_BETS_KEY = "sliplab.bets.v1";

function read(): SavedBet[] {
  try {
    const raw = window.localStorage.getItem(DEVICE_BETS_KEY);
    return raw ? parseBets(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function write(bets: SavedBet[]) {
  // Throws when storage is unavailable or full; the caller surfaces the error.
  window.localStorage.setItem(DEVICE_BETS_KEY, JSON.stringify({ version: 1, bets }));
}

/** Bets saved in this browser only. Used for guests and as the offline fallback. */
export const deviceBetRepository: BetRepository = {
  kind: "device",
  async load() {
    return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async save(bet) {
    const bets = read();
    const i = bets.findIndex((b) => b.id === bet.id);
    if (i >= 0) bets[i] = bet;
    else bets.unshift(bet);
    write(bets);
  },
  async remove(id) {
    write(read().filter((b) => b.id !== id));
  },
};

export function clearDeviceBets() {
  try {
    window.localStorage.removeItem(DEVICE_BETS_KEY);
  } catch {
    // Nothing to clear.
  }
}
