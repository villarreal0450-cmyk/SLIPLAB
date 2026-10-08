import type { Injury, MarketKey, Position } from "@/lib/types";
import { clamp } from "../math";
import { impactFor, type ScoringFactor } from "../types";

const STATUS_WEIGHT: Record<Injury["status"], number> = {
  out: 1,
  ir: 1,
  doubtful: 0.75,
  questionable: 0.35,
  probable: 0.1,
};

/** Opponent positions whose absence helps a market. */
function defendersFor(market: MarketKey): Position[] {
  switch (market) {
    case "passing_yards":
    case "passing_tds":
    case "completions":
    case "receiving_yards":
    case "receptions":
      return ["CB", "S", "DB", "LB"];
    case "rushing_yards":
    case "rushing_attempts":
    case "anytime_td":
      return ["DL", "LB", "S"];
    default:
      return [];
  }
}

export const injuries: ScoringFactor = {
  key: "injuries",
  label: "Injuries",
  weight: 0.7,
  evaluate(ctx) {
    const defenders = defendersFor(ctx.pick.market);
    const notes: string[] = [];
    let adjustment = 0;

    // Player's own status is the biggest risk.
    const self = ctx.injuries.own.find((i) => i.playerId === ctx.pick.playerId);
    if (self) {
      adjustment -= STATUS_WEIGHT[self.status] * 0.5;
      notes.push(`${ctx.player.name.split(" ").slice(-1)[0]} is ${self.status} (${self.description}).`);
    }

    // Opponent defenders missing helps.
    const oppOut = ctx.injuries.opponent.filter((i) => defenders.includes(i.position));
    if (oppOut.length) {
      const boost = Math.min(0.3, oppOut.reduce((acc, i) => acc + STATUS_WEIGHT[i.status] * 0.12, 0));
      adjustment += boost;
      notes.push(
        `${ctx.opponent.city} secondary/front is banged up: ${oppOut.map((i) => `${i.playerName.split(" ").slice(-1)[0]} ${i.status}`).join(", ")}.`,
      );
    }

    // Own-team QB or offensive line issues hurt everyone on offense.
    const ownQb = ctx.injuries.own.find((i) => i.position === "QB" && i.playerId !== ctx.pick.playerId);
    if (ownQb) {
      adjustment -= STATUS_WEIGHT[ownQb.status] * 0.3;
      notes.push(`Own QB ${ownQb.playerName} is ${ownQb.status}.`);
    }
    const ownOl = ctx.injuries.own.filter((i) => i.position === "OL");
    if (ownOl.length) {
      adjustment -= Math.min(0.15, ownOl.reduce((acc, i) => acc + STATUS_WEIGHT[i.status] * 0.08, 0));
      notes.push(`Offensive line: ${ownOl.map((i) => `${i.playerName.split(" ").slice(-1)[0]} ${i.status}`).join(", ")}.`);
    }

    const score = clamp(0.5 + adjustment);
    return {
      key: this.key,
      label: this.label,
      score,
      weight: this.weight,
      impact: impactFor(score),
      explanation: notes.length ? notes.join(" ") : "No relevant injuries reported on either side.",
      evidence: { opponentDefendersAffected: oppOut.length, selfStatus: self?.status ?? null },
    };
  },
};
