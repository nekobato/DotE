import { AppBskyFeedPost } from "@atproto/api";
import type { AppBskyRichtextFacet } from "@atproto/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { blueskyCreatePost } from "./bluesky";

const { restore, post, resolveHandle } = vi.hoisted(() => ({
  restore: vi.fn(),
  post: vi.fn(),
  resolveHandle: vi.fn(),
}));
vi.mock("../oauth/client", () => ({ getBlueskyOAuthClient: async () => ({ restore }) }));
vi.mock("../oauth/agent", () => ({
  createBlueskyAgent: () => ({ post, com: { atproto: { identity: { resolveHandle } } } }),
}));

const did = "did:plc:qa";
const cid = "bafkreigh2akiscaildc6f4r4uqmycd65xyfnd6xqy36l4r5tbvclygr6de";
const reference = (id: string) => ({ uri: `at://${did}/app.bsky.feed.post/${id}`, cid });
const image = {
  blob: { cid, mimeType: "image/png", size: 128 },
  alt: "花の写真",
  aspectRatio: { width: 640, height: 480 },
};
const postedRecord = (): AppBskyFeedPost.Record => post.mock.calls[0][0];
const byteRange = (text: string, segment: string) => {
  const start = text.indexOf(segment);
  return {
    byteStart: Buffer.byteLength(text.slice(0, start)),
    byteEnd: Buffer.byteLength(text.slice(0, start + segment.length)),
  };
};
const assertValidRecord = () => expect(AppBskyFeedPost.validateRecord(postedRecord())).toMatchObject({ success: true });

beforeEach(() => {
  restore.mockReset().mockResolvedValue({ did });
  post.mockReset().mockResolvedValue(reference("created"));
  resolveHandle.mockReset().mockResolvedValue({ data: { did: "did:plc:alice" } });
});

