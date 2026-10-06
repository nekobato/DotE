import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { MisskeyNote } from "@shared/types/misskey";
import { useMisskeyNote } from "./useMisskeyNote";
import { useMisskeyReactions } from "./useMisskeyReactions";

function note(overrides: Partial<MisskeyNote> = {}): MisskeyNote {
  return {
    id: "original",
    text: "Original note",
    cw: null,
    replyId: null,
    renoteId: null,
    fileIds: [],
    files: [],
    poll: null,
    repliesCount: 7,
    renoteCount: 12,
    reactions: { "👍": 3, ":custom:": 2 },
    reactionEmojis: { custom: "https://original.example/emoji.png" },
    myReaction: "👍",
    ...overrides,
  } as MisskeyNote;
}

function renote(overrides: Partial<MisskeyNote> = {}): MisskeyNote {
  return note({
    id: "shared",
    renoteId: "original",
    renote: note(),
    text: null,
    repliesCount: 2,
    renoteCount: 4,
    reactions: { "❤️": 1, ":custom:": 1 },
    reactionEmojis: { custom: "https://quote.example/emoji.png" },
    myReaction: null,
    ...overrides,
  });
}

const quoteContent: [string, Partial<MisskeyNote>][] = [
  ["text", { text: "My comment" }],
  ["empty text", { text: "" }],
  ["CW only", { cw: "Spoiler" }],
  ["empty CW", { cw: "" }],
  ["attachment only", { fileIds: ["image"] }],
  ["poll only", { poll: { multiple: false, choices: [{ text: "Yes", votes: 0, isVoted: false }] } }],
  ["reply", { replyId: "reply-target" }],
];

describe("Misskey note classification and displayed counts", () => {
  const poll = { multiple: false, choices: [{ text: "Yes", votes: 0, isVoted: false }] };

  it("keeps a poll-only composer preview out of clickable attachments without requiring a note URL", () => {
    const result = useMisskeyNote(note({ id: undefined, poll }));
    expect(result.postAttachments.value).toEqual([]);
    expect(result.displayNote.value.poll).toEqual(poll);
  });

  it("keeps media alongside a poll without adding a duplicate poll attachment", () => {
    const file = {
      type: "image/png",
      url: "https://misskey.example/image.png",
      properties: { width: 640, height: 480 },
      isSensitive: false,
    } as NonNullable<MisskeyNote["files"]>[number];
    const result = useMisskeyNote(renote({ renote: note({ poll, files: [file] }) }));
    expect(result.postAttachments.value).toEqual([
      {
        type: "image",
        url: file.url,
        thumbnailUrl: "",
        size: { width: 640, height: 480 },
        isSensitive: false,
      },
    ]);
    expect(result.displayNote.value.poll).toEqual(poll);
  });

  it.each([
    ["note", {}],
    ["reply", { replyId: "reply-target" }],
  ] as const)("keeps a regular %s as its own displayed note", (type, overrides) => {
    const result = useMisskeyNote(note(overrides));
    expect(result.postType.value).toBe(type);
    expect(result.displayNote.value.id).toBe("original");
  });

  it("uses the original note's counts for a pure Renote", () => {
    const result = useMisskeyNote(renote());
    expect(result.postType.value).toBe("renote");
    expect(result.renoteType.value).toBe("renoted");
    expect(result.displayNote.value).toMatchObject({ id: "original", repliesCount: 7, renoteCount: 12 });
  });

  it.each(quoteContent)("keeps a quote with %s and its own counts", (_label, content) => {
    const result = useMisskeyNote(renote(content));
    expect(result.postType.value).toBe("quote");
    expect(result.renoteType.value).toBe("quoted");
    expect(result.displayNote.value).toMatchObject({ id: "shared", repliesCount: 2, renoteCount: 4 });
  });

  it("preserves classification when the referenced note is unavailable", () => {
    const post = renote({ renote: undefined });
    expect(useMisskeyNote(post).postType.value).toBe("renote");
    expect(useMisskeyNote(post).displayNote.value).toBe(post);
    expect(useMisskeyNote({ ...post, cw: "Comment" }).postType.value).toBe("quote");
  });

  it("updates classification and counts when the post or its contents change", () => {
    const post = ref(renote());
    const result = useMisskeyNote(post);
    expect(result.displayNote.value.repliesCount).toBe(7);
    post.value.renote!.repliesCount = 8;
    expect(result.displayNote.value.repliesCount).toBe(8);
    post.value.fileIds!.push("image");
    expect(result.postType.value).toBe("quote");
    expect(result.displayNote.value.id).toBe("shared");
    post.value = note({ repliesCount: 0, renoteCount: 0 });
    expect(result.postType.value).toBe("note");
    expect(result.displayNote.value.repliesCount).toBe(0);
  });
});

describe("Misskey reactions follow the displayed note", () => {
  it("shows the original note's reactions and viewer state for a pure Renote", () => {
    const result = useMisskeyReactions(renote(), []);
    expect(result.reactions.value).toContainEqual({ name: "👍", count: 3, isRemote: false });
    expect(result.reactions.value).not.toContainEqual({ name: "❤️", count: 1, isRemote: false });
    expect(result.reactions.value.find((reaction) => reaction.name === ":custom:")?.url).toBe(
      "https://original.example/emoji.png",
    );
    expect(result.isReacted("👍")).toBe(true);
  });

  it.each(quoteContent)(
    "shows the quote's reactions for %s without inheriting the original viewer state",
    (_label, content) => {
      const result = useMisskeyReactions(renote(content), []);
      expect(result.reactions.value).toContainEqual({ name: "❤️", count: 1, isRemote: false });
      expect(result.reactions.value.find((reaction) => reaction.name === ":custom:")?.url).toBe(
        "https://quote.example/emoji.png",
      );
      expect(result.isReacted("👍")).toBe(false);
    },
  );
});
