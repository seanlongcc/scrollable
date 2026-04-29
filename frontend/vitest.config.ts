import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    fileParallelism: false,
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],
  },
});
