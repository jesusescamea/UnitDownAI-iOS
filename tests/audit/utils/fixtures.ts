import { test as base, expect, type Page } from "@playwright/test";

export type AuditFixtures = {
  /** Console errors collected since test start (JS errors only, ignoring known noise) */
  consoleErrors: string[];
  /** API errors: any /api/* response with 4xx/5xx status */
  apiErrors: string[];
  /** Wait for the React SPA to hydrate and settle */
  waitForApp: () => Promise<void>;
};

const CONSOLE_IGNORED = [
  "favicon",
  "ERR_CONNECTION_REFUSED",
  "net::ERR",
  "Download the React DevTools",
  "__playwright",
  "Content Security Policy",
  // Clerk cannot load its CDN JS in the sandboxed test environment
  "Failed to load Clerk",
  "clerk.browser.js",
  "failed_to_load_clerk_js",
  "Clerk:",
];

const API_OK_STATUSES = new Set([200, 201, 204, 304, 400, 401, 403, 429]);

export const test = base.extend<AuditFixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!CONSOLE_IGNORED.some((s) => text.includes(s))) {
          errors.push(text);
        }
      }
    });
    page.on("pageerror", (err) => {
      errors.push(`[uncaught] ${err.message}`);
    });
    await use(errors);
  },

  apiErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      const status = res.status();
      if (url.includes("/api/") && !API_OK_STATUSES.has(status)) {
        errors.push(`HTTP ${status}: ${url}`);
      }
    });
    await use(errors);
  },

  waitForApp: async ({ page }, use) => {
    await use(async () => {
      await page.waitForLoadState("domcontentloaded");
      // Give React a moment to render after initial load
      await page.waitForTimeout(600);
    });
  },
});

export { expect };
export type { Page };
