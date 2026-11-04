import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: process.env.CI ? undefined : "chrome",
      },
    },
  ],
  webServer: {
    command: "npm run build:e2e && node scripts/e2e-server.mjs",
    url: "http://127.0.0.1:4173/bookclub/",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://bookclub-test.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-only-public-key",
      VITE_GOOGLE_MAPS_API_KEY: "",
    },
  },
});
