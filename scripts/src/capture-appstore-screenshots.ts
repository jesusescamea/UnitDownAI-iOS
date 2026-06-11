#!/usr/bin/env tsx
/**
 * UnitDown AI — App Store Screenshot Generator
 *
 * Launches a headless iPhone 16 Pro Max browser, logs into the live app, runs
 * a realistic HVAC diagnosis, and captures all 10 App Store screenshots.
 *
 * Usage:
 *   DEMO_EMAIL=x@y.com DEMO_PASSWORD=secret pnpm --filter @workspace/scripts run appstore:screenshots
 *
 * Marketing overlay mode (adds headline text to each screenshot):
 *   DEMO_EMAIL=x DEMO_PASSWORD=secret pnpm --filter @workspace/scripts run appstore:screenshots -- --marketing
 *
 * Override target URL (default: https://unitdown.org):
 *   BASE_URL=https://staging.unitdown.org DEMO_EMAIL=... DEMO_PASSWORD=... ...
 */

import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ── Config ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

const BASE_URL = (process.env.BASE_URL ?? "https://unitdown.org").replace(/\/$/, "");
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "";
const MARKETING_MODE = process.argv.includes("--marketing");
const OUTPUT_DIR = path.join(REPO_ROOT, "screenshots", "appstore");

// iPhone 16 Pro Max — matches Apple App Store required screenshot dimensions.
// Playwright will produce a (1290 * 3) × (2796 * 3) = 3870 × 8388 px PNG.
const VIEWPORT = { width: 1290, height: 2796 };
const DEVICE_SCALE_FACTOR = 3;

// Marketing-mode headline for each output file
const MARKETING_HEADLINES: Record<string, string> = {
  "01-home.png": "Commercial HVAC Diagnostics in Seconds",
  "02-diagnostic-report.png": "AI-Powered Fault Diagnosis",
  "03-likely-causes.png": "Confidence-Ranked Root Causes",
  "04-meter-checks.png": "Meter & Instrument Verification",
  "05-recommended-action.png": "Clear Repair Recommendations",
  "06-equipment-timeline.png": "Track Every Unit's History",
  "07-brand-guides.png": "Brand-Specific Troubleshooting",
  "08-hvac-guides.png": "Built for Commercial HVAC Technicians",
  "09-unit-details.png": "Complete Equipment Profiles",
  "10-pro-membership.png": "Unlimited Diagnostics, Pro Features",
};

// Realistic commercial HVAC symptom — produces a rich, section-filled result.
const DEMO_SYMPTOM =
  "Carrier 50XC commercial rooftop, 20 ton, R-410A. Compressor trips on " +
  "high pressure lockout after 15 min of runtime. Discharge pressure reaching " +
  "450 PSI. Outdoor ambient 95°F. Condenser coils clean, head pressure switch " +
  "manually reset three times today. Suction pressure normal at 70 PSI. " +
  "Condenser fan motors all running. No refrigerant leaks observed.";

// ── Logging ───────────────────────────────────────────────────────────────────

function log(msg: string) { process.stdout.write(`${msg}\n`); }
function step(msg: string) { log(`\n→ ${msg}`); }

// ── Filesystem helpers ────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileSizeKb(p: string): number {
  return Math.round(fs.statSync(p).size / 1024);
}

// ── Page helpers ──────────────────────────────────────────────────────────────

/** Settle Framer Motion animations and CSS transitions. */
async function settle(page: Page, ms = 700) {
  await page.waitForTimeout(ms);
}

/** Scroll to an absolute Y position instantly. */
async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.waitForTimeout(200);
}

/** Scroll so the first element matching a CSS selector is centred in the
 *  viewport. Silent if the element is not found. */
async function scrollToSelector(page: Page, selector: string) {
  await page.evaluate((sel) => {
    (document.querySelector(sel) as HTMLElement | null)
      ?.scrollIntoView({ block: "center", behavior: "instant" });
  }, selector);
  await page.waitForTimeout(200);
}

/** Scroll so the first DOM node containing `text` is centred. Silent if not
 *  found — some sections may not be present for every diagnosis result. */
async function scrollToText(page: Page, text: string) {
  await page.evaluate((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent?.includes(t) && node.parentElement) {
        (node.parentElement as HTMLElement).scrollIntoView({
          block: "center",
          behavior: "instant",
        });
        return;
      }
    }
  }, text);
  await page.waitForTimeout(200);
}

/** Inject a full-width marketing headline overlay at the top of the viewport.
 *  Uses a CSS fixed div so it appears in the screenshot without changing layout. */
