const MAX_BODY_BYTES = 64 * 1024;

/** Parse a JSON request body, refusing oversized or malformed payloads. Returns undefined on failure. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
