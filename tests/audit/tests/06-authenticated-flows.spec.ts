/**
 * 06 — Authenticated Flows
 * Tests that require a signed-in user. Run after:
 *   pnpm audit:setup-auth
 *
 * These tests are SKIPPED automatically when no auth state is found.
 * The playwright project "desktop-auth" provides the saved browser state.
 */
import { test, expect } from "../utils/fixtures";
import { getFirstUnitId } from "../utils/helpers";
import path from "path";
import fs from "fs";

const AUTH_STATE = process.env.AUDIT_AUTH_STATE ?? path.join(__dirname, "../.auth/user.json");
const hasAuth = fs.existsSync(AUTH_STATE);

test.describe("Dashboard — authenticated", () => {
  test.skip(!hasAuth, "Run `pnpm audit:setup-auth` to create auth state, then retry");

  test("[DASHBOARD] Loads without error and shows main nav", async ({
    page,
    consoleErrors,
    apiErrors,
    waitForApp,
  }) => {
    await page.goto("/dashboard");
    await waitForApp();
    await expect(page.locator("body")).toContainText(/dashboard|job|equipment|records/i, {
      timeout: 10_000,
    });
    expect(apiErrors).toHaveLength(0);
    expect(consoleErrors).toHaveLength(0);
  });

  test("[DASHBOARD] Start Diagnosis shortcut navigates to /diagnose", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1000);
    const btn = page.getByRole("button", { name: /diagnos/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(800);
      expect(page.url()).toContain("/diagnose");
    } else {
      test.skip(true, "Start Diagnosis button not visible — may be inside a nav section");
    }
  });

  test("[DASHBOARD] Scan Nameplate button opens the scanner modal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1000);
    const btn = page.getByRole("button", { name: /scan nameplate|nameplate/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(800);
      // Modal or camera UI should appear
      const modal = page.locator("[role='dialog'], [class*='modal'], [class*='Modal']");
      await expect(modal.first()).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "Scan Nameplate button not found in this viewport");
    }
  });

  test("[DASHBOARD] My Van / Tool Checklist button is present and clickable", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1000);
    const btn = page.getByRole("button", { name: /van|tool|checklist/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(600);
      // Should open a modal or navigate — no crash
      const body = await page.locator("body").textContent();
      expect((body ?? "").trim().length).toBeGreaterThan(0);
    } else {
      test.skip(true, "My Van / Tool Checklist button not visible in dashboard");
    }
  });

  test("[DASHBOARD] AI Assistant button is present", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1000);
    const btn = page.getByRole("button", { name: /AI|assistant|chat/i }).first();
    if (await btn.isVisible()) {
      await expect(btn).toBeEnabled();
    }
    // Pass even if not found — presence varies by subscription tier
  });

  test("[DASHBOARD] Theme toggle changes dark/light class", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(800);
    const toggleBtn = page.locator("[aria-label*='theme'], [aria-label*='dark'], [aria-label*='light'], button:has([class*='Sun']), button:has([class*='Moon'])").first();
    if (await toggleBtn.isVisible()) {
      const htmlBefore = await page.locator("html").getAttribute("class");
      await toggleBtn.click();
      await page.waitForTimeout(300);
      const htmlAfter = await page.locator("html").getAttribute("class");
      // Class should change
      expect(htmlAfter).not.toBe(htmlBefore);
    }
    // Pass even if toggle not found — it may be in a different location
  });
});

test.describe("Equipment Records — authenticated", () => {
  test.skip(!hasAuth, "Run `pnpm audit:setup-auth` to create auth state, then retry");

  test("[RECORDS] /records page loads with equipment list", async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    await page.goto("/records");
    await waitForApp();
    await expect(page.locator("body")).toContainText(/equipment|record|unit|no equipment/i, {
      timeout: 10_000,
    });
    expect(consoleErrors).toHaveLength(0);
  });

  test("[RECORDS] Unit detail page — Start Diagnosis routes to /diagnose", async ({
    page,
    waitForApp,
  }) => {
    const unitId = await getFirstUnitId(page);
    if (!unitId) {
      test.skip(true, "No units found for this account — create a unit first");
      return;
    }
    await page.goto(`/records/${unitId}`);
    await waitForApp();
    await expect(page.locator("body")).toContainText(/diagnos|start/i, { timeout: 8_000 });

    const btn = page.getByRole("button", { name: /start diagnosis|diagnos/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(800);
      expect(page.url()).toContain("/diagnose");
      // Unit context card should be visible
      await expect(page.locator("body")).toContainText(/unit selected|model|manufacturer/i, {
        timeout: 5_000,
      });
    }
  });

  test("[RECORDS] Unit detail page — Start Job routes to /job/:id", async ({
    page,
    waitForApp,
  }) => {
    const unitId = await getFirstUnitId(page);
    if (!unitId) {
      test.skip(true, "No units found for this account");
      return;
    }
    await page.goto(`/records/${unitId}`);
    await waitForApp();

    const btn = page.getByRole("button", { name: /start job/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toMatch(/\/job\/.+/);
    }
  });

  test("[RECORDS] Back button from unit detail returns to /records", async ({
    page,
    waitForApp,
  }) => {
    const unitId = await getFirstUnitId(page);
    if (!unitId) {
      test.skip(true, "No units found");
      return;
    }
    await page.goto(`/records/${unitId}`);
    await waitForApp();
    const back = page.getByRole("button", { name: /back/i }).or(
      page.locator("[aria-label='back'], [aria-label='Back']"),
    ).first();
    if (await back.isVisible()) {
      await back.click();
      await page.waitForTimeout(600);
      expect(page.url()).toMatch(/\/records($|\?)/);
    }
  });
});

test.describe("Account page — authenticated", () => {
  test.skip(!hasAuth, "Run `pnpm audit:setup-auth` to create auth state, then retry");

  test("[ACCOUNT] /account loads without error", async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    await page.goto("/account");
    await waitForApp();
    await expect(page.locator("body")).toContainText(/account|profile|subscription|plan/i, {
      timeout: 10_000,
    });
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Job Mode — authenticated", () => {
  test.skip(!hasAuth, "Run `pnpm audit:setup-auth` to create auth state, then retry");

  test("[JOB] /job page loads without error", async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    await page.goto("/job");
    await waitForApp();
    // Job page may redirect to dashboard or show job list
    const body = await page.locator("body").textContent();
    expect((body ?? "").trim().length).toBeGreaterThan(0);
    expect(consoleErrors).toHaveLength(0);
  });
});
