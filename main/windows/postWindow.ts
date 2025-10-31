import { join } from "path";
import { BrowserWindow } from "electron";
import { isDevelopment, pageRoot, preload } from "../static";

const pageName = "/post";

export function createPostWindow() {
  const win = new BrowserWindow({
    x: 0,
    y: 0,
    height: 320,
    width: 540,
    show: false,
    resizable: true,
    webPreferences: {
      preload: preload,
    },
    useContentSize: false,
    center: true,
    frame: false,
    transparent: false,
    hasShadow: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    fullscreenable: false,
    titleBarStyle: "hidden",
    titleBarOverlay: true,
    trafficLightPosition: { x: 8, y: 12 },
  });

  if (isDevelopment) {
    win.loadURL(pageRoot.development + "#" + pageName);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(join(pageRoot.production), { hash: pageName });
  }

  win.on("close", (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
}
