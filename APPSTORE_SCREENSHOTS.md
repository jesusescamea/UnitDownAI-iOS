# UnitDown AI — App Store Screenshot Guide

Automated screenshot generation for Apple App Store submission.
Screenshots are captured from the live production app using a real browser at
iPhone 16 Pro Max dimensions (1290 × 2796 pt @ 3×).

---

## Quick Start

```bash
# 1. Install Playwright browsers (one time, run from repo root)
pnpm --filter @workspace/scripts exec playwright install chromium

# 2. Set credentials (never commit these)
export DEMO_EMAIL="review@unitdown.org"
export DEMO_PASSWORD="your-password"

# 3. Generate screenshots
pnpm --filter @workspace/scripts run appstore:screenshots

# 4. Review and validate
pnpm --filter @workspace/scripts run appstore:review
```

Screenshots are saved to `screenshots/appstore/` in the repo root.

---

## Scripts

### `appstore:screenshots`

Launches a headless iPhone 16 Pro Max browser, logs into the live app with the
demo account, runs a real HVAC diagnosis, and captures 10 screenshots.

```bash
pnpm --filter @workspace/scripts run appstore:screenshots
```

**Options:**

| Flag | Description |
|---|---|
| `--marketing` | Adds bold headline overlays to each screenshot |
| `BASE_URL=https://...` | Override target URL (default: `https://unitdown.org`) |

**Marketing mode** (adds App Store-style headline text):
```bash
DEMO_EMAIL=x DEMO_PASSWORD=y \
  pnpm --filter @workspace/scripts run appstore:screenshots -- --marketing
```

**Staging environment:**
```bash
BASE_URL=https://staging.unitdown.org DEMO_EMAIL=x DEMO_PASSWORD=y \
  pnpm --filter @workspace/scripts run appstore:screenshots
```

---

### `appstore:review`

Validates all 10 screenshots and recommends the best 8 for submission.

```bash
pnpm --filter @workspace/scripts run appstore:review
```

**What it checks:**
- All 10 files exist
- Dimensions are exactly 3870 × 8388 px (1290 × 2796 @3×)
- Files are not suspiciously small (which would indicate blank/error screens)
- Flags text-heavy screenshots for manual review
- Scores each screenshot 0–100 and recommends the top 8

Exit code is `0` if all screenshots pass, `1` if any issues are found.

---

## Output Files

| File | Screen | Content |
|---|---|---|
| `01-home.png` | Home | Diagnosis input, "Run Diagnosis" button, hero section |
| `02-diagnostic-report.png` | AI Report | Full diagnosis result with primary fault |
| `03-likely-causes.png` | Likely Causes | Confidence-ranked root causes accordion |
| `04-meter-checks.png` | Meter Checks | Meter readings and instrument verification steps |
| `05-recommended-action.png` | Repair Action | Recommended repair with step-by-step guidance |
| `06-equipment-timeline.png` | Timeline | Unit service history and event log |
| `07-brand-guides.png` | Brand Guides | Brand-specific troubleshooting guide hub |
| `08-hvac-guides.png` | Guide Library | HVAC troubleshooting reference library |
| `09-unit-details.png` | Unit Profile | Equipment specifications and unit profile |
| `10-pro-membership.png` | Pro Membership | Account page with subscription and Pro features |

---

## Updating Screenshots

Regenerate whenever:
- UI changes that affect any captured screen
- New features are added that should be showcased
- Before each App Store submission

```bash
# Full regeneration
DEMO_EMAIL=x DEMO_PASSWORD=y pnpm --filter @workspace/scripts run appstore:screenshots
pnpm --filter @workspace/scripts run appstore:review
```

The demo account (`review@unitdown.org`) must:
- Be created in Clerk
- Have Pro status active (set via `REVIEW_ACCOUNT_CLERK_ID` on the API server)
- Have at least one saved HVAC unit in the Records page (for screens 06 and 09)

---

## Apple App Store Requirements

| Requirement | Value |
|---|---|
| Device | iPhone 16 Pro Max |
| Dimensions | 1290 × 2796 pt → 3870 × 8388 px at 3× |
| Format | PNG (generated) or JPEG |
| Count | Up to 10; Apple recommends 8 |
| Device frames | Do NOT add them — App Store Connect adds them automatically |
| Rounded corners | Do NOT add them |
| First screenshot | Appears in search results — use the most compelling image |
| Alpha channel | Allowed in PNG |

### What Apple Rejects

- Screenshots that do not match the declared device size
- Screenshots showing login screens, legal pages, or onboarding
- Screenshots with placeholder or "Lorem ipsum" content
- Screenshots that misrepresent the app's functionality

---

## Marketing Mode Headlines

When `--marketing` is used, each screenshot gets a bold gradient overlay with:

| Screen | Headline |
|---|---|
| Home | "Commercial HVAC Diagnostics in Seconds" |
| AI Report | "AI-Powered Fault Diagnosis" |
| Likely Causes | "Confidence-Ranked Root Causes" |
| Meter Checks | "Meter & Instrument Verification" |
| Recommended Action | "Clear Repair Recommendations" |
| Equipment Timeline | "Track Every Unit's History" |
| Brand Guides | "Brand-Specific Troubleshooting" |
| HVAC Guides | "Built for Commercial HVAC Technicians" |
| Unit Details | "Complete Equipment Profiles" |
| Pro Membership | "Unlimited Diagnostics, Pro Features" |

Marketing-mode screenshots are suitable for App Store submission. Apple does not
require screenshots to be "raw" UI — overlaid text and design elements are allowed
as long as they accurately represent the app.

---

## Troubleshooting

**"DEMO_EMAIL and DEMO_PASSWORD must be set"**
Export both environment variables before running the script. Never put them in
the script or commit them.

**Screenshots 02–05 show the home screen instead of a diagnosis result**
The API took longer than 45 seconds. Re-run with a stable connection and confirm
the production API is responding. Check `https://unitdown.org/api/healthz`.

**Screens 06 and 09 show the Records list instead of a unit detail**
The demo account has no saved units. Log in as `review@unitdown.org`, add an
HVAC unit via the Records page, then re-run.

**Dimensions mismatch in `appstore:review`**
The viewport or deviceScaleFactor in `capture-appstore-screenshots.ts` was
changed. Restore them to `width: 1290, height: 2796, deviceScaleFactor: 3`.

**Playwright browser not found**
Run the one-time install:
```bash
pnpm --filter @workspace/scripts exec playwright install chromium
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DEMO_EMAIL` | ✅ | Login email for the demo/review account |
| `DEMO_PASSWORD` | ✅ | Login password for the demo/review account |
| `BASE_URL` | optional | Target URL (default: `https://unitdown.org`) |
