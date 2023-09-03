import { join } from "path";
import { BrowserWindow } from "electron";
import { format } from "url";
import { indexHtml, preloadJs } from "../static";

const pageName = "media-viewer";

export function createMediaViewerWindow() {
  const mediaViewer = new BrowserWindow({
    useContentSize: true,
    show: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      preload: preloadJs,
    },
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    center: true,
    focusable: false,
    roundedCorners: false,
  });

  if (process.env.NODE_ENV === "development") {
    mediaViewer.loadURL(`${indexHtml}#/${pageName}`);
    // mediaViewer.webContents.openDevTools();
  } else {
    mediaViewer.loadURL(
      format({
        protocol: "app",
        slashes: true,
        pathname: `${indexHtml}#/${pageName}`,
      }),
    );
  }
  return mediaViewer;
}
