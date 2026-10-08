import type { Direction } from "@/lib/types";

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
};

/**
 * Whether a stat value settles the pick as a hit.
 * Integer lines ("244+") hit on >= line; half lines (244.5) hit on > line.
 */
export function isHit(value: number, line: number, direction: Direction): boolean {
  const isWholeNumber = Number.isInteger(line);
  if (direction === "over" || direction === "yes") {
    return isWholeNumber ? value >= line : value > line;
  }
  return isWholeNumber ? value < line : value < line;
}

/** Sign helper: +1 for over/yes, -1 for under/no. */
export const directionSign = (direction: Direction) => (direction === "over" || direction === "yes" ? 1 : -1);

/** Standard normal CDF (Abramowitz & Stegun approximation). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export const round1 = (v: number) => Math.round(v * 10) / 10;
