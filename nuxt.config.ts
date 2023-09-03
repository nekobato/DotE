// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
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
  css: ["@/assets/styles/index.scss"],
  theme: "default",
});
