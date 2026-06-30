/**
 * Auth Setup — run once to create a saved browser auth state.
 *
 * Usage:
 *   pnpm audit:setup-auth
 *
 * This opens a headed browser, lets you sign in manually,
 * then saves the browser state to .auth/user.json for subsequent tests.
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_STATE_PATH = path.join(__dirname, "../.auth/user.json");
const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:80";

setup("authenticate — sign in manually and save state", async ({ page }) => {
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  console.log("\n=== Manual Authentication Setup ===");
  console.log("A browser window will open. Sign in with your UnitDown credentials.");
  console.log("The session state will be saved for automated tests.\n");

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("domcontentloaded");

  // Wait for the user to sign in manually (up to 3 minutes)
  await page.waitForURL(
    (url) => !url.pathname.includes("/login") && !url.pathname.includes("/sso-callback"),
    { timeout: 3 * 60 * 1000, waitUntil: "domcontentloaded" },
  );

  console.log(`✅ Signed in — current URL: ${page.url()}`);
  console.log(`   Saving auth state to: ${AUTH_STATE_PATH}`);

  await page.context().storageState({ path: AUTH_STATE_PATH });

  console.log("✅ Auth state saved. Run `pnpm audit` to execute all tests including authenticated flows.");
});
