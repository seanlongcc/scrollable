import { defineConfig, devices } from "@playwright/test";

const chromiumChannel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  workers: 1,
  webServer: {
    command:
      'bash -lc ". ~/.nvm/nvm.sh; nvm use 24 >/dev/null; npm run dev -- --hostname 127.0.0.1 --port 3000"',
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...(chromiumChannel ? { channel: chromiumChannel } : {}),
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
