import { join } from "path";
import { BrowserWindow } from "electron";
import { format } from "url";
import { indexHtml, preloadJs } from "../static";

const pageName = "post";

export function createPostWindow() {
  const postWindow = new BrowserWindow({
    x: 0,
    y: 0,
    height: 320,
    width: 540,
    show: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      preload: preloadJs,
    },
    useContentSize: false,
    frame: true,
    transparent: false,
    hasShadow: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    fullscreenable: false,
    roundedCorners: false,
  });

  if (process.env.NODE_ENV === "development") {
    postWindow.loadURL(`${indexHtml}#/${pageName}`);
    // postWindow.webContents.openDevTools();
  } else {
    postWindow.loadURL(
      format({
        protocol: "app",
        slashes: true,
        pathname: `${indexHtml}#/${pageName}`,
      }),
    );
  }

  return postWindow;
}
