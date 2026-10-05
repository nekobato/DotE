import { describe, expect, it } from "vitest";
import type { ApiErrorPayload } from "./types/ipc";
import {
  describeMisskeyManagementError,
  isMisskeyNoteState,
  isUnsupportedMisskeyOperation,
} from "./misskey-note-management";

const error = (status: number, code?: string): ApiErrorPayload => ({
  type: "http",
  status,
  message: "fixture",
  bodyPreview: code ? JSON.stringify({ error: { code } }) : "Not found",
});

describe("Misskey operation fallback", () => {
  it.each([error(404), error(404, "NO_SUCH_ENDPOINT"), error(405), error(501)])(
    "identifies an unsupported endpoint: %j",
    (failure) => {
      expect(isUnsupportedMisskeyOperation(failure)).toBe(true);
      expect(describeMisskeyManagementError(failure)).toContain("利用できません");
    },
  );
  it.each(["NO_SUCH_NOTE", "NO_SUCH_CLIP"])(
    "does not confuse a missing resource %s with an unsupported API",
    (code) => {
      expect(isUnsupportedMisskeyOperation(error(404, code))).toBe(false);
      expect(describeMisskeyManagementError(error(404, code))).toContain("見つかりません");
    },
  );
  it.each([401, 403, 429])("explains permissions or rate limiting: %s", (status) => {
    expect(describeMisskeyManagementError(error(status))).toContain(status === 429 ? "しばらく" : "権限");
  });
  it("recognizes an already clipped note and clip capacity", () => {
    expect(describeMisskeyManagementError(error(400, "ALREADY_CLIPPED"))).toContain("既に");
    expect(describeMisskeyManagementError(error(400, "TOO_MANY_CLIP_NOTES"))).toContain("上限");
  });
  it("handles malformed errors and state without treating them as success", () => {
    expect(describeMisskeyManagementError({ type: "network", message: "offline" })).toContain("通信");
    expect(isMisskeyNoteState({ isFavorited: true })).toBe(false);
    expect(isMisskeyNoteState({ isFavorited: "false", isMutedThread: false })).toBe(false);
    expect(isMisskeyNoteState(null)).toBe(false);
    expect(isMisskeyNoteState({ isFavorited: false, isMutedThread: true })).toBe(true);
  });
});
