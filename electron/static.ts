import * as path from "path";

process.env.ROOT = path.join(__dirname, "..");
process.env.DIST = path.join(process.env.ROOT, "dist-electron");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.ROOT, "public")
  : path.join(process.env.ROOT, ".output/public");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

const isDev = process.env.NODE_ENV === "development";
export const preload = path.join(process.env.DIST, "preload.js");

export const trayIcon = path.join(process.env.VITE_PUBLIC, "images/tray_icon.png");

export const pageRoot = {
  development: process.env.VITE_DEV_SERVER_URL as string,
  production: path.join(process.env.VITE_PUBLIC, "index.html"),
};
