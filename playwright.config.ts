import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:43173",
    viewport: { width: 1440, height: 1050 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npx vite preview --host 127.0.0.1 --port 43173 --strictPort",
      url: "http://127.0.0.1:43173",
      reuseExistingServer: false,
    },
    {
      command: "node scripts/fixture.mjs",
      env: { TRACEGLASS_FIXTURE_PORT: "43174" },
      url: "http://127.0.0.1:43174",
      reuseExistingServer: false,
    },
  ],
});
