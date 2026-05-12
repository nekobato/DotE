import process from "node:process";
import { defineConfig } from "vitepress";

/**
 * Normalizes the public base path used by GitHub Pages project sites.
 */
const normalizeBase = (value: string | undefined): string => {
  if (!value) {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

const siteBase = normalizeBase(process.env.VITEPRESS_BASE);

/**
 * VitePress configuration for the DotE introduction site.
 */
export default defineConfig({
  lang: "ja-JP",
  title: "DotE",
  titleTemplate: ":title | Daydream of the Elephants",
  description:
    "DotE は、Misskey、Mastodon、Bluesky に対応した「ながら見」向け Fediverse デスクトップクライアントです。",
  base: siteBase,
  outDir: "../public",
  cleanUrls: false,
  head: [
    ["link", { rel: "icon", href: `${siteBase}icons/png/32x32.png` }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "DotE - Daydream of the Elephants" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "透明ウィンドウとコンパクトな表示で、作業中のタイムライン確認を支える Fediverse デスクトップクライアント。",
      },
    ],
    ["meta", { property: "og:image", content: `${siteBase}images/icons/dote.png` }],
    ["meta", { name: "twitter:card", content: "summary" }],
  ],
  vite: {
    publicDir: "../public",
    build: {
      copyPublicDir: false,
      emptyOutDir: false,
    },
  },
  themeConfig: {
    logo: "/images/icons/dote.png",
    siteTitle: "DotE",
    nav: [
      { text: "特徴", link: "/#features" },
      { text: "対応サービス", link: "/#services" },
      { text: "ダウンロード", link: "/#download" },
      { text: "GitHub", link: "https://github.com/nekobato/DotE" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/nekobato/DotE" }],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright (c) nekobato",
    },
  },
});
