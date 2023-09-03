import * as path from "path";

const isDev = process.env.NODE_ENV === "development";

export const preloadJs = path.join(__dirname, "./preload.js");
export const indexHtml = isDev
  ? "http://localhost:3000/index.html"
  : `file://${path.join(__dirname, "../renderer/index.html")}`;

export const trayIcon = path.join(__dirname, "../public/images/tray_icon.png");
