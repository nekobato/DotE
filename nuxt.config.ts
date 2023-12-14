// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false }, // 見れない
  experimental: {
    // https://github.com/caoxiemeihao/nuxt-electron/issues/53
    appManifest: false,
  },
  modules: ["nuxt-electron", "@pinia/nuxt"],
  electron: {
    build: [
      {
        entry: "electron/index.ts",
      },
      {
        entry: "electron/preload.ts",
      },
    ],
  },
  theme: "default",
});
