import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { MisskeyNote } from "@shared/types/misskey";
import type { InstanceStore } from "@shared/types/store";
import { useStore } from ".";
import { useMisskeyStore } from "./misskey";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke: invoke, ipcSend: vi.fn() }));
vi.mock("./bluesky", () => ({ useBlueskyStore: () => ({}) }));
vi.mock("./mastodon", () => ({ useMastodonStore: () => ({}) }));

const pollNote = (isVoted = false, votes = 2): MisskeyNote =>
  ({
    id: "poll",
    createdAt: "2026-10-05T00:00:00Z",
    text: "Poll",
    reactionEmojis: {},
    reactions: {},
    poll: {
      multiple: false,
      expiresAt: null,
      choices: [
        { text: "A", votes, isVoted },
        { text: "B", votes: 0, isVoted: false },
      ],
    },
  }) as MisskeyNote;
const failure = { ok: false, error: { type: "http", status: 403, message: "Forbidden" } };
function setup() {
  const root = useStore();
  root.users = ["alice", "bob"].map((id) => ({
    id,
    name: id,
    instanceId: "instance",
    token: `${id}-fixture`,
    avatarUrl: "",
  }));
  root.instances = [
    { id: "instance", type: "misskey", url: "https://misskey.example", name: "Misskey" },
  ] as InstanceStore[];
  root.timelines = ["alice-home", "alice-list", "bob-home"].map((id, index) => ({
    id,
    userId: index === 2 ? "bob" : "alice",
    channel: "misskey:homeTimeline",
    available: index === 0,
    options: {},
    updateInterval: 60_000,
    posts: [pollNote()],
    notifications: [],
    pendingNewPosts: [],
    readmoreLocked: false,
  }));
  const note = root.timelines[0].posts[0] as MisskeyNote;
  return {
    root,
    store: useMisskeyStore(),
    note,
    params: { note, choice: 0, userId: "alice", instanceUrl: "https://misskey.example" },
  };
}
beforeEach(() => {
  setActivePinia(createPinia());
  invoke.mockReset();
});

