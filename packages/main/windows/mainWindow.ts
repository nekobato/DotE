import { join } from "path";
import { BrowserWindow, screen } from "electron";
import url from "node:url";
import path from "node:path";

const pageName = "main/timeline";

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
      webSecurity: false,
      nodeIntegration: true,
      preload: join(__dirname, "../preload/index.cjs"),
    },
    frame: false,
    transparent: true,
    hasShadow: false,
    skipTaskbar: true,
    roundedCorners: false,
    icon: join("build", `app_icon.png`),
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(`http://localhost:3000/index.html#/${pageName}`);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        protocol: "app",
        slashes: true,
        pathname: path.join(__dirname, `../renderer/index.html#/${pageName}`),
      }),
    );
  }
  return mainWindow;
}
