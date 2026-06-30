/**
 * 04 — Diagnosis Flow
 * Tests the core guest-accessible diagnosis flow end-to-end.
 * Does NOT actually submit to the AI (avoids API cost) — verifies
 * form elements, UX state, and button availability.
 * To test a real submission, set AUDIT_RUN_LIVE_DIAGNOSIS=1.
 */
import { test, expect } from "../utils/fixtures";

test.describe("Diagnosis page — form elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagnose");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
  });

  test("[DIAGNOSIS] Symptom textarea is visible and focusable", async ({ page }) => {
    const input = page.locator("textarea").first();
    await expect(input).toBeVisible({ timeout: 8_000 });
    await input.focus();
    await expect(input).toBeFocused();
  });

  test("[DIAGNOSIS] Submit button is disabled when input is empty", async ({ page }) => {
    const btn = page.getByRole("button", { name: /run diagnosis/i });
    await expect(btn).toBeVisible({ timeout: 8_000 });
    await expect(btn).toBeDisabled();
  });

  test("[DIAGNOSIS] Submit button enables after typing symptoms", async ({ page }) => {
    const input = page.locator("textarea").first();
    await expect(input).toBeVisible({ timeout: 8_000 });
    await input.fill("Unit not cooling, compressor kicks on then off");
    const btn = page.getByRole("button", { name: /run diagnosis/i });
    await expect(btn).toBeEnabled({ timeout: 5_000 });
  });

  test("[DIAGNOSIS] Unit selector link navigates to /records", async ({ page, consoleErrors }) => {
    // The "Select unit (optional)" link should be present
    const link = page.getByText(/select unit/i);
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState("domcontentloaded");
      // Should navigate to records or login
      const url = page.url();
      expect(url).toMatch(/\/(records|login|signup)/);
    } else {
      // User is signed in — unit selector may be hidden
      test.skip(true, "Unit selector only visible for unauthenticated users");
    }
    expect(consoleErrors).toHaveLength(0);
  });

  test("[DIAGNOSIS] No JS errors on diagnosis page", async ({ page, consoleErrors, waitForApp }) => {
    await waitForApp();
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Diagnosis flow — live submission", () => {
  test.skip(
    !process.env.AUDIT_RUN_LIVE_DIAGNOSIS,
    "Set AUDIT_RUN_LIVE_DIAGNOSIS=1 to run this test (calls real AI API)",
  );

  test("[DIAGNOSIS-LIVE] Submit symptoms → result or error renders", async ({ page }) => {
    await page.goto("/diagnose");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);

    const input = page.locator("textarea").first();
    await input.fill("Unit not cooling. Compressor runs but evaporator coil is freezing over.");

    const btn = page.getByRole("button", { name: /run diagnosis/i });
    await btn.click();

    // Wait for either results or an error — whichever comes first
    await expect(
      page.locator('[data-testid="hero-button-run"]:not([disabled]),' +
        ' .space-y-5, [class*="Alert"]'),
    ).toBeAttached({ timeout: 45_000 });

    // No crash
    const body = await page.locator("body").textContent();
    expect(body ?? "").not.toContain("Something went wrong");
  });
});
