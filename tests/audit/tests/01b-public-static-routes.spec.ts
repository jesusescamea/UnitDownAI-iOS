/**
 * 01b — Public Static / Secondary Routes
 * Includes thin SPA info pages and the /guides SEO shell served by the API
 * server. Also covers the /sponsor redirect and the unknown-route 404 check.
 * ~9 tests × ~5 s each ≈ 45 s — fits comfortably in the 2-minute bash limit.
 */
import { test, expect } from "../utils/fixtures";
import { ROUTES, assertNotErrorPage } from "../utils/helpers";

for (const route of ROUTES.publicStatic) {
  test(`[PUBLIC] ${route.label} — ${route.path}`, async ({
    page,
    consoleErrors,
    apiErrors,
    waitForApp,
  }) => {
    const res = await page.goto(route.path);

    expect(
      res?.status() ?? 200,
      `${route.path} must not return HTTP 5xx`,
    ).toBeLessThan(500);
    expect(
      res?.status() ?? 200,
      `${route.path} must not return HTTP 404`,
    ).not.toBe(404);

    await waitForApp();
    await assertNotErrorPage(page);

    // SEO-shell routes (e.g. /guides) have an empty React root — check <title>.
    if (route.titleMatch) {
      await expect(page).toHaveTitle(route.titleMatch, { timeout: 8_000 });
    } else if (route.textMatch) {
      await expect(page.locator("body")).toContainText(route.textMatch, {
        timeout: 10_000,
      });
    }

    expect(apiErrors, `${route.path}: unexpected API errors:\n${apiErrors.join("\n")}`).toHaveLength(0);
    expect(
      consoleErrors,
      `${route.path}: unexpected console errors:\n${consoleErrors.join("\n")}`,
    ).toHaveLength(0);
  });
}

test("[PUBLIC] /sponsors redirect — /sponsor alias", async ({ page }) => {
  const res = await page.goto("/sponsor");
  expect(res?.status() ?? 200).toBeLessThan(500);
  await page.waitForLoadState("domcontentloaded");
  await assertNotErrorPage(page);
});

test("[PUBLIC] Unknown route shows 404 page — not blank", async ({ page }) => {
  await page.goto("/this-route-definitely-does-not-exist-abc123");
  await page.waitForLoadState("domcontentloaded");
  const body = await page.locator("body").textContent();
  expect((body ?? "").trim().length).toBeGreaterThan(0);
});
