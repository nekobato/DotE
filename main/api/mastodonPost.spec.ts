import { beforeEach, describe, expect, it, vi } from "vitest";
import { mastodonPostStatus, mastodonUpdateMedia, mastodonUploadMedia } from "./mastodon";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("electron-fetch", () => ({ default: fetch }));
vi.mock("../db", () => ({ getInstanceMetaCache: vi.fn(), setInstanceMetaCache: vi.fn() }));

const account = { instanceUrl: "https://mastodon.example", token: "test-token" };

beforeEach(() => {
  fetch.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ id: "media-1" }),
  });
});

describe("Mastodon composer API requests", () => {
  it.each(["public", "unlisted", "private", "direct"] as const)(
    "sends %s visibility with CW, sensitivity and language",
    async (visibility) => {
      await mastodonPostStatus({
        ...account,
        status: "本文",
        inReplyToId: "parent",
        mediaIds: ["media-1", "media-2"],
        sensitive: true,
        spoilerText: "内容の警告",
        visibility,
        language: "ja",
      });
      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe("https://mastodon.example/api/v1/statuses");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer test-token");
      expect(JSON.parse(options.body)).toEqual({
        status: "本文",
        in_reply_to_id: "parent",
        media_ids: ["media-1", "media-2"],
        sensitive: true,
        spoiler_text: "内容の警告",
        visibility,
        language: "ja",
      });
    },
  );

  it("leaves omitted visibility and language to the server", async () => {
    await mastodonPostStatus({ ...account, status: "本文", sensitive: false, spoilerText: "" });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ status: "本文", sensitive: false, spoiler_text: "" });
  });

  it("uploads each attachment's description alongside its file", async () => {
    await mastodonUploadMedia({
      ...account,
      fileDataBase64: Buffer.from("image-bytes").toString("base64"),
      fileName: "image.png",
      fileType: "image/png",
      description: "花の写真",
    });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://mastodon.example/api/v2/media");
    expect(options.method).toBe("POST");
    const body = options.body.toString();
    expect(body).toContain('name="description"');
    expect(body).toContain("花の写真");
    expect(body).toContain('filename="image.png"');
    expect(body).toContain("image-bytes");
  });

  it.each(["修正した説明", ""])("updates an uploaded description, including clearing it: %j", async (description) => {
    await mastodonUpdateMedia({ ...account, id: "media-1", description });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://mastodon.example/api/v1/media/media-1");
    expect(options.method).toBe("PUT");
    expect(options.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(options.body)).toEqual({ description });
  });

  it("propagates a failed media update so the composer can stop publication", async () => {
    fetch.mockRejectedValueOnce(new Error("offline"));
    await expect(mastodonUpdateMedia({ ...account, id: "media-1", description: "説明" })).rejects.toMatchObject({
      details: { type: "network", message: "offline" },
    });
  });
});