async function injectHeadline(page: Page, text: string) {
  await page.evaluate((headline) => {
    const el = document.createElement("div");
    el.id = "__as_headline__";
    el.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:2147483647",
      "background:linear-gradient(180deg,rgba(0,10,40,0.94) 0%,rgba(0,10,40,0.72) 55%,transparent 100%)",
      "padding:60px 48px 96px",
      "font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',Helvetica,Arial,sans-serif",
      "color:#ffffff",
      "font-size:60px",
      "font-weight:800",
      "line-height:1.07",
      "letter-spacing:-2px",
      "text-shadow:0 3px 28px rgba(0,0,0,0.55)",
      "pointer-events:none",
      "user-select:none",
    ].join(";");
    el.textContent = headline;
    document.body.prepend(el);
  }, text);
  await page.waitForTimeout(80);
}

async function removeHeadline(page: Page) {
  await page.evaluate(() => document.getElementById("__as_headline__")?.remove());
}

/** Take a screenshot and save it. Adds marketing overlay when --marketing is set. */
async function capture(page: Page, filename: string) {
  const filepath = path.join(OUTPUT_DIR, filename);

  if (MARKETING_MODE) {
    const headline = MARKETING_HEADLINES[filename];
    if (headline) await injectHeadline(page, headline);
  }

  await page.screenshot({ path: filepath, type: "png" });

  if (MARKETING_MODE) await removeHeadline(page);

  log(`  ✓  ${filename}  (${fileSizeKb(filepath)} KB)`);
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(page: Page) {
  step("Logging in…");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const isOnLoginPage = () => {
    const url = page.url();
    return url.includes("/login") || url.includes("/sign-in") || url.includes("clerk");
  };

  // Step 1 — email / identifier
  const emailInput = page.locator("input[name='identifier'],input[type='email']").first();
  await emailInput.waitFor({ state: "visible", timeout: 20_000 });
  await emailInput.fill(DEMO_EMAIL);
  await page.waitForTimeout(500);

  const continueBtn = page.locator("button[type='submit']").first();
  await continueBtn.click();

  // Wait for navigation — Clerk may go to password step or directly home (if passkey/session)
  await page.waitForTimeout(3000);
  log(`  [debug] URL after Continue: ${page.url()}`);

  // Step 2 — password (only needed if still on the login/Clerk page)
  if (isOnLoginPage()) {
    const passwordInput = page.locator("input[type='password'],input[name='password']").first();
    await passwordInput.waitFor({ state: "visible", timeout: 20_000 });
    await passwordInput.fill(DEMO_PASSWORD);
    await page.waitForTimeout(300);

    const signInBtn = page.locator("button[type='submit']").first();
    await signInBtn.click();

    // Wait for redirect away from login
    await page.waitForURL(
      (u) => {
        const href = u.href;
        return !href.includes("/login") && !href.includes("/signup") && !href.includes("clerk");
      },
      { timeout: 30_000 },
    );
  }

  await page.waitForLoadState("networkidle");

  // Verify we're actually signed in by checking for an authenticated element
  log(`  [debug] Final URL: ${page.url()}`);
  log("  ✓  Logged in.");
}

// ── Diagnosis runner ──────────────────────────────────────────────────────────

async function runDiagnosis(page: Page): Promise<boolean> {
  step("Running diagnosis…");
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const textarea = page.locator("[data-testid='hero-input-symptoms']");
  await textarea.waitFor({ state: "visible", timeout: 10_000 });
  await textarea.click();
  await textarea.fill(DEMO_SYMPTOM);

  await page.locator("[data-testid='hero-button-run']").click();

  log("  Waiting for AI result (up to 45 s)…");

  // Wait for loading skeleton, then wait for it to go away
  try {
    await page.waitForSelector("[data-testid='loading-skeleton']", { timeout: 6_000 });
    await page.waitForSelector("[data-testid='loading-skeleton']", {
      state: "detached",
      timeout: 45_000,
    });
  } catch {
    // Fast response — skeleton may never have appeared
  }

  // Confirm result content exists
  try {
    await page.waitForSelector("[data-testid='alternatives-accordion']", { timeout: 12_000 });
    await settle(page, 1000);
    log("  ✓  Diagnosis result received.");
    return true;
  } catch {
    log("  ⚠  Result not found — will screenshot home state for result screens.");
    return false;
  }
}

// ── Individual screenshot captures ────────────────────────────────────────────

async function captureHome(page: Page) {
  step("[01] Home screen");
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await settle(page);
  await scrollTo(page, 0);
  await capture(page, "01-home.png");
}

async function captureDiagnosticReport(page: Page) {
  step("[02] AI diagnostic report");
  // Scroll to top so the primary diagnosis card is fully visible
  await scrollTo(page, 0);
  await settle(page);
  await capture(page, "02-diagnostic-report.png");
}

async function captureLikelyCauses(page: Page) {
  step("[03] Likely causes");
  await scrollToSelector(page, "[data-testid='alternatives-accordion']");
  await settle(page);
  await capture(page, "03-likely-causes.png");
}

async function captureMeterChecks(page: Page) {
  step("[04] Meter & instrument checks");
  // Meter checks appear inside the first open alternative card
  await scrollToText(page, "Meter");
  await settle(page);
  await capture(page, "04-meter-checks.png");
}

async function captureRecommendedAction(page: Page) {
  step("[05] Recommended action");
  await scrollToText(page, "Recommended Action");
  await settle(page);
  await capture(page, "05-recommended-action.png");
}

async function captureEquipmentTimeline(page: Page) {
  step("[06] Equipment timeline");
  await page.goto(`${BASE_URL}/records`, { waitUntil: "networkidle" });
  await settle(page);

  // Open the first unit if one exists
  const firstUnit = page.locator("a[href^='/records/']").first();
  if (await firstUnit.isVisible().catch(() => false)) {
    await firstUnit.click();
    await page.waitForLoadState("networkidle");
    await settle(page);
    // Try to scroll timeline section into view
    const scrolled = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll("h2,h3,[class*='timeline'],[class*='history']"));
      const el = headings.find((h) => h.textContent?.toLowerCase().includes("timeline") ||
                                      h.textContent?.toLowerCase().includes("history"));
      if (el) { (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" }); return true; }
      return false;
    });
    if (!scrolled) await scrollTo(page, 300);
    await settle(page);
  }

  await capture(page, "06-equipment-timeline.png");
}

