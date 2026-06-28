# UnitDown Production Audit

**Date:** June 2026
**Scope:** Full app — all 12 systems
**Standard:** UnitDown Service Standard (USS)

> For Job Mode prototype-specific audit, see `docs/JOB_MODE_PRODUCTION_AUDIT.md`.

---

## Executive Summary

| System | Real | Partial | Mock / Placeholder | Production Blocker |
|---|---|---|---|---|
| Authentication | ✅ | | | |
| Subscription / Pro | ✅ | ⚠ Team plan | | Team plan UI only |
| Diagnostic Engine | ✅ | ⚠ Fallback copy | | |
| Saved Equipment | ✅ | | | |
| Job Mode (real, `/job`) | ✅ | ⚠ AI summaries | | AI reports not generated |
| Job Mode Prototype (`/jobmode-prototype`) | | | 🧪 Fully mock | See separate audit |
| My Van / Tool Checklist | | ⚠ Session only | 🧪 Scan/Order | Persistence |
| Service Records / USR | ✅ | ⚠ Export formats | | PDF, email, share not built |
| Offline Behavior | ✅ | ⚠ Conflict handling | | |
| iOS / Mobile | ✅ | ⚠ Review demo | | |
| Public Website | ✅ | | | |
| Navigation / Routes | ✅ | ⚠ Dev routes public | | Dev routes in prod |
| Data Storage | ✅ | ⚠ localStorage cache | | Stale Pro cache risk |

---

## 1. Authentication

### What is real
- **Clerk** is the identity provider. Fully configured with `CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY`.
- **Email/password** login is real and works on web and iOS.
- **Google OAuth** is real. Uses `authenticateWithRedirect`.
- **Apple Sign-In** is real. Required by Apple guideline 4.8; present on all platforms.
- **Email OTP** path: In WebView environments (Median/GoNative) where external OAuth redirects are blocked, the app automatically switches to email code strategy. This is intentional and real.
- **Session persistence**: Clerk manages JWT sessions. Sessions survive page refresh.
- **SSO callback**: `/sso-callback` route handles Clerk redirects.
- **Logout**: Fully functional.

### iOS-specific behavior
- Native iOS builds override the Clerk redirect `effectiveOrigin` to `https://unitdown.org` (not `https://localhost` which Clerk rejects).
- The Clerk proxy middleware at `/api/__clerk` enables auth on custom domains and Replit previews without DNS CNAME changes.
- Production enforces `pk_live_` keys to prevent the `dev_browser` cookie-sync flow that is blocked in cross-origin iframes.

### Demo reviewer bypass
- `unitdownsupport@gmail.com` and `review@unitdown.org` are whitelisted in `tester-whitelist.ts` and treated as Pro server-side regardless of subscription status.
- A local demo session (`activateDemoSession()`) stored in `sessionStorage` allows Pro access without a real login, for use during Apple review.
- **Risk:** The demo session flag could be activated by any user who discovers the activation path. This is acceptable for Apple review but the activation trigger should not be publicly documented or navigable.

### What is missing
- No multi-factor authentication (MFA) beyond Apple/Google OAuth.
- No admin-level user management UI (users are managed via Clerk dashboard).
- Password reset is handled entirely by Clerk; no custom recovery flow.

### Production blockers
- None for core auth. Demo bypass is intentional.

---

## 2. Subscription / Pro Access

### What is real
- **Free tier**: Anonymous users get 4 free diagnostics, tracked by fingerprint + cookie. The "Email Wall" grants +1 additional use.
- **Authenticated free trial**: 7-day Pro trial with 25 initial credits (`user_trials` table). Enforced server-side.
- **Credit rewards**: +5 credits for engagement actions (first diagnosis, saving a unit) via the Rewards API.
- **Stripe payments (Web/Android)**: Real Stripe integration. Subscription status checked against live Stripe API. `stripeSubscriptionId` stored in `users` table.
- **Apple IAP (iOS)**: Real StoreKit via native Capacitor plugin (`UnitDownIAP`). The `AppleIAPUpgradeModal` and `ProGate` components use this exclusively on iOS.
- **Restore Purchases (iOS)**: Real — calls native `restorePurchases()` via `appleIAP.ts`.
- **iOS payment guard**: `iosPaymentGuard.ts` patches `window.open`, anchor clicks, and `location.assign` to block Stripe URLs on iOS. This is required for App Store compliance.
- **Backend enforcement**: `hvacRouter` performs a server-side backstop. Returns "lite" results (1 cause, 2 checks, no meter values) if user is not Pro/Trial.
- **Pro unlocks**: Full ranked causes, all meter checks, alternative diagnoses, full SEO guide library.
- **Demo reviewer bypass**: Whitelist grants Pro to test accounts. See §1.

