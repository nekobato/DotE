import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import type { AppBskyEmbedRecord, AppBskyFeedPost } from "@atproto/api";
import type { BlueskyNotification as Notification } from "@/types/bluesky";
import BlueskyPostContent from "./BlueskyPostContent.vue";
import BlueskyNotification from "./BlueskyNotification.vue";

vi.mock("@iconify/vue", () => ({ Icon: { render: () => null } }));

const payload = "<img src=x onerror=\"window.ipc.invoke('db:get-users')\"> & 日本語\n次の行";
const escaped = "&lt;img src=x onerror=&quot;window.ipc.invoke(&#39;db:get-users&#39;)&quot;&gt; &amp; 日本語\n次の行";
const author = { did: "did:plc:author", handle: "author.example" };
const record: AppBskyFeedPost.Record = {
  $type: "app.bsky.feed.post",
  text: payload,
  createdAt: "2026-10-19T00:00:00Z",
};
const renderContent = (props: Record<string, unknown>) =>
  renderToString(
    createSSRApp({ render: () => h(BlueskyPostContent, { type: "post", author, lineStyle: "all", ...props }) }),
  );

describe("Bluesky untrusted text rendering", () => {
  it("renders post text as literal text, preserving punctuation, Unicode and newlines", async () => {
    const html = await renderContent({ record });
    expect(html).toContain(escaped);
    expect(html).not.toContain("<img src=x");
  });

  it("renders quoted record text safely when there is no primary record", async () => {
    const quotedRecord: AppBskyEmbedRecord.ViewRecord = {
      uri: "at://did:plc:author/app.bsky.feed.post/quoted",
      cid: "cid",
      author,
      value: record,
      indexedAt: record.createdAt,
    };
    expect(await renderContent({ type: "quoted", quotedRecord })).toContain(escaped);
  });

  it.each(["displayName", "handle"])("escapes the origin author's %s", async (field) => {
    const html = await renderContent({ type: "repost", record, originAuthor: { ...author, [field]: payload } });
    expect(html.split(escaped)).toHaveLength(3);
    expect(html).not.toContain("<img src=x");
  });

  it.each(["mention", "reply", "quote"])("also escapes a real %s notification's embedded post", async (reason) => {
    const notification = {
      uri: "at://did:plc:author/app.bsky.feed.post/example",
      cid: "cid",
      author,
      reason,
      record,
      indexedAt: record.createdAt,
      isRead: false,
    } as Notification;
    const html = await renderToString(createSSRApp(BlueskyNotification, { notification, lineStyle: "all" }));
    expect(html).toContain(escaped);
    expect(html).not.toContain("<img src=x");
  });
});
