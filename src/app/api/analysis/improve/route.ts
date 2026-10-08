import { runImprove } from "@/lib/analysis/service";
import { readJsonBody } from "@/lib/http/readJson";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) return Response.json({ ok: false, error: "Request body must be JSON." }, { status: 400 });
  const result = await runImprove(body);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
