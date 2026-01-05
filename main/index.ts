import electron, {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  powerMonitor,
  protocol,
} from "electron";
import path from "node:path";
import { createMainWindow } from "./windows/mainWindow";
import { createPostWindow } from "./windows/postWindow";
import { createMediaViewerWindow } from "./windows/mediaViewerWindow";
import { DEBUG, isMac } from "./env";
import { release } from "os";
import menuTemplate from "./menu";
import * as db from "./db";
import { apiRequest } from "./api";
import { checkUpdate } from "./autoupdate";
import type { Settings } from "../shared/types/store";
import { ApiError } from "./api/helpers";
import type { ApiErrorPayload, ApiInvokeResult } from "../shared/types/ipc";
import { notifyOAuthRedirect } from "./oauth/callback-router";
import { APP_PROTOCOL_PREFIX, APP_PROTOCOL_SCHEME } from "./oauth/constants";
import { getFonts } from "font-list";

const isElectronRuntime = Boolean(process.versions?.electron);
const electronApp = (electron as unknown as { app?: typeof app }).app ?? app;

const extractCustomSchemeUrls = (args: readonly string[]): string[] => {
  return args.filter((arg) => typeof arg === "string" && arg.startsWith(APP_PROTOCOL_PREFIX));
};

const handleOAuthRedirectUrl = (url: string) => {
  notifyOAuthRedirect(url);
  if (mainWindow) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
  }
};

/**
 * Load installed system fonts for selection UI.
 */
const getSystemFonts = async (): Promise<string[]> => {
  try {
    const fonts = await getFonts();
    return Array.from(new Set(fonts)).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error("[system:get-fonts] failed", error);
    return [];
  }
};

process.on("uncaughtException", function (error) {
  if (isElectronRuntime && dialog?.showErrorBox) {
    dialog.showErrorBox("Error", error.message);
  } else {
    console.error(`[Error] ${error.message}`);
  }
});

// Disable GPU Acceleration for Windows 7
if (isElectronRuntime && electronApp?.disableHardwareAcceleration && release().startsWith("6.1")) {
  electronApp.disableHardwareAcceleration();
}

// Set application name for Windows 10+ notifications
if (isElectronRuntime && process.platform === "win32" && electronApp?.setAppUserModelId) {
  electronApp.setAppUserModelId(electronApp.getName());
}

if (isElectronRuntime && electronApp?.requestSingleInstanceLock) {
  if (!electronApp.requestSingleInstanceLock()) {
    electronApp.quit();
    process.exit(0);
  }

  electronApp.on("second-instance", (_event, commandLine) => {
    const urls = extractCustomSchemeUrls(commandLine);
    urls.forEach(handleOAuthRedirectUrl);
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

if (isElectronRuntime) {
  checkUpdate();
}

const registerCustomProtocolClient = () => {
  if (!isElectronRuntime || !electronApp?.setAsDefaultProtocolClient) return;

  try {
    if (process.defaultApp && process.argv.length > 1) {
      const executable = process.execPath;
      const entry = path.resolve(process.argv[1]);
      electronApp.setAsDefaultProtocolClient(APP_PROTOCOL_SCHEME, executable, [entry]);
    } else {
      electronApp.setAsDefaultProtocolClient(APP_PROTOCOL_SCHEME);
    }
  } catch (error) {
    console.warn("[oauth] Failed to register custom protocol", { error });
  }
};

let mainWindow: BrowserWindow | null = null;
let mediaViewerWindow: BrowserWindow | null = null;
let postWindow: BrowserWindow | null = null;

const sanitizePayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item));
  }

  const sensitiveKeys = new Set(["token", "accessToken", "refreshToken", "password", "authorization", "i"]);

  return Object.entries(payload as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (sensitiveKeys.has(key)) {
      acc[key] = "***";
    } else {
      acc[key] = sanitizePayload(value);
    }
    return acc;
  }, {});
};

