import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import pkg from "../../package.json";

// https://vitejs.dev/config/
export default defineConfig({
  mode: process.env.NODE_ENV,
  root: __dirname,
  plugins: [
    vue(),
    /**
     * Here you can specify other modules
     * 🚧 You have to make sure that your module is in `dependencies` and not in the` devDependencies`,
     *    which will ensure that the electron-builder can package it correctly
     * @example
     * {
     *   'electron-store': 'const Store = require("electron-store"); export default Store;',
     * }
     */
  ],
  base: "./",
  build: {
    emptyOutDir: true,
    sourcemap: true,
    outDir: "../../dist/renderer",
  },
  server: {
    port: pkg.env.PORT,
  },
  resolve: {
    alias: {
      "@/": `${__dirname}/src/`,
    },
  },
});
