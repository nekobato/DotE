import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Keep unit tests independent of the Electron build/start plugins.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["{src,main,shared}/**/*.spec.ts"],
  },
});
