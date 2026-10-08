import type { ScoringFactor } from "../types";
import { gameEnvironment } from "./gameEnvironment";
import { injuries } from "./injuries";
import { lineValue } from "./lineValue";
import { marketVolatility } from "./marketVolatility";
import { matchup } from "./matchup";
import { opportunity } from "./opportunity";
import { recentForm } from "./recentForm";
import { seasonBaseline } from "./seasonBaseline";

/** Ordered registry. Add a factor here and it participates in every score. */
export const defaultFactors: readonly ScoringFactor[] = [
  recentForm,
  seasonBaseline,
  matchup,
  opportunity,
  lineValue,
  injuries,
  marketVolatility,
  gameEnvironment,
];
