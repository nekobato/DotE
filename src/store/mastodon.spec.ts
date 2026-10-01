import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { MastodonNotification } from "@/types/mastodon";
import type { InstanceStore } from "@shared/types/store";
import { useNotificationReadSync } from "@/composables/useNotificationReadSync";
import { useStore, type TimelineStore } from ".";
import { useMastodonStore } from "./mastodon";
import { useTimelineStore } from "./timeline";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke: invoke }));
vi.mock("./bluesky", () => ({ useBlueskyStore: () => ({}) }));
vi.mock("./misskey", () => ({ useMisskeyStore: () => ({}) }));

const notification = (id: string): MastodonNotification =>
  ({
    id,
    created_at: "2026-09-18T00:00:00.000Z",
    type: "mention",
    account: {},
  }) as MastodonNotification;

function setup() {
  const root = useStore();
  root.instances = [
    { id: "instance", type: "mastodon", url: "https://mastodon.example", name: "Mastodon" },
  ] as InstanceStore[];
  root.users = [{ id: "user", instanceId: "instance", token: "test", name: "test", avatarUrl: "" }];
  root.timelines = [
    {
      id: "notifications",
      userId: "user",
      channel: "mastodon:notifications",
      options: {},
      available: true,
      updateInterval: 60000,
      posts: [],
      notifications: [],
      pendingNewPosts: [],
      readmoreLocked: false,
    },
  ];
  invoke.mockImplementation((event, payload) =>
    Promise.resolve(
      event === "api"
        ? {
            ok: true,
            data:
              payload.method === "mastodon:getNotificationMarker"
                ? { notifications: { last_read_id: "10", updated_at: "2026-10-01T00:00:00.000Z" } }
                : [notification("10"), notification("9")],
          }
        : undefined,
    ),
  );
  return { root, timeline: useTimelineStore(), mastodon: useMastodonStore() };
}

beforeEach(() => {
  setActivePinia(createPinia());
  useStore().settings.notifications.markAsRead = "manual";
  invoke.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("Mastodon server notification read state", () => {
  it.each(["manual", "onOpen"] as const)(
    "loads already-read notifications without issuing a read request in %s mode",
    async (mode) => {
      const { root, timeline, mastodon } = setup();
      root.settings.notifications.markAsRead = mode;
      const stop = useNotificationReadSync();
      try {
        await mastodon.fetchPosts();
        expect(timeline.currentNotificationUnreadCount).toBe(0);
        expect(timeline.current?.notifications).toHaveLength(2);
        expect(root.timelines[0].lastReadNotificationId).toBeUndefined();
        expect(invoke.mock.calls.map(([, payload]) => payload.method)).toEqual([
          "mastodon:getNotifications",
          "mastodon:getNotificationMarker",
        ]);
      } finally {
        stop();
      }
    },
  );

  it("retains newer unread entries without using marker.updated_at as a read cutoff", async () => {
    const { timeline, mastodon } = setup();
    invoke.mockResolvedValueOnce({ ok: true, data: [notification("11"), notification("10"), notification("9")] });
    await mastodon.fetchPosts();
    expect(timeline.currentNotificationUnreadCount).toBe(1);
    expect(timeline.isCurrentNotificationUnread(notification("11"))).toBe(true);
    expect(timeline.isCurrentNotificationUnread(notification("9"))).toBe(false);
  });

  it("keeps a newer locally confirmed marker when the server returns an older one", async () => {
    const { root, timeline, mastodon } = setup();
    root.timelines[0].lastReadNotificationId = "11";
    invoke.mockResolvedValueOnce({ ok: true, data: [notification("11"), notification("10")] });
    await mastodon.fetchPosts();
    expect(timeline.currentNotificationUnreadCount).toBe(0);
  });

  it("loads notifications and retains the local marker when fetching the server marker fails", async () => {
    const { root, timeline, mastodon } = setup();
    root.timelines[0].lastReadNotificationId = "9";
    invoke
      .mockResolvedValueOnce({ ok: true, data: [notification("10"), notification("9")] })
      .mockResolvedValueOnce({ ok: false, error: { message: "offline" } });
    await mastodon.fetchPosts();
    expect(timeline.currentNotificationUnreadCount).toBe(1);
    expect(timeline.current?.notifications).toHaveLength(2);
    expect(root.errors).toEqual([{ message: "通知の既読位置を取得できませんでした" }]);
  });

  it("keeps delayed notification and marker responses bound to the original timeline", async () => {
    const { root, timeline, mastodon } = setup();
    let resolve!: (value: unknown) => void;
    invoke.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = mastodon.fetchPosts();
    root.timelines[0].available = false;
    root.timelines.push({ ...root.timelines[0], id: "destination", available: true } as TimelineStore);
    resolve({ ok: true, data: [notification("10"), notification("9")] });
    await pending;
    expect(root.timelines[0].notifications).toHaveLength(2);
    expect(root.timelines[0].mastodonNotificationReadId).toBe("10");
    expect(timeline.current?.notifications).toEqual([]);
    expect(timeline.current?.mastodonNotificationReadId).toBeUndefined();
  });
});
