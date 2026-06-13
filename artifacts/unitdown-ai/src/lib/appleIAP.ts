/**
 * Apple In-App Purchase service — Capacitor custom plugin bridge.
 *
 * This module registers a custom Capacitor plugin interface that calls
 * through to native Swift code in the iOS app target.
 *
 * Product setup required in App Store Connect:
 *   Product ID: com.unitdown.subscribtion.monthly   ← NOTE: "subscribtion" is intentional —
 *                                                    this is the exact ID registered in App Store Connect.
 *   Type: Auto-renewing subscription
 *   Price: $7.99/month
 *
 * iOS Xcode setup (outside Replit):
 *   1. Run: npx cap add ios && npx cap sync
 *   2. Enable "In-App Purchase" capability on the App target.
 *   3. Copy artifacts/unitdown-ai/ios-plugins/UnitDownIAPPlugin.swift AND
 *      UnitDownIAPPlugin.m into ios/App/App/ in Xcode.
 *   4. The .m file registers the plugin methods with the Capacitor bridge.
 *   5. IAP product com.unitdown.subscribtion.monthly must exist in App Store
 *      Connect and be attached to the app version under "In-App Purchases and
 *      Subscriptions". NOTE: "subscribtion" matches the App Store Connect typo.
 *
 * This module no-ops gracefully on web so the same React components compile
 * without errors in the browser.
 */

import { registerPlugin } from "@capacitor/core";
import { getPlatform, isNative } from "./platform";

// NOTE: "subscribtion" matches the exact product ID registered in App Store Connect.
// Do NOT "fix" this spelling — changing it will break StoreKit lookups.
export const IAP_PRODUCT_ID = "com.unitdown.subscribtion.monthly";

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

/**
 * Logs whether the native UnitDownIAP plugin is visible in Capacitor.Plugins.
 * Call this before opening the paywall to confirm native registration.
 *
 * Expected output on iOS (after the ViewController.swift fix):
 *   [UnitDownIAP] plugin status — platform:ios  native:true  Capacitor.Plugins.UnitDownIAP: REGISTERED ✅
 *
 * If you still see MISSING ❌ on a real device/simulator build:
 *   1. Confirm ViewController.swift compiled (check Xcode build log for "ViewController.swift")
 *   2. Confirm Main.storyboard uses customClass="ViewController" (not CAPBridgeViewController)
 *   3. Clean build folder (Cmd+Shift+K) and rebuild
 */
export function logIAPPluginStatus(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  const platform: string = cap?.getPlatform?.() ?? "unknown";
  const native: boolean = cap?.isNativePlatform?.() ?? false;
  const registered: boolean = Object.prototype.hasOwnProperty.call(
    cap?.Plugins ?? {},
    "UnitDownIAP"
  );
  console.log(
    `[UnitDownIAP] plugin status — platform:${platform}  native:${native}  Capacitor.Plugins.UnitDownIAP: ${registered ? "REGISTERED ✅" : "MISSING ❌"}`
  );
}

/** Fetch available products from the App Store.
 *  Resolves to [] on any error or if StoreKit doesn't respond within 6 seconds,
 *  so callers never hang waiting for IAP when the plugin isn't installed or the
 *  App Store is unreachable. */
export async function fetchProducts(): Promise<IAPProduct[]> {
  const platform = getPlatform();
  const native = isNative();
  logIAPPluginStatus();
  console.log(
    `[UnitDownIAP] fetchProducts — platform:${platform} native:${native} productId:${IAP_PRODUCT_ID}`
  );

  const timeout = new Promise<IAPProduct[]>((resolve) =>
    setTimeout(() => {
      console.log("[UnitDownIAP] fetchProducts timed out after 6 s");
      resolve([]);
    }, 6_000)
  );

  const fetch = UnitDownIAP.getProducts({ productIds: [IAP_PRODUCT_ID] })
    .then((result) => {
      const mapped = result.products.map((p) => ({
        productId: p.productId,
        title: p.title,
        description: p.description,
        price: p.price,
        priceAsDecimal: p.priceAsDecimal,
        currency: p.currencyCode,
      }));
      console.log(
        `[UnitDownIAP] fetchProducts returned ${mapped.length} product(s):`,
        mapped.map((p) => `${p.productId}=${p.price}`).join(", ") || "(none)"
      );
      return mapped;
    })
    .catch((err: unknown) => {
      console.log("[UnitDownIAP] fetchProducts error:", (err as Error)?.message ?? err);
      return [] as IAPProduct[];
    });

  return Promise.race([fetch, timeout]);
}

