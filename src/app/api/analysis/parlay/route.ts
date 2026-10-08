import { runParlayAnalysis } from "@/lib/analysis/service";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === undefined) return Response.json({ ok: false, error: "Request body must be JSON." }, { status: 400 });
  const result = await runParlayAnalysis(body);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