describe("Misskey poll votes", () => {
  it("uses authoritative votes and syncs same-account copies, nested Renotes, notifications and pending posts", async () => {
    const { root, store, params } = setup();
    const nested = { ...pollNote(), id: "renote", poll: null, renote: pollNote() } as MisskeyNote;
    root.timelines[1].posts.push(nested);
    root.timelines[1].pendingNewPosts.push(pollNote());
    root.timelines[1].notifications = [{ type: "pollEnded", note: pollNote() } as any];
    invoke.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true, data: pollNote(true, 9) });
    expect(await store.voteInPoll(params)).toBe(true);
    expect(invoke.mock.calls[0][1]).toEqual({
      method: "misskey:voteInPoll",
      instanceUrl: params.instanceUrl,
      token: "alice-fixture",
      noteId: "poll",
      choice: 0,
    });
    for (const timeline of root.timelines.slice(0, 2))
      expect((timeline.posts[0] as MisskeyNote).poll?.choices[0]).toMatchObject({ votes: 9, isVoted: true });
    expect(nested.renote?.poll?.choices[0].votes).toBe(9);
    expect((root.timelines[1].pendingNewPosts[0] as MisskeyNote).poll?.choices[0].votes).toBe(9);
    expect((root.timelines[1].notifications[0] as any).note.poll.choices[0].votes).toBe(9);
    expect((root.timelines[2].posts[0] as MisskeyNote).poll?.choices[0]).toMatchObject({ votes: 2, isVoted: false });
  });
  it("keeps pending votes unmodified, blocks duplicate choices and binds delayed results to the original account", async () => {
    const { root, store, params } = setup();
    let resolve!: (value: unknown) => void;
    invoke.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const task = store.voteInPoll(params);
    expect(store.isVotingInPoll("alice", "poll")).toBe(true);
    expect(params.note.poll?.choices[0].isVoted).toBe(false);
    expect(await store.voteInPoll({ ...params, choice: 1 })).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(1);
    root.timelines[0].available = false;
    root.timelines[2].available = true;
    invoke.mockResolvedValueOnce({ ok: true, data: pollNote(true, 3) });
    resolve({ ok: true });
    expect(await task).toBe(true);
    expect(invoke.mock.calls[1][1].token).toBe("alice-fixture");
    expect((root.timelines[2].posts[0] as MisskeyNote).poll?.choices[0].isVoted).toBe(false);
    expect(store.isVotingInPoll("alice", "poll")).toBe(false);
  });
  it("does not apply a delayed vote after the stored credentials have changed", async () => {
    const { root, store, params } = setup();
    let resolve!: (value: unknown) => void;
    invoke.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const task = store.voteInPoll(params);
    root.users[0].token = "replacement";
    invoke.mockResolvedValueOnce({ ok: true, data: pollNote(true, 3) });
    resolve({ ok: true });
    expect(await task).toBe(false);
    expect(params.note.poll?.choices[0].isVoted).toBe(false);
  });
  it("recognizes a server-confirmed vote after an error and suppresses the stale error", async () => {
    const { root, store, params } = setup();
    invoke.mockResolvedValueOnce(failure).mockResolvedValueOnce({ ok: true, data: pollNote(true, 3) });
    expect(await store.voteInPoll(params)).toBe(true);
    expect(root.errors).toEqual([]);
  });
  it("preserves an unconfirmed vote after failure and allows retry", async () => {
    const { root, store, params } = setup();
    invoke.mockResolvedValueOnce(failure).mockResolvedValueOnce({ ok: true, data: pollNote() });
    expect(await store.voteInPoll(params)).toBe(false);
    expect(params.note.poll?.choices[0]).toMatchObject({ votes: 2, isVoted: false });
    expect(root.errors).toHaveLength(1);
    invoke.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true, data: pollNote(true, 3) });
    expect(await store.voteInPoll(params)).toBe(true);
  });
  it.each(["unavailable", "throw", "stale"])(
    "retains a confirmed 204 after a %s follow-up without double-counting",
    async (read) => {
      const { store, params } = setup();
      invoke.mockResolvedValueOnce({ ok: true });
      if (read === "throw") invoke.mockRejectedValueOnce(new Error("offline"));
      else invoke.mockResolvedValueOnce(read === "stale" ? { ok: true, data: pollNote(false, 3) } : failure);
      expect(await store.voteInPoll(params)).toBe(true);
      expect(params.note.poll?.choices[0]).toMatchObject({ votes: 3, isVoted: true });
      expect(await store.voteInPoll(params)).toBe(false);
      expect(invoke).toHaveBeenCalledTimes(2);
    },
  );
  it("permits an additional choice on a multiple poll but never repeats a voted choice", async () => {
    const { store, params } = setup();
    params.note.poll = { ...pollNote(true).poll!, multiple: true };
    const server = {
      ...pollNote(true),
      poll: {
        ...params.note.poll,
        choices: [
          { text: "A", votes: 2, isVoted: true },
          { text: "B", votes: 1, isVoted: true },
        ],
      },
    };
    invoke.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true, data: server });
    expect(await store.voteInPoll({ ...params, choice: 1 })).toBe(true);
    expect(await store.voteInPoll({ ...params, choice: 1 })).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
  it.each([-1, 0.5, 2])("blocks invalid choice %s locally", async (choice) => {
    const { store, params } = setup();
    expect(await store.voteInPoll({ ...params, choice })).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
  it("blocks expired polls and mismatched accounts or instances without sending", async () => {
    const { store, params } = setup();
    params.note.poll!.expiresAt = new Date(Date.now() - 1).toISOString();
    expect(await store.voteInPoll(params)).toBe(false);
    expect(await store.voteInPoll({ ...params, userId: "missing" })).toBe(false);
    expect(await store.voteInPoll({ ...params, instanceUrl: "https://other.example" })).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});
