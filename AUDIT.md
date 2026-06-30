# UnitDown Field OS — Regression Audit

Automated browser regression tests covering all major routes, API endpoints,
UI interactions, and mobile viewports. Built with [Playwright](https://playwright.dev).

---

## Quick Start

```bash
# 1. Install Playwright browsers (first time only)
pnpm audit:install

# 2. Run the full audit
pnpm audit

# 3. Open the HTML report
pnpm audit:report
```

---

## Prerequisites

- Both workflows must be running:
  - `artifacts/api-server: API Server` (port 8080 → proxied at /api)
  - `artifacts/unitdown-ai: web` (Vite dev server)
- The proxy serves everything at `http://localhost:80`
- The audit checks `/api/healthz` on startup and exits if the server is unreachable

---

## Test Suites

| File | Tests | Auth Required | What it covers |
|------|-------|:---:|----------------|
| `01-public-routes.spec.ts` | 15 | ❌ | All public-facing routes — landing, diagnose, PT chart, login, pricing, guides, static pages |
| `02-protected-routes.spec.ts` | 8 | ❌ | Auth-guarded routes don't 404/500 for unauthenticated visitors |
| `03-api-endpoints.spec.ts` | 9 | ❌ | API health, usage, units, customers, diagnose, nameplate, van inventory, reminders |
| `04-diagnosis-flow.spec.ts` | 5 | ❌ | Symptom input, submit button state, unit selector, no JS errors |
| `05-pt-chart.spec.ts` | 5 | ❌ | PT chart page renders, refrigerant selector, temperature input |
| `06-authenticated-flows.spec.ts` | 10 | ✅ | Dashboard, Scan Nameplate, My Van, Start Diagnosis from unit, Start Job, Account |
| `07-mobile.spec.ts` | 6 | ❌ | iPhone 14 + Pixel 7 viewport rendering — landing, diagnose, PT chart, login, pricing |
| `08-navigation.spec.ts` | 7 | ❌ | Nav links, footer links, CTAs, form submit buttons |

**Total: ~65 tests** across 5 browser projects (desktop, desktop-auth, iphone-14, pixel-7)

---

## Browser Projects

| Project | Viewport | Auth | Tests |
|---------|----------|:----:|-------|
| `desktop` | 1280×800 | ❌ | All except `06-authenticated` and `07-mobile` |
| `desktop-auth` | 1280×800 | ✅ | `06-authenticated-flows.spec.ts` only |
| `iphone-14` | 390×844 | ❌ | `07-mobile.spec.ts` |
| `pixel-7` | 412×915 | ❌ | `07-mobile.spec.ts` |

---

## Authenticated Tests

The authenticated test suite (`06-authenticated-flows.spec.ts`) requires a saved
browser state. Run this **once** to set it up:

```bash
# Opens a headed browser — sign in manually when prompted
pnpm --filter @workspace/audit run audit:setup-auth
```

After signing in, the session is saved to `tests/audit/.auth/user.json`.
Subsequent `pnpm audit` runs will use this state automatically.

> ⚠️ The `.auth/` directory is gitignored — never commit auth state.

### What authenticated tests cover
- Dashboard loads, no errors
- "Start Diagnosis" shortcut → routes to `/diagnose`
- "Scan Nameplate" button → opens scanner modal
- "My Van / Tool Checklist" → opens modal
- Equipment Records list renders
- Unit detail → Start Diagnosis → pre-selects unit on `/diagnose`
- Unit detail → Start Job → navigates to `/job/:id`
- Unit detail → Back button returns to `/records`
- Account page loads without error
- Theme toggle changes dark/light mode

---

## Live Diagnosis Test

By default, the diagnosis form tests stop at button-click to avoid AI API costs.
To run a full end-to-end diagnosis submission:

```bash
AUDIT_RUN_LIVE_DIAGNOSIS=1 pnpm audit --grep "DIAGNOSIS-LIVE"
```

---

## Custom Base URL

To audit a deployed production instance:

```bash
AUDIT_BASE_URL=https://unitdown.org pnpm audit
```

---

## Output

### Terminal
```
✓ [PUBLIC] Landing page — /  (1.2s)
✓ [PUBLIC] Diagnosis form — /diagnose  (0.9s)
✓ [API] GET /api/healthz → 200 { status: 'ok' }  (0.1s)
✗ [MOBILE] Diagnosis form is usable on mobile  (FAILED)
  Screenshot: audit-report/data/abc123.png
```

### HTML Report
After running, open the interactive report:
```bash
pnpm audit:report
# Opens: tests/audit/audit-report/index.html
```

The HTML report includes:
- **PASS / FAIL** per test with timing
- **Screenshots** on failure
- **Trace viewer** for debugging failed steps
- **Retry history** for flaky tests

### JSON Output
Raw results at `tests/audit/audit-results.json` — useful for CI integration.

---

## CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Install Playwright browsers
  run: pnpm audit:install

- name: Run regression audit
  run: pnpm audit
  env:
    AUDIT_BASE_URL: http://localhost:80

- name: Upload audit report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: audit-report
    path: tests/audit/audit-report/
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUDIT_BASE_URL` | `http://localhost:80` | Override the target app URL |
| `AUDIT_AUTH_STATE` | `tests/audit/.auth/user.json` | Path to saved browser auth state |
| `AUDIT_RUN_LIVE_DIAGNOSIS` | unset | Set to `1` to run real AI diagnosis submission |

---

## Limitations

| Limitation | Workaround |
|-----------|-----------|
| Clerk auth blocks authenticated routes without saved state | Run `pnpm audit:setup-auth` once |
| AI diagnosis not exercised by default (cost) | Set `AUDIT_RUN_LIVE_DIAGNOSIS=1` |
| Camera/microphone not accessible in headless Chromium | Use `--headed` + manual testing for Scan Nameplate camera |
| Stripe/payment flows require real Stripe credentials | Test in Stripe test mode manually |
| Push notifications require HTTPS + service worker | Test on deployed URL with `AUDIT_BASE_URL` |
| Talk Schedule / voice features require WebRTC | Test manually on device |

---

## Adding New Tests

1. Create a new spec file in `tests/audit/tests/`
2. Import from `../utils/fixtures` for `test`, `expect`, `consoleErrors`, `apiErrors`
3. Follow the naming convention: `NN-descriptive-name.spec.ts`
4. Run only your new test: `pnpm audit --grep "\[YOUR-TAG\]"`

```ts
import { test, expect } from "../utils/fixtures";

test("[MY-FEATURE] Description of what this tests", async ({ page, consoleErrors }) => {
  await page.goto("/my-route");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toContainText(/expected text/i);
  expect(consoleErrors).toHaveLength(0);
});
```

---

## Troubleshooting

**`Error: Cannot reach API at /api/healthz`**
→ Start the API Server workflow in Replit first.

**`Error: browserType.launch: Executable doesn't exist`**
→ Run `pnpm audit:install` to download Chromium.

**Authenticated tests all skip**
→ Run `pnpm --filter @workspace/audit run audit:setup-auth` and sign in manually.

**Tests are slow**
→ Playwright retries on failure. Use `--retries=0` to skip retries during development.

**`storageState` file not found warning**
→ Normal if auth setup hasn't been run. Authenticated tests will be auto-skipped.
