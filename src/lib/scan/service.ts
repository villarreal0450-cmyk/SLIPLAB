import "server-only";

import { isClaudeConfigured } from "@/lib/analyst/claude";
import { getSportsDataProvider } from "@/lib/sports";
import { claudeParser } from "./claudeParser";
import { buildCatalog, normalizeSlip } from "./normalize";
import { sampleParser } from "./sample";
import type { ScanResult, SlipImage } from "./types";

const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
/** ~5 MB of image data once base64-encoded. */
const MAX_BASE64_LENGTH = 7_000_000;

export function scanAvailable(): boolean {
  return isClaudeConfigured();
}

/**
 * Scan a slip image (vision model) or load the labelled sample. Without a
 * configured vision model an uploaded image is refused with a clear reason;
 * the app never pretends to have read it.
 */
export async function runScan(input: unknown): Promise<ScanResult> {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const wantsSample = body.sample === true;

  let image: SlipImage | null = null;
  if (!wantsSample) {
    const { data, mediaType } = body;
    if (typeof data !== "string" || typeof mediaType !== "string" || !MEDIA_TYPES.has(mediaType) || data.length === 0) {
      return { ok: false, reason: "invalid", error: "Upload a PNG, JPG, WEBP or GIF screenshot." };
    }
    if (data.length > MAX_BASE64_LENGTH) return { ok: false, reason: "invalid", error: "That image is too large. Keep it under 5 MB." };
    if (!/^[A-Za-z0-9+/=]+$/.test(data)) return { ok: false, reason: "invalid", error: "That image couldn't be read." };
    if (!scanAvailable()) {
      return {
        ok: false,
        reason: "not_configured",
        error: "Screenshot scanning isn't connected in this build yet. Try the sample slip, or add your picks manually.",
      };
    }
    image = { data, mediaType: mediaType as SlipImage["mediaType"] };
  }

  const parser = wantsSample ? sampleParser : claudeParser;
  try {
    const slip = await parser.parse(image);
    if (!slip.is_betslip || slip.legs.length === 0) {
      return { ok: false, reason: "not_a_slip", error: "That doesn't look like a bet slip. Try a clearer screenshot of the slip itself." };
    }
    const catalog = await buildCatalog(getSportsDataProvider());
    const legs = normalizeSlip(slip, catalog, () => crypto.randomUUID());
    return { ok: true, source: parser.source, slip, legs, catalog };
  } catch (error) {
    console.error("runScan failed", error);
    return { ok: false, reason: "failed", error: "The slip couldn't be read. Try again or add your picks manually." };
  }
}
