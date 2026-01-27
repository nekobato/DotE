const pkg = require("./package.json");

/**
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: "net.nekobato.dot-e",
  asar: true,
  productName: "DotE",
  directories: {
    output: `release/${pkg.version}`,
  },
  protocols: [
    {
      name: "DotE OAuth Redirect",
      schemes: ["io.github.nekobato"],
    },
  ],
  files: [
    "dist",
    "!dist/assets/*.map",
    "dist-electron",
    {
      from: "node_modules/file-icon/file-icon",
      to: "dist-electron/file-icon",
    },
  ],
  mac: {
    target: ["default"],
    icon: "dist/icons/mac/icon.icns",
    category: "public.app-category.social-networking",
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    publish: ["github"],
  },
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
  },
  // nsis: {
  //   oneClick: false,
  //   perMachine: false,
  //   allowToChangeInstallationDirectory: true,
  //   deleteAppDataOnUninstall: false,
  // },
  // linux: {
  //   target: ["AppImage"],
  // },
};

module.exports = config;
