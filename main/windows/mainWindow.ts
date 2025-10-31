import { join } from "path";
import electron, { BrowserWindow, screen } from "electron";
import { getSettingAll } from "../db";
import { isDevelopment, pageRoot, preload } from "../static";

const pageName = "/main";

export async function createMainWindow() {
  const settings = getSettingAll();
  const win = new BrowserWindow({
    x: 0,
    y: 0,
    width: settings.windowSize.width || 360,
    height: settings.windowSize.height || screen.getPrimaryDisplay().workAreaSize.height - 24, // size of Mac tray size
    minWidth: 360,
    minHeight: 360,
    resizable: true,
    webPreferences: {
      preload: preload,
    },
    frame: true,
    transparent: false,
    hasShadow: false,
    skipTaskbar: false,
    show: true,
    titleBarStyle: "hidden",
    titleBarOverlay: true,
    trafficLightPosition: { x: 8, y: 12 },
    icon: join("build", `app_icon.png`),
  });

  if (isDevelopment) {
    await win.loadURL(pageRoot.development + "#" + pageName);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(join(pageRoot.production), { hash: pageName });
    // win.webContents.openDevTools();
  }

  win.on("ready-to-show", () => {
    win.show();
  });

  win.webContents?.on("will-navigate", (e, url) => {
    e.preventDefault();
    if (!url.startsWith("https://")) return;
    electron.shell.openExternal(url);
  });

  return win;
}
