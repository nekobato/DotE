// OAuth/DID documents are small control messages. Bound them before the SDK's
// Zod 3 validators can allocate an issue for every attacker-controlled element.
// XRPC and media use arrayBuffer()/streams and keep their existing behavior.
export const OAUTH_JSON_MAX_BYTES = 1024 * 1024;
export const OAUTH_JSON_MAX_COLLECTION = 4096;
export const OAUTH_JSON_MAX_NODES = 16384;
export const OAUTH_JSON_MAX_DEPTH = 32;

const assertJsonBudget = (value: unknown): void => {
  const pending = [{ value, depth: 0 }];
  let nodes = 1;
  while (pending.length) {
    const current = pending.pop()!;
    if (current.depth > OAUTH_JSON_MAX_DEPTH) throw new RangeError("Bluesky OAuth JSON is too deeply nested");
    if (current.value === null || typeof current.value !== "object") continue;
    const children: unknown[] = Array.isArray(current.value) ? current.value : Object.values(current.value);
    if (children.length > OAUTH_JSON_MAX_COLLECTION) throw new RangeError("Bluesky OAuth JSON collection is too large");
    nodes += children.length;
    if (nodes > OAUTH_JSON_MAX_NODES) throw new RangeError("Bluesky OAuth JSON has too many values");
    for (const child of children) pending.push({ value: child, depth: current.depth + 1 });
  }
};

const readJson = async (response: Response): Promise<unknown> => {
  if (response.bodyUsed) throw new TypeError("Response body has already been consumed");
  if (!response.body) return response.json();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > OAUTH_JSON_MAX_BYTES) {
        // A tee'd clone can keep cancellation pending until its sibling closes.
        // Reject immediately instead of waiting for an attacker-controlled body.
        void reader.cancel().catch(() => {});
        throw new RangeError("Bluesky OAuth JSON response is too large");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const value: unknown = JSON.parse(new TextDecoder().decode(data));
  assertJsonBudget(value);
  return value;
};

const protectJson = (response: Response): Response => {
  const json = () => readJson(response);
  const clone = () => protectJson(response.clone());
  const bound = new Map<PropertyKey, unknown>();
  return new Proxy(response, {
    get(target, property) {
      if (property === "json") return json;
      if (property === "clone") return clone;
      const value: unknown = Reflect.get(target, property, target);
      if (typeof value !== "function" || property === "constructor") return value;
      if (!bound.has(property)) bound.set(property, value.bind(target));
      return bound.get(property);
    },
  });
};

export const createBlueskyOAuthFetch = (fetcher: typeof globalThis.fetch): typeof globalThis.fetch => {
  return async (...args) => protectJson(await fetcher(...args));
};

export const blueskyOAuthFetch = createBlueskyOAuthFetch((...args) => globalThis.fetch(...args));