### What is partial or missing
- **Team plan**: Referenced in product requirements and pricing copy but not implemented as a distinct account type. There is no team seat management, no invitation flow, and no team-level billing. The current implementation is individual Pro only.
- **`isPro` localStorage cache**: `localStorage('unitdown_is_pro')` caches Pro status to prevent paywall flash. If a subscription lapses, the cached value shows the wrong state until the next API call resolves. The backend always double-checks, so false upgrades cannot be exploited, but a lapsed user might briefly see Pro UI.
- **Subscription management portal**: There is no in-app subscription cancellation for Stripe. Users must manage via Stripe's customer portal or Apple subscriptions settings.

### Production blockers
- Team plan UI if shown: must be labeled "Coming Soon" or removed until implemented.
- Consider surfacing a subscription management portal link in AccountPage for Stripe users.

---

## 3. Diagnostic Engine

### What is real
- **Hybrid engine**: Knowledge Base (KB) scoring first, OpenAI augmentation if confidence is low. Both layers are real.
- **Symptom input**: Free-text, fault codes, and instrument readings. All processed by the real engine.
- **KB scoring** (`hvac-diagnostics.ts`): Weighted scoring with brand/equipment-type modifiers, contradiction penalties (e.g., "compressor running" + "locked rotor" cancels each other), and signal boosts (e.g., LRA detection).
- **SH/SC calculations**: Real refrigeration logic in the OpenAI system prompt:
  - High SH + Low SC → Undercharge/Leak
  - High SH + High SC → Restriction (TXV / Filter Drier)
  - Low SH + High SC → Overcharge
- **Safety warnings**: `riskNote` and `priorityLevel` (low → critical). Safety Override rule: gas smell, smoke, or sparking always surfaces as first and highest priority. This is real.
- **Resolution capture**: DiagnosticLogDetailPage allows technicians to record what fixed it. Stored server-side.
- **Feedback buttons**: Thumbs up/down on results. Calls real `/api/feedback` endpoint. Stored in DB.
- **Pro vs. Free gating**: Backend enforces. Free users receive "lite" results. Pro users receive full diagnosis.

### What is partial
- **Meter readings flow**: The diagnostic form accepts measurements, but there is no guided "measure now and re-run" loop. Users enter readings manually.
- **Alternative diagnoses**: Shown in Pro results but ranked purely by the scoring engine. No follow-up inference pass.
- **Brand/model-specific overrides**: KB has brand-weighted entries but no model-specific fault code database.

### What is missing
- OEM fault code lookup by model number.
- Guided step-by-step measurement collection integrated with the diagnostic loop.
- Measurement history tracking per equipment unit.

### Production blockers
- None for the core engine. It is real and functional.

---

## 4. Saved Equipment

### What is real
- **Create / Edit**: `UnitFormPage.tsx`. All fields persist to `unit_records` (Postgres via Drizzle ORM).
- **Archive**: `isArchived` flag. Soft delete.
- **Duplicate detection**: `DuplicateModal.tsx` + server-side `/check-duplicate` endpoint normalizes serial numbers.
- **Nameplate OCR** (not prototype): `NameplateScannerModal` uses real OCR. Generates a persistent object storage URL and compressed preview. Results stored in `unit_records`.
- **Equipment detail page** (`/records/:id`): Tabs for Timeline, Info, Photos, Resources, Notes. All real.
- **Diagnostic history**: Timeline aggregates diagnostics, repairs, maintenance, and scans from DB.
- **Customer/site grouping**: `siteCustomerName` and `location` fields on `unit_records`. Filterable.
- **Search**: Client-side search in RecordsPage over unit name, model, serial, customer name.
- **Open recommendations**: Tracked and displayed in equipment detail.

