import { runPickBreakdown } from "@/lib/analysis/service";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const text = await request.text();
  let body: unknown;
  try {
    body = text.length <= MAX_BODY_BYTES ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (body === undefined) return Response.json({ ok: false, error: "Request body must be JSON.", reason: "invalid" }, { status: 400 });

  const result = await runPickBreakdown(body);
  const status = result.ok ? 200 : result.reason === "not_found" ? 404 : result.reason === "invalid" ? 422 : 500;
  return Response.json(result, { status });
}
