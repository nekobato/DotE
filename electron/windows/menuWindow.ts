import { join } from "path";
import { BrowserWindow } from "electron";
import { pageRoot, preload } from "../static";

const pageName = "/menu";

export function createMenuWindow() {
  const win = new BrowserWindow({
    x: 0,
    y: 0,
    width: 250,
    height: 32,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      preload: preload,
    },
    frame: false,
    transparent: true,
    hasShadow: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    roundedCorners: false,
  });

  win.setVisibleOnAllWorkspaces(true);

  if (process.env.NODE_ENV === "development") {
    win.loadURL(join(pageRoot.development, "#", pageName));
    // win.webContents.openDevTools();
  } else {
    win.loadFile(join(pageRoot.production), { hash: pageName });
  }

  return win;
}