describe("Bluesky post records", () => {
  it("detects links, mentions and hashtags using UTF-8 offsets after Japanese text and emoji", async () => {
    const text = "日本語👩‍💻 @alice.bsky.social https://example.com/guide #日本語 #DotE";
    await blueskyCreatePost({ did, text, langs: ["ja", "en"] });
    const record = postedRecord();
    const expected = [
      ["@alice.bsky.social", { $type: "app.bsky.richtext.facet#mention", did: "did:plc:alice" }],
      ["https://example.com/guide", { $type: "app.bsky.richtext.facet#link", uri: "https://example.com/guide" }],
      ["#日本語", { $type: "app.bsky.richtext.facet#tag", tag: "日本語" }],
      ["#DotE", { $type: "app.bsky.richtext.facet#tag", tag: "DotE" }],
    ] as const;
    expect(record.text).toBe(text);
    expect(record.langs).toEqual(["ja", "en"]);
    expect(record.facets).toHaveLength(expected.length);
    expected.forEach(([segment, feature], index) => {
      expect(record.facets?.[index]).toMatchObject({ index: byteRange(text, segment), features: [feature] });
      const range = record.facets![index].index;
      expect(Buffer.from(text).subarray(range.byteStart, range.byteEnd).toString()).toBe(segment);
    });
    expect(resolveHandle).toHaveBeenCalledWith({ handle: "alice.bsky.social" });
    expect(restore).toHaveBeenCalledWith(did, "auto");
    assertValidRecord();
  });

  it("does not include empty facets or unspecified language and preserves plain text", async () => {
    await blueskyCreatePost({ did, text: "日本語の本文\n絵文字🌸", langs: [] });
    expect(postedRecord()).toEqual({
      $type: "app.bsky.feed.post",
      text: "日本語の本文\n絵文字🌸",
      createdAt: expect.any(String),
    });
    expect(resolveHandle).not.toHaveBeenCalled();
    assertValidRecord();
  });

  it("canonicalizes and deduplicates language tags, retaining region and script", async () => {
    await blueskyCreatePost({ did, text: "本文", langs: [" JA ", "ja", "EN-us", "zh-hant"] });
    expect(postedRecord().langs).toEqual(["ja", "en-US", "zh-Hant"]);
    assertValidRecord();
  });

  it("omits whitespace-only language tags", async () => {
    await blueskyCreatePost({ did, text: "本文", langs: ["", " "] });
    expect(postedRecord()).not.toHaveProperty("langs");
  });

  it("accepts valid private-use, grandfathered and extlang tags unsupported by Intl", async () => {
    await blueskyCreatePost({
      did,
      text: "本文",
      langs: [" x-private ", "X-PRIVATE", "i-klingon", "zh-cmn-Hans-CN"],
    });
    expect(postedRecord().langs).toEqual(["x-private", "i-klingon", "zh-cmn-Hans-CN"]);
    assertValidRecord();
  });

  it.each([["en_US"], ["日本語"], ["ja", "en", "fr", "de"]])(
    "rejects invalid or excessive languages before authentication or publication: %j",
    async (...langs) => {
      await expect(blueskyCreatePost({ did, text: "本文", langs })).rejects.toThrow("言語");
      expect(restore).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
    },
  );

  it("preserves reply references, image Alt and aspect ratio together with facets and languages", async () => {
    const replyTo = { root: reference("root"), parent: reference("parent") };
    await blueskyCreatePost({ did, text: "返信 #写真", replyTo, images: [image], langs: ["ja"] });
    const record = postedRecord();
    expect(record.reply).toEqual(replyTo);
    expect(record.langs).toEqual(["ja"]);
    expect(record.facets?.[0].features).toEqual([{ $type: "app.bsky.richtext.facet#tag", tag: "写真" }]);
    expect(JSON.parse(JSON.stringify(record.embed))).toEqual({
      $type: "app.bsky.embed.images",
      images: [
        {
          image: { $type: "blob", ref: { $link: cid }, mimeType: "image/png", size: 128 },
          alt: image.alt,
          aspectRatio: image.aspectRatio,
        },
      ],
    });
    assertValidRecord();
  });

  it("keeps a quote and multiple images in recordWithMedia while adding RichText and languages", async () => {
    const quote = reference("quoted");
    await blueskyCreatePost({
      did,
      text: "引用 https://example.com",
      quote,
      images: [image, { ...image, alt: "別の写真" }],
      langs: ["ja"],
    });
    expect(postedRecord().embed).toMatchObject({
      $type: "app.bsky.embed.recordWithMedia",
      record: { $type: "app.bsky.embed.record", record: quote },
      media: { $type: "app.bsky.embed.images", images: [{ alt: "花の写真" }, { alt: "別の写真" }] },
    });
    expect(postedRecord().facets?.[0].features).toEqual([
      { $type: "app.bsky.richtext.facet#link", uri: "https://example.com" },
    ]);
    assertValidRecord();
  });

  it("supports a media-only post without facets and a quote without images", async () => {
    await blueskyCreatePost({ did, text: "", images: [image] });
    expect(postedRecord()).not.toHaveProperty("facets");
    assertValidRecord();
    post.mockClear();
    const quote = reference("quoted");
    await blueskyCreatePost({ did, text: "引用", quote });
    expect(postedRecord().embed).toEqual({ $type: "app.bsky.embed.record", record: quote });
    assertValidRecord();
  });

  it("keeps unresolved mentions as text and removes invalid empty DIDs without losing links or tags", async () => {
    resolveHandle.mockRejectedValueOnce(new Error("handle not found"));
    const text = "@missing.bsky.social https://example.com #日本語";
    await blueskyCreatePost({ did, text });
    expect(postedRecord().text).toBe(text);
    const features = postedRecord().facets?.flatMap((facet: AppBskyRichtextFacet.Main) => facet.features);
    expect(features).toEqual([
      { $type: "app.bsky.richtext.facet#link", uri: "https://example.com" },
      { $type: "app.bsky.richtext.facet#tag", tag: "日本語" },
    ]);
    assertValidRecord();
  });

  it("propagates publication failure so the composer can retain its inputs and retry", async () => {
    post.mockRejectedValueOnce(new Error("offline"));
    await expect(blueskyCreatePost({ did, text: "本文 #日本語", langs: ["ja"] })).rejects.toThrow("offline");
    expect(post).toHaveBeenCalledOnce();
  });
});
