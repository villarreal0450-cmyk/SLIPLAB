import { analystMode, runAnalyst } from "@/lib/analyst/service";
import { readJsonBody } from "@/lib/http/readJson";
import { clientKey, rateLimit } from "@/lib/http/rateLimit";

/** Chat with the analyst about the current slip. Streams plain text. */
export async function POST(request: Request) {
  // Model calls cost money and this route is open to guests.
  if (analystMode() === "ai" && !rateLimit(`analyst:${clientKey(request)}`, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "You're asking faster than the analyst can answer. Give it a few minutes." }, { status: 429 });
  }

  const body = await readJsonBody(request);
  if (body === undefined) return Response.json({ error: "Request body must be JSON." }, { status: 400 });

  try {
    const result = await runAnalyst(body, request.signal);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return new Response(result.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Analyst-Mode": result.mode,
      },
    });
  } catch (error) {
    console.error("Analyst route failed", error);
    return Response.json({ error: "The analyst couldn't read this slip. Try again." }, { status: 500 });
  }
}
