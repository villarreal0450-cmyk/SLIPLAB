import { runResearch } from "@/lib/analyst/research";
import { readJsonBody } from "@/lib/http/readJson";

/** Web research takes a while: a few searches plus a written brief. */
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) return Response.json({ ok: false, error: "Request body must be JSON.", reason: "invalid" }, { status: 400 });
  const result = await runResearch(body);
  const status = result.ok ? 200 : result.reason === "invalid" ? 422 : result.reason === "not_configured" ? 503 : 500;
  return Response.json(result, { status });
}