### What is partial
- **Resources tab**: Links to manufacturer manuals and wiring diagrams. These are static/curated links, not dynamically fetched from OEM APIs.
- **Photos tab**: Shows photos linked to this unit. Upload works. No photo categorization UI (nameplate vs. fault vs. repair).
- **Customer grouping**: No dedicated "Customers" page — grouped by `siteCustomerName` field in the unit list.

### What is missing
- Equipment-to-equipment relationships (e.g., split system outdoor + indoor).
- Warranty tracking.
- Service reminder scheduling (ScheduledEventModal exists but persistence unclear).
- QR code generation / equipment labeling (per USS North Star).

### Production blockers
- None for core CRUD. Equipment data persists correctly.

---

## 5. Job Mode

### Real Job Mode (`/job`, `/job/:id`)
The production Job Mode is separate from the `/jobmode-prototype`.

**What is real:**
- Job creation, timeline event persistence (`job_timeline_events`).
- Real voice recording via `MediaRecorder` + Whisper transcription.
- Real photo capture + object storage upload.
- Real measurement entry (no pre-filled mock values).
- Real part logging.
- Real recommendation entry.
- Offline-first: IndexedDB sync queue, `OfflineStatusBar`, automatic retry on reconnect.
- Real `ServiceRecordPage` (`/logs/:id`) compiled from real timeline events.

**What is partial:**
- AI Professional Report: Section exists in `ServiceRecordPage`. Shown as empty placeholder ("AI-generated professional report will appear here once generated") until generated. The generation trigger is not yet implemented — no button calls an AI endpoint to generate the report.
- Customer Summary: Same — section exists, shows placeholder if no data.
- Invoice Summary: Same — section exists, shows placeholder if no data.
- Equipment Memory Updates: Section exists, shown as placeholder if none logged.
- USR ID: Assigned server-side per job. Not yet the global permanent format described in the USS spec.

**What is missing:**
- AI report generation trigger (button that calls GPT over `job_timeline_events`).
- USR PDF export (Print works; PDF generation does not).
- Office notification on job completion.
- Email/share/USS Archive export (all labeled "Soon" in the export sheet).

### Job Mode Prototype (`/jobmode-prototype`)
Fully documented in `docs/JOB_MODE_PRODUCTION_AUDIT.md`. Summary: in-memory only, all data lost on refresh, 8 of 14 behaviors are mock or fake. Not a production feature — for demonstration and planning only.

### Production blockers
- AI report generation not yet wired: GPT call over timeline events.
- Export formats other than Print not yet built.

---

## 6. My Van / Tool Checklist

### What is real within a session
- Inventory adjustments (add/remove/use) persist within the session (useState).
- Van readiness score computed from current state.
- Tool checklist check/uncheck within session.
- Borrow From Another Van UI: Toggles open; individual transfer/reserve buttons show "coming soon" toasts.
- Restock list: Shows parts below threshold. "Order Now" button shows "coming soon" toast.

### What is labeled "Coming Soon" (correctly)
- Scan Receipt → Sheet opens, clearly labeled "Coming Soon."
- Shelf Scan → Sheet opens, labeled "Coming Soon."
- Order Now → Labeled "Order Now — Coming Soon" inline.
- Barcode scanning → Sheet opens, "Barcode scanning is coming soon."
- Transfer / Reserve (Borrow) → Toast: "Transfer request — coming soon" / "Reserve — coming soon."
- Supply house integration → Toast: "Supply house integration — coming soon."

### What is missing
- **Persistence**: All van inventory and tool checklist data is lost on page refresh. No `van_inventory` table written to.
- **Real van assignment**: No van-to-technician assignment. Inventory is generic.
- **Nearby techs**: Hardcoded for Borrow feature; no real dispatch data.

### Production blockers
- Van inventory must persist to a `van_inventory` table (or similar) before this feature is production-ready.
- Tool checklist should persist to a `tool_checklist_logs` table keyed by technician + date.

