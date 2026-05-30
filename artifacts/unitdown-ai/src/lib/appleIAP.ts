/**
 * Apple In-App Purchase service — Capacitor custom plugin bridge.
 *
 * This module registers a custom Capacitor plugin interface that calls
 * through to native Swift code in the iOS app target.
 *
 * Product setup required in App Store Connect:
 *   Product ID: com.unitdown.subscription.monthly
 *   Type: Auto-renewing subscription
 *   Price: $7.99/month
 *
 * iOS Xcode setup (outside Replit):
 *   1. Run: npx cap add ios && npx cap sync
 *   2. Enable "In-App Purchase" capability on the App target.
 *   3. Copy artifacts/unitdown-ai/ios-plugins/UnitDownIAPPlugin.swift AND
 *      UnitDownIAPPlugin.m into ios/App/App/ in Xcode.
 *   4. The .m file registers the plugin methods with the Capacitor bridge.
 *   5. Create the IAP product com.unitdown.subscription.monthly in App Store
 *      Connect and configure the subscription group.
 *
 * This module no-ops gracefully on web so the same React components compile
 * without errors in the browser.
 */

import { registerPlugin } from "@capacitor/core";

export const IAP_PRODUCT_ID = "com.unitdown.subscription.monthly";

// ── Plugin interface ──────────────────────────────────────────────────────────

interface UnitDownIAPPlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: Array<{ productId: string; title: string; description: string; price: string; priceAsDecimal: number; currencyCode: string }> }>;
  purchaseProduct(options: { productId: string }): Promise<{ transactionId: string; productId: string; state: string }>;
  restoreTransactions(): Promise<{ transactions: Array<{ transactionId: string; productId: string; state: string }> }>;
  finishTransaction(options: { transactionId: string; productId: string }): Promise<void>;
}

const UnitDownIAP = registerPlugin<UnitDownIAPPlugin>("UnitDownIAP", {
  web: () => import("./appleIAPWebStub").then((m) => new m.UnitDownIAPWebStub()),
});

// ── Public types ──────────────────────────────────────────────────────────────

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAsDecimal?: number;
  currency?: string;
}

export interface IAPPurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  error?: string;
  cancelled?: boolean;
}

export interface IAPRestoreResult {
  success: boolean;
  restoredProductIds: string[];
  error?: string;
}

// ── In-memory subscription cache ─────────────────────────────────────────────
// Tracks whether the user has an active Pro subscription within this session.
// Set to true by purchasePro() on a successful purchase and by restorePurchases()
// when an active subscription is found.
//
// On a cold app start this defaults to false — the user must tap "Restore
// Purchases" to re-validate with Apple. This is intentional: Apple guidelines
// require that restore only happens in response to an explicit user action, and
// passive silent restores (which trigger a system authentication prompt) are not
// allowed.
let _iapSubscriptionActive = false;

/** Called by purchasePro() and restorePurchases() to persist session state. */
export function setIAPSubscriptionActive(active: boolean): void {
  _iapSubscriptionActive = active;
}

// ── API ───────────────────────────────────────────────────────────────────────

/** Fetch available products from the App Store.
 *  Resolves to [] on any error or if StoreKit doesn't respond within 6 seconds,
 *  so callers never hang waiting for IAP when the plugin isn't installed or the
 *  App Store is unreachable. */
export async function fetchProducts(): Promise<IAPProduct[]> {
  const timeout = new Promise<IAPProduct[]>((resolve) =>
    setTimeout(() => resolve([]), 6_000)
  );
  const fetch = UnitDownIAP.getProducts({ productIds: [IAP_PRODUCT_ID] })
    .then((result) =>
      result.products.map((p) => ({
        productId: p.productId,
        title: p.title,
        description: p.description,
        price: p.price,
        priceAsDecimal: p.priceAsDecimal,
        currency: p.currencyCode,
      }))
    )
    .catch(() => [] as IAPProduct[]);
  return Promise.race([fetch, timeout]);
}

/** Initiate a purchase. Must be called from a user gesture. */
export async function purchasePro(): Promise<IAPPurchaseResult> {
  try {
    const result = await UnitDownIAP.purchaseProduct({ productId: IAP_PRODUCT_ID });

    if (result.state === "purchased") {
      await UnitDownIAP.finishTransaction({
        transactionId: result.transactionId,
        productId: IAP_PRODUCT_ID,
      }).catch(() => {});
      setIAPSubscriptionActive(true);
      return { success: true, productId: IAP_PRODUCT_ID, transactionId: result.transactionId };
    }

    // "deferred" = parental approval pending — not a user cancellation or error.
    if (result.state === "deferred") {
      return { success: false, error: "Purchase is pending parental approval." };
    }

    // "cancelled" = user explicitly dismissed the Apple payment sheet. Silent.
    if (result.state === "cancelled") {
      return { success: false, cancelled: true };
    }

    return { success: false, error: "Purchase did not complete. Please try again." };
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    // Only treat USER_CANCELLED (the explicit Capacitor code) as a silent cancel.
    // Do NOT match on error message strings — that would swallow real errors
    // such as plugin-not-found fallbacks from the web stub.
    if (e?.code === "USER_CANCELLED") {
      return { success: false, cancelled: true };
    }
    return { success: false, error: e?.message ?? "Purchase failed. Please try again." };
  }
}

/** Restore previous purchases. Required by Apple guidelines. Only call from an
 *  explicit "Restore Purchases" user action — never call silently on app start,
 *  as StoreKit may show an authentication prompt. */
export async function restorePurchases(): Promise<IAPRestoreResult> {
  try {
    const result = await UnitDownIAP.restoreTransactions();
    const productIds = result.transactions
      .filter((t) => t.state === "purchased" || t.state === "restored")
      .map((t) => t.productId)
      .filter(Boolean);

    for (const t of result.transactions) {
      if (productIds.includes(t.productId)) {
        await UnitDownIAP.finishTransaction({
          transactionId: t.transactionId,
          productId: t.productId,
        }).catch(() => {});
      }
    }

    const hasProSubscription = productIds.includes(IAP_PRODUCT_ID);
    setIAPSubscriptionActive(hasProSubscription);

    return { success: true, restoredProductIds: [...new Set(productIds)] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      success: false,
      restoredProductIds: [],
      error: e?.message ?? "Restore failed. Please try again.",
    };
  }
}

/**
 * Returns whether the user has an active Pro subscription in this session.
 *
 * This is a pure in-memory read — it does NOT contact Apple, does NOT call
 * restoreTransactions(), and will never trigger a system authentication prompt.
 *
 * The cache is populated by:
 *   - purchasePro()     — after a successful new purchase
 *   - restorePurchases() — after the user taps "Restore Purchases"
 *
 * On a cold app start this returns false until one of the above is called.
 * Users who have an active subscription should tap "Restore Purchases" once
 * after a fresh install to re-activate their Pro status.
 */
export function checkIAPSubscriptionActive(): boolean {
  return _iapSubscriptionActive;
}
