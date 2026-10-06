import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  misskeyAddNoteToClip,
  misskeyFavoriteNote,
  misskeyGetClips,
  misskeyGetNoteState,
  misskeyMuteThread,
  misskeyUnfavoriteNote,
  misskeyUnmuteThread,
  misskeyUnrenote,
} from "./misskey-note-management";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("electron-fetch", () => ({ default: fetch }));
const params = { instanceUrl: "https://misskey.example", token: "fixture", noteId: "original" };
beforeEach(() => {
  fetch.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
});

describe("Misskey note management API contracts", () => {
  it.each([
    [misskeyFavoriteNote, "notes/favorites/create"],
    [misskeyUnfavoriteNote, "notes/favorites/delete"],
    [misskeyMuteThread, "notes/thread-muting/create"],
    [misskeyUnmuteThread, "notes/thread-muting/delete"],
    [misskeyUnrenote, "notes/unrenote"],
  ] as const)("accepts empty 204 for %s at %s", async (request, endpoint) => {
    await expect(request(params)).resolves.toBeUndefined();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${params.instanceUrl}/api/${endpoint}`);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ i: "fixture", noteId: "original" });
  });

  it("reads account-specific favorite and thread mute state", async () => {
    const state = { isFavorited: true, isMutedThread: false };
    fetch.mockResolvedValue(Response.json(state));
    await expect(misskeyGetNoteState(params)).resolves.toEqual(state);
    expect(fetch.mock.calls[0][0]).toBe(`${params.instanceUrl}/api/notes/state`);
  });

  it("paginates owned clips with the requested limit and cursor", async () => {
    fetch.mockResolvedValue(Response.json([]));
    await misskeyGetClips({ ...params, limit: 50, untilId: "clip-50" });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${params.instanceUrl}/api/clips/list`);
    expect(JSON.parse(options.body)).toEqual({ i: "fixture", limit: 50, untilId: "clip-50" });
  });

  it("adds the note to the selected clip using an empty 204 response", async () => {
    await expect(misskeyAddNoteToClip({ ...params, clipId: "clip" })).resolves.toBeUndefined();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ i: "fixture", noteId: "original", clipId: "clip" });
  });

  it.each([0, 101, 1.5])("rejects invalid clip limit %s before networking", (limit) => {
    expect(() => misskeyGetClips({ ...params, limit })).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects missing targets before networking", () => {
    expect(() => misskeyFavoriteNote({ ...params, noteId: " " })).toThrow();
    expect(() => misskeyAddNoteToClip({ ...params, clipId: "" })).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves unsupported API and permission errors for graceful fallback", async () => {
    fetch.mockResolvedValue(Response.json({ error: { code: "NO_SUCH_ENDPOINT" } }, { status: 404 }));
    await expect(misskeyUnrenote(params)).rejects.toMatchObject({ details: { type: "http", status: 404 } });
    fetch.mockResolvedValue(Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403 }));
    await expect(misskeyFavoriteNote(params)).rejects.toMatchObject({ details: { type: "http", status: 403 } });
  });
});
