import { describe, expect, it, vi } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import type { MisskeyEntities, MisskeyNote } from "@shared/types/misskey";
import MisskeyNoteContent from "./MisskeyNoteContent.vue";
import MisskeyIdentity from "../misskey/MisskeyIdentity.vue";
import MisskeyNotification from "./MisskeyNotification.vue";

vi.mock("@iconify/vue", () => ({ Icon: { render: () => null } }));
vi.mock("../misskey/Mfm.vue", () => ({ default: { render: () => null } }));
vi.mock("./MisskeyPoll.vue", () => ({ default: { render: () => null } }));

const attack = "<svg onload=\"window.ipc.invoke('db:get-users')\"> & 🌸";
const escaped = "&lt;svg onload=&quot;window.ipc.invoke(&#39;db:get-users&#39;)&quot;&gt; &amp; 🌸";
const user = { id: "user", name: "Alice", username: "alice", host: null, avatarUrl: "" } as MisskeyNote["user"];
const note = { id: "note", user, text: "Body", reactionEmojis: {} } as MisskeyNote;

describe("Misskey identity rendering", () => {
  it("escapes an unsolicited reaction notification's origin identity", async () => {
    const notification = {
      id: "notification",
      type: "reaction",
      reaction: "🌸",
      createdAt: "2026-10-19T00:00:00Z",
      user: { ...user, name: attack },
      note,
    } as MisskeyEntities.Notification;
    const html = await renderToString(
      createSSRApp(MisskeyNotification, {
        notification,
        emojis: [],
        lineStyle: "all",
        hideCw: false,
      }),
    );
    expect(html).toContain(escaped);
    expect(html).not.toContain("<svg");
  });
  it.each(["name", "username"])("renders both primary and notification-origin %s as text", async (field) => {
    const identity = { ...user, name: null, [field]: attack };
    const html = await renderToString(
      createSSRApp(MisskeyNoteContent, {
        type: "reaction",
        note: { ...note, user: identity },
        originUser: identity,
        emojis: [],
        lineStyle: "all",
        hideCw: false,
      }),
    );
    expect(html.split(escaped)).toHaveLength(3);
    expect(html).not.toContain("<svg");
  });

  it("preserves literal punctuation, known emojis, unknown codes and web links", async () => {
    const html = await renderToString(
      createSSRApp(MisskeyIdentity, {
        text: "Alice & <Bob> :flower: :unknown: https://example.test/?a=1&b=2",
        emojis: [{ name: "flower", url: "https://example.test/flower.png" }],
      }),
    );
    expect(html).toContain("Alice &amp; &lt;Bob&gt;");
    expect(html).toContain('class="emoji" src="https://example.test/flower.png" alt=":flower:"');
    expect(html).toContain(":unknown:");
    expect(html).toContain('href="https://example.test/?a=1&amp;b=2"');
  });

  it.each([
    'https://example.test/x" onerror="alert(1)',
    "javascript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
  ])("keeps emoji URLs inert: %s", async (url) => {
    const html = await renderToString(
      createSSRApp(MisskeyIdentity, { text: ":evil:", emojis: [{ name: "evil", url }] }),
    );
    expect(html).not.toContain(' onerror="');
    expect(html).not.toContain("<svg");
    expect(html).not.toContain('src="javascript:');
    expect(html).not.toContain('src="data:');
  });

  it("keeps remote emoji precedence over a local emoji with the same name", async () => {
    const html = await renderToString(
      createSSRApp(MisskeyNoteContent, {
        type: "note",
        note: { ...note, user: { ...user, name: ":flower:" }, reactionEmojis: { flower: "https://remote.test/x.png" } },
        emojis: [{ name: "flower", url: "https://local.test/x.png" }],
        lineStyle: "all",
        hideCw: false,
      }),
    );
    expect(html).toContain('src="https://remote.test/x.png"');
    expect(html).not.toContain('src="https://local.test/x.png"');
  });
});
