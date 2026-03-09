import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir:  "./tests/e2e",
  timeout:  30_000,
  retries:  process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? "github" : "list",

  use: {
    baseURL:     process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:3000",
    headless:    true,
    screenshot:  "only-on-failure",
    video:       "retain-on-failure",
    trace:       "on-first-retry",
  },

  projects: [
    { name:"chromium", use:{ ...devices["Desktop Chrome"] } },
    { name:"firefox",  use:{ ...devices["Desktop Firefox"] } },
  ],

  webServer: process.env["CI"] ? undefined : {
    command: "npm run dev",
    url:     "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
