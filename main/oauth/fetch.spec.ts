import { describe, expect, it, vi } from "vitest";
import { OAuthClient } from "@atproto/oauth-client";
import {
  createBlueskyOAuthFetch,
  OAUTH_JSON_MAX_BYTES,
  OAUTH_JSON_MAX_COLLECTION,
  OAUTH_JSON_MAX_DEPTH,
} from "./fetch";

const jsonResponse = (data: unknown) => Response.json(data);
const fixture = {
  client_id: "https://client.example/metadata.json" as const,
  redirect_uris: ["https://client.example/callback"],
  response_types: ["code"],
  grant_types: ["authorization_code", "refresh_token"],
  scope: "atproto transition:generic",
  token_endpoint_auth_method: "none",
};

describe("Bluesky SDK JSON input budget", () => {
  it("keeps ordinary metadata valid through the real SDK and forwards request options unchanged", async () => {
    const rawFetch = vi.fn<typeof globalThis.fetch>(async () => jsonResponse(fixture));
    const guarded = createBlueskyOAuthFetch(rawFetch);
    const controller = new AbortController();
    const metadata = await OAuthClient.fetchMetadata({
      clientId: fixture.client_id,
      fetch: guarded,
      signal: controller.signal,
    });
    expect(metadata.redirect_uris).toEqual(fixture.redirect_uris);
    const [request] = rawFetch.mock.calls[0];
    if (!(request instanceof Request)) throw new Error("SDK metadata request must preserve its Request object");
    expect(request.url).toBe(fixture.client_id);
    expect(request.redirect).toBe("error");
    controller.abort();
    expect(request.signal.aborted).toBe(true);
  });

  it("rejects a small-byte attack with thousands of invalid array elements before SDK schema validation", async () => {
    const metadata = { ...fixture, redirect_uris: Array(OAUTH_JSON_MAX_COLLECTION + 1).fill(0) };
    const guarded = createBlueskyOAuthFetch(async () => jsonResponse(metadata));
    await expect(OAuthClient.fetchMetadata({ clientId: fixture.client_id, fetch: guarded })).rejects.toThrow(
      RangeError,
    );
  });

  it.each([undefined, "1"])("counts streamed bytes even when Content-Length is %s", async (length) => {
    const cancelled = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(OAUTH_JSON_MAX_BYTES));
        controller.enqueue(new Uint8Array(1));
      },
      cancel: cancelled,
    });
    const response = new Response(stream, { headers: length ? { "content-length": length } : undefined });
    const guarded = createBlueskyOAuthFetch(async () => response);
    await expect((await guarded("https://server.example")).json()).rejects.toThrow("response is too large");
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it("protects clones without waiting for their unread tee sibling to finish", async () => {
    const guarded = createBlueskyOAuthFetch(async () => new Response(new Uint8Array(OAUTH_JSON_MAX_BYTES + 1)));
    const response = await guarded("https://server.example");
    await expect(response.clone().json()).rejects.toThrow("response is too large");
    expect(response.bodyUsed).toBe(false);
    await response.body?.cancel();
  });

  it("rejects deep trees, oversized objects, and aggregate nested collections", async () => {
    let deep: unknown = null;
    for (let i = 0; i <= OAUTH_JSON_MAX_DEPTH; i++) deep = { next: deep };
    const wide = Object.fromEntries(Array.from({ length: OAUTH_JSON_MAX_COLLECTION + 1 }, (_, i) => [`key${i}`, i]));
    const aggregate = Array.from({ length: 8 }, () => Array(2500).fill(0));
    for (const value of [deep, wide, aggregate]) {
      const guarded = createBlueskyOAuthFetch(async () => jsonResponse(value));
      await expect((await guarded("https://server.example")).json()).rejects.toThrow(RangeError);
    }
  });

  it("preserves nonce/auth headers, native Response metadata and consumed-body errors", async () => {
    const raw = new Response('{"ok":true}', {
      status: 401,
      headers: { "dpop-nonce": "nonce", "www-authenticate": "DPoP" },
    });
    Object.defineProperties(raw, { url: { value: "https://issuer.example/token" }, redirected: { value: true } });
    const rawFetch = vi.fn(async () => raw);
    const guarded = createBlueskyOAuthFetch(rawFetch);
    const request = new Request("https://issuer.example/token");
    const options = { method: "POST", headers: { DPoP: "proof" }, body: "grant_type=refresh_token" };
    const response = await guarded(request, options);
    expect(rawFetch).toHaveBeenCalledWith(request, options);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(401);
    expect(response.url).toBe(raw.url);
    expect(response.redirected).toBe(true);
    expect(response.type).toBe(raw.type);
    expect(response.headers.get("dpop-nonce")).toBe("nonce");
    expect(response.headers.get("www-authenticate")).toBe("DPoP");
    expect(await response.json()).toEqual({ ok: true });
    expect(response.bodyUsed).toBe(true);
    await expect(response.json()).rejects.toThrow(TypeError);
  });

  it("keeps large XRPC/media arrayBuffer reads and upload bodies unchanged", async () => {
    const body = new Uint8Array(OAUTH_JSON_MAX_BYTES + 1);
    const rawFetch = vi.fn(async () => new Response(body));
    const guarded = createBlueskyOAuthFetch(rawFetch);
    const options = { method: "POST", body };
    const response = await guarded("https://pds.example/xrpc/com.atproto.repo.uploadBlob", options);
    expect(rawFetch).toHaveBeenCalledWith("https://pds.example/xrpc/com.atproto.repo.uploadBlob", options);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
  });
});
