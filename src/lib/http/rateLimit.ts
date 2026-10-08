/**
 * Minimal fixed-window rate limiter, per server instance. Good enough to stop
 * a runaway client from burning model credits; replace with a shared store
 * (e.g. Upstash/Redis) before running multiple instances.
 */
const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  if (w.count >= limit) return false;
  w.count += 1;
  return true;
}

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
