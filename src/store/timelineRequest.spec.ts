import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { effectScope, type EffectScope } from "vue";
import type { InstanceStore, InstanceType } from "@shared/types/store";
import { useStore, type TimelineStore } from ".";
import { useTimelineStore } from "./timeline";
import { useMastodonStore } from "./mastodon";
import { useMisskeyStore } from "./misskey";
import { useTimelineReadmore } from "@/composables/useTimelineReadmore";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke: invoke }));
const scopes: EffectScope[] = [];
beforeEach(() => {
  setActivePinia(createPinia());
  invoke.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.restoreAllMocks();
});

function setup(type: InstanceType, notifications = false) {
  const root = useStore();
  root.instances = [1, 2].map((id) => ({
    id: String(id),
    type,
    url: `https://${id}.example.test`,
    name: String(id),
  })) as InstanceStore[];
  root.users = ["alice", "bob"].map((id, index) => ({
    id,
    instanceId: String(index + 1),
    token: `${id}-token`,
    name: id,
    avatarUrl: "",
    blueskySession: {
      did: `did:plc:${id}`,
      handle: `${id}.test`,
      pdsUrl: `https://${index + 1}.example.test`,
      authorizationServer: "https://auth.test",
      scope: "atproto",
      tokenType: "DPoP",
      active: true,
    },
  }));
  const feed = (id: string) => ({
    id: `at://did:plc:author/app.bsky.feed.post/${id}`,
    post: {
      uri: `at://did:plc:author/app.bsky.feed.post/${id}`,
      cid: "cid",
      author: { did: "did:plc:author", handle: "author.test" },
      record: { $type: "app.bsky.feed.post", text: id, createdAt: "2026-10-19T00:00:00Z" },
      indexedAt: "2026-10-19T00:00:00Z",
      viewer: {},
    },
  });
  const item = (id: string) =>
    type === "bluesky" ? feed(id) : { id, user: { username: "bob" }, account: { username: "bob" } };
  const notification = {
    id: "notification",
    uri: "at://did:plc:author/app.bsky.feed.post/note",
    cid: "cid",
    reason: "like",
    author: { did: "did:plc:author", handle: "author.test" },
    record: {},
    indexedAt: "2026-10-19T00:00:00Z",
    isRead: false,
  };
  root.timelines = ["alice", "bob"].map((id, index) => ({
    id: `${id}-timeline`,
    userId: id,
    channel: `${type}:${notifications ? "notifications" : "homeTimeline"}`,
    options: {},
    available: index === 0,
    updateInterval: 60000,
    posts: notifications ? [] : [item("existing")],
    notifications: notifications ? [{ ...notification, id: "existing-notification" }] : [],
    pendingNewPosts: [],
    readmoreLocked: false,
    bluesky: { cursor: "initial" },
  })) as TimelineStore[];
  const timeline = useTimelineStore();
  const scope = effectScope();
  scopes.push(scope);
  const pagination = scope.run(() => useTimelineReadmore())!;
  let resolve!: (value: unknown) => void;
  invoke.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const response = notifications ? [notification] : [item("forged-bob-delete-id")];
  const complete = (ok = true) =>
    resolve(
      ok
        ? {
            ok: true,
            data:
              type === "bluesky"
                ? { [notifications ? "notifications" : "feed"]: response, cursor: "response-cursor" }
                : response,
          }
        : { ok: false, error: { message: "old failure" } },
    );
  const diff = () => (type === "mastodon" ? useMastodonStore().fetchDiffPosts() : useMisskeyStore().fetchDiffPosts());
  return { root, timeline, pagination, complete, diff };
}

