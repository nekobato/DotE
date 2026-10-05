import { beforeEach, describe, expect, it, vi } from "vitest";
import { misskeyCreateNote, misskeyVoteInPoll } from "./misskey";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("electron-fetch", () => ({ default: fetch }));
const account = { instanceUrl: "https://misskey.example", token: "fixture" };
beforeEach(() => fetch.mockReset().mockResolvedValue({ ok: true, status: 204, headers: new Headers() }));

describe("Misskey poll API", () => {
  it("sends an authenticated vote using a zero-based choice and accepts 204", async () => {
    await expect(misskeyVoteInPoll({ ...account, noteId: "poll", choice: 0 })).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://misskey.example/api/notes/polls/vote",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ i: "fixture", noteId: "poll", choice: 0 }),
      }),
    );
  });
  it.each([-1, 0.5, NaN])("rejects an invalid choice before sending: %s", async (choice) => {
    await expect(misskeyVoteInPoll({ ...account, noteId: "poll", choice })).rejects.toThrow("選択肢");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("creates a textless poll while preserving reply, quote, media and visibility arguments", async () => {
    const createdNote = { id: "created" };
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ createdNote }),
    });
    const result = await misskeyCreateNote({
      ...account,
      text: null,
      cw: "注意",
      replyId: "parent",
      renoteId: "quoted",
      fileIds: ["image"],
      visibility: "home",
      localOnly: true,
      poll: { choices: [" A ", "B"], multiple: true, expiredAfter: 300_000 },
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      i: "fixture",
      text: null,
      cw: "注意",
      replyId: "parent",
      renoteId: "quoted",
      fileIds: ["image"],
      visibility: "home",
      localOnly: true,
      poll: { choices: ["A", "B"], multiple: true, expiredAfter: 300_000 },
    });
    expect(result).toEqual({ createdNote });
  });
  it("does not publish an invalid poll", async () => {
    await expect(
      misskeyCreateNote({ ...account, text: "Text", cw: null, poll: { choices: ["A", "A"] } }),
    ).rejects.toThrow("重複");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("propagates a rejected vote instead of treating it as success", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      headers: new Headers({ "content-type": "application/json" }),
      clone: () => ({ text: async () => JSON.stringify({ error: { code: "PERMISSION_DENIED" } }) }),
    });
    await expect(misskeyVoteInPoll({ ...account, noteId: "poll", choice: 1 })).rejects.toThrow("403");
  });
});
