import electron from "electron";

const menuTemplate: (electron.MenuItemConstructorOptions | electron.MenuItem)[] = [
  // @ts-ignore: appMenu is not defined in d.ts
  {
    label: "hazy",
    submenu: [
      {
        id: "quit",
        label: "Quit hazy",
        role: "quit",
      },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { label: "Undo", role: "undo" },
      { label: "Redo", role: "redo" },
      { type: "separator" },
      { label: "Cut", role: "cut" },
      { label: "Copy", role: "copy" },
      { label: "Paste", role: "paste" },
      { label: "Select All", role: "selectAll" },
    ],
  },
  // @ts-ignore: viewMenu is not defined in d.ts
  {
    label: "View",
    role: "viewMenu",
  },
];

export default menuTemplate;
