import electron, { app, BrowserWindow, globalShortcut, ipcMain, Menu, protocol, Tray } from "electron";
import { createMainWindow } from "./windows/mainWindow";
import { createMenuWindow } from "./windows/menuWindow";
import { createPostWindow } from "./windows/postWindow";
import { createMediaViewerWindow } from "./windows/mediaViewerWindow";
import { DEBUG, isMac } from "./env";
import { release } from "os";
import menuTemplate from "./menu";
import { setTrayIcon } from "./tray-icon";
import * as db from "./db";
import { apiRequest } from "./api";
import { autoUpdater } from "electron-updater";
import { Setting } from "packages/shared/types/Store";

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

console.log(isMac);

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let menuWindow: BrowserWindow | null = null;
let mediaViewerWindow: BrowserWindow | null = null;
let postWindow: BrowserWindow | null = null;

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { secure: true, standard: true } }]);

const initialize = async () => {
  const opacity = await db.getSetting("opacity");
  mainWindow?.setOpacity(Number(opacity) / 100);
  const hazyMode = (await db.getSetting("hazyMode")) as Setting["hazyMode"];
  setMainWindowMode(hazyMode);
};

const setMainWindowMode = async (mode: string) => {
  switch (mode) {
    case "show":
    case "settings":
    case "tutorial":
      mainWindow?.show();
      mainWindow?.focus();
      mainWindow?.setAlwaysOnTop(false);
      mainWindow?.setIgnoreMouseEvents(false);
      mainWindow?.setOpacity(1);
      mainWindow?.setVisibleOnAllWorkspaces(false);
      break;
    case "haze":
      const opacity = (await db.getSetting("opacity")) || 50;
      mainWindow?.show();
      mainWindow?.setAlwaysOnTop(true, "floating");
      mainWindow?.setIgnoreMouseEvents(true);
      mainWindow?.setOpacity(Number(opacity) / 100);
      mainWindow?.setVisibleOnAllWorkspaces(true);
      break;
    case "hide":
      mainWindow?.hide();
      break;
  }
};

app.on("ready", async () => {
  autoUpdater.checkForUpdatesAndNotify();

  tray = setTrayIcon();

  tray.on("click", () => {
    if (menuWindow?.isVisible()) {
      menuWindow?.hide();
    } else {
      menuWindow?.show();
    }
  });

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow = createMainWindow();
  menuWindow = createMenuWindow();
  mediaViewerWindow = createMediaViewerWindow();
  postWindow = createPostWindow();

  ipcMain.on("renderer-event", async (_, event: string, payload?: any) => {
    const data = payload ? JSON.parse(payload) : null;
    console.log(event, data);
    switch (event) {
      case "set-hazy-mode":
        setMainWindowMode(data.mode);
        db.setSetting("hazyMode", data.mode);
        mainWindow?.webContents.send("set-hazy-mode", data);
        break;
      case "open-url":
        electron.shell.openExternal(data.url);
        break;
      case "media-viewer:open":
        let maxSize = electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()).workAreaSize;
        mediaViewerWindow?.center();
        mediaViewerWindow?.webContents.send(event, { ...data, maxSize });
        mediaViewerWindow?.show();
        break;
      case "media-viewer:close":
        mediaViewerWindow?.webContents.send(event, data);
        mediaViewerWindow?.hide();
        break;
      case "post:create":
        if (!postWindow) {
          postWindow = createPostWindow();
        }
        postWindow?.show();
        break;
      case "post:close":
        postWindow?.hide();
        break;
      case "post:detail":
        if (!postWindow) {
          postWindow = createPostWindow();
        }
        postWindow?.webContents.send(event, data);
        postWindow?.show();
        break;
      case "resize":
        mainWindow?.setBounds(data);
        break;
      default:
        throw new Error(`${event} is not defined event.`);
    }
  });

  // invoke
  ipcMain.handle("renderer-event", async (_, event: string, payload?: any) => {
    const data = payload ? JSON.parse(payload) : null;
    console.log(event, data);
    switch (event) {
      case "api":
        const method: keyof typeof apiRequest = data.method;
        if (apiRequest[method]) {
          const result = await apiRequest[method](data);
          return result || {};
        } else {
          throw new Error(`${data.method} is not defined method.`);
        }
      case "db:get-users":
        return await db.getUserAll();
      case "db:upsert-user":
        return await db.upsertUser(data);
      case "db:delete-user":
        return await db.deleteUser(data.id);
      case "db:get-timeline-all":
        return await db.getTimelineAll();
      case "db:set-timeline":
        return await db.setTimeline(data);
      case "db:get-instance-all":
        return await db.getInstanceAll();
      case "db:upsert-instance":
        return await db.upsertInstance(data);
      case "settings:set":
        return await db.setSetting(data.key, data.value);
      case "settings:all":
        return await db.getSettingAll();
      default:
        throw new Error(`${event} is not defined event.`);
    }
  });

  mainWindow.on("resize", () => {
    const [width, height] = mainWindow?.getSize() || [0, 0];
    const [x, y] = mainWindow?.getPosition() || [0, 0];
    mainWindow?.webContents.send("resize", { width, height, x, y });
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  menuWindow.on("closed", () => {
    postWindow = null;
  });

  postWindow.on("closed", () => {
    postWindow = null;
  });

  mediaViewerWindow.on("closed", () => {
    mediaViewerWindow = null;
  });

  initialize();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (isMac) {
    console.log("quit");
    app.quit();
  }
});

if (DEBUG) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
