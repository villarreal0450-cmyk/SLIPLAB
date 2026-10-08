import { clientKey, rateLimit } from "@/lib/http/rateLimit";
import { runScan, scanAvailable } from "@/lib/scan/service";

const MAX_BODY_BYTES = 7_500_000;

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return Response.json({ ok: false, reason: "invalid", error: "That image is too large. Keep it under 5 MB." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, reason: "invalid", error: "Request body must be JSON." }, { status: 400 });
  }

  // Vision calls cost money; limit them per client.
  const isSample = typeof body === "object" && body !== null && (body as { sample?: unknown }).sample === true;
  if (!isSample && scanAvailable() && !rateLimit(`scan:${clientKey(request)}`, 10, 10 * 60 * 1000)) {
    return Response.json({ ok: false, reason: "failed", error: "Too many scans in a row. Try again in a few minutes." }, { status: 429 });
  }

  const result = await runScan(body);
  const status = result.ok ? 200 : result.reason === "not_configured" ? 501 : result.reason === "failed" ? 502 : 422;
  return Response.json(result, { status });
}
