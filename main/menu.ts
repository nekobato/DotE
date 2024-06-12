import electron, { app, dialog } from "electron";

type MenuTemplate = (electron.MenuItemConstructorOptions | electron.MenuItem)[];

const menuTemplate = ({ mainWindow }: { mainWindow: electron.BrowserWindow | null }): MenuTemplate => [
  // @ts-ignore: appMenu is not defined in d.ts
  {
    label: "DotE",
    submenu: [
      {
        label: "About DotE",
        click: () => {
          dialog.showMessageBox({
            type: "info",
            icon: `${__dirname}/../public/icons/png/128x128.png`,
            title: "Daydream of the Elephants",
            message: `Daydream of the Elephants`,
            detail: `Version: ${app.getVersion()}\n\nhttps://github.com/nekobato/dot-e/`,
          });
        },
      },
      {
        type: "separator",
      },
      {
        id: "reload",
        label: "Reload Timeline",
        click: () => {
          mainWindow?.webContents.reload();
        },
      },
      {
        type: "separator",
      },
      {
        id: "quit",
        label: "Quit DotE",
        role: "quit",
      },
    ],
  },
  {
    label: "Edit",
    role: "editMenu",
  },
  // @ts-ignore: viewMenu is not defined in d.ts
  {
    label: "View",
    role: "viewMenu",
  },
];

export default menuTemplate;
