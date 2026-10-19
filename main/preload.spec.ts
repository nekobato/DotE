import { afterEach, describe, expect, it, vi } from "vitest";

const { exposeInMainWorld } = vi.hoisted(() => ({ exposeInMainWorld: vi.fn() }));
vi.mock("electron", () => ({ contextBridge: { exposeInMainWorld }, ipcRenderer: {}, webUtils: {} }));
afterEach(() => vi.unstubAllGlobals());

describe("preload bridge exposure", () => {
  it.each([
    [true, "file:///app/index.html#/post/create", true],
    [true, "https://remote.test/", false],
    [true, "file:///app/other.html", false],
    [false, "file:///app/index.html", false],
  ])("mainFrame=%s document=%s exposes bridge=%s", async (isMainFrame, href, exposed) => {
    vi.resetModules();
    exposeInMainWorld.mockClear();
    vi.stubGlobal("process", { ...process, argv: ["--dote-document-url=file:///app/index.html"], isMainFrame });
    vi.stubGlobal("location", { href });
    await import("./preload");
    expect(exposeInMainWorld).toHaveBeenCalledTimes(exposed ? 1 : 0);
  });
});
