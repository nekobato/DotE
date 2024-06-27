import { join } from "path";
import { BrowserWindow } from "electron";
import { pageRoot, preload } from "../static";

const pageName = "/media-viewer";

export function createMediaViewerWindow() {
  const win = new BrowserWindow({
    show: false,
    resizable: true,
    webPreferences: {
      preload: preload,
    },
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    center: true,
    focusable: true,
    roundedCorners: false,
  });

  win.visibleOnAllWorkspaces = true;

  if (process.env.NODE_ENV === "development") {
    win.loadURL(pageRoot.development + "#" + pageName);
    // win.webContents.openDevTools();
  } else {
    win.loadFile(join(pageRoot.production), { hash: pageName });
  }

  return win;
}
