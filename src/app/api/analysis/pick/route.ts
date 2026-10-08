import { runPickBreakdown } from "@/lib/analysis/service";
import { readJsonBody } from "@/lib/http/readJson";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) return Response.json({ ok: false, error: "Request body must be JSON.", reason: "invalid" }, { status: 400 });
  const result = await runPickBreakdown(body);
  const status = result.ok ? 200 : result.reason === "not_found" ? 404 : result.reason === "invalid" ? 422 : 500;
  return Response.json(result, { status });
}
