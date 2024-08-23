import electron, { app, dialog } from "electron";

type MenuTemplate = (electron.MenuItemConstructorOptions | electron.MenuItem)[];

const menuTemplate = (): MenuTemplate => [
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
            detail: `Version: ${app.getVersion()}\n\nhttps://github.com/nekobato/dote/`,
          });
        },
      },
      {
        type: "separator",
      },
      {
        role: "services",
      },
      {
        type: "separator",
      },
      {
        label: "Close DotE",
        role: "hide",
        accelerator: "CommandOrControl+W",
      },
      {
        label: "Hide DotE",
        role: "hide",
      },
      {
        role: "hideOthers",
      },
      {
        role: "unhide",
      },
      {
        role: "quit",
      },
    ],
  },
  {
    label: "Edit",
    role: "editMenu",
  },
  {
    label: "View",
    // Customized ViewMenu for excluding toggleDevTools
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
    ],
  },
];

export default menuTemplate;
