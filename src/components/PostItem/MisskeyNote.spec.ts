import { describe, expect, it, vi } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import type { MisskeyNote as Note } from "@shared/types/misskey";
import MisskeyNote from "./MisskeyNote.vue";

vi.mock("./MisskeyNoteContent.vue", () => ({ default: { inheritAttrs: false, render: () => null } }));
vi.mock("./PostActionDropdown.vue", () => ({ default: { inheritAttrs: false, render: () => null } }));

const original = {
  id: "original",
  createdAt: "2026-10-01T00:00:00.000Z",
  text: "Original",
  renoteId: null,
  repliesCount: 7,
  renoteCount: 12,
  reactions: {},
  reactionEmojis: {},
} as Note;

async function render(post: Note) {
  const html = await renderToString(
    createSSRApp(MisskeyNote, { post, emojis: [], lineStyle: "all", hideCw: false, showReactions: false }),
  );
  return { html, text: html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ") };
}

describe("Misskey note counts in the timeline", () => {
  it("displays replies and combined Renotes/quotes with visible labels", async () => {
    const { text, html } = await render(original);
    expect(text).toContain("返信 7");
    expect(text).toContain("Renote・引用 12");
    expect(html).toContain('title="Renoteと引用の合計"');
  });

  it("displays zero counts without hiding them", async () => {
    const { text } = await render({ ...original, repliesCount: 0, renoteCount: 0 });
    expect(text).toContain("返信 0");
    expect(text).toContain("Renote・引用 0");
  });

  it("does not invent counts when the API omits them", async () => {
    const { html } = await render({ ...original, repliesCount: undefined, renoteCount: undefined } as unknown as Note);
    expect(html).not.toContain('class="note-stats"');
  });

  it("displays the referenced note's counts on a pure Renote", async () => {
    const { text } = await render({
      ...original,
      id: "shared",
      text: null,
      renoteId: "original",
      renote: original,
      repliesCount: 0,
      renoteCount: 0,
    });
    expect(text).toContain("返信 7");
    expect(text).toContain("Renote・引用 12");
  });

  it("displays a CW-only quote's counts without mixing in the original counts", async () => {
    const { text } = await render({
      ...original,
      id: "quoted",
      text: null,
      cw: "Spoiler",
      renoteId: "original",
      renote: original,
      repliesCount: 2,
      renoteCount: 4,
    });
    expect(text).toContain("返信 2");
    expect(text).toContain("Renote・引用 4");
    expect(text).not.toContain("返信 7");
  });
});
