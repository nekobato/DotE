import { beforeEach, describe, expect, it, vi } from "vitest";
import { openExternalWebUrl } from "./externalWebUrl";

const { openExternal } = vi.hoisted(() => ({ openExternal: vi.fn() }));
vi.mock("electron", () => ({ shell: { openExternal } }));
beforeEach(() => openExternal.mockReset().mockResolvedValue(undefined));

describe("external URL protocol boundary", () => {
  it.each([
    "https://example.test/path?q=%2F#fragment",
    "http://localhost:3000/",
    "HTTPS://例え.テスト/path",
    " \tHtTpS://example.test/\n",
  ])("opens a parsed web URL: %s", async (value) => {
    expect(await openExternalWebUrl(value)).toBe(true);
    expect(openExternal).toHaveBeenCalledExactlyOnceWith(new URL(value).href);
  });
  it.each([
    "file:///etc/hosts",
    "custom-handler:action",
    "JavaScript:alert(1)",
    "data:text/html,x",
    "\nCuStOm:action",
    "/relative",
    "//example.test",
    "https://",
    "",
    null,
    {},
    ["https://example.test"],
  ])("never dispatches a non-web or malformed value: %j", async (value) => {
    expect(await openExternalWebUrl(value)).toBe(false);
    expect(openExternal).not.toHaveBeenCalled();
  });
  it("handles a failed OS browser launch without an unhandled rejection", async () => {
    openExternal.mockRejectedValueOnce(new Error("No browser"));
    expect(await openExternalWebUrl("https://example.test")).toBe(false);
  });
});
