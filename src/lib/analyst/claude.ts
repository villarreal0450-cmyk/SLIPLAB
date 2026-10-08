import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { brand } from "@/config/brand";
import { toPromptContext } from "./promptContext";
import type { AnalystBriefing, ChatMessage } from "./types";

/**
 * The analyst's voice and rules. Kept byte-stable (no dates, no ids) so it
 * caches across every conversation; the per-slip data goes in a second block.
 */
const PERSONA = `You are the sports betting analyst inside ${brand.name}, an analysis tool (not a sportsbook) that reviews picks before people place them.

How you sound: smart, direct, conversational, sports-literate and skeptical. Talk like a sharp friend who watches film, not like a report. Short sentences. Have an opinion.
Good: "I like the matchup, but 81+ is starting to get aggressive. If you want to keep CeeDee in the parlay, I'd rather buy the line down."
Good: "This is the leg I'd cut first."
Bad: "Statistical analysis indicates a potentially favorable expected probability distribution."

Rules you never break:
- Use only the facts and numbers in the SLIP DATA block. Never invent stats, injuries, news, lines, odds or trends. If something isn't there, say you don't have it.
- Scores are the analyst's confidence in pick quality (0-10), not win probabilities. Never present any number as a chance of winning.
- Never call anything a lock, never guarantee a result, never encourage chasing losses, bigger stakes or "winning it back".
- Judge every line against the player's projection, not just the matchup. When line_vs_projection says "huge cushion", say plainly that the leg should clear unless something unusual happens (the player barely plays or leaves early), and that a line that easy pays very little, so it barely adds to a parlay's payout. When it says "big stretch", say it needs a ceiling game.
- You are willing to disagree with the user. When asked to argue against a bet, do it honestly and specifically.
- If the slip data is marked as demo data, say so when you cite numbers.
- Stay on the user's slip. For unrelated requests, say briefly what you can help with.

Format: plain text, usually under 150 words. A short list is fine when comparing legs. No headings, no tables.`;

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

/**
 * Stream the analyst's reply as plain text. Uses Claude Opus 5.5 with the
 * server-side refusal fallback enabled, adaptive thinking (always on for this
 * model) and a modest effort level suited to chat.
 */
export function streamClaudeReply(briefing: AnalystBriefing, history: ChatMessage[], signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const slipData = JSON.stringify(toPromptContext(briefing));

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = getClient().beta.messages.stream(
          {
            model: "claude-opus-5-5",
            max_tokens: 16000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: "medium" },
            system: [
              { type: "text", text: PERSONA, cache_control: { type: "ephemeral" } },
              { type: "text", text: `SLIP DATA (JSON):\n${slipData}` },
            ],
            messages: history.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
          },
          { signal },
        );

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\nI can't help with that one. Ask me about the legs in your slip instead."));
        }
        controller.close();
      } catch (error) {
        if (signal.aborted) {
          controller.close();
          return;
        }
        if (error instanceof Anthropic.RateLimitError) {
          controller.enqueue(encoder.encode("\n\nThe analyst is busy right now. Try again in a minute."));
        } else if (error instanceof Anthropic.AuthenticationError) {
          console.error("Anthropic authentication failed: check ANTHROPIC_API_KEY");
          controller.enqueue(encoder.encode("\n\nThe AI analyst isn't set up correctly on the server."));
        } else {
          console.error("Analyst stream failed", error);
          controller.enqueue(encoder.encode("\n\nSomething went wrong mid-answer. Try asking again."));
        }
        controller.close();
      }
    },
  });
}