---

## 7. Service Records / USR

### What is real
- `ServiceRecordPage` (`/logs/:id`) is compiled from real `job_timeline_events` data.
- Timeline, measurements, voice notes, photos all pulled from real DB records.
- **Print**: Works. `window.print()` triggers browser print dialog with print-optimized CSS.
- USR ID: Server-assigned per job.

### Export formats

| Format | Status |
|---|---|
| Print | ✅ Real |
| PDF Report | 🔜 "Soon" (labeled) |
| Customer Copy | 🔜 "Soon" (labeled) |
| Office Copy | 🔜 "Soon" (labeled) |
| USS Archive (JSON) | 🔜 "Soon" (labeled) |
| Email | 🔜 "Soon" (labeled) |
| Share Link | 🔜 "Soon" (labeled) |
| Copy JSON | 🔜 "Soon" (labeled) |

All "Soon" buttons are disabled with a visible "Soon" badge and a note: "Export formats are being added in upcoming releases." No misleading UI.

### Placeholder sections (correctly handled)
- AI Professional Report: Shows `PlaceholderSection` when no data. Not misleading.
- Customer Summary: Shows "No Customer Summary generated." Not misleading.
- Invoice Summary: Shows "No Invoice Summary generated." Not misleading.
- Equipment Memory Updates: Shows `PlaceholderSection` when empty. Not misleading.

### What is missing
- AI report generation endpoint (GPT call to produce professional, customer, and invoice summaries).
- PDF generation (puppeteer, react-pdf, or similar).
- Shareable link generation (server-side signed URL).
- USS Archive JSON compilation and download.
- Global permanent USR ID format (e.g., `USR-2026-004921`) as described in the USS spec.

### Production blockers
- AI report summaries not generated.
- PDF / share / email exports not built.
- USR ID format not finalized.

---

## 8. Offline Behavior

### What is real
- **IndexedDB**: `jobOfflineDB.ts` manages `sync_queue` (pending API operations) and `blobs` (unsynced photos/voice notes).
- **Sync queue**: Operations enqueued when offline; auto-flushed when `navigator.onLine` fires or on manual retry.
- **OfflineStatusBar**: Shows real sync state — idle, syncing, pending, error, offline.
- **Service Worker**: PWA service worker present with Workbox. `NetworkOnly` for `/api/*` (no caching stale results). `StaleWhileRevalidate` for Google Fonts CSS. `CacheFirst` for font files. Precaching for build assets.
- **`startJob`**: Client-generates a permanent ID locally; job can start without network access.
- **`onConflictDoNothing`**: Server uses idempotent write strategy — replaying a queued operation does not create duplicates.

### What is partial
- **Conflict handling**: `onConflictDoNothing` prevents duplicate-write errors, but there is no explicit last-write-wins or merge strategy for conflicting edits. This is acceptable for append-only timeline events.
- **Unsynced indicators**: `OfflineStatusBar` shows global sync state, but individual timeline events do not show per-item "pending sync" badges.
- **Blob sync**: Photos and voice notes queued in IndexedDB blobs are synced, but the UI does not distinguish between "uploaded" and "pending upload" for individual media items.

### Data loss risks
- If IndexedDB is cleared (user clears browser data, private browsing), all pending offline changes are lost permanently.
- On iOS in Capacitor's WKWebView, IndexedDB persistence across app updates is generally reliable, but large blobs may be evicted by the OS under storage pressure.

### Production blockers
- No critical blockers. Offline architecture is well-designed.
- Recommended: Per-item "pending" badge on timeline events.
- Recommended: Warn user before clearing offline data.

---

## 9. iOS / Mobile App

### What is real
- **Capacitor build**: The Android app uses `https://unitdown.org` as its WebView remote URL. iOS build uses the same.
- **Apple Sign-In**: Real, required by Apple guideline 4.8.
- **Apple IAP**: Real StoreKit via native `UnitDownIAP` Capacitor plugin. Native purchase sheet is shown.
- **Restore Purchases**: Real — `restorePurchases()` calls native StoreKit restore.
- **iOS payment guard**: `iosPaymentGuard.ts` blocks Stripe URLs on iOS. Required for App Store compliance.
- **Camera permissions**: Nameplate scanner requests camera permission natively.
- **Safe-area layout**: `safe-area-pb`, `pt-12` safe area classes used throughout modals and headers.
- **Apple Review path**: Demo bypass via `unitdownsupport@gmail.com` or sessionStorage flag.

