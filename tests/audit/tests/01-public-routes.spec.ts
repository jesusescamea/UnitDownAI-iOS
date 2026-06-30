/**
 * 01 — Public Routes
 * Every route accessible without authentication.
 * Verifies: page loads, expected content visible, no API 500s, no JS crashes.
 */
import { test, expect } from "../utils/fixtures";
import { ROUTES, assertNotErrorPage } from "../utils/helpers";

for (const route of ROUTES.public) {
  test(`[PUBLIC] ${route.label} — ${route.path}`, async ({
    page,
    consoleErrors,
    apiErrors,
    waitForApp,
  }) => {
    const res = await page.goto(route.path);

    // ── HTTP status must not be a server error ────────────────────────────
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

    // ── Expected text must appear somewhere on the page ───────────────────
    // SEO-shell routes (e.g. /guides served by the API server) have an empty
    // React root; verify <title> instead of body text for those.
    if (route.titleMatch) {
      await expect(page).toHaveTitle(route.titleMatch, { timeout: 8_000 });
    } else if (route.textMatch) {
      await expect(page.locator("body")).toContainText(route.textMatch, {
        timeout: 10_000,
      });
    }

    // ── No unhandled API errors ────────────────────────────────────────────
    expect(apiErrors, `${route.path}: unexpected API errors:\n${apiErrors.join("\n")}`).toHaveLength(0);

    // ── No unhandled JS errors ─────────────────────────────────────────────
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
  // Must show something — not a blank white page
  const body = await page.locator("body").textContent();
  expect((body ?? "").trim().length).toBeGreaterThan(0);
});
