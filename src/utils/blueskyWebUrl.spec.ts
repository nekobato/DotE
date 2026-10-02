import { describe, expect, it } from "vitest";
import { resolveBlueskyPostUrl, resolveBlueskyProfileUrl } from "./blueskyWebUrl";

describe("Bluesky web links", () => {
  it("resolves a persisted post URI using its repository identity without a handle lookup", () => {
    const did = "did:plc:author";
    const uri = `at://${did}/app.bsky.feed.post/3k4duaz5vfs2b`;
    expect(resolveBlueskyProfileUrl(did)).toBe("https://bsky.app/profile/did:plc:author");
    expect(resolveBlueskyPostUrl(uri)).toBe("https://bsky.app/profile/did:plc:author/post/3k4duaz5vfs2b");
  });

  it("supports did:web accounts without treating their host as the web UI", () => {
    const did = "did:web:pds.example:users:alice";
    expect(resolveBlueskyProfileUrl(did)).toBe(`https://bsky.app/profile/${did}`);
    expect(resolveBlueskyPostUrl(`at://${did}/app.bsky.feed.post/3k4duaz5vfs2b`)).toBe(
      `https://bsky.app/profile/${did}/post/3k4duaz5vfs2b`,
    );
  });

  it("opens the original post record rather than a repost activity record", () => {
    const postUri = "at://did:plc:author/app.bsky.feed.post/original";
    const repostUri = "at://did:plc:reposter/app.bsky.feed.repost/activity";
    expect(resolveBlueskyPostUrl(postUri)).toBe("https://bsky.app/profile/did:plc:author/post/original");
    expect(resolveBlueskyPostUrl(repostUri)).toBeUndefined();
  });

  it.each([
    "",
    "not-an-at-uri",
    "author.bsky.social/app.bsky.feed.post/record",
    "https://pds.example/app.bsky.feed.post/record",
    "at://did:plc:author/app.bsky.feed.like/record",
    "at://did:plc:author/app.bsky.feed.post/",
    "at://did:plc:author/app.bsky.feed.post/record/extra",
    "at://did:plc:author/app.bsky.feed.post/record?query=1",
    "at://did:plc:author/app.bsky.feed.post/record#fragment",
    "at://did:plc:author/app.bsky.feed.post/.",
    "at://did:plc:author/app.bsky.feed.post/..",
  ])("does not invent a post link for an invalid or non-post record: %s", (uri) => {
    expect(resolveBlueskyPostUrl(uri)).toBeUndefined();
  });
});
