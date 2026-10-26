import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import metadata from "../../public/bluesky-client-metadata.json";
import { getBlueskyOAuthClient, resetCachedBlueskyClient } from "./client";
import { blueskyOAuthFetch, OAUTH_JSON_MAX_COLLECTION } from "./fetch";

vi.mock("../db", () => ({
  getBlueskyOAuthConfig: () => ({
    clientId: metadata.client_id,
    redirectUri: metadata.redirect_uris[0],
    scope: metadata.scope,
  }),
  getBlueskyLoopbackRedirectUri: () => "http://127.0.0.1:3000/oauth/callback",
  getBlueskyOAuthSession: vi.fn(),
  setBlueskyOAuthSession: vi.fn(),
  deleteBlueskyOAuthSession: vi.fn(),
}));
vi.mock("electron-log", () => ({ default: { info: vi.fn(), warn: vi.fn() } }));

beforeEach(() => resetCachedBlueskyClient());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Bluesky OAuth client fetch boundary", () => {
  it("uses the same protected fetch for initial metadata and all SDK client/resolver requests", async () => {
    const fetchMetadata = vi.spyOn(NodeOAuthClient, "fetchMetadata");
    const fetch = vi.fn(async () => Response.json(metadata));
    vi.stubGlobal("fetch", fetch);
    const client = await getBlueskyOAuthClient();
    expect(fetchMetadata).toHaveBeenCalledWith({ clientId: metadata.client_id, fetch: blueskyOAuthFetch });
    expect(client.fetch).toBe(blueskyOAuthFetch);
    expect(client.clientMetadata.redirect_uris).toEqual(metadata.redirect_uris);
    expect(await getBlueskyOAuthClient()).toBe(client);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects oversized metadata before creating or caching a client", async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        ...metadata,
        redirect_uris: Array(OAUTH_JSON_MAX_COLLECTION + 1).fill(0),
      }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(getBlueskyOAuthClient()).rejects.toThrow(RangeError);
    await expect(getBlueskyOAuthClient()).rejects.toThrow(RangeError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
