/**
 * 07 — Mobile Viewport Regression
 * Runs on iPhone 14 and Pixel 7 projects (see playwright.config.ts).
 * Tests that key pages render correctly at mobile screen sizes.
 */
import { test, expect } from "../utils/fixtures";
import { assertNotErrorPage } from "../utils/helpers";

test.describe("Mobile — Landing / Diagnosis", () => {
  test("[MOBILE] Landing page renders on mobile viewport", async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    const res = await page.goto("/");
    expect(res?.status() ?? 200).toBeLessThan(500);
    await waitForApp();
    await assertNotErrorPage(page);
    await expect(page.locator("body")).toContainText(/UnitDown|HVAC|diagnos/i, {
      timeout: 10_000,
    });
    expect(consoleErrors).toHaveLength(0);
  });

  test("[MOBILE] Diagnosis form is usable on mobile", async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    await page.goto("/diagnose");
    await waitForApp();

    const input = page.locator("textarea").first();
    await expect(input).toBeVisible({ timeout: 8_000 });

    // Verify the submit button is visible (may require scrolling on mobile)
    const btn = page.getByRole("button", { name: /run diagnosis/i });
    await expect(btn).toBeVisible({ timeout: 8_000 });

    expect(consoleErrors).toHaveLength(0);
  });

  test("[MOBILE] Typing in symptom input works on mobile", async ({ page }) => {
    await page.goto("/diagnose");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);

    const input = page.locator("textarea").first();
    await expect(input).toBeVisible({ timeout: 8_000 });
    // Use click() — tap() requires hasTouch context option (mobile projects only)
    await input.click();
    await input.fill("Compressor short cycling on 5-ton RTU");

    const value = await input.inputValue();
    expect(value).toBe("Compressor short cycling on 5-ton RTU");

    const btn = page.getByRole("button", { name: /run diagnosis/i });
    await expect(btn).toBeEnabled({ timeout: 4_000 });
  });
});

test.describe("Mobile — PT Chart", () => {
  test("[MOBILE] PT Chart loads on mobile", async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    await page.goto("/pt-chart");
    await waitForApp();
    await assertNotErrorPage(page);
    await expect(page.locator("body")).toContainText(/refrigerant|pressure|temperature/i, {
      timeout: 10_000,
    });
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Mobile — Navigation", () => {
  test("[MOBILE] Login page renders on mobile without overflow", async ({
    page,
    waitForApp,
  }) => {
    await page.goto("/login");
    await waitForApp();
    await assertNotErrorPage(page);
    await expect(page.locator("body")).toContainText(/sign in|log in/i, { timeout: 8_000 });

    // Check there's no horizontal overflow (common mobile layout bug)
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth, "Page should not have horizontal overflow on mobile").toBeLessThanOrEqual(
      clientWidth + 2, // Allow 2px tolerance
    );
  });

  test("[MOBILE] Pricing page renders on mobile", async ({
    page,
    waitForApp,
  }) => {
    await page.goto("/pricing");
    await waitForApp();
    await assertNotErrorPage(page);
    await expect(page.locator("body")).toContainText(/Pro|plan|pricing/i, { timeout: 10_000 });
  });
});

test.describe("Mobile — Back navigation", () => {
  test("[MOBILE] Browser back from /diagnose returns to previous page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(400);

    await page.goto("/diagnose");
    await page.waitForLoadState("domcontentloaded");

    await page.goBack();
    // Wait for Clerk timeout (4 s in RootRoute) to fire so guest content renders.
    // Without this wait the body can still be a spinner with no text.
    await page.waitForTimeout(5_000);

    // Should be back at /  or wherever we came from — not crashed
    const body = await page.locator("body").textContent();
    expect((body ?? "").trim().length).toBeGreaterThan(0);
  });
});
