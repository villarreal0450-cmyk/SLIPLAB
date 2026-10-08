import type { ParlayAnalysis } from "@/lib/types";
import type { PickBreakdown } from "./breakdown";

/** Response shapes shared by the analysis API routes and their client callers. */

export type AnalyzeResult =
  | { ok: true; analysis: ParlayAnalysis }
  | { ok: false; error: string; pickId?: string };

export type BreakdownResult =
  | { ok: true; breakdown: PickBreakdown }
  | { ok: false; error: string; reason: "invalid" | "not_found" | "failed" };
