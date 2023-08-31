const package = require("./package.json");

module.exports = {
  appId: "net.nekobato.hazy",
  mac: {
    category: "public.app-category.social-networking",
    icon: "./build/icon.icns",
    target: ["dmg"],
    publish: [
      {
        provider: "github",
        owner: "nekobato",
        repo: "hazy",
      },
    ],
  },
  asar: false,
  directories: {
    output: "release/${version}",
  },
  files: ["dist"],
  buildVersion: package.version,
};
