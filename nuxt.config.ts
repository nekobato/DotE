// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
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
