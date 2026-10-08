import type { Pick } from "@/lib/types";
import type { AnalystMode, ChatMessage } from "./types";

export class AnalystError extends Error {}

/**
 * Ask the analyst. Calls `onText` with each chunk as it streams in and
 * resolves with the full reply and which mode answered.
 */
export async function askAnalyst(
  picks: Pick[],
  messages: ChatMessage[],
  onText: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; mode: AnalystMode }> {
  let res: Response;
  try {
    res = await fetch("/api/analyst", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks, messages }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AnalystError("Couldn't reach the analyst. Check your connection and try again.");
  }
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new AnalystError(data?.error ?? "The analyst didn't answer. Try again.");
  }

  const mode = (res.headers.get("X-Analyst-Mode") as AnalystMode | null) ?? "rules";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    text += chunk;
    onText(chunk);
  }
  return { text, mode };
}
