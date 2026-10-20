import { shell, type BrowserWindow, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from "electron";
import { pathToFileURL } from "node:url";
import { isAppDocument } from "../../shared/appDocument";
import { isDevelopment, pageRoot } from "../static";

const trustedDocuments = new Map<WebContents, string>();

export const appDocumentUrl = (): string =>
  isDevelopment && pageRoot.development ? new URL(pageRoot.development).href : pathToFileURL(pageRoot.production).href;

export const applicationArguments = (): string[] => [`--dote-document-url=${appDocumentUrl()}`];

const openWebLink = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") void shell.openExternal(url.href);
  } catch {
    // A malformed or non-web destination never reaches a native handler.
  }
};

/** Install before the first load so every application window retains its local document. */
export const secureApplicationWindow = (win: BrowserWindow, expected = appDocumentUrl()): void => {
  const contents = win.webContents;
  trustedDocuments.set(contents, expected);
  contents.once("destroyed", () => trustedDocuments.delete(contents));
  contents.on("will-navigate", (event) => event.preventDefault());
  contents.on("will-frame-navigate", (event) => {
    event.preventDefault();
    if (event.isMainFrame) openWebLink(event.url);
  });
  contents.on("will-redirect", (event, url) => {
    if (!isAppDocument(url, expected)) event.preventDefault();
  });
  contents.on("will-attach-webview", (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    openWebLink(url);
    return { action: "deny" };
  });
};

export const isTrustedIpcSender = (event: Pick<IpcMainEvent, "sender" | "senderFrame">): boolean => {
  try {
    const expected = trustedDocuments.get(event.sender);
    return Boolean(
      expected &&
      !event.sender.isDestroyed() &&
      event.senderFrame &&
      event.senderFrame === event.sender.mainFrame &&
      isAppDocument(event.senderFrame.url, expected),
    );
  } catch {
    return false;
  }
};

/** Authorize before parsing renderer data or dispatching any privileged operation. */
export const trustedIpcHandler =
  <Args extends unknown[], Result>(handler: (...args: Args) => Result) =>
  (event: IpcMainEvent | IpcMainInvokeEvent, ...args: Args): Result | undefined => {
    if (!isTrustedIpcSender(event)) return undefined;
    return handler(...args);
  };
