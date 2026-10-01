import { beforeEach, describe, expect, it, vi } from "vitest";
import { misskeyGetNotifications } from "./misskey";
import { mastodonGetNotificationMarker } from "./mastodon";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("electron-fetch", () => ({ default: fetch }));
vi.mock("../db", () => ({ getInstanceMetaCache: vi.fn(), setInstanceMetaCache: vi.fn() }));

beforeEach(() =>
  fetch.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ notifications: { last_read_id: "10" } }),
  }),
);

describe("notification API requests", () => {
  it("fetches Misskey notifications without marking them read", async () => {
    await misskeyGetNotifications({ instanceUrl: "https://misskey.example", token: "test", limit: 40, sinceId: "1" });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://misskey.example/api/i/notifications");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ i: "test", limit: 40, sinceId: "1", markAsRead: false });
  });

  it("fetches the authenticated Mastodon notification marker", async () => {
    const result = await mastodonGetNotificationMarker({ instanceUrl: "https://mastodon.example", token: "test" });
    const [url, options] = fetch.mock.calls[0];
    expect(new URL(url).pathname).toBe("/api/v1/markers");
    expect(new URL(url).searchParams.getAll("timeline[]")).toEqual(["notifications"]);
    expect(options.headers.Authorization).toBe("Bearer test");
    expect(options.method ?? "GET").toBe("GET");
    expect(result).toEqual({ notifications: { last_read_id: "10" } });
  });
});
