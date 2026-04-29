import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  webServer: {
    command:
      'bash -lc "export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh; nvm use 24 >/dev/null; npm run dev -- --hostname 127.0.0.1 --port 3000"',
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 15"], browserName: "chromium" },
    },
  ],
});
