const package = require("./package.json");

module.exports = {
  appId: "net.nekobato.hazy",
  asar: true,
  directories: {
    output: "release/${version}",
  },
  files: [".output/**/*", "dist-electron"],
  mac: {
    category: "public.app-category.social-networking",
    icon: ".output/public/icons/mac/icon.icns",
    artifactName: "${productName}_${version}.${ext}",
    target: ["dmg"],
    publish: [
      {
        provider: "github",
        owner: "nekobato",
        repo: "hazy",
      },
    ],
  },
  // win: {
  //   target: [
  //     {
  //       target: "nsis",
  //       arch: ["x64"],
  //     },
  //   ],
  //   artifactName: "${productName}_${version}.${ext}",
  // },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
  },
  buildVersion: package.version,
};
