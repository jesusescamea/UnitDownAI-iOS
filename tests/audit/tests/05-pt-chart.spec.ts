/**
 * 05 — PT Chart
 * Verifies the pressure-temperature chart page loads and is interactive.
 */
import { test, expect } from "../utils/fixtures";

test.describe("PT Chart page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pt-chart");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);
  });

  test("[PT-CHART] Page loads with expected heading", async ({ page }) => {
    await expect(page.locator("body")).toContainText(
      /PT Chart|Pressure.{0,5}Temperature|refrigerant/i,
      { timeout: 10_000 },
    );
  });

  test("[PT-CHART] Refrigerant selector buttons are present", async ({ page }) => {
    // PT Chart uses button-based refrigerant selection (R-410A, R-454B, etc.)
    const refBtn = page
      .getByRole("button", { name: /R-410A|R-454B|R-32|R-22|R-407C/i })
      .first();
    await expect(refBtn).toBeVisible({ timeout: 8_000 });
  });

  test("[PT-CHART] Pressure input field is present", async ({ page }) => {
    // PT Chart has pressure inputs (PSIG)
    const inputs = page.locator("input");
    await expect(inputs.first()).toBeVisible({ timeout: 8_000 });
  });

  test("[PT-CHART] No API errors and no JS crashes", async ({
    page,
    apiErrors,
    consoleErrors,
    waitForApp,
  }) => {
    await waitForApp();
    expect(apiErrors).toHaveLength(0);
    expect(consoleErrors).toHaveLength(0);
  });

  test("[PT-CHART] Page is reachable via /pt-chart URL without auth", async ({ page }) => {
    const res = await page.goto("/pt-chart");
    expect(res?.status() ?? 200).toBeLessThan(400);
    await expect(page.locator("body")).toContainText(/refrigerant|chart|pressure/i, {
      timeout: 10_000,
    });
  });
});
