import "server-only";

import { z } from "zod";
import { parseParlayInput } from "@/lib/parlay/schema";
import { getSportsDataProvider } from "@/lib/sports";
import { buildBriefing } from "./briefing";
import { isClaudeConfigured, streamClaudeReply } from "./claude";
import { answerWithRules } from "./rules";
import type { AnalystMode, ChatMessage } from "./types";

const historySchema = z
  .array(z.object({ role: z.enum(["user", "analyst"]), content: z.string().min(1).max(2000) }))
  .min(1)
  .max(30)
  .refine((h) => h[h.length - 1].role === "user", "Last message must be from the user");

export type AnalystRequestError = { status: number; error: string };

export function analystMode(): AnalystMode {
  return isClaudeConfigured() ? "ai" : "rules";
}

/** Validate input and produce a text stream (AI) or a complete text (rules). */
export async function runAnalyst(
  input: unknown,
  signal: AbortSignal,
): Promise<{ mode: AnalystMode; body: ReadableStream<Uint8Array> | string } | AnalystRequestError> {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const slip = parseParlayInput({ picks: body.picks });
  const history = historySchema.safeParse(body.messages);
  if (!slip.success) return { status: 422, error: "The analyst needs a valid slip to talk about." };
  if (!history.success) return { status: 422, error: "That message couldn't be read." };

  const briefing = await buildBriefing(slip.data.picks, getSportsDataProvider());
  const messages: ChatMessage[] = history.data;

  if (analystMode() === "ai") {
    return { mode: "ai", body: streamClaudeReply(briefing, messages, signal) };
  }
  return { mode: "rules", body: answerWithRules(messages[messages.length - 1].content, briefing) };
}
