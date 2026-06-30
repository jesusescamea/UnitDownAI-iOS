import type { Page, Request, Response } from "@playwright/test";

/** All app routes, grouped by auth requirement */
export const ROUTES = {
  public: [
    { path: "/",          label: "Landing page",         textMatch: /UnitDown|HVAC|diagnos/i },
    { path: "/diagnose",  label: "Diagnosis form",        textMatch: /diagnos|symptom|Run Diagnosis/i },
    { path: "/pt-chart",  label: "PT Chart page",         textMatch: /PT Chart|Pressure.{0,5}Temperature|refrigerant/i },
    { path: "/login",     label: "Login page",            textMatch: /UnitDown|Sign in|sign.in|Google|Apple|email/i },
    { path: "/signup",    label: "Sign-up page",          textMatch: /Create your account|UnitDown|Sign up/i },
    { path: "/pricing",   label: "Pricing page",          textMatch: /Start Free|9\.99|Founding Member|Pro/i },
    { path: "/guides",    label: "Guides hub",            textMatch: /Troubleshooting Guides|Guides|HVAC/i },
    { path: "/terms",     label: "Terms of Service",      textMatch: /terms/i },
    { path: "/privacy",   label: "Privacy Policy",        textMatch: /privacy/i },
    { path: "/legal",     label: "Legal",                 textMatch: /legal|terms|privacy/i },
    { path: "/safety",    label: "Safety page",           textMatch: /safety/i },
    { path: "/contact",   label: "Contact page",          textMatch: /contact/i },
    { path: "/ai",        label: "AI page",               textMatch: /AI|artificial|intelligence|UnitDown/i },
  ],
  protected: [
    { path: "/dashboard",      label: "Dashboard" },
    { path: "/records",        label: "Equipment records" },
    { path: "/account",        label: "Account page" },
    { path: "/notifications",  label: "Notifications" },
    { path: "/job",            label: "Job mode" },
  ],
} as const;

/** Viewports for mobile regression */
export const MOBILE_VIEWPORTS = [
  { name: "iPhone 14",  width: 390,  height: 844 },
  { name: "Pixel 7",    width: 412,  height: 915 },
  { name: "Galaxy S23", width: 393,  height: 852 },
] as const;

/** Capture all failed requests during a page action */
export function collectRequestFailures(page: Page): () => string[] {
  const failures: string[] = [];
  const handler = (req: Request) => {
    failures.push(`[request-failed] ${req.method()} ${req.url()}`);
  };
  page.on("requestfailed", handler);
  return () => {
    page.off("requestfailed", handler);
    return failures;
  };
}

/** Verify page did not navigate to an error page */
export async function assertNotErrorPage(page: Page) {
  const url = page.url();
  const body = await page.locator("body").textContent({ timeout: 5000 }).catch(() => "");
  const looks404 = /404|not found|page not found/i.test(body ?? "");
  const looks500 = /500|internal server error|error occurred/i.test(body ?? "");
  if (looks404) throw new Error(`Page appears to be a 404 at ${url}`);
  if (looks500) throw new Error(`Page appears to be a 500 at ${url}`);
}

/** Attempt to get a real unit ID from the API (falls back to null) */
export async function getFirstUnitId(page: Page): Promise<string | null> {
  try {
    const res = await page.request.get("/api/units?clientId=audit-test-client&limit=1");
    if (!res.ok()) return null;
    const json = await res.json();
    const units = json?.units ?? json?.data ?? json;
    if (Array.isArray(units) && units.length > 0) return units[0].id ?? null;
  } catch { /* silent */ }
  return null;
}
