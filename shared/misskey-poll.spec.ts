import { describe, expect, it } from "vitest";
import {
  canVoteMisskeyPoll,
  createMisskeyPollDraft,
  isMisskeyPollExpired,
  normalizeMisskeyPoll,
  type MisskeyPollInput,
} from "./misskey-poll";

describe("Misskey poll creation", () => {
  it("normalizes choices while keeping multiple selection and the deadline in milliseconds", () => {
    expect(normalizeMisskeyPoll({ choices: [" はい ", "いいえ🌸"], multiple: true, expiredAfter: 300_000 })).toEqual({
      choices: ["はい", "いいえ🌸"],
      multiple: true,
      expiredAfter: 300_000,
    });
  });
  it("defaults to single selection without imposing a deadline", () => {
    expect(normalizeMisskeyPoll({ choices: ["A", "B"] })).toEqual({ choices: ["A", "B"], multiple: false });
    const draft = createMisskeyPollDraft();
    draft.choices[0] = "changed";
    expect(createMisskeyPollDraft()).toEqual({ choices: ["", ""], multiple: false, expiredAfter: null });
  });
  it("accepts ten choices and counts astral emoji as one character", () => {
    expect(
      normalizeMisskeyPoll({ choices: ["🌸".repeat(50), ...Array.from({ length: 9 }, (_, i) => `${i}`)] }).choices,
    ).toHaveLength(10);
  });
  it.each([
    { choices: ["A"] },
    { choices: Array.from({ length: 11 }, (_, i) => `${i}`) },
    { choices: ["A", " "] },
    { choices: ["A", " A "] },
    { choices: ["🌸".repeat(51), "B"] },
    { choices: ["A", "B"], expiredAfter: 0 },
    { choices: ["A", "B"], expiredAfter: 0.5 },
    { choices: ["A", "B"], expiresAt: Date.now() - 1 },
    { choices: ["A", "B"], expiresAt: Date.now() + 60_000, expiredAfter: 60_000 },
  ])("rejects invalid drafts: %j", (poll) => {
    expect(() => normalizeMisskeyPoll(poll as MisskeyPollInput)).toThrow(/投票|選択肢/);
  });
});

describe("Misskey poll voting", () => {
  const poll = {
    multiple: false,
    choices: [
      { text: "A", votes: 1, isVoted: true },
      { text: "B", votes: 2, isVoted: false },
    ],
  };
  it("blocks all choices after a single-choice vote", () => {
    expect(canVoteMisskeyPoll(poll, 0)).toBe(false);
    expect(canVoteMisskeyPoll(poll, 1)).toBe(false);
  });
  it("allows only unvoted choices on a multiple-choice poll", () => {
    expect(canVoteMisskeyPoll({ ...poll, multiple: true }, 0)).toBe(false);
    expect(canVoteMisskeyPoll({ ...poll, multiple: true }, 1)).toBe(true);
  });
  it("expires at the deadline and rejects invalid choice indexes", () => {
    const deadline = "2026-10-05T12:00:00.000Z";
    const expiresAt = Date.parse(deadline);
    const open = { ...poll, multiple: true, expiresAt: deadline };
    expect(isMisskeyPollExpired(open, expiresAt - 1)).toBe(false);
    expect(isMisskeyPollExpired(open, expiresAt)).toBe(true);
    for (const index of [-1, 2, 0.5]) expect(canVoteMisskeyPoll(open, index, expiresAt - 1)).toBe(false);
    expect(canVoteMisskeyPoll(open, 1, expiresAt)).toBe(false);
    expect(isMisskeyPollExpired(poll)).toBe(false);
  });
});
