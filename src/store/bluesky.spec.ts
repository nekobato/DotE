import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { AppBskyFeedDefs } from "@atproto/api";
import type { BlueskyFeedPost } from "@/types/bluesky";
import type { InstanceStore, User } from "@shared/types/store";
import { useStore, type TimelineStore } from ".";
import { useBlueskyStore } from "./bluesky";
import { useTimelineStore } from "./timeline";
import { resolveBlueskyFeedItemId, withBlueskyFeedItemId } from "@/utils/bluesky";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke: invoke }));
vi.mock("./mastodon", () => ({ useMastodonStore: () => ({}) }));
vi.mock("./misskey", () => ({ useMisskeyStore: () => ({}) }));

const postUri = "at://did:plc:author/app.bsky.feed.post/original";
const repostUri = "at://did:plc:alice/app.bsky.feed.repost/new";
const target = { userId: "alice", postUri };
const success = { ok: true, data: { uri: repostUri, cid: "repost-cid" } };
const failure = { ok: false, error: { type: "network", message: "offline" } };

const post = (repost?: string): AppBskyFeedDefs.PostView => ({
  uri: postUri,
  cid: "post-cid",
  author: { did: "did:plc:author", handle: "author.example" },
  record: { $type: "app.bsky.feed.post", text: "Hello", createdAt: "2026-10-01T00:00:00.000Z" },
  indexedAt: "2026-10-01T00:00:00.000Z",
  repostCount: 2,
  viewer: { ...(repost ? { repost } : {}), like: "like-record" },
});

const feed = (repost?: string) => withBlueskyFeedItemId({ post: post(repost) });

const repostFeed = (uri = repostUri, by = "did:plc:alice") =>
  withBlueskyFeedItemId({
    post: post(repostUri),
    reason: {
      $type: "app.bsky.feed.defs#reasonRepost",
      uri,
      cid: "repost-cid",
      by: { did: by, handle: "reposter.example" },
      indexedAt: "2026-10-02T00:00:00.000Z",
    },
  });

const account = (id: string): User => ({
  id,
  instanceId: "bluesky",
  name: id,
  token: "",
  avatarUrl: "",
  blueskySession: {
    did: `did:plc:${id}`,
    handle: `${id}.example`,
    pdsUrl: "https://pds.example",
    authorizationServer: "https://auth.example",
    scope: "atproto",
    tokenType: "DPoP",
    active: true,
  },
});

const home = (id: string, userId: string, available = false): TimelineStore => ({
  id,
  userId,
  channel: "bluesky:homeTimeline",
  options: {},
  available,
  updateInterval: 60000,
  posts: [feed()],
  notifications: [],
  pendingNewPosts: [],
  readmoreLocked: false,
});

const setup = () => {
  const root = useStore();
  root.users = [account("alice"), account("bob")];
  root.instances = [{ id: "bluesky", type: "bluesky", name: "Bluesky", url: "https://bsky.app" }] as InstanceStore[];
  root.timelines = [home("alice-home", "alice", true), home("alice-copy", "alice"), home("bob-home", "bob")];
  // The fixtures above contain only Bluesky home timelines.
  type BlueskyTestTimeline = Omit<TimelineStore, "posts" | "pendingNewPosts"> & {
    posts: BlueskyFeedPost[];
    pendingNewPosts: BlueskyFeedPost[];
  };
  return {
    root: root as Omit<typeof root, "timelines"> & { timelines: BlueskyTestTimeline[] },
    bluesky: useBlueskyStore(),
    timeline: useTimelineStore(),
  };
};

const deferred = () => {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { resolve, promise };
};

