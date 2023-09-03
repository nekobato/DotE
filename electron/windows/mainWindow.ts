import { join } from "path";
import { BrowserWindow, screen } from "electron";
import { format } from "url";
import { indexHtml, preloadJs } from "../static";

const pageName = "main";

export function createMainWindow() {
  const mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    height: screen.getPrimaryDisplay().workAreaSize.height - 24, // size of Mac tray size
    minWidth: 360,
    minHeight: 240,
    show: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      preload: preloadJs,
    },
    frame: false,
    transparent: true,
    hasShadow: false,
    skipTaskbar: true,
    roundedCorners: false,
    icon: join("build", `app_icon.png`),
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(`${indexHtml}#/${pageName}`);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      format({
        protocol: "app",
        slashes: true,
        pathname: `${indexHtml}#/${pageName}`,
      }),
    );
  }
  return mainWindow;
}
