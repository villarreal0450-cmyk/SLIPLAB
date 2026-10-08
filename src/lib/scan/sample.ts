import type { BetSlipParser, ParsedSlip } from "./types";

/**
 * A fixed, clearly-labelled sample slip (the DAL @ TB parlay from the product
 * brief). It lets people try the review flow without a vision model. It is
 * never presented as a reading of an uploaded image.
 */
export const SAMPLE_SLIP: ParsedSlip = {
  is_betslip: true,
  sportsbook: "Sample sportsbook",
  event: "DAL @ TB",
  legs: [
    { raw_text: "Dak Prescott — Passing Yards 244+", player: "Dak Prescott", team: "DAL", market: "Passing Yards", line: 244, direction: "over", odds: -150 },
    { raw_text: "CeeDee Lamb — Receiving Yards 81+", player: "CeeDee Lamb", team: "DAL", market: "Receiving Yards", line: 81, direction: "over", odds: 105 },
    { raw_text: "George Pickens — Receiving Yards 62+", player: "George Pickens", team: "DAL", market: "Receiving Yards", line: 62, direction: "over", odds: -115 },
    { raw_text: "Javonte Williams — Anytime TD Scorer", player: "Javonte Williams", team: "DAL", market: "Anytime TD Scorer", line: null, direction: "yes", odds: -115 },
  ],
  combined_odds: 1094,
  stake: null,
};

export const sampleParser: BetSlipParser = {
  source: "sample",
  async parse() {
    return SAMPLE_SLIP;
  },
};
