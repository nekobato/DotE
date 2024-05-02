import { defineConfig } from "vitepress";
import path from "node:path";
import vueJsx from "@vitejs/plugin-vue-jsx";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Davneko",
  description: "Home Audio Server",
  vite: {
    resolve: {
      alias: {
        "@shared": path.join(__dirname, "../../shared"),
        "@": path.join(__dirname, "../../src"),
      },
    },
    // @ts-ignore
    plugins: [vueJsx()],
  },
});