### What is partial
- **Background/resume behavior**: No explicit app-resume handler. If the app is backgrounded mid-job, state is preserved in localStorage/IndexedDB but there is no reconnection trigger on foreground. `navigator.onLine` events fire naturally on resume.
- **Push notifications**: Not implemented. Job completion notifications, service reminders would require APNs registration.

### What is missing
- Push notification support (job alerts, service reminders, office notifications).
- Deep link handling (e.g., scanning a QR code on equipment opens its detail page).
- Siri/Shortcuts integration.

### Production blockers
- None for current feature set. App is App Store-compliant with IAP and payment guard.
- Deep links and push notifications are future phase requirements.

---

## 10. Public Website

### What is real
- **Homepage** (`/`): Real — diagnostic input, results, Pro upsell.
- **Guides hub** (`/guides`): Real — SEO-optimized troubleshooting hub.
- **SEO issue pages** (`/guides/:slug`): Real — content pages for specific faults.
- **Brand hub** (`/brand-guides`): Real.
- **Brand pages** (`/brand-guides/:slug`): Real.
- **Terms** (`/terms`): Real legal content.
- **Privacy** (`/privacy`): Real privacy policy.
- **Legal/safety** (`/legal`): Real disclosures.
- **App Store badge**: Static SVG link. Points to App Store listing.
- **Footer links**: Release Notes, Support, Contact, Report a Bug, Terms, Privacy. All wired.
- **Sponsor page** (`/sponsor`): Exists; content is informational.

### What is partial
- **Pricing page**: No dedicated `/pricing` route. Pro upgrade is surfaced inline (ProGate, AccountPage). Pricing details visible in the upgrade modal.
- **SEO/meta tags**: Present on SEO pages via react-helmet or equivalent. Coverage of non-SEO pages (Home, Records, Account) needs verification.

### What is missing
- Dedicated pricing/plans page.
- Blog or changelog section.
- HVAC brand partner / sponsor directory.

### Production blockers
- None for current public pages.
- Recommended: Verify meta tags on all top-level routes.

---

## 11. Navigation / Routes

### Defined routes

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Real | Home / Diagnostics |
| `/guides` | ✅ Real | Troubleshooting Hub |
| `/guides/:slug` | ✅ Real | SEO issue pages |
| `/brand-guides` | ✅ Real | Brand hub |
| `/brand-guides/:slug` | ✅ Real | Brand pages |
| `/sponsor` | ✅ Real | Sponsor info |
| `/account` | ✅ Real | User + subscription management |
| `/records` | ✅ Real | Equipment list |
| `/records/new` | ✅ Real | Add equipment |
| `/records/:id/edit` | ✅ Real | Edit equipment |
| `/records/:id` | ✅ Real | Equipment detail |
| `/logs/:id` | ✅ Real | Service Record view |
| `/login` | ✅ Real | Sign in |
| `/signup` | ✅ Real | Register |
| `/sso-callback` | ✅ Real | Clerk OAuth return |
| `/terms` | ✅ Real | Terms of Service |
| `/privacy` | ✅ Real | Privacy Policy |
| `/legal` | ✅ Real | Legal / safety disclosures |
| `/job` | ✅ Real | Job list / start job |
| `/job/:id` | ✅ Real | Active job view |
| `/job/:id/record` | ✅ Real | Job completion / record |
| `/admin` | ⚠ Internal | Admin view — no auth guard visible in routes |
| `/jobmode-prototype` | 🧪 Prototype | Publicly accessible prototype — see separate audit |
| `/job-preview` | 🧪 Dev | Dev preview — publicly accessible |
| `/job-preview/record` | 🧪 Dev | Dev preview — publicly accessible |
| `/dev/equipment-preview` | 🧪 Dev | Dev preview — publicly accessible |
| `*` (unmatched) | ⚠ Unknown | No explicit 404 route visible in App.tsx |

