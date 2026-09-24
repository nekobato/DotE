import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useNotificationReadSync } from "@/composables/useNotificationReadSync";
import type { InstanceStore, InstanceType } from "@shared/types/store";
import type { BlueskyNotification } from "@/types/bluesky";
import type { MastodonNotification } from "@/types/mastodon";
import type { MisskeyEntities } from "@shared/types/misskey";
import { useStore, type TimelineStore } from ".";
import { useTimelineStore } from "./timeline";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke: invoke }));
vi.mock("./bluesky", () => ({ useBlueskyStore: () => ({}) }));
vi.mock("./misskey", () => ({ useMisskeyStore: () => ({}) }));
vi.mock("./mastodon", () => ({ useMastodonStore: () => ({}) }));

function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function setup(type: InstanceType, id = "a", available = true) {
  const root = useStore();
  root.instances.push({ id, name: id, type, url: `https://${id}.example`, iconUrl: "" } as InstanceStore);
  root.users.push({
    id,
    instanceId: id,
    name: id,
    token: `token-${id}`,
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
  const at = "2026-09-18T01:00:00.000Z";
  const notification =
    type === "bluesky"
      ? ({
          uri: `at://did:plc:${id}/app.bsky.feed.like/1`,
          cid: id,
          author: { did: `did:plc:${id}`, handle: `${id}.example` },
          reason: "like",
          record: {},
          indexedAt: at,
          isRead: false,
        } as BlueskyNotification)
      : type === "mastodon"
        ? ({ id: "10", type: "mention", created_at: at, account: {} } as MastodonNotification)
        : ({ id: "10", type: "follow", createdAt: at, user: {} } as MisskeyEntities.Notification);
  root.timelines.push({
    id,
    userId: id,
    channel: `${type}:notifications`,
    options: {},
    updateInterval: 60000,
    available,
    posts: [],
    notifications: [notification],
    pendingNewPosts: [],
    readmoreLocked: false,
  } as TimelineStore);
  return { root, timeline: root.timelines[root.timelines.length - 1], store: useTimelineStore() };
}

beforeEach(() => {
  setActivePinia(createPinia());
  useStore().settings.notifications = { markAsRead: "manual" };
  invoke.mockReset().mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const platforms = ["misskey", "mastodon", "bluesky"] as const;
describe("notification read synchronization", () => {
  it.each(platforms)("does not skip the destination while %s is still pending", async (type) => {
    const { root, timeline: a, store } = setup(type);
    const { timeline: b } = setup(type, "b", false);
    const first = deferred();
    invoke.mockImplementation((event, payload) =>
      event === "api" && (payload.token === "token-a" || payload.did === "did:plc:a")
        ? first.promise
        : Promise.resolve({ ok: true }),
    );
    const readA = store.markCurrentNotificationsAsRead();
    a.available = false;
    b.available = true;
    const readB = store.markCurrentNotificationsAsRead();
    expect(invoke.mock.calls.filter(([event]) => event === "api")).toHaveLength(2);
    expect(await readB).toBe(true);
    expect(store.getNotificationUnreadCount("b")).toBe(0);
    first.resolve({ ok: true });
    expect(await readA).toBe(true);
    expect(root.errors).toEqual([]);
    const saved = invoke.mock.calls.filter(([event]) => event === "db:set-timeline").map(([, value]) => value);
    expect(saved.map((value) => value.id).sort()).toEqual(["a", "b"]);
    expect(saved.every((value) => !("notifications" in value) && !("posts" in value))).toBe(true);
  });

  it.each(platforms)("deduplicates %s requests until persistence finishes", async (type) => {
    const { store } = setup(type);
    const save = deferred();
    invoke.mockImplementation((event) => (event === "db:set-timeline" ? save.promise : Promise.resolve({ ok: true })));
    const first = store.markCurrentNotificationsAsRead();
    const second = store.markCurrentNotificationsAsRead();
    await Promise.resolve();
    expect(invoke.mock.calls.filter(([event]) => event === "api")).toHaveLength(1);
    save.resolve(undefined);
    expect(await Promise.all([first, second])).toEqual([true, true]);
  });

  it.each(platforms)("rolls back %s API failures and allows retry", async (type) => {
    const { root, timeline, store } = setup(type);
    const original = JSON.parse(JSON.stringify(timeline.notifications));
    invoke.mockResolvedValueOnce({ ok: false, error: { message: "offline" } });
    expect(await store.markCurrentNotificationsAsRead()).toBe(false);
    expect(timeline.lastReadNotificationId).toBeUndefined();
    expect(timeline.lastReadNotificationAt).toBeUndefined();
    expect(timeline.notifications).toEqual(original);
    expect(store.currentNotificationUnreadCount).toBe(1);
    expect(root.errors).toEqual([{ message: "通知の既読化に失敗しました" }]);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(await store.markCurrentNotificationsAsRead()).toBe(true);
  });

  it.each(platforms)("keeps newly arrived %s notifications after a failed request", async (type) => {
    const { timeline, store } = setup(type);
    const request = deferred();
    invoke.mockReturnValueOnce(request.promise);
    const pending = store.markCurrentNotificationsAsRead();
    const newer =
      type === "bluesky"
        ? {
            ...timeline.notifications[0],
            uri: "at://did:plc:a/app.bsky.feed.like/new",
            indexedAt: new Date(Date.now() + 1000).toISOString(),
            isRead: false,
          }
        : {
            ...timeline.notifications[0],
            id: "11",
            createdAt: new Date(Date.now() + 1000).toISOString(),
            created_at: new Date(Date.now() + 1000).toISOString(),
          };
    store.addNewNotification(newer as BlueskyNotification | MastodonNotification | MisskeyEntities.Notification);
    request.resolve({ ok: false, error: { message: "offline" } });
    expect(await pending).toBe(false);
    expect(timeline.notifications).toHaveLength(2);
    expect(store.currentNotificationUnreadCount).toBe(2);
  });

  it("rolls back local state if persistence fails", async () => {
    const { store, timeline } = setup("bluesky");
    invoke.mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error("disk full"));
    expect(await store.markCurrentNotificationsAsRead()).toBe(false);
    expect(timeline.lastReadNotificationId).toBeUndefined();
    expect(store.currentNotificationUnreadCount).toBe(1);
  });

  it("does not send requests for an empty or non-notification timeline", async () => {
    const { timeline, store } = setup("misskey");
    timeline.channel = "misskey:homeTimeline";
    expect(await store.markCurrentNotificationsAsRead()).toBe(false);
    timeline.channel = "misskey:notifications";
    timeline.notifications = [];
    expect(await store.markCurrentNotificationsAsRead()).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});

const flush = async () => {
  for (let i = 0; i < 12; i++) await nextTick();
};
describe("manual and on-open notification modes", () => {
  it("waits for an explicit action in manual mode", async () => {
    const { store } = setup("bluesky");
    const stop = useNotificationReadSync();
    try {
      await flush();
      expect(invoke).not.toHaveBeenCalled();
      expect(await store.markCurrentNotificationsAsRead()).toBe(true);
    } finally {
      stop();
    }
  });
  it.each(platforms)("marks the destination on-open while %s source is pending", async (type) => {
    const { root, timeline: a, store } = setup(type);
    const { timeline: b } = setup(type, "b", false);
    root.settings.notifications.markAsRead = "onOpen";
    const first = deferred();
    invoke.mockReturnValueOnce(first.promise);
    const stop = useNotificationReadSync();
    try {
      a.available = false;
      b.available = true;
      await flush();
      expect(invoke.mock.calls.filter(([event]) => event === "api")).toHaveLength(2);
      expect(store.getNotificationUnreadCount("b")).toBe(0);
      first.resolve({ ok: true });
      await flush();
    } finally {
      stop();
    }
  });
  it("retains unread state on failure without automatic retry loops", async () => {
    const { root, store } = setup("bluesky");
    root.settings.notifications.markAsRead = "onOpen";
    invoke.mockResolvedValue({ ok: false, error: { message: "offline" } });
    const stop = useNotificationReadSync();
    try {
      await flush();
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(store.currentNotificationUnreadCount).toBe(1);
    } finally {
      stop();
    }
  });
  it("marks new arrivals after the pending on-open request completes", async () => {
    const { root, store, timeline } = setup("bluesky");
    root.settings.notifications.markAsRead = "onOpen";
    const first = deferred();
    invoke.mockReturnValueOnce(first.promise);
    const stop = useNotificationReadSync();
    try {
      const markerTime = Date.parse(timeline.lastReadNotificationAt!);
      store.addNewNotification({
        ...timeline.notifications[0],
        uri: "at://did:plc:a/app.bsky.feed.like/new",
        indexedAt: new Date(markerTime + 1).toISOString(),
        isRead: false,
      } as BlueskyNotification);
      await flush();
      expect(invoke).toHaveBeenCalledTimes(1);
      first.resolve({ ok: true });
      await flush();
      expect(invoke.mock.calls.filter(([event]) => event === "api")).toHaveLength(2);
      expect(store.currentNotificationUnreadCount).toBe(0);
    } finally {
      stop();
    }
  });
});

describe("request isolation and platform payloads", () => {
  it.each(platforms)("sends the expected %s read marker", async (type) => {
    const { store, timeline } = setup(type);
    await store.markCurrentNotificationsAsRead();
    const payload = invoke.mock.calls.find(([event]) => event === "api")![1];
    if (type === "bluesky")
      expect(payload).toEqual({
        method: "bluesky:updateSeenNotifications",
        did: "did:plc:a",
        seenAt: timeline.lastReadNotificationAt,
      });
    else
      expect(payload).toEqual({
        method: type === "misskey" ? "misskey:markAllNotificationsAsRead" : "mastodon:updateNotificationMarker",
        instanceUrl: "https://a.example",
        token: "token-a",
        ...(type === "mastodon" ? { notificationId: "10" } : {}),
      });
  });
  it("does not roll back the destination when the source fails", async () => {
    const { timeline: a, store } = setup("bluesky");
    const { timeline: b } = setup("mastodon", "b", false);
    const first = deferred();
    invoke.mockReturnValueOnce(first.promise);
    const readA = store.markCurrentNotificationsAsRead();
    a.available = false;
    b.available = true;
    expect(await store.markCurrentNotificationsAsRead()).toBe(true);
    first.resolve({ ok: false, error: { message: "offline" } });
    expect(await readA).toBe(false);
    expect(store.getNotificationUnreadCount("a")).toBe(1);
    expect(store.getNotificationUnreadCount("b")).toBe(0);
  });
  it("handles an invalid notification timestamp with a valid read request", async () => {
    const { store, timeline } = setup("bluesky");
    (timeline.notifications[0] as BlueskyNotification).indexedAt = "invalid";
    expect(await store.markCurrentNotificationsAsRead()).toBe(true);
    expect(Number.isFinite(Date.parse(timeline.lastReadNotificationAt!))).toBe(true);
    expect(store.currentNotificationUnreadCount).toBe(0);
  });
});

it("does not start another automatic request after the page is disposed", async () => {
  const { root, store, timeline } = setup("bluesky");
  root.settings.notifications.markAsRead = "onOpen";
  const first = deferred();
  invoke.mockReturnValueOnce(first.promise);
  const stop = useNotificationReadSync();
  store.addNewNotification({
    ...timeline.notifications[0],
    uri: "at://did:plc:a/app.bsky.feed.like/new",
    indexedAt: new Date(Date.now() + 1000).toISOString(),
    isRead: false,
  } as BlueskyNotification);
  await flush();
  stop();
  first.resolve({ ok: true });
  await flush();
  expect(invoke.mock.calls.filter(([event]) => event === "api")).toHaveLength(1);
  expect(store.currentNotificationUnreadCount).toBe(1);
});