const normalizeApiError = (error: unknown, fallback: Partial<ApiErrorPayload> = {}): ApiErrorPayload => {
  if (error instanceof ApiError) {
    return {
      ...error.details,
      message: error.details.message || error.message,
    };
  }

  if (error instanceof Error) {
    return {
      type: fallback.type ?? "unknown",
      status: fallback.status,
      url: fallback.url,
      bodyPreview: fallback.bodyPreview,
      headers: fallback.headers,
      message: error.message,
    };
  }

  return {
    type: fallback.type ?? "unknown",
    status: fallback.status,
    url: fallback.url,
    bodyPreview: fallback.bodyPreview,
    headers: fallback.headers,
    message: typeof error === "string" ? error : "Unknown error",
  };
};

if (isElectronRuntime) {
  protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { secure: true, standard: true } }]);
}

if (isElectronRuntime && electronApp) {
  electronApp.on("open-url", (event, url) => {
    event.preventDefault();
    if (url.startsWith(APP_PROTOCOL_PREFIX)) {
      handleOAuthRedirectUrl(url);
    }
  });
}

const initialize = async () => {
  const mode = (await db.getSetting("mode")) as Settings["mode"];
  setMainWindowMode(mode);
};

const toggleTimeline = async () => {
  if (mainWindow?.isVisible()) {
    mainWindow?.hide();
  } else {
    mainWindow?.show();
  }
};

function setGlobalShortcut() {
  const settings = db.getSettingAll();
  if (globalShortcut.isRegistered(settings.shortcuts.toggleTimeline)) {
    globalShortcut.unregister(settings.shortcuts.toggleTimeline);
  }
  globalShortcut.register(settings.shortcuts.toggleTimeline, toggleTimeline);
}

const setMainWindowMode = async (mode: string) => {
  switch (mode) {
    case "show":
    case "settings":
    case "tutorial":
      mainWindow?.show();
      mainWindow?.setAlwaysOnTop(false);
      mainWindow?.setIgnoreMouseEvents(false);
      mainWindow?.setOpacity(1);
      mainWindow?.setVisibleOnAllWorkspaces(false);
      break;
    case "haze":
      mainWindow?.show();
      mainWindow?.setAlwaysOnTop(true, "floating");
      mainWindow?.setIgnoreMouseEvents(true);
      mainWindow?.setVisibleOnAllWorkspaces(true);
      mainWindow?.blur();
      break;
    case "hide":
      mainWindow?.hide();
      break;
  }
};