### Concerns
- **Dev routes in production**: `/jobmode-prototype`, `/job-preview`, `/job-preview/record`, `/dev/equipment-preview` are all publicly accessible via direct URL. They contain prototype/mock data and no auth guard. Users who find these routes might be confused by the prototype behaviors.
- **No explicit 404 route**: Unmatched routes fall through. Users navigating to non-existent paths may see a blank page. A `<Route>` catch-all with a "Page Not Found" component should be added.
- **`/admin` route**: Present in routes but no auth guard shown in the route definition. If not guarded, any user can access the admin view.

### Tab and modal audit

| Element | Working | Notes |
|---|---|---|
| Unit detail tabs (Timeline / Info / Photos / Resources / Notes) | ✅ | All real |
| My Van tabs (Overview / Inventory / Restock) | ✅ | Session only |
| Voice Note tabs (Professional / Original / Customer) | ✅ | Content populated from real transcription |
| FAB menu (Active Job) | ✅ | All buttons launch correct modals |
| All modal close buttons | ✅ | Verified in prototype; real job same pattern |
| Diagnostic "Run Analysis" CTA | ✅ | Triggers real engine |
| "Join UnitDown Pro" CTA | ✅ | Opens ProGate / IAP modal |
| "Save Unit" CTA | ✅ | Persists to DB |
| "Start New Job" CTA | ✅ | Creates job in DB |
| My Van "Order Now" | ⚠ Toast | Labeled "Coming Soon" |
| My Van "Scan Receipt" | ⚠ Sheet | Labeled "Coming Soon" |
| My Van "Shelf Scan" | ⚠ Sheet | Labeled "Coming Soon" |
| Export: Print | ✅ | Works |
| Export: PDF / Email / Share / etc. | ⚠ Disabled | Labeled "Soon" |

### Production blockers
- Add a 404 catch-all route.
- Verify `/admin` has a proper auth guard.
- Consider restricting or removing dev routes (`/jobmode-prototype`, `/job-preview`, `/dev/equipment-preview`) from the production build, or requiring internal auth.

---

## 12. Data Storage

### PostgreSQL (Drizzle ORM) — persists across sessions
| Table | What it stores | Real |
|---|---|---|
| `users` | Clerk user ID, email, Pro status, Stripe subscription ID | ✅ |
| `user_trials` | 7-day trial, credit balance, reward history | ✅ |
| `unit_records` | Equipment data, nameplate URLs, normalized serial | ✅ |
| `diagnostic_logs` | Full KB + AI diagnostic outputs, scores, feedback | ✅ |
| `jobs` | Job sessions (start time, technician, equipment link) | ✅ |
| `job_timeline_events` | Chronological typed events per job | ✅ |
| `usage` | Anonymous diagnostic usage tracking | ✅ |

### localStorage — persists across page loads, per browser
| Key | What it stores | Risk |
|---|---|---|
| `unitdown_is_pro` | Cached Pro status | Stale if subscription lapses — UI may briefly show Pro |
| `unitdown_active_job_id` | Resumes in-progress job | Stale if job was deleted server-side |
| `unitdown_recently_viewed` | Last 5 viewed equipment | Low |
| `unitdown_client_id` | Anonymous tracking ID | Low |
| `unitdown_diag_count` | Free diagnostic counter | Can be cleared to bypass limit (soft protection only) |
| Various Clerk keys | Auth session tokens | Managed by Clerk SDK; do not touch |

### IndexedDB — offline sync
| Store | What it stores | Risk |
|---|---|---|
| `sync_queue` | Pending API operations for offline job events | Lost if browser storage cleared |
| `blobs` | Unsynced photos / voice note audio | Lost if browser storage cleared; large blobs may be OS-evicted on iOS |

### sessionStorage — current tab only
| Key | What it stores |
|---|---|
| Demo session flag | Active during Apple review; grants Pro without login |

### Mock / prototype data — never persists
| Location | Content |
|---|---|
| `src/pages/jmp/mockData.ts` | All Job Mode Prototype mock data |
| `src/data/dashboardData.ts` | Dashboard prototype mock events |
| `/jobmode-prototype` state | Lost on any navigation |
| `/job-preview` state | Lost on any navigation |

