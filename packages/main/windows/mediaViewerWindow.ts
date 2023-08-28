import { join } from "path";
import { BrowserWindow } from "electron";
import url from "url";
import path from "path";

const pageName = "media-viewer";

export function createMediaViewerWindow() {
  const mediaViewer = new BrowserWindow({
    useContentSize: true,
    show: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      preload: join(__dirname, "../preload/index.cjs"),
    },
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    center: true,
    focusable: false,
    roundedCorners: false,
  });

  if (process.env.NODE_ENV === "development") {
    mediaViewer.loadURL(`http://localhost:3000/index.html#/${pageName}`);
    // mediaViewer.webContents.openDevTools();
  } else {
    mediaViewer.loadURL(
      url.format({
        protocol: "app",
        slashes: true,
        pathname: path.join(__dirname, `../renderer/index.html#/${pageName}`),
      }),
    );
  }
  return mediaViewer;
}