async function captureBrandGuides(page: Page) {
  step("[07] Brand guides");
  await page.goto(`${BASE_URL}/brand-guides`, { waitUntil: "networkidle" });
  await settle(page);
  await scrollTo(page, 0);
  await capture(page, "07-brand-guides.png");
}

async function captureHvacGuides(page: Page) {
  step("[08] HVAC guides library");
  await page.goto(`${BASE_URL}/guides`, { waitUntil: "networkidle" });
  await settle(page);
  await scrollTo(page, 0);
  await capture(page, "08-hvac-guides.png");
}

async function captureUnitDetails(page: Page) {
  step("[09] Unit details");
  await page.goto(`${BASE_URL}/records`, { waitUntil: "networkidle" });
  await settle(page);

  const firstUnit = page.locator("a[href^='/records/']").first();
  if (await firstUnit.isVisible().catch(() => false)) {
    await firstUnit.click();
    await page.waitForLoadState("networkidle");
    await settle(page);
    await scrollTo(page, 0);
  }

  await capture(page, "09-unit-details.png");
}

async function captureProMembership(page: Page) {
  step("[10] Pro membership");
  await page.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
  await settle(page);
  await scrollTo(page, 0);
  await capture(page, "10-pro-membership.png");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("══════════════════════════════════════════════════");
  log("  UnitDown AI — App Store Screenshot Generator");
  log(MARKETING_MODE ? "  Mode: MARKETING (headlines enabled)" : "  Mode: clean");
  log(`  Target:   ${BASE_URL}`);
  log(`  Output:   ${OUTPUT_DIR}`);
  log(`  Viewport: ${VIEWPORT.width}×${VIEWPORT.height} @${DEVICE_SCALE_FACTOR}x`);
  log("══════════════════════════════════════════════════");

  if (!DEMO_EMAIL || !DEMO_PASSWORD) {
    log("\nERROR: DEMO_EMAIL and DEMO_PASSWORD must be set as environment variables.");
    log("       Never hardcode credentials.\n");
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    locale: "en-US",
    timezoneId: "America/Chicago",
  });

  // Suppress CSS animations so screenshots are crisp and deterministic
  await context.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent = [
      "*, *::before, *::after {",
      "  animation-duration: 0.001ms !important;",
      "  animation-delay: 0ms !important;",
      "  transition-duration: 0.001ms !important;",
      "  scroll-behavior: auto !important;",
      "}",
    ].join("\n");
    document.head?.appendChild(s);
  });

  const page: Page = await context.newPage();

  // Surface console errors during development
  page.on("console", (msg) => {
    if (msg.type() === "error") log(`  [browser error] ${msg.text()}`);
  });

  try {
    await login(page);
    await captureHome(page);

    const hasResult = await runDiagnosis(page);

    await captureDiagnosticReport(page);
    await captureLikelyCauses(page);
    await captureMeterChecks(page);
    await captureRecommendedAction(page);

    await captureEquipmentTimeline(page);
    await captureBrandGuides(page);
    await captureHvacGuides(page);
    await captureUnitDetails(page);
    await captureProMembership(page);

    log("\n══════════════════════════════════════════════════");
    log(`  ✅  10 screenshots saved to ${OUTPUT_DIR}`);
    if (!hasResult) {
      log("  ⚠   Screens 02–05 show home state (diagnosis timed out).");
      log("      Re-run with a live network connection and a Pro account.");
    }
    log("══════════════════════════════════════════════════\n");
  } catch (err) {
    log(`\n❌  Screenshot generation failed: ${(err as Error).message}`);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "_error-state.png") }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
