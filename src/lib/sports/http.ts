/**
 * Small server-side JSON cache for external data providers: per-URL TTL,
 * in-flight de-duplication, timeout, and stale-on-error. Per server instance;
 * swap for a shared cache (Redis, Next data cache) when running several.
 */

type Entry = { expires: number; value?: unknown; pending?: Promise<unknown> };
const store = new Map<string, Entry>();

export class ProviderHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}

export type FetchJsonOptions = {
  ttlMs: number;
  timeoutMs?: number;
  /** Cache key override (e.g. a URL without its API key). */
  key?: string;
  headers?: Record<string, string>;
  onResponse?: (res: Response) => void;
};

export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  const key = opts.key ?? url;
  const now = Date.now();
  const hit = store.get(key);
  if (hit?.value !== undefined && hit.expires > now) return hit.value as T;
  if (hit?.pending) return hit.pending as Promise<T>;

  const pending = (async () => {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", ...opts.headers },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        cache: "no-store",
      });
      opts.onResponse?.(res);
      if (!res.ok) throw new ProviderHttpError(`${res.status} from ${new URL(url).host}`, res.status);
      const value = (await res.json()) as T;
      store.set(key, { value, expires: Date.now() + opts.ttlMs });
      return value;
    } catch (error) {
      // Serve stale data rather than failing outright when the source hiccups.
      if (hit?.value !== undefined) {
        store.set(key, { value: hit.value, expires: Date.now() + 60_000 });
        return hit.value as T;
      }
      store.delete(key);
      throw error;
    }
  })();

  store.set(key, { ...hit, expires: hit?.expires ?? 0, pending });
  return pending;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
