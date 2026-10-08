/** American odds helpers. Pure functions, safe on client and server. */

export function americanToDecimal(odds: number): number {
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  return decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
}

/** Implied probability of American odds, including the book's margin. */
export function impliedProbability(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

/** Combine leg odds into parlay odds. Returns null if any leg is missing odds. */
export function combineOdds(legOdds: (number | undefined | null)[]): number | null {
  if (legOdds.length === 0) return null;
  let decimal = 1;
  for (const o of legOdds) {
    if (o === undefined || o === null || o === 0) return null;
    decimal *= americanToDecimal(o);
  }
  return decimalToAmerican(decimal);
}

export function formatOdds(odds: number | null | undefined): string {
  if (odds === null || odds === undefined || !Number.isFinite(odds)) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}
