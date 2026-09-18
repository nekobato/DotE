import { describe, expect, it } from "vitest";
import type { BlueskyNotification } from "@/types/bluesky";
import { countUnreadNotifications, resolveLatestNotificationMarker } from "./notifications";

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
