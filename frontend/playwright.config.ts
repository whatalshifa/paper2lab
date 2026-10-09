import { defineConfig, devices } from "@playwright/test";

// Browser tests: the real website talking to the real API, in demo mode (no AI key), so they use
// the sample papers. `npx playwright test` starts both servers, or reuses ones already running.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    // Lets the tests run against a browser installed somewhere else (e.g. a sandbox).
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "alembic upgrade head && uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: "http://localhost:8000/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        P2L_DATABASE_URL: process.env.E2E_DATABASE_URL ?? "sqlite:///./e2e.db",
        P2L_UPLOAD_DIR: "./e2e-uploads",
        ANTHROPIC_API_KEY: "",
        // The website must add this to every /api request (src/proxy.ts), as in production.
        P2L_PROXY_SECRET: "e2e-proxy-secret",
        // No calls to Semantic Scholar or Hugging Face: tests that need references fake them.
        P2L_CONNECTIONS_ENABLED: "false",
      },
    },
    {
      command: "npm run start -- -p 3000",
      url: "http://localhost:3000/",
      reuseExistingServer: !process.env.CI,
      env: { API_PROXY_SECRET: "e2e-proxy-secret" },
    },
  ],
});
