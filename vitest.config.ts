import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { fileParallelism: false, include: ["src/**/*.test.ts"] }, // e2e/ es de Playwright
});
