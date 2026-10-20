import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveUploadFileData } from "./helpers";
import { mastodonUploadMedia } from "./mastodon";
import { misskeyUploadFile } from "./misskey";
import { blueskyUploadImage } from "./bluesky";

const { fetch, readFile, restore, uploadBlob } = vi.hoisted(() => ({
  fetch: vi.fn(),
  readFile: vi.fn(),
  restore: vi.fn(),
  uploadBlob: vi.fn(),
}));
vi.mock("electron-fetch", () => ({ default: fetch }));
vi.mock("node:fs/promises", () => ({ readFile }));
vi.mock("../db", () => ({ getInstanceMetaCache: vi.fn(), setInstanceMetaCache: vi.fn() }));
vi.mock("../oauth/client", () => ({ getBlueskyOAuthClient: async () => ({ restore }) }));
vi.mock("../oauth/agent", () => ({ createBlueskyAgent: () => ({ uploadBlob }) }));

beforeEach(() => {
  vi.clearAllMocks();
  restore.mockResolvedValue({ did: "did:plc:test" });
});
const account = { instanceUrl: "https://receiver.test", token: "unused", did: "did:plc:test", fileType: "image/png" };

describe("upload filesystem boundary", () => {
  it.each([mastodonUploadMedia, misskeyUploadFile, blueskyUploadImage])(
    "rejects every API's native path request before any file read or upload",
    async (upload) => {
      for (const filePath of ["/etc/hosts", "../private/key", "file:///etc/hosts", ""]) {
        for (const fileDataBase64 of [undefined, Buffer.from("selected").toString("base64")]) {
          await expect(upload({ ...account, filePath, fileDataBase64 })).rejects.toThrow("ファイルパス");
        }
      }
      expect(readFile).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(uploadBlob).not.toHaveBeenCalled();
    },
  );

  it.each(["aGVsbG8=", "data:image/png;base64,aGVsbG8="])("accepts renderer bytes: %s", async (fileDataBase64) => {
    expect(
      await resolveUploadFileData({ fileDataBase64, fileName: "selected.png", fallbackFileName: "upload" }),
    ).toEqual({ data: Buffer.from("hello"), filename: "selected.png" });
    expect(readFile).not.toHaveBeenCalled();
  });

  it("preserves a selected zero-byte file and rejects missing bytes", async () => {
    expect(await resolveUploadFileData({ fileDataBase64: "", fallbackFileName: "empty" })).toEqual({
      data: Buffer.alloc(0),
      filename: "empty",
    });
    await expect(resolveUploadFileData({ fallbackFileName: "missing" })).rejects.toThrow("ファイルデータ");
  });
});
