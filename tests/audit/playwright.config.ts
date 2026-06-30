import { defineConfig, devices } from "@playwright/test";
import path from "path";

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:80";

// Use the Replit system Chromium (installed via Nix) instead of downloading
// a separate Playwright-managed binary.
const CHROMIUM_EXEC =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium";

export const AUTH_STATE = path.join(__dirname, ".auth", "user.json");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "audit-report", open: "never" }],
    ["json", { outputFile: "audit-results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 12_000,
    navigationTimeout: 20_000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    // ── Authentication setup (manual, run once via audit:setup-auth) ─────────
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: CHROMIUM_EXEC },
        headless: false,
      },
    },

    // ── Public + API tests (no auth needed) ───────────────────────────────
    {
      name: "desktop",
      testIgnore: /06-authenticated/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        launchOptions: { executablePath: CHROMIUM_EXEC },
      },
    },

    // ── Authenticated flows (requires saved auth state) ────────────────────
    {
      name: "desktop-auth",
      testMatch: /06-authenticated/,
      dependencies: [],
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: CHROMIUM_EXEC },
        storageState: process.env.AUDIT_AUTH_STATE ?? AUTH_STATE,
      },
    },

    // ── iPhone 14 — mobile regression ─────────────────────────────────────
    {
      name: "iphone-14",
      testMatch: /07-mobile/,
      use: {
        ...devices["iPhone 14"],
        launchOptions: { executablePath: CHROMIUM_EXEC },
      },
    },

    // ── Pixel 7 — Android regression ──────────────────────────────────────
    {
      name: "pixel-7",
      testMatch: /07-mobile/,
      use: {
        ...devices["Pixel 7"],
        launchOptions: { executablePath: CHROMIUM_EXEC },
      },
    },
  ],
  globalSetup: "./global-setup.ts",
});
