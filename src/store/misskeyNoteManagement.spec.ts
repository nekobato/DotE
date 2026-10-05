import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useStore, type TimelineStore } from ".";
import type { InstanceStore } from "@shared/types/store";
import type { MisskeyNote } from "@shared/types/misskey";
import type { MisskeyClip } from "@shared/misskey-note-management";
import { useMisskeyNoteManagementStore } from "./misskeyNoteManagement";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke: invoke, ipcSend: vi.fn() }));
const params = { userId: "alice", instanceUrl: "https://misskey.example", noteId: "original" };
const state = { isFavorited: false, isMutedThread: false };
const fail = (code = "FAILED", status = 503) => ({
  ok: false,
  error: { type: "http", status, bodyPreview: JSON.stringify({ error: { code } }) },
});
const clip = (id = "clip") => ({ id, name: id, isPublic: false }) as MisskeyClip;

beforeEach(() => {
  setActivePinia(createPinia());
  invoke.mockReset().mockResolvedValue({ ok: true, data: { ...state } });
});
const setup = () => {
  const root = useStore();
  root.instances = [{ id: "instance", type: "misskey", url: params.instanceUrl }] as InstanceStore[];
  root.users = ["alice", "bob"].map((id) => ({
    id,
    name: id,
    instanceId: "instance",
    token: `${id}-fixture`,
    avatarUrl: "",
  }));
  const store = useMisskeyNoteManagementStore();
  return { root, store, entry: store.entryFor(params)! };
};
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("Misskey account-bound post management", () => {
  it("reads state using the initiating account and keeps other accounts separate", async () => {
    const { store, entry } = setup();
    await store.loadState(params);
    expect(invoke).toHaveBeenCalledWith(
      "api",
      expect.objectContaining({ method: "misskey:getNoteState", token: "alice-fixture", noteId: "original" }),
    );
    expect(entry.state).toEqual(state);
    expect(store.entryFor({ ...params, userId: "bob" })?.state).toBeUndefined();
  });

  it("keeps the old state during a request, blocks duplicates, and applies a successful empty response", async () => {
    const { store, entry } = setup();
    await store.loadState(params);
    const pending = deferred();
    invoke.mockReset().mockReturnValueOnce(pending.promise);
    const task = store.setState(params, "favorite", true);
    expect(entry.busy).toBe(true);
    expect(entry.state?.isFavorited).toBe(false);
    expect(await store.setState(params, "favorite", true)).toBe(false);
    pending.resolve({ ok: true });
    expect(await task).toBe(true);
    expect(entry.state?.isFavorited).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it.each(["favorite", "mute"] as const)("can enable and disable %s", async (operation) => {
    const { store, entry } = setup();
    await store.loadState(params);
    invoke.mockReset().mockResolvedValue({ ok: true });
    expect(await store.setState(params, operation, true)).toBe(true);
    expect(await store.setState(params, operation, false)).toBe(true);
    const field = operation === "favorite" ? "isFavorited" : "isMutedThread";
    expect(entry.state?.[field]).toBe(false);
    expect(invoke.mock.calls.map((call) => call[1].method)).toEqual(
      operation === "favorite"
        ? ["misskey:favoriteNote", "misskey:unfavoriteNote"]
        : ["misskey:muteThread", "misskey:unmuteThread"],
    );
  });

  it("recognizes an already applied server state after a rejected mutation", async () => {
    const { store, entry } = setup();
    await store.loadState(params);
    invoke
      .mockReset()
      .mockResolvedValueOnce(fail("ALREADY_FAVORITED", 400))
      .mockResolvedValueOnce({ ok: true, data: { ...state, isFavorited: true } });
    expect(await store.setState(params, "favorite", true)).toBe(true);
    expect(entry.state?.isFavorited).toBe(true);
    expect(entry.error).toBe("");
  });

  it("preserves a rejected mutation and permits a retry", async () => {
    const { store, entry } = setup();
    await store.loadState(params);
    invoke.mockReset().mockResolvedValueOnce(fail()).mockResolvedValueOnce({ ok: true, data: state });
    expect(await store.setState(params, "favorite", true)).toBe(false);
    expect(entry.state?.isFavorited).toBe(false);
    expect(entry.error).toContain("失敗");
    invoke.mockResolvedValue({ ok: true });
    expect(await store.setState(params, "favorite", true)).toBe(true);
    expect(entry.error).toBe("");
  });

  it("does not reuse cached state or a delayed response after credentials change", async () => {
    const { root, store, entry } = setup();
    await store.loadState(params);
    const pending = deferred();
    invoke.mockReturnValueOnce(pending.promise);
    const task = store.setState(params, "favorite", true);
    root.users[0].token = "new-fixture";
    const replacement = store.entryFor(params)!;
    pending.resolve({ ok: true });
    expect(await task).toBe(false);
    expect(replacement.state).toBeUndefined();
    expect(entry.state?.isFavorited).toBe(false);
  });

  it("blocks mismatched instances, missing accounts and unknown state before mutations", async () => {
    const { store } = setup();
    expect(await store.setState(params, "favorite", true)).toBe(false);
    expect(await store.loadState({ ...params, instanceUrl: "https://other.example" })).toBe(false);
    expect(await store.loadState({ ...params, userId: "missing" })).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("disables unsupported mutations and exposes permission failures without inventing state", async () => {
    const { store, entry } = setup();
    invoke.mockResolvedValueOnce(fail("ACCESS_DENIED", 403));
    expect(await store.loadState(params)).toBe(false);
    expect(entry.state).toBeUndefined();
    expect(entry.error).toContain("権限");
    invoke.mockResolvedValueOnce({ ok: true, data: state });
    await store.loadState(params);
    invoke.mockResolvedValueOnce(fail("NO_SUCH_ENDPOINT", 404)).mockResolvedValueOnce({ ok: true, data: state });
    expect(await store.setState(params, "favorite", true)).toBe(false);
    expect(entry.unsupported).toContain("favorite");
    invoke.mockClear();
    expect(await store.setState(params, "favorite", true)).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("re-reads state after a thread mute rather than assigning guessed thread ids", async () => {
    const { store } = setup();
    await store.loadState(params);
    const another = { ...params, noteId: "reply" };
    await store.loadState(another);
    invoke.mockResolvedValue({ ok: true });
    await store.setState(params, "mute", true);
    expect(store.entryFor(another)?.state).toBeUndefined();
    expect(store.entryFor({ ...another, userId: "bob" })?.state).toBeUndefined();
  });

  it("paginates clips without duplicates and stops on an older unpaginated response", async () => {
    const { store, entry } = setup();
    const page = Array.from({ length: 50 }, (_, i) => clip(`clip-${i}`));
    invoke.mockResolvedValueOnce({ ok: true, data: page });
    await store.loadClips(params);
    expect(entry.clipsHasMore).toBe(true);
    invoke.mockResolvedValueOnce({ ok: true, data: [clip("clip-49"), clip("last")] });
    await store.loadClips(params, true);
    expect(invoke.mock.calls[1][1].untilId).toBe("clip-49");
    expect(entry.clips).toHaveLength(51);
    expect(entry.clipsHasMore).toBe(false);
    invoke.mockResolvedValueOnce({ ok: true, data: [...page, clip("legacy")] });
    await store.loadClips(params);
    expect(entry.clipsHasMore).toBe(false);
  });

  it("stops when an old server ignores a cursor and repeats the same fifty clips", async () => {
    const { store, entry } = setup();
    invoke.mockResolvedValue({ ok: true, data: Array.from({ length: 50 }, (_, i) => clip(`clip-${i}`)) });
    await store.loadClips(params);
    await store.loadClips(params, true);
    expect(entry.clips).toHaveLength(50);
    expect(entry.clipsHasMore).toBe(false);
  });

  it("keeps loaded clip choices after a failed page and does not add unknown clips", async () => {
    const { store, entry } = setup();
    invoke.mockResolvedValueOnce({ ok: true, data: [clip()] });
    await store.loadClips(params);
    invoke.mockResolvedValueOnce(fail());
    expect(await store.loadClips(params)).toBe(false);
    expect(entry.clips).toHaveLength(1);
    invoke.mockClear();
    expect(await store.addToClip(params, "foreign-clip")).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each([true, false])("handles a successful or already clipped addition: %s", async (accepted) => {
    const { store, entry } = setup();
    invoke.mockResolvedValueOnce({ ok: true, data: [clip()] });
    await store.loadClips(params);
    invoke.mockReset().mockResolvedValue(accepted ? { ok: true } : fail("ALREADY_CLIPPED", 400));
    expect(await store.addToClip(params, "clip")).toBe(true);
    expect(entry.clippedIds).toEqual(["clip"]);
    expect(await store.addToClip(params, "clip")).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("retains the selected clip after a rejected addition and allows retry", async () => {
    const { store, entry } = setup();
    invoke.mockResolvedValueOnce({ ok: true, data: [clip()] });
    await store.loadClips(params);
    invoke.mockResolvedValueOnce(fail());
    expect(await store.addToClip(params, "clip")).toBe(false);
    expect(entry.clippedIds).toEqual([]);
    expect(entry.clips).toHaveLength(1);
    invoke.mockResolvedValueOnce({ ok: true });
    expect(await store.addToClip(params, "clip")).toBe(true);
  });
});

describe("Misskey unrenote scope", () => {
  const timelines = () => {
    const note = (id: string, userId: string, renoteId: string | null, text: string | null = null) =>
      ({ id, userId, renoteId, text, reactionEmojis: {}, renoteCount: 4 }) as MisskeyNote;
    const posts = [
      note("original", "author", null),
      note("mine", "remote-alice", "original"),
      note("quote", "remote-alice", "original", "Comment"),
      note("other", "remote-bob", "original"),
      note("unrelated", "remote-alice", "another"),
    ];
    return ["alice", "bob"].map(
      (userId) =>
        ({
          userId,
          posts: structuredClone(posts),
          pendingNewPosts: [note("pending-quote", "remote-alice", "original", "Later")],
          notifications: [],
        }) as unknown as TimelineStore,
    );
  };

  it("removes the authenticated account's Renotes and quotes while preserving the original and other accounts", async () => {
    const { root, store } = setup();
    root.timelines = timelines();
    invoke
      .mockResolvedValueOnce({ ok: true, data: { id: "remote-alice" } })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, data: { id: "original", reactionEmojis: {}, renoteCount: 2 } });
    expect(await store.unrenote(params)).toBe(true);
    expect(root.timelines[0].posts.map((post) => (post as MisskeyNote).id)).toEqual(["original", "other", "unrelated"]);
    expect(root.timelines[0].pendingNewPosts).toEqual([]);
    expect(root.timelines[1].posts).toHaveLength(5);
    expect(root.timelines[1].pendingNewPosts).toHaveLength(1);
    expect(invoke.mock.calls[1][1]).toMatchObject({
      method: "misskey:unrenote",
      noteId: "original",
      token: "alice-fixture",
    });
  });

  it("does not remove any post when unrenote is rejected", async () => {
    const { root, store, entry } = setup();
    root.timelines = timelines();
    invoke
      .mockResolvedValueOnce({ ok: true, data: { id: "remote-alice" } })
      .mockResolvedValueOnce(fail("ACCESS_DENIED", 403));
    expect(await store.unrenote(params)).toBe(false);
    expect(root.timelines[0].posts).toHaveLength(5);
    expect(entry.error).toContain("権限");
  });

  it("keeps an accepted unrenote even if the follow-up read fails", async () => {
    const { root, store } = setup();
    root.timelines = timelines();
    invoke
      .mockResolvedValueOnce({ ok: true, data: { id: "remote-alice" } })
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("offline"));
    expect(await store.unrenote(params)).toBe(true);
    expect(root.timelines[0].posts).toHaveLength(3);
  });

  it("stops before unrenote if the identity read belongs to replaced credentials", async () => {
    const { root, store } = setup();
    const pending = deferred();
    invoke.mockReturnValueOnce(pending.promise);
    const task = store.unrenote(params);
    root.users[0].token = "replacement";
    pending.resolve({ ok: true, data: { id: "remote-alice" } });
    expect(await task).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
