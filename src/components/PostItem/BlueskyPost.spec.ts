import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import type { AppBskyFeedDefs } from "@atproto/api";
import BlueskyPost from "./BlueskyPost.vue";

vi.mock("@iconify/vue", () => ({ Icon: { render: () => null } }));
vi.mock("./PostActionDropdown.vue", async () => {
  const { h } = await import("vue");
  return {
    default: {
      props: ["actions"],
      setup: (props: { actions: { label: string; disabled?: boolean }[] }) => () =>
        h(
          "div",
          props.actions.map((action) => h("button", { disabled: action.disabled }, action.label)),
        ),
    },
  };
});

const feed = (repost?: string): AppBskyFeedDefs.FeedViewPost => ({
  post: {
    uri: "at://did:plc:author/app.bsky.feed.post/post",
    cid: "cid",
    author: { did: "did:plc:author", handle: "author.example" },
    record: { $type: "app.bsky.feed.post", text: "Test", createdAt: "2026-10-01T00:00:00Z" },
    indexedAt: "2026-10-01T00:00:00Z",
    repostCount: 2,
    viewer: { ...(repost ? { repost } : {}) },
  },
});

const render = (post: AppBskyFeedDefs.FeedViewPost, props: Record<string, unknown> = {}) =>
  renderToString(createSSRApp({ render: () => h(BlueskyPost, { post, lineStyle: "all", ...props }) }));

describe("Bluesky repost controls", () => {
  it("offers distinct native repost and quote actions and exposes the count", async () => {
    const html = await render(feed());
    expect(html).toContain('aria-pressed="false" aria-label="リポスト"');
    expect(html).toContain('<span class="count"');
    expect(html).toMatch(/title="Reposts: 2"[^>]*>.*?<span class="count"[^>]*>2<\/span>/);
    expect(html).toContain(">リポスト</button>");
    expect(html).toContain(">引用</button>");
  });

  it("offers unrepost and still allows quoting a reposted post", async () => {
    const html = await render(feed("my-repost"));
    expect(html).toContain('aria-pressed="true" aria-label="リポスト解除"');
    expect(html).toContain(">リポスト解除</button>");
    expect(html).toContain(">引用</button>");
  });

  it("disables the native action during a pending request while keeping quote available", async () => {
    const html = await render(feed(), { repostPending: true });
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="リポスト"/);
    expect(html).toContain("<button disabled>リポスト処理中</button>");
    expect(html).toContain("<button>引用</button>");
  });

  it("uses known repost state for notification records that have no viewer", async () => {
    const post = feed();
    delete post.post.viewer;
    expect(await render(post, { repostUri: "my-repost" })).toContain('aria-pressed="true"');
    expect(await render(post, { repostUri: null })).toContain('aria-pressed="false"');
  });

  it("keeps read-only composer previews free of repost and quote actions", async () => {
    const html = await render(feed(), { showActions: false, showReactions: false });
    expect(html).not.toContain(">引用</button>");
    expect(html).not.toContain("aria-pressed");
    expect(html).toContain(">投稿を開く</button>");
  });

  it("renders the quoting author's text and the quoted text once each", async () => {
    const post = feed();
    post.post.record = { $type: "app.bsky.feed.post", text: "自分のコメント", createdAt: "2026-10-01T00:00:00Z" };
    post.post.embed = {
      $type: "app.bsky.embed.record#view",
      record: {
        $type: "app.bsky.embed.record#viewRecord",
        uri: "at://did:plc:other/app.bsky.feed.post/quoted",
        cid: "quoted-cid",
        author: { did: "did:plc:other", handle: "other.example" },
        value: { $type: "app.bsky.feed.post", text: "引用元の本文", createdAt: "2026-10-01T00:00:00Z" },
        indexedAt: "2026-10-01T00:00:00Z",
      },
    };
    const html = await render(post);
    expect(html.split("自分のコメント")).toHaveLength(2);
    expect(html.split("引用元の本文")).toHaveLength(2);
  });
});