const start = async () => {
  const menu = Menu.buildFromTemplate(menuTemplate());
  Menu.setApplicationMenu(menu);
  setGlobalShortcut();

  mainWindow = await createMainWindow();
  mediaViewerWindow = createMediaViewerWindow();
  postWindow = createPostWindow();

  ipcMain.on("renderer-event", async (_, event: string, payload?: any) => {
    const data = payload ? JSON.parse(payload) : null;
    switch (event) {
      case "set-mode":
        setMainWindowMode(data.mode);
        db.setSetting("mode", data.mode);
        mainWindow?.webContents.send("set-mode", data);
        break;
      case "init-shortcuts":
        setGlobalShortcut();
        break;
      case "open-url":
        electron.shell.openExternal(data.url);
        break;
      case "media-viewer:open":
        const pointerDisplay = electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint());
        const workAreaSize = pointerDisplay.workAreaSize;
        mediaViewerWindow?.setBounds({
          x: pointerDisplay.bounds.x,
          y: pointerDisplay.bounds.y,
          width: workAreaSize.width,
          height: workAreaSize.height,
        });
        mediaViewerWindow?.center();
        mediaViewerWindow?.webContents.send(event, data);
        mediaViewerWindow?.show();
        mediaViewerWindow?.focus();
        break;
      case "media-viewer:close":
        mediaViewerWindow?.webContents.send(event, data);
        mediaViewerWindow?.hide();
        break;
      case "main:reload":
        db.setSetting("mode", "show");
        mainWindow?.webContents.reload();
        break;
      case "main:reaction":
        mainWindow?.webContents.send(event, data);
        break;
      case "post:create":
        postWindow?.webContents.send(event, data);
        postWindow?.center();
        postWindow?.show();
        break;
      case "post:close":
        postWindow?.webContents.send(event, data);
        postWindow?.close();
        break;
      case "post:reaction":
      case "post:repost":
        postWindow?.webContents.send(event, data);
        postWindow?.center();
        postWindow?.show();
        break;
      case "stream:sub-note":
        // TODO: main processへ移植
        mainWindow?.webContents.send("stream:sub-note", data);
        break;
      case "stream:unsub-note":
        // TODO: main processへ移植
        mainWindow?.webContents.send("stream:unsub-note", data);
        break;
      case "quit":
        electronApp?.quit();
        break;
      case "test":
        console.log("test");
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
        if (!apiRequest[method]) {
          const errorPayload: ApiErrorPayload = {
            type: "unknown",
            message: `${data.method} is not defined method.`,
          };
          console.error(`[ipc][api] ${method} undefined`, {
            payload: sanitizePayload(data),
            error: errorPayload,
          });
          return { ok: false, error: errorPayload } satisfies ApiInvokeResult<unknown>;
        }

        try {
          const result = await apiRequest[method](data);
          return { ok: true, data: result ?? null } satisfies ApiInvokeResult<unknown>;
        } catch (error) {
          const errorPayload = normalizeApiError(error, { url: data.instanceUrl });
          console.error(`[ipc][api] ${method} failed`, {
            payload: sanitizePayload(data),
            error: errorPayload,
          });
          return { ok: false, error: errorPayload } satisfies ApiInvokeResult<unknown>;
        }
      case "db:get-users":
        return db.getUserAll();
      case "db:upsert-user":
        return db.upsertUser(data);
      case "db:delete-user":
        return db.deleteUser(data.id);
      case "db:get-timeline-all":
        return db.getTimelineAll();
      case "db:set-timeline":
        return db.setTimeline(data);
      case "db:delete-timeline":
        return db.deleteTimeline(data.id);
      case "db:get-instance-all":
        return db.getInstanceAll();
      case "db:upsert-instance":
        return db.upsertInstance(data);
      case "settings:set":
        return db.setSetting(data.key, data.value);
      case "settings:all":
        return db.getSettingAll();
      case "system:get-fonts":
        return getSystemFonts();
      default:
        throw new Error(`${event} is not defined event.`);
    }
  });

  mainWindow.on("resize", () => {
    const [width, height] = mainWindow?.getSize() || [0, 0];
    db.setSetting("windowSize", { width, height });
  });

  mainWindow.on("closed", () => {
    electronApp?.quit();
  });

  powerMonitor.on("resume", () => {
    mainWindow?.webContents.send("resume-timeline");
  });

  initialize();
};

if (isElectronRuntime && electronApp) {
  electronApp.on("before-quit", () => {
    globalShortcut.unregisterAll();
    postWindow?.removeAllListeners();
    mainWindow = null;
    mediaViewerWindow = null;
    postWindow = null;
  });

  electronApp.on("activate", async () => {
    if (mainWindow === null) {
      start();
    }
    const mode = (await db.getSetting("mode")) as Settings["mode"];
    if (mode === "haze" || mode === "hide") {
      setMainWindowMode("show");
      mainWindow?.webContents.send("set-mode", { mode: "show" });
    }
  });

  electronApp.on("window-all-closed", () => {
    if (isMac) {
      electronApp.quit();
    }
  });

  if (DEBUG) {
    if (process.platform === "win32") {
      process.on("message", (data) => {
        if (data === "graceful-exit") {
          electronApp.quit();
        }
      });
    } else {
      process.on("SIGTERM", () => {
        electronApp.quit();
      });
    }
  }

  electronApp.whenReady().then(async () => {
    registerCustomProtocolClient();
    await start();
    const initialUrls = extractCustomSchemeUrls(process.argv.slice(1));
    initialUrls.forEach(handleOAuthRedirectUrl);
  });
} else {
  console.info("Electron runtime not detected; main process lifecycle hooks skipped.");
}
