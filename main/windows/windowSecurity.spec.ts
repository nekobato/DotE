import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserWindow, IpcMainEvent } from "electron";
import { isAppDocument } from "../../shared/appDocument";
import { secureApplicationWindow, trustedIpcHandler } from "./windowSecurity";

const { openExternal } = vi.hoisted(() => ({ openExternal: vi.fn() }));
vi.mock("electron", () => ({ shell: { openExternal } }));
vi.mock("../static", () => ({ isDevelopment: false, pageRoot: { production: "/application/index.html" } }));

const documentUrl = "file:///application/index.html";
function setup() {
  const handlers = new Map<string, (...args: any[]) => void>();
  const mainFrame = { url: `${documentUrl}#/post/create` };
  const contents = {
    mainFrame,
    isDestroyed: () => false,
    once: vi.fn(),
    on: (name: string, handler: (...args: any[]) => void) => handlers.set(name, handler),
    setWindowOpenHandler: vi.fn(),
  };
  secureApplicationWindow({ webContents: contents } as unknown as BrowserWindow, documentUrl);
  const event = { sender: contents, senderFrame: mainFrame } as unknown as IpcMainEvent;
  return { contents, event, handlers };
}

beforeEach(() => vi.clearAllMocks());

describe("application document authority", () => {
  it.each(["#/main", "#/post/create", "#/media-viewer"])("allows the exact app document with route %s", (hash) => {
    expect(isAppDocument(documentUrl + hash, documentUrl)).toBe(true);
  });
  it.each([
    "file:///application/index.html/other",
    "file:///application/index.html?remote=1",
    "file:///application/other.html",
    "https://remote.test",
    "about:blank",
  ])("rejects a different document: %s", (value) => expect(isAppDocument(value, documentUrl)).toBe(false));
  it("restricts the development server to its configured entry document", () => {
    const expected = "http://localhost:5173/";
    expect(isAppDocument(expected + "#/post/create", expected)).toBe(true);
    for (const value of [
      "http://localhost:5173/remote",
      "http://localhost:5174/",
      "http://localhost:5173/?remote=1",
      "http://localhost:5173.evil.test/",
    ]) {
      expect(isAppDocument(value, expected)).toBe(false);
    }
  });

  it("authorizes the real registered top frame before dispatch", async () => {
    const { event } = setup();
    const handler = vi.fn(async (_name: string, payload: string) => JSON.parse(payload));
    const guarded = trustedIpcHandler(handler);
    expect(await guarded(event, "db:upsert-user", '{"token":"valid"}')).toEqual({ token: "valid" });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("rejects foreign, navigated, null and child frames before parsing or dispatch", () => {
    const { contents, event } = setup();
    const handler = vi.fn((_name: string, payload: string) => JSON.parse(payload));
    const guarded = trustedIpcHandler(handler);
    const invalidEvents = [
      { ...event, sender: { ...contents } },
      { ...event, senderFrame: null },
      { ...event, senderFrame: { url: documentUrl } },
    ];
    for (const invalid of invalidEvents) guarded(invalid as IpcMainEvent, "api", "not JSON");
    contents.mainFrame.url = "https://remote.test/";
    guarded(event, "api", "not JSON");
    expect(handler).not.toHaveBeenCalled();
  });

  it("blocks navigation, redirects, child frames and popups while routing web links externally", () => {
    const { handlers, contents } = setup();
    const preventDefault = vi.fn();
    handlers.get("will-frame-navigate")!({ preventDefault, isMainFrame: true, url: "https://remote.test/path" });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(openExternal).toHaveBeenCalledExactlyOnceWith("https://remote.test/path");
    handlers.get("will-frame-navigate")!({ preventDefault, isMainFrame: false, url: "https://frame.test" });
    handlers.get("will-frame-navigate")!({ preventDefault, isMainFrame: true, url: "custom:handler" });
    expect(openExternal).toHaveBeenCalledOnce();
    handlers.get("will-redirect")!({ preventDefault }, "https://remote.test");
    const popup = contents.setWindowOpenHandler.mock.calls[0][0];
    expect(popup({ url: "javascript:alert(1)" })).toEqual({ action: "deny" });
    expect(openExternal).toHaveBeenCalledOnce();
  });
});
