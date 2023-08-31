import { join } from "path";
import { BrowserWindow } from "electron";
import url from "url";

const pageName = "post";

export function createPostWindow() {
  const postWindow = new BrowserWindow({
    x: 0,
    y: 0,
    height: 320,
    width: 540,
    show: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      preload: join(__dirname, "../preload/index.cjs"),
    },
    useContentSize: false,
    frame: true,
    transparent: false,
    hasShadow: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    fullscreenable: false,
    roundedCorners: false,
  });

  if (process.env.NODE_ENV === "development") {
    postWindow.loadURL(`http://localhost:3000/index.html#/${pageName}`);
    // postWindow.webContents.openDevTools();
  } else {
    postWindow.loadURL(
      url.format({
        protocol: "app",
        slashes: true,
        pathname: join(__dirname, `../renderer/index.html#/${pageName}`),
      }),
    );
  }

  return postWindow;
}
