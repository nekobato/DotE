import { describe, expect, it } from "vitest";
import type { BlueskyNotification } from "@/types/bluesky";
import {
  countUnreadNotifications,
  resolveLatestNotificationMarker,
  resolveNotificationId,
  resolveNotificationCreatedAt,
  isUnreadNotification,
  isNotificationChannel,
  type DotENotification,
} from "./notifications";
import type { MastodonNotification } from "@/types/mastodon";
import type { MisskeyEntities } from "@shared/types/misskey";

const notification = (overrides: Partial<BlueskyNotification> = {}): BlueskyNotification => ({
  uri: "at://did:plc:example/app.bsky.feed.like/1",
  cid: "test-cid",
  author: { did: "did:plc:example", handle: "example.test" },
  reason: "like",
  record: {},
  isRead: false,
  indexedAt: "2026-09-18T02:00:00.000Z",
  ...overrides,
});

describe("notification read state", () => {
  it("has no unread notifications or marker for an empty list", () => {
    expect(countUnreadNotifications({ notifications: [] })).toBe(0);
    expect(resolveLatestNotificationMarker([])).toBeNull();
  });

  it("uses the server read state when no local marker exists", () => {
    expect(
      countUnreadNotifications({
        notifications: [notification(), notification({ isRead: true })],
      }),
    ).toBe(1);
  });

  it("counts only notifications strictly newer than the saved timestamp", () => {
    expect(
      countUnreadNotifications({
        notifications: [
          notification({ indexedAt: "2026-09-18T00:00:00.000Z" }),
          notification({ indexedAt: "2026-09-18T01:00:00.000Z" }),
          notification({ indexedAt: "2026-09-18T02:00:00.000Z" }),
        ],
        markerAt: "2026-09-18T01:00:00.000Z",
      }),
    ).toBe(1);
  });

  it("marks the newest notification and older entries as read", () => {
    const notifications = [
      notification(),
      notification({
        uri: "at://did:plc:example/app.bsky.feed.like/older",
        indexedAt: "2026-09-18T01:00:00.000Z",
      }),
    ];
    const marker = resolveLatestNotificationMarker(notifications);
    expect(marker).toEqual({
      id: "at://did:plc:example/app.bsky.feed.like/1#like",
      at: "2026-09-18T02:00:00.000Z",
    });
    expect(countUnreadNotifications({ notifications, markerId: marker!.id, markerAt: marker!.at })).toBe(0);
  });
});

const at = "2026-09-18T01:00:00.000Z";
const mastodon = (id: string, created_at = at) =>
  ({ id, created_at, type: "mention", account: {} }) as MastodonNotification;
const misskey = (id: string, createdAt = at) =>
  ({ id, createdAt, type: "follow", user: {} }) as MisskeyEntities.Notification;

describe("platform notification markers", () => {
  it.each([
    [misskey("mk-id"), "mk-id", at],
    [mastodon("123"), "123", at],
    [notification(), "at://did:plc:example/app.bsky.feed.like/1#like", "2026-09-18T02:00:00.000Z"],
  ] as const)("resolves platform ID and timestamp for %j", (item, id, timestamp) => {
    expect(resolveNotificationId(item)).toBe(id);
    expect(resolveNotificationCreatedAt(item)).toBe(timestamp);
    expect(resolveLatestNotificationMarker([item])).toEqual({ id, at: timestamp });
  });

  it.each([misskey, mastodon])("uses descending list position for legacy ID-only markers", (make) => {
    const notifications = [make("3"), make("2"), make("1")];
    expect(countUnreadNotifications({ notifications, markerId: "2" })).toBe(1);
    expect(countUnreadNotifications({ notifications })).toBe(3);
  });

  it("uses timestamps regardless of list order or missing marker notification", () => {
    const older = mastodon("1", "2026-09-18T00:00:00.000Z");
    const newer = mastodon("3", "2026-09-18T02:00:00.000Z");
    for (const notifications of [
      [older, newer],
      [newer, older],
    ]) {
      expect(countUnreadNotifications({ notifications, markerId: "missing", markerAt: at })).toBe(1);
    }
  });

  it("uses the newest entry supplied by the descending timeline", () => {
    expect(resolveLatestNotificationMarker([mastodon("3"), mastodon("2")])?.id).toBe("3");
  });

  it("handles invalid dates without throwing and recognizes an exact read ID", () => {
    const invalid = mastodon("invalid", "not-a-date");
    expect(isUnreadNotification({ notification: invalid })).toBe(true);
    expect(isUnreadNotification({ notification: invalid, markerId: "invalid", markerAt: "invalid" })).toBe(false);
    expect(countUnreadNotifications({ notifications: [invalid], markerAt: "invalid" })).toBe(1);
    expect(isUnreadNotification({ notification: notification({ indexedAt: "invalid", isRead: true }) })).toBe(false);
  });

  it("does not invent a notification ID when data is missing", () => {
    const missing = {} as DotENotification;
    expect(resolveNotificationId(missing)).toBe("");
    expect(resolveNotificationCreatedAt(missing)).toBe("");
    expect(resolveLatestNotificationMarker([missing])).toBeNull();
  });

  it("only recognizes notification channels", () => {
    expect(isNotificationChannel()).toBe(false);
    expect(isNotificationChannel("misskey:homeTimeline")).toBe(false);
    for (const channel of ["misskey:notifications", "mastodon:notifications", "bluesky:notifications"] as const) {
      expect(isNotificationChannel(channel)).toBe(true);
    }
  });
});
