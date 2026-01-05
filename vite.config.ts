import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    electron({
      main: {
        entry: "main/index.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["font-list"],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, "main/preload.ts"),
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: [
      { find: "@/", replacement: `${__dirname}/src/` },
      { find: "@shared/", replacement: `${__dirname}/shared/` },
    ],
  },
  esbuild: {
    jsxFactory: "h",
    jsxFragment: "Fragment",
  },
});
