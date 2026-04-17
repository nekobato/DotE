import { app, dialog } from "electron";
import { autoUpdater, type AppUpdater, type ProgressInfo, type UpdateInfo } from "electron-updater";
import log from "electron-log";
import type { AutoUpdateState } from "@shared/types/update";
import { DEBUG } from "./env";

type SetupAutoUpdaterOptions = {
  notifyState: (state: AutoUpdateState) => void;
};

/**
 * Build the initial auto update state for the current app version.
 */
const createInitialAutoUpdateState = (): AutoUpdateState => ({
  status: "idle",
  currentVersion: app.getVersion(),
  availableVersion: null,
  downloadedVersion: null,
  progressPercent: null,
  bytesPerSecond: null,
  transferredBytes: null,
  totalBytes: null,
  checkedAt: null,
  releaseDate: null,
  releaseName: null,
  releaseNotes: null,
  errorMessage: null,
});

let autoUpdateState = createInitialAutoUpdateState();
let notifyState: SetupAutoUpdaterOptions["notifyState"] = () => {};
let isAutoUpdaterSetup = false;
let activeCheckPromise: Promise<AutoUpdateState> | null = null;
let restartPromptPromise: Promise<void> | null = null;

/**
 * Create an ISO timestamp for updater state transitions.
 */
const nowIsoString = (): string => new Date().toISOString();

/**
 * Normalize release notes into a string that the renderer can display.
 */
const normalizeReleaseNotes = (releaseNotes: UpdateInfo["releaseNotes"]): string | null => {
  if (typeof releaseNotes === "string") {
    return releaseNotes;
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((note) => {
        const header = note.version ? `Version ${note.version}` : "Release Notes";
        return `${header}\n${note.note}`;
      })
      .join("\n\n");
  }

  return null;
};

/**
 * Convert an updater error into a safe user-facing message.
 */
const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "アップデートの確認に失敗しました。";
};

/**
 * Extract shared fields from update metadata.
 */
const toUpdateInfoPatch = (info: UpdateInfo): Partial<AutoUpdateState> => ({
  availableVersion: info.version,
  releaseDate: info.releaseDate ?? null,
  releaseName: info.releaseName ?? null,
  releaseNotes: normalizeReleaseNotes(info.releaseNotes),
});

/**
 * Publish the latest updater state to the renderer.
 */
const emitAutoUpdateState = (): AutoUpdateState => {
  notifyState(autoUpdateState);
  return autoUpdateState;
};

/**
 * Merge and publish a new updater state snapshot.
 */
const setAutoUpdateState = (patch: Partial<AutoUpdateState>): AutoUpdateState => {
  autoUpdateState = {
    ...autoUpdateState,
    ...patch,
    currentVersion: app.getVersion(),
  };

  return emitAutoUpdateState();
};

/**
 * Mark auto update as unavailable in environments that cannot check updates.
 */
const setDisabledState = (message: string): AutoUpdateState =>
  setAutoUpdateState({
    status: "disabled",
    checkedAt: nowIsoString(),
    availableVersion: null,
    downloadedVersion: null,
    releaseDate: null,
    releaseName: null,
    releaseNotes: null,
    errorMessage: message,
    progressPercent: null,
    bytesPerSecond: null,
    transferredBytes: null,
    totalBytes: null,
  });

/**
 * Configure the updater once before any checks start.
 */
const configureAutoUpdater = (): void => {
  autoUpdater.logger = log;
  log.transports.file.level = DEBUG ? "debug" : "info";
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;
};

/**
 * Persist download progress into renderer-visible state.
 */
const handleDownloadProgress = (progress: ProgressInfo): AutoUpdateState =>
  setAutoUpdateState({
    status: "downloading",
    progressPercent: progress.percent,
    bytesPerSecond: progress.bytesPerSecond,
    transferredBytes: progress.transferred,
    totalBytes: progress.total,
    errorMessage: null,
  });

/**
 * Prompt the user once after a new version has been downloaded.
 */
const promptToInstallDownloadedUpdate = async (): Promise<void> => {
  if (restartPromptPromise) {
    return restartPromptPromise;
  }

  restartPromptPromise = dialog
    .showMessageBox({
      type: "info",
      buttons: ["今すぐ再起動", "あとで"],
      defaultId: 0,
      cancelId: 1,
      title: "アップデートの準備ができました",
      message: "アップデートをダウンロードしました",
      detail: "再起動すると新しいバージョンを適用できます。",
    })
    .then((result) => {
      if (result.response === 0) {
        installDownloadedUpdate();
      }
    })
    .catch((error) => {
      log.error("autoUpdater: restart prompt failed", error);
    })
    .finally(() => {
      restartPromptPromise = null;
    });

  return restartPromptPromise;
};

