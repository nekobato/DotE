import { dialog } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

export const checkUpdate = () => {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("checking-for-update", () => {
    log.info(process.pid, "checking-for-update...");
  });
  // アップデートが見つかった
  autoUpdater.on("update-available", () => {
    log.info(process.pid, "Update available.");
  });
  // アップデートがなかった（最新版だった）
  autoUpdater.on("update-not-available", () => {
    log.info(process.pid, "Update not available.");
  });
  // エラーが発生
  autoUpdater.on("error", (err) => {
    log.error(process.pid, err);
  });

  return autoUpdater;
};
