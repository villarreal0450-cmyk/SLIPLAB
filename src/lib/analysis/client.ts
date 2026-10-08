import type { Pick } from "@/lib/types";
import type { AlternativesMode } from "./suggestions/alternatives";
import type { AlternativesResult, AnalyzeResult, BreakdownResult, ImproveResult } from "./results";

/**
 * Browser-side callers for the analysis API. Analysis is a read, so it goes
 * through Route Handlers (parallel, cancellable) rather than Server Actions
 * (serialized, meant for mutations).
 */

const NETWORK_ERROR = "Couldn't reach the analyst. Check your connection and try again.";

async function post<T extends { ok: boolean }>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok && res.status !== 400 && res.status !== 404 && res.status !== 422) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchParlayAnalysis(picks: Pick[], signal?: AbortSignal): Promise<AnalyzeResult> {
  try {
    return await post<AnalyzeResult>("/api/analysis/parlay", { picks }, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function fetchPickBreakdown(pickId: string, picks: Pick[], signal?: AbortSignal): Promise<BreakdownResult> {
  try {
    return await post<BreakdownResult>("/api/analysis/pick", { pickId, picks }, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, error: NETWORK_ERROR, reason: "failed" };
  }
}

export async function fetchSuggestions(picks: Pick[], signal?: AbortSignal): Promise<ImproveResult> {
  try {
    return await post<ImproveResult>("/api/analysis/improve", { picks }, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function fetchLegAlternatives(pickId: string, mode: AlternativesMode, picks: Pick[], signal?: AbortSignal): Promise<AlternativesResult> {
  try {
    return await post<AlternativesResult>("/api/analysis/alternatives", { pickId, mode, picks }, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, error: NETWORK_ERROR };
  }
}
