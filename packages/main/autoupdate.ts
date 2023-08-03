import { autoUpdater } from "electron-updater";
import electronLog from "electron-log";

export default class AppUpdater {
  constructor() {
    electronLog.transports.file.level = "debug";
    autoUpdater.logger = electronLog;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
