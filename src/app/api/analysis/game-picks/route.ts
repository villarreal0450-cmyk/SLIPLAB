import { runGamePicks } from "@/lib/analysis/service";

export async function GET(request: Request) {
  const gameId = new URL(request.url).searchParams.get("gameId");
  const result = await runGamePicks(gameId);
  return Response.json(result, { status: result.ok ? 200 : 404 });
}
