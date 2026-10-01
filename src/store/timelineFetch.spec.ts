import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { InstanceStore, InstanceType } from "@shared/types/store";
import { useStore } from ".";
import { useTimelineStore } from "./timeline";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke: invoke }));

beforeEach(() => {
  setActivePinia(createPinia());
  invoke.mockReset().mockResolvedValue({ ok: true, data: {} });
});

function setup(type: InstanceType, sourceIsNotifications: boolean) {
  const root = useStore();
  root.instances = [{ id: "instance", type, url: "https://example.test", name: "test" }] as InstanceStore[];
  root.users = [
    {
      id: "user",
      instanceId: "instance",
      token: "test",
      name: "test",
      avatarUrl: "",
      blueskySession: {
        did: "did:plc:test",
        handle: "test.example",
        pdsUrl: "https://example.test",
        authorizationServer: "https://example.test",
        scope: "atproto",
        tokenType: "DPoP",
        active: true,
      },
    },
  ];
  root.timelines = [
    {
      id: "source",
      userId: "user",
      channel: `${type}:${sourceIsNotifications ? "notifications" : "homeTimeline"}`,
      options: {},
      available: true,
      updateInterval: 60000,
      posts: [],
      notifications: [],
      pendingNewPosts: [],
      readmoreLocked: false,
    },
    {
      id: "destination",
      userId: "user",
      channel: `${type}:notifications`,
      options: {},
      available: false,
      updateInterval: 60000,
      posts: [],
      notifications: [],
      pendingNewPosts: [],
      readmoreLocked: false,
    },
  ];
  let resolve!: (result: unknown) => void;
  invoke.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const timeline = useTimelineStore();
  const pending = timeline.fetchInitialPosts();
  root.timelines[0].available = false;
  root.timelines[1].available = true;
  return { root, pending, resolve };
}

describe("timeline fetch isolation", () => {
  it.each(["misskey", "mastodon", "bluesky"] as const)(
    "does not put a delayed %s home response into notifications",
    async (type) => {
      const { root, pending, resolve } = setup(type, false);
      resolve({ ok: true, data: type === "bluesky" ? { feed: [{ id: "post" }], cursor: "old" } : [{ id: "post" }] });
      await pending;
      expect(root.timelines[1].notifications).toEqual([]);
      expect(root.timelines[1].posts).toEqual([]);
      expect(root.timelines[1].bluesky?.cursor).toBeUndefined();
    },
  );

  it.each(["misskey", "mastodon", "bluesky"] as const)(
    "does not put delayed %s notifications into the destination",
    async (type) => {
      const { root, pending, resolve } = setup(type, true);
      resolve({
        ok: true,
        data:
          type === "bluesky" ? { notifications: [{ id: "notification" }], cursor: "old" } : [{ id: "notification" }],
      });
      await pending;
      expect(root.timelines[1].notifications).toEqual([]);
      expect(root.timelines[1].bluesky?.cursor).toBeUndefined();
    },
  );
});
