import { join } from "path";
import { BrowserWindow } from "electron";
import url from "url";

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
      preload: join(__dirname, "../preload/index.cjs"),
    },
    frame: false,
    transparent: true,
    hasShadow: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    roundedCorners: false,
  });

  if (process.env.NODE_ENV === "development") {
    menuWindow.loadURL(`http://localhost:3000/index.html#/${pageName}`);
    // menuWindow.webContents.openDevTools();
  } else {
    menuWindow.loadURL(
      url.format({
        protocol: "app",
        slashes: true,
        pathname: join(__dirname, `../renderer/index.html#/${pageName}`),
      }),
    );
  }
  return menuWindow;
}