### Stale cache risks
- `unitdown_is_pro = "1"` in localStorage shows Pro UI until the next API call resolves the real status. The backend always enforces; no data is returned to free users. But the UI flash exists.
- `unitdown_diag_count` can be cleared by the user to reset the free diagnosis counter. This is soft protection. The server also tracks by fingerprint + IP, providing a harder layer.

---

## Privacy Concerns Fixed

The following were identified and fixed during this audit:

1. **Symptom data logged to browser console** (`App.tsx` line ~2084): A `console.log` call printed diagnostic symptom text and `clientId` to the browser console. This could expose patient/equipment/symptom details to anyone with DevTools access. **Removed.**

2. **Server routes using `console.log` instead of `req.log`** (`feedback.ts`, `resolution.ts`): Two route handlers logged feedback content via `console.log` rather than the project-standard `req.log`. This bypasses structured logging and log-level controls. **Fixed to use `req.log`.**

---

## Production Blockers (Priority Order)

### Critical
1. **`/admin` route auth guard** — Verify this route requires admin authentication. If not guarded, any user can access admin functionality.
2. **AI report generation** — No GPT call is wired to generate the Professional Report, Customer Summary, or Invoice Summary in completed job records. Sections exist but are always empty.

### High
3. **404 catch-all route** — No fallback route for unmatched paths. Add a "Page Not Found" component.
4. **Van inventory persistence** — All inventory data lost on refresh. Blocks My Van from being production-useful.
5. **PDF export** — Only "Print" works. PDF, email, share, USS Archive are all labeled "Soon" but not built.

### Medium
6. **Dev routes in production** — `/jobmode-prototype`, `/job-preview`, `/dev/equipment-preview` are publicly accessible. Consider requiring internal auth or removing from production build.
7. **Team plan** — No implementation. If referenced in any visible pricing UI, label it "Coming Soon."
8. **USR ID format** — Current format is not the global permanent `USR-YYYY-NNNNNN` format described in the USS spec.
9. **Push notifications** — Job completion and service reminder notifications require APNs/FCM registration.

### Low
10. **Per-item offline pending badge** — Timeline events don't show individual "syncing" state.
11. **Subscription management portal link** — No in-app way for Stripe users to manage or cancel their subscription.
12. **Meta tags on non-SEO pages** — Home, Records, Account may lack proper og:/twitter: tags.

---

## Recommended Fix Order

### Phase 1 — Security and correctness (do now)
- [ ] Verify `/admin` route has a proper auth guard
- [ ] Confirm dev routes require internal auth or remove from production
- [ ] Add 404 catch-all route
- [ ] ~~Remove symptom `console.log`~~ ✅ Done
- [ ] ~~Fix server `console.log` → `req.log`~~ ✅ Done

### Phase 2 — Missing core features
- [ ] Wire AI report generation (GPT over `job_timeline_events`)
- [ ] Persist van inventory and tool checklist to DB
- [ ] Build PDF export (react-pdf or puppeteer)
- [ ] USR ID permanent format finalization

### Phase 3 — Polish and completeness
- [ ] 404 page with navigation back to home
- [ ] Subscription management portal link (Stripe billing portal)
- [ ] Push notification infrastructure (APNs/FCM)
- [ ] Per-item "syncing" badge on offline timeline events
- [ ] Meta tags audit on all routes
- [ ] Team plan (implement or remove all references)

---

## Safe Fixes Applied During This Audit

| File | Change | Reason |
|---|---|---|
| `artifacts/unitdown-ai/src/App.tsx` | Removed `console.log` that printed symptoms + clientId to browser console | Privacy — user symptom data should not appear in DevTools |
| `artifacts/api-server/src/routes/feedback.ts` | Replaced `console.log` with `req.log` | Project standard — all route logging must use structured `req.log` |
| `artifacts/api-server/src/routes/resolution.ts` | Replaced `console.log` with `req.log` | Project standard — all route logging must use structured `req.log` |

---

*Last updated: June 2026*
*Owner: UnitDown Engineering*
