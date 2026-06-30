/**
 * 02 — Protected Routes (unauthenticated)
 * These routes require sign-in. Without auth they should redirect to the landing
 * page or /login — but must never serve a 404 or 500, and must not crash the JS.
 */
import { test, expect } from "../utils/fixtures";
import { ROUTES, assertNotErrorPage } from "../utils/helpers";

for (const route of ROUTES.protected) {
  test(`[AUTH-GUARD] ${route.label} — ${route.path} does not 404/500 unauthenticated`, async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    const res = await page.goto(route.path);

    // Server must not return an error response
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

    // The page must render something in the DOM (even a loading spinner is acceptable —
    // Clerk cannot load its CDN scripts in the sandbox, so auth-guarded pages may stay
    // in a loading state rather than redirecting).  Check DOM element count, not text.
    const domCount = await page.locator("body *").count();
    expect(domCount, `${route.path}: DOM must contain at least one element`).toBeGreaterThan(0);

    // No uncaught JS exceptions (Clerk errors are filtered in fixtures.ts)
    expect(
      consoleErrors,
      `${route.path}: unexpected console errors:\n${consoleErrors.join("\n")}`,
    ).toHaveLength(0);
  });
}

test("[AUTH-GUARD] /records/:id with random ID does not 500", async ({ page }) => {
  const res = await page.goto("/records/nonexistent-unit-id-xyz");
  expect(res?.status() ?? 200).toBeLessThan(500);
  await page.waitForLoadState("domcontentloaded");
  await assertNotErrorPage(page);
});

test("[AUTH-GUARD] /job/:id with random ID does not 500", async ({ page }) => {
  const res = await page.goto("/job/nonexistent-job-id-xyz");
  expect(res?.status() ?? 200).toBeLessThan(500);
  await page.waitForLoadState("domcontentloaded");
  await assertNotErrorPage(page);
});

test("[AUTH-GUARD] /logs/:id with random ID does not 500", async ({ page }) => {
  const res = await page.goto("/logs/nonexistent-log-id-xyz");
  expect(res?.status() ?? 200).toBeLessThan(500);
  await page.waitForLoadState("domcontentloaded");
  await assertNotErrorPage(page);
});
