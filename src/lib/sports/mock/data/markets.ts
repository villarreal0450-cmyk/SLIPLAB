import type { MarketLine } from "@/lib/types";

const updatedAt = "2026-10-07T12:00:00Z";
const TB_DAL = "nfl-2026-w5-tb-dal";
const ATL_NO = "nfl-2026-w5-atl-no";
const KC_DEN = "nfl-2026-w5-kc-den";

const ou = (
  gameId: string,
  playerId: string,
  market: MarketLine["market"],
  line: number,
  alternates?: MarketLine["alternates"],
): MarketLine => ({
  playerId,
  gameId,
  market,
  line,
  overOdds: -112,
  underOdds: -108,
  alternates,
  updatedAt,
});

/** Anytime TD style market. `overOdds` holds the YES price, `underOdds` the NO price. */
const yesNo = (gameId: string, playerId: string, yesOdds: number, noOdds: number): MarketLine => ({
  playerId,
  gameId,
  market: "anytime_td",
  line: null,
  overOdds: yesOdds,
  underOdds: noOdds,
  updatedAt,
});

const yardAlts = (center: number, step: number, count = 3) =>
  Array.from({ length: count * 2 + 1 }, (_, i) => {
    const offset = (i - count) * step;
    const line = center + offset;
    // Cheaper lines pay less; harder lines pay more.
    const overOdds = offset < 0 ? -112 - Math.abs(offset) * 11 : -112 + offset * 12;
    const underOdds = offset < 0 ? -108 + Math.abs(offset) * 10 : -108 - offset * 11;
    return { line, overOdds: Math.round(overOdds), underOdds: Math.round(underOdds) };
  });

export const marketLines: MarketLine[] = [
  // TB vs DAL
  ou(TB_DAL, "dak-prescott", "passing_yards", 265.5, yardAlts(265.5, 10, 4)),
  ou(TB_DAL, "dak-prescott", "passing_tds", 1.5),
  ou(TB_DAL, "dak-prescott", "completions", 24.5),
  ou(TB_DAL, "ceedee-lamb", "receiving_yards", 78.5, yardAlts(78.5, 6, 4)),
  ou(TB_DAL, "ceedee-lamb", "receptions", 6.5),
  yesNo(TB_DAL, "ceedee-lamb", 120, -150),
  ou(TB_DAL, "george-pickens", "receiving_yards", 62.5, yardAlts(62.5, 6, 4)),
  ou(TB_DAL, "george-pickens", "receptions", 4.5),
  yesNo(TB_DAL, "george-pickens", 150, -190),
  ou(TB_DAL, "javonte-williams", "rushing_yards", 58.5, yardAlts(58.5, 5, 3)),
  ou(TB_DAL, "javonte-williams", "rushing_attempts", 14.5),
  yesNo(TB_DAL, "javonte-williams", -115, -110),
  ou(TB_DAL, "jake-ferguson", "receiving_yards", 34.5),
  ou(TB_DAL, "jake-ferguson", "receptions", 4.5),
  yesNo(TB_DAL, "jake-ferguson", 260, -340),
  ou(TB_DAL, "baker-mayfield", "passing_yards", 248.5, yardAlts(248.5, 10, 4)),
  ou(TB_DAL, "baker-mayfield", "passing_tds", 1.5),
  ou(TB_DAL, "mike-evans", "receiving_yards", 64.5, yardAlts(64.5, 6, 4)),
  ou(TB_DAL, "mike-evans", "receptions", 4.5),
  yesNo(TB_DAL, "mike-evans", 125, -155),
  ou(TB_DAL, "chris-godwin", "receiving_yards", 58.5, yardAlts(58.5, 6, 4)),
  ou(TB_DAL, "chris-godwin", "receptions", 5.5),
  yesNo(TB_DAL, "chris-godwin", 175, -220),
  ou(TB_DAL, "emeka-egbuka", "receiving_yards", 48.5),
  ou(TB_DAL, "bucky-irving", "rushing_yards", 62.5, yardAlts(62.5, 5, 3)),
  ou(TB_DAL, "bucky-irving", "rushing_attempts", 15.5),
  yesNo(TB_DAL, "bucky-irving", -105, -120),

  // ATL vs NO
  ou(ATL_NO, "michael-penix", "passing_yards", 231.5),
  ou(ATL_NO, "bijan-robinson", "rushing_yards", 84.5),
  yesNo(ATL_NO, "bijan-robinson", -140, 110),
  ou(ATL_NO, "drake-london", "receiving_yards", 68.5),
  ou(ATL_NO, "spencer-rattler", "passing_yards", 214.5),
  ou(ATL_NO, "alvin-kamara", "rushing_yards", 52.5),
  ou(ATL_NO, "chris-olave", "receiving_yards", 54.5),

  // KC vs DEN
  ou(KC_DEN, "patrick-mahomes", "passing_yards", 258.5),
  ou(KC_DEN, "travis-kelce", "receiving_yards", 52.5),
  ou(KC_DEN, "rashee-rice", "receiving_yards", 66.5),
  ou(KC_DEN, "bo-nix", "passing_yards", 229.5),
  ou(KC_DEN, "courtland-sutton", "receiving_yards", 61.5),
  ou(KC_DEN, "rj-harvey", "rushing_yards", 57.5),
];
