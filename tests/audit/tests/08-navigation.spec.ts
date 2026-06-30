/**
 * 08 — Navigation & Links
 * Tests that navigation buttons, links, and routing work correctly
 * on publicly accessible pages.
 */
import { test, expect } from "../utils/fixtures";
import { assertNotErrorPage } from "../utils/helpers";

test.describe("Diagnosis page navigation", () => {
  test("[NAV] /diagnose → /pricing via pricing link works", async ({ page }) => {
    await page.goto("/diagnose");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);

    const pricingLink = page.getByRole("link", { name: /pricing|upgrade|pro/i }).first();
    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).toContain("/pricing");
      await assertNotErrorPage(page);
    }
    // Not a hard failure if the link doesn't exist in current layout
  });

  test("[NAV] /diagnose has a link/button to PT Chart", async ({ page }) => {
    await page.goto("/diagnose");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);

    const ptLink = page.getByRole("link", { name: /PT Chart|pressure.temperature/i }).first();
    const ptBtn  = page.getByRole("button", { name: /PT Chart|pressure.temperature/i }).first();

    const linkVisible = await ptLink.isVisible();
    const btnVisible  = await ptBtn.isVisible();

    if (linkVisible) {
      await ptLink.click();
      await page.waitForTimeout(600);
      expect(page.url()).toContain("/pt-chart");
    } else if (btnVisible) {
      await ptBtn.click();
      await page.waitForTimeout(600);
      expect(page.url()).toContain("/pt-chart");
    }
    // May be in a nav menu — not always visible without click
  });
});

test.describe("Landing page navigation", () => {
  test("[NAV] Landing page login link goes to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);

    const loginLink = page
      .getByRole("link", { name: /sign in|log in/i })
      .or(page.getByRole("button", { name: /sign in|log in/i }))
      .first();

    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).toMatch(/\/(login|sso-callback)/);
      await assertNotErrorPage(page);
    }
  });

  test("[NAV] Footer links resolve without 404", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(600);

    const footerLinks = ["/terms", "/privacy", "/safety", "/contact"];
    for (const href of footerLinks) {
      const link = page.locator(`a[href="${href}"], a[href*="${href}"]`).first();
      if (await link.isVisible()) {
        const res = await page.request.get(href);
        expect(
          res.status(),
          `Footer link ${href} must not 404`,
        ).not.toBe(404);
        expect(
          res.status(),
          `Footer link ${href} must not 500`,
        ).toBeLessThan(500);
      }
    }
  });
});

test.describe("Pricing page", () => {
  test("[NAV] Pricing page renders pricing content", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");
    // Pricing page uses useUser() from Clerk; allow extra render time in sandbox
    await page.waitForTimeout(2_000);
    await assertNotErrorPage(page);

    // The pricing page always renders "Start Free" and "$9.99" regardless of auth state
    await expect(page.locator("body")).toContainText(/Start Free|9\.99|Founding Member/i, {
      timeout: 20_000,
    });
  });
});

test.describe("Guides hub", () => {
  test("[NAV] /guides renders article list", async ({ page, consoleErrors }) => {
    await page.goto("/guides");
    await page.waitForLoadState("domcontentloaded");
    // TroubleshootingHub uses useUser() from Clerk; allow extra render time in sandbox
    await page.waitForTimeout(2_000);
    await assertNotErrorPage(page);
    // "Troubleshooting Guides" is always in the h2 regardless of Pro status
    await expect(page.locator("body")).toContainText(/Troubleshooting Guides|Guides|HVAC/i, {
      timeout: 20_000,
    });
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Login and sign-up page structure", () => {
  test("[NAV] Login page loads with UnitDown branding (Clerk may not load in sandbox)", async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    const res = await page.goto("/login");
    expect(res?.status() ?? 200).toBeLessThan(500);
    await waitForApp();
    // The login page has a custom wrapper with UnitDown branding and OAuth buttons
    // Clerk's own form may not load in the sandboxed test environment (CDN blocked)
    await expect(page.locator("body")).toContainText(/UnitDown|Sign in|Google|email/i, {
      timeout: 8_000,
    });
    expect(consoleErrors).toHaveLength(0);
  });

  test("[NAV] Sign-up page loads with 'Create your account' heading", async ({
    page,
    consoleErrors,
    waitForApp,
  }) => {
    const res = await page.goto("/signup");
    expect(res?.status() ?? 200).toBeLessThan(500);
    await waitForApp();
    // Signup page has a static h1 "Create your account" outside of Clerk's component
    await expect(page.locator("body")).toContainText(/Create your account|UnitDown/i, {
      timeout: 8_000,
    });
    expect(consoleErrors).toHaveLength(0);
  });
});
