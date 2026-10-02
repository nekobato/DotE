import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { effectScope, ref, type EffectScope } from "vue";
import { useStream } from "@/composables/useStream";
import type { MisskeyNote } from "@shared/types/misskey";
import type { InstanceStore } from "@shared/types/store";
import { useStore } from ".";
import { useMisskeyStore } from "./misskey";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke: invoke, ipcSend: vi.fn() }));
vi.mock("./bluesky", () => ({ useBlueskyStore: () => ({}) }));
vi.mock("./mastodon", () => ({ useMastodonStore: () => ({}) }));
vi.mock("@/utils/misskeyStream", () => ({ useMisskeyStream: () => ({ state: ref("closed") }) }));
vi.mock("@/utils/mastodonStream", () => ({ useMastodonStream: () => ({}) }));
vi.mock("@/utils/polling", () => ({
  useMisskeyPolling: () => ({}),
  useMastodonPolling: () => ({}),
  useBlueskyPolling: () => ({}),
}));
vi.mock("./misskeyTimelineConnection", () => ({ useMisskeyTimelineConnectionStore: () => ({ isWebSocket: false }) }));
vi.mock("@/utils/text2Speech", () => ({ text2Speech: vi.fn() }));

let streamScope: EffectScope | undefined;
afterEach(() => {
  streamScope?.stop();
  streamScope = undefined;
  vi.unstubAllGlobals();
});

function setup(content: Partial<MisskeyNote>, reacted = false) {
  const root = useStore();
  root.instances = [
    { id: "instance", type: "misskey", url: "https://misskey.example", name: "Misskey" },
  ] as InstanceStore[];
  root.users = [{ id: "user", instanceId: "instance", token: "test", name: "test", avatarUrl: "" }];
  const reactions: MisskeyNote["reactions"] = reacted ? { "👍": 1 } : {};
  const note = {
    createdAt: "2026-10-01T00:00:00.000Z",
    userId: "author",
    user: { id: "author", username: "author", name: "Author" } as MisskeyNote["user"],
    visibility: "public" as const,
    reactionAcceptance: null,
    reactionCount: reacted ? 1 : 0,
    repliesCount: 0,
    renoteCount: 0,
    text: null,
    cw: null,
    replyId: null,
    fileIds: [],
    poll: null,
    reactions,
    reactionEmojis: {},
    myReaction: reacted ? "👍" : null,
  };
  const original = {
    ...note,
    reactions: { ...reactions },
    id: "original",
    renoteId: null,
    text: "Original",
  } as MisskeyNote;
  const post = {
    ...note,
    reactions: { ...reactions },
    id: "shared",
    renoteId: "original",
    renote: original,
    ...content,
  } as MisskeyNote;
  root.timelines = [
    {
      id: "home",
      userId: "user",
      channel: "misskey:homeTimeline",
      options: {},
      available: true,
      updateInterval: 60000,
      posts: [post],
      notifications: [],
      pendingNewPosts: [],
      readmoreLocked: false,
    },
  ];
  return { root, store: useMisskeyStore(), post: root.timelines[0].posts[0] as MisskeyNote };
}

beforeEach(() => {
  setActivePinia(createPinia());
  invoke.mockReset().mockResolvedValue({ ok: true });
});

const cases: [string, Partial<MisskeyNote>, string][] = [
  ["pure Renote", {}, "original"],
  ["text quote", { text: "Comment" }, "shared"],
  ["CW-only quote", { cw: "Spoiler" }, "shared"],
  ["attachment-only quote", { fileIds: ["image"] }, "shared"],
  ["poll-only quote", { poll: { multiple: false, choices: [{ text: "Yes", votes: 0, isVoted: false }] } }, "shared"],
];

describe("Misskey reaction API targets for Renotes and quotes", () => {
  it.each(cases)("creates a reaction on the displayed %s", async (_label, content, targetId) => {
    const { root, store, post } = setup(content);
    expect(await store.createMyReaction(post.id, "👍")).toBe(true);
    expect(invoke).toHaveBeenCalledExactlyOnceWith("api", {
      method: "misskey:createReaction",
      instanceUrl: "https://misskey.example",
      token: "test",
      noteId: targetId,
      reaction: "👍",
    });
    const target = targetId === "original" ? post.renote! : post;
    const other = targetId === "original" ? post : post.renote!;
    expect(target.myReaction).toBe("👍");
    expect(target.reactions["👍"]).toBe(1);
    expect(other.myReaction).toBeNull();
    expect(other.reactions["👍"]).toBeUndefined();
    expect(root.errors).toEqual([]);
  });

  it.each(cases)("deletes a reaction from the displayed %s", async (_label, content, targetId) => {
    const { store, post } = setup(content, true);
    expect(await store.deleteMyReaction(post.id)).toBe(true);
    expect(invoke).toHaveBeenCalledExactlyOnceWith("api", {
      method: "misskey:deleteReaction",
      instanceUrl: "https://misskey.example",
      token: "test",
      noteId: targetId,
    });
    const target = targetId === "original" ? post.renote! : post;
    const other = targetId === "original" ? post : post.renote!;
    expect(target.myReaction).toBeUndefined();
    expect(target.reactions["👍"]).toBeUndefined();
    expect(other.myReaction).toBe("👍");
    expect(other.reactions["👍"]).toBe(1);
  });
});

describe("Misskey reactions dispatched through the timeline IPC handler", () => {
  const clickCases = cases.flatMap(([label, content, targetId]) =>
    (["create", "delete", "replace"] as const).map((operation) => ({ label, content, targetId, operation })),
  );

  it.each(clickCases)(
    "$operation on $label affects only the displayed note",
    async ({ content, targetId, operation }) => {
      const { post } = setup(content, operation !== "create");
      const target = targetId === "original" ? post.renote! : post;
      const other = targetId === "original" ? post : post.renote!;
      const reactionState = (note: MisskeyNote) => ({ myReaction: note.myReaction, reactions: { ...note.reactions } });
      const otherBefore = reactionState(other);
      const handlers = new Map<string, (event: unknown, data: { postId: string; reaction: string }) => void>();
      vi.stubGlobal("window", {
        ipc: {
          on: (channel: string, handler: (event: unknown, data: { postId: string; reaction: string }) => void) => {
            handlers.set(channel, handler);
            return () => handlers.delete(channel);
          },
        },
      });
      streamScope = effectScope();
      streamScope.run(() => useStream().setupIpcHandlers());
      handlers.get("main:reaction")!(undefined, { postId: post.id, reaction: operation === "replace" ? "😎" : "👍" });
      // Drain the handler's promise queue and its mocked API responses.
      await new Promise<void>((resolve) => setImmediate(resolve));

      const methods =
        operation === "replace"
          ? ["misskey:deleteReaction", "misskey:createReaction"]
          : [operation === "delete" ? "misskey:deleteReaction" : "misskey:createReaction"];
      expect(invoke.mock.calls.map(([, payload]) => payload.method)).toEqual(methods);
      expect(invoke.mock.calls.every(([, payload]) => payload.noteId === targetId)).toBe(true);
      expect(target.myReaction).toBe(operation === "delete" ? undefined : operation === "replace" ? "😎" : "👍");
      expect(reactionState(other)).toEqual(otherBefore);
    },
  );
});
