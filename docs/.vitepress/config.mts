import { defineConfigWithTheme } from "vitepress";
import { ThemeConfig } from "./types/themeConfig";
import rootPkg from "../../package.json";

const title = "DotE - Daydream of the Elephants";
const description = "Mastoron, MisskeyのタイムラインをよりコンパクトなUIで眺めるためのクライアントアプリ";

// https://vitepress.dev/reference/site-config
export default defineConfigWithTheme<ThemeConfig>({
  lang: "ja",
  head: [
    ["link", { rel: "icon", href: "./favicon.png" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:url", content: "https://nekobato.github.io/dote/" }],
    ["meta", { name: "og:image", content: "/images/thumbnail1.png" }],
    ["meta", { name: "og:title", content: title }],
    ["meta", { name: "og:site_name", content: title }],
    ["meta", { name: "og:description", content: description }],
    ["meta", { name: "og:locale", content: "ja_JP" }],
    ["meta", { name: "twitter:card", content: "summary" }],
  ],
  title,
  base: "/dote/",
  assetsDir: "assets",
  description,
  themeConfig: {
    appicon: "/images/appicon.png",
    thumbnails: [
      "/images/thumbnail1.png",
      "/images/thumbnail2.png",
      "/images/thumbnail3.png",
      "/images/thumbnail4.png",
    ],
    downloadLinks: {
      macOS: {
        arm64: "https://github.com/nekobato/DotE/releases/download/v0.0.19/DotE-0.0.19-arm64.dmg",
      },
    },
    refLinks: [
      {
        type: "github",
        url: rootPkg.repository.url,
      },
    ],
  },
});
