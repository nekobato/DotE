import { nativeTheme, Tray } from "electron";
import { trayIcon } from "./static";

export function setTrayIcon(): Tray {
  const tray = new Tray(trayIcon);
  return tray;
}
