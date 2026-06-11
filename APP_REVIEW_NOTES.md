# UnitDown AI — App Store Review Notes

## Demo / Review Account

A demo account has been provisioned for Apple review with Pro features unlocked:

- **Email:** review@unitdown.org
- **Password:** Review123!

This account bypasses the free-diagnosis limit and has Pro status active.
Log in with the email/password above. All Pro features (full ranked diagnoses,
meter readings, alternative faults, diagnosis history) will be accessible
immediately after sign-in.

If login fails, please try:
1. Tap "Continue with Apple" on the login screen (Sign in with Apple is available)
2. Or use the email/password login with the credentials above

---

## Sign in with Apple

Sign in with Apple is implemented on all login surfaces:

- **Login page** — "Sign in with Apple" button appears above "Continue with Google" (same size and prominence)
- **Sign-up modal** — "Continue with Apple" option available
- **Email wall modal** — "Continue with Apple" shown on iOS alongside Google

Implementation: Clerk OAuth strategy `oauth_apple` with redirect through `/sso-callback`.

---

## iOS Subscriptions — Apple In-App Purchase

All subscriptions on iOS use Apple StoreKit 2 (In-App Purchase). Stripe is
**not shown** on iOS. The payment sheet is Apple's native system dialog.

**Product IDs configured in code:**

| Product | ID | Type |
|---|---|---|
| Pro Tech (monthly) | `com.unitdown.subscription.monthly` | Auto-renewing subscription |

These product IDs **must be created in App Store Connect** before submission.
See `APPLE_SUBMISSION_CHECKLIST.md` for the full setup checklist.

---

## Subscribe Button

The "Subscribe" button is located in:
1. **Upgrade modal** — tap any "Subscribe" / "Upgrade to Pro" button in the app
2. **Account page** → Subscription section → "Upgrade to Pro"
3. **Pro content gates** — on SEO/brand guide pages behind a lock icon

Each Subscribe button calls `purchasePro()` which opens the Apple payment sheet.
The button shows a loading spinner while processing and displays errors inline.
It is never unresponsive.

---

## Restore Purchases

A visible "Restore Purchases" button is present on:
1. **Upgrade modal** — below the Subscribe button
2. **Account page** → Subscription section → "Restore Purchases"
3. **Pro content gate** (ProGate) — below the Subscribe button

Tapping Restore Purchases calls Apple's `restoreTransactions()`. On success,
Pro status is unlocked immediately. On failure, a clear message is shown.

---

## Stripe / External Payments

Stripe is hidden on iOS. The platform detection (`isIOS()`) gates all
Stripe UI behind a runtime check. Apple reviewers will never see a Stripe
checkout link in the iOS app.

Stripe remains active on the web version (unitdown.org) only.

---

## Backend Setup Required Before Submission

1. Create the `review@unitdown.org` Clerk account in the Clerk dashboard
2. Set the env variable `REVIEW_ACCOUNT_CLERK_ID=<clerk_user_id>` in the
   production API server (the Clerk user ID for review@unitdown.org)
3. Create IAP product `com.unitdown.subscription.monthly` in App Store Connect
4. Accept the Paid Apps Agreement in App Store Connect