beforeEach(() => {
  setActivePinia(createPinia());
  invoke.mockReset().mockResolvedValue(success);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("Bluesky native repost actions", () => {
  it("reposts immediately, updates every copy for the account, and inserts one activity", async () => {
    const { root, bluesky } = setup();
    const pendingCopy = feed();
    root.timelines[1].pendingNewPosts.push(pendingCopy);
    expect(await bluesky.createRepost({ userId: "alice", timelineId: "alice-home", post: post() })).toBe(true);
    expect(invoke).toHaveBeenCalledExactlyOnceWith("api", {
      method: "bluesky:createRepost",
      did: "did:plc:alice",
      uri: postUri,
      cid: "post-cid",
    });
    for (const timeline of root.timelines.slice(0, 2)) {
      const original = timeline.posts.find((entry) => entry.id === postUri)!;
      expect(original.post.viewer).toEqual({ repost: repostUri, like: "like-record" });
      expect(original.post.repostCount).toBe(3);
    }
    expect(pendingCopy.post.repostCount).toBe(3);
    expect(root.timelines[0].posts).toHaveLength(2);
    expect(root.timelines[0].posts[0].reason).toMatchObject({ uri: repostUri, by: { did: "did:plc:alice" } });
    expect(root.timelines[0].posts[0].post.repostCount).toBe(3);
    expect(root.timelines[2].posts[0].post.viewer?.repost).toBeUndefined();
    expect(bluesky.repostUriFor(target)).toBe(repostUri);
    expect(bluesky.isRepostPending(target)).toBe(false);
  });

  it("does not increment shared PostView objects more than once", async () => {
    const { root, bluesky } = setup();
    const sharedPost = post();
    root.timelines[0].posts = [withBlueskyFeedItemId({ post: sharedPost })];
    root.timelines[1].posts = [withBlueskyFeedItemId({ post: sharedPost })];
    await bluesky.createRepost({ userId: "alice", post: sharedPost });
    expect(sharedPost.repostCount).toBe(3);
    expect(root.timelines[0].posts[0].post.repostCount).toBe(3);
  });

  it.each([undefined, repostUri])(
    "uses refreshed counts and avoids double-counting a server-confirmed repost while awaiting success (%s)",
    async (serverRepost) => {
      const { root, bluesky } = setup();
      const request = deferred();
      invoke.mockReturnValueOnce(request.promise);
      const action = bluesky.createRepost({ userId: "alice", timelineId: "alice-home", post: post() });
      const refreshedPost = post(serverRepost);
      refreshedPost.repostCount = 5;
      root.timelines[0].posts = [withBlueskyFeedItemId({ post: refreshedPost })];
      request.resolve(success);
      await action;
      const expectedCount = serverRepost ? 5 : 6;
      for (const timeline of root.timelines.slice(0, 2)) {
        expect(timeline.posts.every((entry) => entry.post.repostCount === expectedCount)).toBe(true);
      }
    },
  );

  it("keeps delayed success bound to the account and timeline selected before the request", async () => {
    const { root, bluesky, timeline } = setup();
    const request = deferred();
    invoke.mockReturnValueOnce(request.promise);
    const action = bluesky.createRepost({ userId: "alice", timelineId: "alice-home", post: post() });
    root.timelines[0].available = false;
    root.timelines[2].available = true;
    expect(timeline.currentUser?.id).toBe("bob");
    request.resolve(success);
    expect(await action).toBe(true);
    expect(root.timelines[0].posts).toHaveLength(2);
    expect(root.timelines[2].posts).toEqual([feed()]);
    expect(invoke.mock.calls[0][1].did).toBe("did:plc:alice");
  });

  it("does not apply an old account's response after its stored DID has changed", async () => {
    const { root, bluesky } = setup();
    const request = deferred();
    invoke.mockReturnValueOnce(request.promise);
    const action = bluesky.createRepost({ userId: "alice", post: post() });
    root.users[0].blueskySession!.did = "did:plc:replacement";
    request.resolve(success);
    await action;
    expect(root.timelines[0].posts).toEqual([feed()]);
    expect(bluesky.repostUriFor(target)).toBeUndefined();
    expect(bluesky.isRepostPending(target)).toBe(false);
  });

  it("suppresses duplicate and opposite actions during an in-flight request", async () => {
    const { bluesky } = setup();
    const request = deferred();
    invoke.mockReturnValueOnce(request.promise);
    const action = bluesky.createRepost({ userId: "alice", post: post() });
    expect(bluesky.isRepostPending(target)).toBe(true);
    expect(await bluesky.createRepost({ userId: "alice", post: post() })).toBe(false);
    expect(await bluesky.deleteRepost({ ...target, repostUri })).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(1);
    request.resolve(success);
    await action;
    expect(bluesky.isRepostPending(target)).toBe(false);
  });

  it("allows the same post to be reposted independently by a second account", async () => {
    const { root, bluesky } = setup();
    const request = deferred();
    invoke.mockReturnValueOnce(request.promise);
    const action = bluesky.createRepost({ userId: "alice", post: post() });
    invoke.mockResolvedValueOnce({ ok: true, data: { uri: "bob-repost", cid: "bob-cid" } });
    expect(await bluesky.createRepost({ userId: "bob", post: post() })).toBe(true);
    expect(root.timelines[2].posts[0].post.viewer?.repost).toBe("bob-repost");
    request.resolve(success);
    await action;
    expect(root.timelines[0].posts[0].post.viewer?.repost).toBe(repostUri);
  });

  it("queues the local repost when the original timeline is locked for readmore", async () => {
    const { root, bluesky } = setup();
    root.timelines[0].readmoreLocked = true;
    await bluesky.createRepost({ userId: "alice", timelineId: "alice-home", post: post() });
    expect(root.timelines[0].posts).toHaveLength(1);
    expect(root.timelines[0].pendingNewPosts).toHaveLength(1);
    expect(root.timelines[0].pendingNewPosts[0].reason).toMatchObject({ uri: repostUri });
  });

  it.each([failure, { ok: true, data: {} }])("preserves posts on a failed or malformed response", async (response) => {
    const { root, bluesky } = setup();
    const before = JSON.stringify(root.timelines);
    invoke.mockResolvedValueOnce(response);
    expect(await bluesky.createRepost({ userId: "alice", post: post() })).toBe(false);
    expect(JSON.stringify(root.timelines)).toBe(before);
    expect(root.errors).toHaveLength(1);
    expect(bluesky.repostUriFor(target)).toBeUndefined();
    expect(bluesky.isRepostPending(target)).toBe(false);
  });

  it("releases the guard on bridge rejection and allows retry", async () => {
    const { root, bluesky } = setup();
    invoke.mockRejectedValueOnce(new Error("bridge failed"));
    expect(await bluesky.createRepost({ userId: "alice", post: post() })).toBe(false);
    expect(root.timelines[0].posts).toEqual([feed()]);
    expect(bluesky.isRepostPending(target)).toBe(false);
    expect(await bluesky.createRepost({ userId: "alice", post: post() })).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("does not create a second record for an already reposted post", async () => {
    const { root, bluesky } = setup();
    root.timelines[0].posts = [feed(repostUri)];
    expect(await bluesky.createRepost({ userId: "alice", post: post(repostUri) })).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
    expect(root.timelines[0].posts[0].post.repostCount).toBe(2);
  });

  it("hydrates notification records before creating a repost", async () => {
    const { bluesky } = setup();
    const notificationPost = post();
    delete notificationPost.viewer;
    invoke.mockResolvedValueOnce({ ok: true, data: { posts: [post()] } });
    expect(await bluesky.createRepost({ userId: "alice", post: notificationPost })).toBe(true);
    expect(invoke.mock.calls.map(([, args]) => args.method)).toEqual(["bluesky:getPosts", "bluesky:createRepost"]);
    expect(invoke.mock.calls[0][1]).toEqual({ method: "bluesky:getPosts", did: "did:plc:alice", uris: [postUri] });
  });

  it("exposes the existing repost record found while hydrating a notification without reposting again", async () => {
    const { root, bluesky } = setup();
    const notificationPost = post();
    delete notificationPost.viewer;
    invoke.mockResolvedValueOnce({ ok: true, data: { posts: [{ ...post(repostUri), repostCount: 9 }] } });
    expect(await bluesky.createRepost({ userId: "alice", post: notificationPost })).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(root.timelines[0].posts[0].post.repostCount).toBe(9);
    expect(bluesky.repostUriFor(target)).toBe(repostUri);
  });

  it.each([failure, { ok: true, data: { posts: [] } }])(
    "does not repost when notification hydration fails",
    async (response) => {
      const { root, bluesky } = setup();
      const notificationPost = post();
      delete notificationPost.viewer;
      invoke.mockResolvedValueOnce(response);
      expect(await bluesky.createRepost({ userId: "alice", post: notificationPost })).toBe(false);
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(root.timelines[0].posts).toEqual([feed()]);
      expect(root.errors).toHaveLength(1);
      expect(bluesky.isRepostPending(target)).toBe(false);
    },
  );

  it("does not send an API request without the target account", async () => {
    const { root, bluesky } = setup();
    expect(await bluesky.createRepost({ userId: "missing", post: post() })).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
    expect(root.errors).toHaveLength(1);
  });

  it("removes only the target repost activity and decrements each copy once", async () => {
    const { root, bluesky } = setup();
    root.timelines[0].posts = [feed(repostUri), repostFeed(), repostFeed("another-repost", "did:plc:other")];
    root.timelines[1].posts = [feed(repostUri)];
    root.timelines[1].pendingNewPosts = [repostFeed()];
    expect(await bluesky.deleteRepost({ ...target, repostUri })).toBe(true);
    expect(invoke).toHaveBeenCalledExactlyOnceWith("api", {
      method: "bluesky:deleteRepost",
      did: "did:plc:alice",
      uri: repostUri,
    });
    expect(root.timelines[0].posts).toHaveLength(2);
    expect(root.timelines[0].posts.map((entry) => entry.id)).toEqual([postUri, `${postUri}#another-repost`]);
    for (const item of root.timelines[0].posts) {
      expect(item.post.viewer).toEqual({ like: "like-record" });
      expect(item.post.repostCount).toBe(1);
    }
    expect(root.timelines[1].pendingNewPosts).toEqual([]);
    expect(bluesky.repostUriFor(target)).toBeNull();
    expect(root.timelines[2].posts).toEqual([feed()]);
  });

  it("shares the action guard with deleting my repost activity from the delete menu", async () => {
    const { root, bluesky } = setup();
    root.timelines[0].posts = [repostFeed()];
    const request = deferred();
    invoke.mockReturnValueOnce(request.promise);
    const action = bluesky.deleteRepost({ ...target, repostUri });
    expect(
      await bluesky.deletePost({
        userId: "alice",
        uri: repostUri,
        feedItemId: resolveBlueskyFeedItemId(repostFeed()),
        isRepost: true,
      }),
    ).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(1);
    request.resolve({ ok: true, data: undefined });
    await action;
    expect(root.timelines[0].posts).toEqual([]);
  });

  it("keeps a failed unrepost unchanged and clamps successful zero counts", async () => {
    const { root, bluesky } = setup();
    root.timelines[0].posts = [feed(repostUri)];
    root.timelines[0].posts[0].post.repostCount = 0;
    invoke.mockResolvedValueOnce(failure);
    expect(await bluesky.deleteRepost({ ...target, repostUri })).toBe(false);
    expect(root.timelines[0].posts[0].post.viewer?.repost).toBe(repostUri);
    expect(bluesky.isRepostPending(target)).toBe(false);
    expect(await bluesky.deleteRepost({ ...target, repostUri })).toBe(true);
    expect(root.timelines[0].posts[0].post.repostCount).toBe(0);
  });

  it("deduplicates the local activity when the server later returns the same repost", async () => {
    const { root, bluesky } = setup();
    await bluesky.createRepost({ userId: "alice", timelineId: "alice-home", post: post() });
    bluesky.setPosts([repostFeed(), feed(repostUri)]);
    expect(root.timelines[0].posts).toHaveLength(2);
    expect(new Set(root.timelines[0].posts.map((entry) => entry.id)).size).toBe(2);
    bluesky.setPosts([feed()]);
    expect(bluesky.repostUriFor(target)).toBeNull();
  });
});