/** Initiate a purchase. Must be called from a user gesture. */
export async function purchasePro(): Promise<IAPPurchaseResult> {
  console.log(
    `[UnitDownIAP] purchasePro — platform:${getPlatform()} native:${isNative()} productId:${IAP_PRODUCT_ID}`
  );
  try {
    const result = await UnitDownIAP.purchaseProduct({ productId: IAP_PRODUCT_ID });
    console.log(`[UnitDownIAP] purchaseProduct result — state:${result.state} txId:${result.transactionId}`);

    if (result.state === "purchased") {
      await UnitDownIAP.finishTransaction({
        transactionId: result.transactionId,
        productId: IAP_PRODUCT_ID,
      }).catch(() => {});
      setIAPSubscriptionActive(true);
      console.log("[UnitDownIAP] purchasePro SUCCESS");
      return { success: true, productId: IAP_PRODUCT_ID, transactionId: result.transactionId };
    }

    // "deferred" = parental approval pending — not a user cancellation or error.
    if (result.state === "deferred") {
      console.log("[UnitDownIAP] purchasePro DEFERRED (parental approval)");
      return { success: false, error: "Purchase is pending parental approval." };
    }

    // "cancelled" = user explicitly dismissed the Apple payment sheet. Silent.
    if (result.state === "cancelled") {
      console.log("[UnitDownIAP] purchasePro CANCELLED by user");
      return { success: false, cancelled: true };
    }

    console.log(`[UnitDownIAP] purchasePro unknown state: ${result.state}`);
    return { success: false, error: "Purchase did not complete. Please try again." };
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    console.log(`[UnitDownIAP] purchasePro THREW — code:${e?.code} message:${e?.message}`);
    // Only treat USER_CANCELLED (the explicit Capacitor code) as a silent cancel.
    if (e?.code === "USER_CANCELLED") {
      return { success: false, cancelled: true };
    }
    // "Product not found: <id>" is a StoreKit signal that the product isn't
    // available in this environment yet (App Store Connect not yet attached to
    // this app version, or subscription still under review). Map to a
    // review-safe user-facing message — do NOT expose the raw internal string.
    if (e?.message?.startsWith("Product not found:")) {
      return { success: false, error: "Subscription is temporarily unavailable. Please try again later." };
    }
    return { success: false, error: e?.message ?? "Purchase failed. Please try again." };
  }
}

/** Restore previous purchases. Required by Apple guidelines. Only call from an
 *  explicit "Restore Purchases" user action — never call silently on app start,
 *  as StoreKit may show an authentication prompt. */
export async function restorePurchases(): Promise<IAPRestoreResult> {
  console.log(
    `[UnitDownIAP] restorePurchases — platform:${getPlatform()} native:${isNative()}`
  );
  try {
    const result = await UnitDownIAP.restoreTransactions();
    const productIds = result.transactions
      .filter((t) => t.state === "purchased" || t.state === "restored")
      .map((t) => t.productId)
      .filter(Boolean);

    console.log(
      `[UnitDownIAP] restorePurchases — ${result.transactions.length} transaction(s) returned,`,
      `${productIds.length} active. productIds:`, productIds.join(", ") || "(none)"
    );

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
    console.log(`[UnitDownIAP] restorePurchases hasProSubscription:${hasProSubscription}`);

    return { success: true, restoredProductIds: [...new Set(productIds)] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.log(`[UnitDownIAP] restorePurchases THREW — message:${e?.message}`);
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
