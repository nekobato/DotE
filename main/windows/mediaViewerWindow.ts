import { join } from "path";
import { BrowserWindow } from "electron";
import { isDevelopment, pageRoot, preload } from "../static";
import { applicationArguments, secureApplicationWindow } from "./windowSecurity";

const pageName = "/media-viewer";

export function createMediaViewerWindow() {
  const win = new BrowserWindow({
    show: false,
    resizable: true,
    webPreferences: {
      preload: preload,
      additionalArguments: applicationArguments(),
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

  secureApplicationWindow(win);
  win.visibleOnAllWorkspaces = true;

  if (isDevelopment) {
    win.loadURL(pageRoot.development + "#" + pageName);
    // win.webContents.openDevTools();
  } else {
    win.loadFile(join(pageRoot.production), { hash: pageName });
  }

  return win;
}
