import { join } from "path";
import { BrowserWindow } from "electron";
import { format } from "url";
import { indexHtml, preloadJs } from "../static";

const pageName = "menu";

export function createMenuWindow() {
  const menuWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: 250,
    height: 32,
    show: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      preload: preloadJs,
    },
    frame: false,
    transparent: true,
    hasShadow: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    roundedCorners: false,
  });

  if (process.env.NODE_ENV === "development") {
    menuWindow.loadURL(`${indexHtml}#/${pageName}`);
    // menuWindow.webContents.openDevTools();
  } else {
    menuWindow.loadURL(
      format({
        protocol: "app",
        slashes: true,
        pathname: `${indexHtml}#/${pageName}`,
      }),
    );
  }
  return menuWindow;
}
