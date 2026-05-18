# Apple App Store Submission Checklist — UnitDown AI

## App Store Connect Setup

### Agreements
- [ ] Paid Apps Agreement accepted in App Store Connect → Agreements, Tax, and Banking
- [ ] Banking information completed and verified

### In-App Purchases
- [ ] IAP product created: **`com.unitdown.ai.pro.monthly`**
  - Type: Auto-Renewable Subscription
  - Subscription Group: "UnitDown AI Pro"
  - Display Name: "UnitDown AI Pro"
  - Price: $7.99 / month (or your target price tier)
  - Localization: English (US) display name + description added
  - App Store Review screenshot attached to the IAP
  - IAP product status: **Ready to Submit** (not missing metadata)
- [ ] IAP product submitted together with the app binary (cannot submit IAP after binary alone)

### App Record
- [ ] App name, subtitle, description, keywords filled
- [ ] Screenshots for all required device sizes (6.7", 6.5", 5.5" iPhone; 12.9" iPad if iPad supported)
- [ ] App preview video (optional but recommended)
- [ ] Privacy policy URL provided
- [ ] Content rights confirmed
- [ ] App category set (Utilities or Productivity)
- [ ] Age rating completed

### Review Information
- [ ] Demo account credentials entered in App Review Information:
  - Username: `review@unitdown.org`
  - Password: `Review123!`
- [ ] Review notes added (copy from `APP_REVIEW_NOTES.md`)
- [ ] Contact info for review team filled

---

## Xcode / Build Setup

- [ ] `npx cap add ios` run (if not already done)
- [ ] `npx cap sync` run after every web build
- [ ] **In-App Purchase** capability enabled in Xcode target → Signing & Capabilities
- [ ] `StoreKit.framework` added to Frameworks, Libraries, and Embedded Content
- [ ] `UnitDownIAPPlugin.swift` copied into `ios/App/App/` in Xcode
- [ ] Bundle identifier is `com.unitdown.ai` (must match IAP product prefix)
- [ ] Provisioning profile includes In-App Purchase entitlement
- [ ] Signing certificate is Distribution (App Store)

---

## Clerk / Auth Setup

- [ ] Apple OAuth provider enabled in Clerk Dashboard → Social Connections → Apple
- [ ] Apple Services ID and Key configured in Clerk (requires Apple Developer account)
- [ ] `review@unitdown.org` account created in Clerk
- [ ] `REVIEW_ACCOUNT_CLERK_ID` env var set on the API server with the Clerk user ID for review@unitdown.org

---

## Pre-Submission Testing

- [ ] Sandbox purchase tested on a real device (not Simulator)
- [ ] Sandbox restore tested: uninstall → reinstall → tap "Restore Purchases"
- [ ] Sign in with Apple tested on a real iOS device
- [ ] Sign in with Google tested
- [ ] Email/password login tested with demo account credentials
- [ ] Pro features visible after purchase/restore (full diagnosis, meter readings, history)
- [ ] Subscribe button shows loading spinner while processing
- [ ] Cancel during purchase shows no error (graceful cancel)
- [ ] Network error during purchase shows error message

---

## IAP Product ID Reference

| Plan | Product ID | Type |
|---|---|---|
| Pro Tech Monthly | `com.unitdown.ai.pro.monthly` | Auto-Renewable Subscription |

> These IDs are defined in `artifacts/unitdown-ai/src/lib/appleIAP.ts` as `IAP_PRODUCT_ID`.
> The product IDs in App Store Connect **must exactly match** these values.

---

## Common Rejection Reasons — Already Fixed

| Rejection | Fix Applied |
|---|---|
| 3.1.1 — External payment link | All Stripe UI hidden on iOS; Apple IAP only |
| 4.8 — Sign in with Apple missing | Apple sign-in button on login + signup + email wall |
| IAP not functional | StoreKit 2 Capacitor plugin implemented (`UnitDownIAPPlugin.swift`) |
| Subscribe button unresponsive | All Subscribe buttons have `onClick` + loading + error state |
| Demo account not working | `review@unitdown.org` with Pro bypass (requires Clerk account creation) |
