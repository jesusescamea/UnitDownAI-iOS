/**
 * 01a — Public SPA Routes (core)
 * Vite-served routes that render React content without authentication.
 * ~6 tests × ~10 s each ≈ 60 s — fits comfortably in the 2-minute bash limit.
 */
import { test, expect } from "../utils/fixtures";
import { ROUTES, assertNotErrorPage } from "../utils/helpers";

for (const route of ROUTES.publicSpa) {
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

    if (route.textMatch) {
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