/**
 * Register updater lifecycle events before any check begins.
 */
const registerAutoUpdaterEvents = (): void => {
  autoUpdater.on("checking-for-update", () => {
    log.info("autoUpdater: checking-for-update");
    setAutoUpdateState({
      status: "checking",
      checkedAt: nowIsoString(),
      errorMessage: null,
      progressPercent: null,
      bytesPerSecond: null,
      transferredBytes: null,
      totalBytes: null,
    });
  });

  autoUpdater.on("update-available", (info) => {
    log.info("autoUpdater: update-available", { version: info.version });
    setAutoUpdateState({
      status: "available",
      downloadedVersion: null,
      progressPercent: 0,
      bytesPerSecond: null,
      transferredBytes: null,
      totalBytes: null,
      errorMessage: null,
      ...toUpdateInfoPatch(info),
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("autoUpdater: update-not-available", { version: info.version });
    setAutoUpdateState({
      status: "not-available",
      checkedAt: nowIsoString(),
      availableVersion: null,
      downloadedVersion: null,
      progressPercent: null,
      bytesPerSecond: null,
      transferredBytes: null,
      totalBytes: null,
      releaseDate: null,
      releaseName: null,
      releaseNotes: null,
      errorMessage: null,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    handleDownloadProgress(progress);
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("autoUpdater: update-downloaded", { version: info.version });
    setAutoUpdateState({
      status: "downloaded",
      downloadedVersion: info.version,
      progressPercent: 100,
      checkedAt: nowIsoString(),
      errorMessage: null,
      ...toUpdateInfoPatch(info),
    });
    void promptToInstallDownloadedUpdate();
  });

  autoUpdater.on("error", (error) => {
    log.error("autoUpdater: error", error);
    setAutoUpdateState({
      status: "error",
      checkedAt: nowIsoString(),
      errorMessage: toErrorMessage(error),
      progressPercent: null,
      bytesPerSecond: null,
      transferredBytes: null,
      totalBytes: null,
    });
  });
};

/**
 * Initialize the shared updater service exactly once.
 */
export const setupAutoUpdater = ({ notifyState: nextNotifyState }: SetupAutoUpdaterOptions): AppUpdater => {
  notifyState = nextNotifyState;

  if (isAutoUpdaterSetup) {
    emitAutoUpdateState();
    return autoUpdater;
  }

  configureAutoUpdater();
  registerAutoUpdaterEvents();
  isAutoUpdaterSetup = true;
  emitAutoUpdateState();
  return autoUpdater;
};

/**
 * Read the latest updater state for renderer synchronization.
 */
export const getAutoUpdateState = (): AutoUpdateState => autoUpdateState;

/**
 * Check for updates using the configured auto-download policy.
 */
export const checkForAppUpdates = async (): Promise<AutoUpdateState> => {
  if (!app.isPackaged) {
    return setDisabledState("自動更新は配布版でのみ確認できます。");
  }

  if (
    autoUpdateState.status === "available" ||
    autoUpdateState.status === "downloading" ||
    autoUpdateState.status === "downloaded"
  ) {
    return autoUpdateState;
  }

  if (activeCheckPromise) {
    return activeCheckPromise;
  }

  activeCheckPromise = autoUpdater
    .checkForUpdates()
    .then(() => autoUpdateState)
    .catch((error) => {
      log.error("autoUpdater: check failed", error);
      return setAutoUpdateState({
        status: "error",
        checkedAt: nowIsoString(),
        errorMessage: toErrorMessage(error),
        progressPercent: null,
        bytesPerSecond: null,
        transferredBytes: null,
        totalBytes: null,
      });
    })
    .finally(() => {
      activeCheckPromise = null;
    });

  return activeCheckPromise;
};

/**
 * Restart the application and install the already-downloaded update.
 */
export const installDownloadedUpdate = (): AutoUpdateState => {
  if (autoUpdateState.status !== "downloaded") {
    return autoUpdateState;
  }

  autoUpdater.quitAndInstall();
  return autoUpdateState;
};
