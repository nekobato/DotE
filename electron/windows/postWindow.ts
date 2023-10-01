import { join } from "path";
import { BrowserWindow } from "electron";
import { pageRoot, preload } from "../static";

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
      nodeIntegration: true,
      preload: preload,
    },
    useContentSize: false,
    center: true,
    frame: true,
    transparent: false,
    hasShadow: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    fullscreenable: false,
    roundedCorners: false,
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL(join(pageRoot.development, "#", pageName));
    // win.webContents.openDevTools();
  } else {
    win.loadFile(join(pageRoot.production), { hash: pageName });
  }

  // close to hide
  // win.on("close", (e) => {
  //   e.preventDefault();
  //   win.hide();
  // });

  return win;
}
