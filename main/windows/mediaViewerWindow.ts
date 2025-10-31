import { join } from "path";
import { BrowserWindow } from "electron";
import { isDevelopment, pageRoot, preload } from "../static";

const pageName = "/media-viewer";

export function createMediaViewerWindow() {
  const win = new BrowserWindow({
    show: false,
    resizable: true,
    webPreferences: {
      preload: preload,
      devTools: isDevelopment,
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

  if (isDevelopment) {
    win.loadURL(pageRoot.development + "#" + pageName);
    // win.webContents.openDevTools();
  } else {
    win.loadFile(join(pageRoot.production), { hash: pageName });
  }

  return win;
}
