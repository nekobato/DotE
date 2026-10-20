import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { setSafeHtml } from "./safeHtml";
import MastodonToot from "@/components/PostItem/MastodonToot.vue";
import MastodonNotification from "@/components/PostItem/MastodonNotification.vue";
import type { MastodonToot as Toot } from "@/types/mastodon";

const attack = '<img src=x onerror="alert(1)">';
const post = {
  id: "post",
  content: attack,
  account: { username: "Alice" },
  media_attachments: [],
  emojis: [],
  url: "https://example.test/@alice/post",
} as unknown as Toot;

describe("provider HTML fail-closed rendering", () => {
  it("uses literal text when the safe native API is unavailable", () => {
    const element = { textContent: "" } as HTMLElement;
    setSafeHtml(element, attack);
    expect(element.textContent).toBe(attack);
    expect(element).not.toHaveProperty("innerHTML");
  });

  it("uses literal text when the native safe parser rejects input", () => {
    const element = {
      textContent: "",
      setHTML: () => {
        throw new Error("unsupported");
      },
    } as unknown as HTMLElement;
    setSafeHtml(element, attack);
    expect(element.textContent).toBe(attack);
  });

  it("keeps both real components inert during SSR before native mounting", async () => {
    const toot = await renderToString(createSSRApp(MastodonToot, { post, lineStyle: "all", showActions: false }));
    const notification = await renderToString(
      createSSRApp(MastodonNotification, { type: "mention", post, by: post.account, lineStyle: "all" }),
    );
    for (const html of [toot, notification]) {
      expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
      expect(html).not.toContain("<img src=x");
    }
  });
});
