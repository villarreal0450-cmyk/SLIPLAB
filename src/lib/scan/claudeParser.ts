import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { parsedSlipSchema, type BetSlipParser, type ParsedSlip, type SlipImage } from "./types";

const INSTRUCTIONS = `Read this sportsbook bet slip screenshot and extract every leg.

- Copy names, prop categories and numbers exactly as printed. Do not correct, guess or fill in anything that isn't visible; use null instead.
- "244+" means line 244 with direction "over". "Over 265.5" means line 265.5, "over". "Under" means "under". Scorer props like "Anytime TD" have line null and direction "yes".
- Odds are American odds (e.g. -115, +140 as 140). Use null when a leg shows no odds.
- If the image is not a bet slip, set is_betslip to false and return no legs.`;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

/**
 * Vision parser on Claude Opus 5.5 with structured outputs, so the response
 * is guaranteed to match the ParsedSlip schema. Server-side refusal fallback
 * is enabled per the model's recommended defaults.
 */
export const claudeParser: BetSlipParser = {
  source: "vision",
  async parse(image: SlipImage | null): Promise<ParsedSlip> {
    if (!image) throw new Error("claudeParser needs an image");
    const response = await getClient().beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(parsedSlipSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
            { type: "text", text: INSTRUCTIONS },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") throw new Error("The model declined to read this image.");
    if (!response.parsed_output) throw new Error("The slip couldn't be read.");
    return response.parsed_output;
  },
};