describe("timeline response provenance", () => {
  it.each(["mastodon", "misskey", "bluesky"] as const)(
    "rejects an initial %s response after the same timeline is reassigned",
    async (type) => {
      const { root, timeline, complete } = setup(type);
      const pending = timeline.fetchInitialPosts();
      root.timelines[0].userId = "bob";
      const before = JSON.stringify(root.timelines);
      complete();
      await pending;
      expect(JSON.stringify(root.timelines)).toBe(before);
    },
  );

  it.each(["mastodon", "misskey"] as const)(
    "discards a %s diff after credentials change without switching timeline IDs",
    async (type) => {
      const { root, complete, diff } = setup(type);
      const pending = diff();
      root.users[0].token = "new-credentials";
      const before = JSON.stringify(root.timelines);
      complete();
      await pending;
      expect(JSON.stringify(root.timelines)).toBe(before);
    },
  );
  it.each(["mastodon", "misskey"] as const)("discards a delayed %s diff after switching accounts", async (type) => {
    const { root, complete, diff } = setup(type);
    const pending = diff();
    root.timelines[0].available = false;
    root.timelines[1].available = true;
    const destination = JSON.stringify(root.timelines[1]);
    complete();
    await pending;
    expect(JSON.stringify(root.timelines[1])).toBe(destination);
    expect(root.errors).toEqual([]);
  });

  it.each(["mastodon", "misskey", "bluesky"] as const)(
    "leaves destination posts, pending queue, cursor and locks unchanged after a delayed %s page",
    async (type) => {
      const { root, pagination, complete } = setup(type);
      const pending = pagination.readmore();
      root.timelines[0].available = false;
      root.timelines[1].available = true;
      const destination = JSON.stringify(root.timelines[1]);
      complete();
      await pending;
      expect(JSON.stringify(root.timelines[1])).toBe(destination);
      expect(root.errors).toEqual([]);
      expect(pagination.loading.value).toBe(false);
    },
  );

  it.each(["misskey", "bluesky"] as const)(
    "does not copy delayed %s notifications or cursors to a different account",
    async (type) => {
      const { root, pagination, complete } = setup(type, true);
      const pending = pagination.readmore();
      root.timelines[0].available = false;
      root.timelines[1].available = true;
      const destination = JSON.stringify(root.timelines[1]);
      complete();
      await pending;
      expect(JSON.stringify(root.timelines[1])).toBe(destination);
    },
  );

  for (const mutation of ["account", "token", "origin", "did", "options", "channel", "removed", "replaced"] as const) {
    it.each(["mastodon", "misskey", "bluesky"] as const)(
      `rejects %s pagination after ${mutation} changes even when the timeline ID is reused`,
      async (type) => {
        const { root, pagination, complete } = setup(type);
        const pending = pagination.readmore();
        const target = root.timelines[0];
        switch (mutation) {
          case "account":
            target.userId = "bob";
            break;
          case "token":
            root.users[0].token = "replaced-token";
            break;
          case "origin":
            root.instances[0].url = "https://replacement.test";
            break;
          case "did":
            root.users[0].blueskySession!.did = "did:plc:replacement";
            break;
          case "options":
            target.options.query = "replacement";
            break;
          case "channel":
            target.channel = `${type}:notifications`;
            break;
          case "removed":
            root.timelines.shift();
            root.timelines[0].available = true;
            break;
          case "replaced":
            root.timelines[0] = { ...target, posts: [], pendingNewPosts: [] };
            break;
        }
        const before = JSON.stringify(root.timelines);
        complete();
        await pending;
        expect(JSON.stringify(root.timelines)).toBe(before);
        expect(root.errors).toEqual([]);
      },
    );
  }

  it.each(["mastodon", "misskey", "bluesky"] as const)(
    "preserves ordinary %s pagination and owns its loading state",
    async (type) => {
      const { root, pagination, complete } = setup(type);
      const pending = pagination.readmore();
      complete();
      await pending;
      expect(root.timelines[0].posts).toHaveLength(2);
      expect(root.timelines[1].posts).toHaveLength(1);
      expect(pagination.loading.value).toBe(false);
      if (type === "bluesky") expect(root.timelines[0].bluesky?.cursor).toBe("response-cursor");
    },
  );

  it.each(["mastodon", "misskey"] as const)("preserves %s diff ordering and queue behavior", async (type) => {
    for (const locked of [false, true]) {
      const { root, complete, diff } = setup(type);
      root.timelines[0].readmoreLocked = locked;
      const pending = diff();
      complete();
      await pending;
      expect(root.timelines[0].posts).toHaveLength(locked ? 1 : 2);
      expect(root.timelines[0].pendingNewPosts).toHaveLength(locked ? 1 : 0);
      expect(root.timelines[1].posts).toHaveLength(1);
    }
  });

  it("does not let an old readmore failure flush a replacement timeline's pending posts", async () => {
    const { root, pagination, complete } = setup("mastodon");
    const pending = pagination.readmore();
    root.timelines[0].available = false;
    root.timelines[1].available = true;
    root.timelines[1].pendingNewPosts = [{ id: "queued" }] as TimelineStore["pendingNewPosts"];
    root.timelines[1].readmoreLocked = true;
    const destination = JSON.stringify(root.timelines[1]);
    complete(false);
    await pending;
    expect(JSON.stringify(root.timelines[1])).toBe(destination);
    expect(root.errors).toEqual([]);
  });
});
