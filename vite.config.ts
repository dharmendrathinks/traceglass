import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      input: {
        workspace: resolve("index.html"),
        devtools: resolve("devtools.html"),
        background: resolve("src/background.ts"),
      },
      output: { entryFileNames: "assets/[name].js" },
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
