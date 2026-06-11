/**
 * Web stub for the UnitDownIAP Capacitor plugin.
 *
 * This runs in two situations:
 *   1. In a desktop/mobile browser (expected — Stripe is used on web instead).
 *   2. On iOS inside Capacitor when the native UnitDownIAPPlugin Swift file is
 *      NOT registered in the Xcode project (unexpected — means the plugin is
 *      missing and purchases will never work on that build).
 *
 * getProducts() returns an empty array so the modal can detect unavailability.
 * purchaseProduct() and restoreTransactions() throw with Apple-review-safe
 * user-facing messages — no internal developer detail is exposed.
 */

function _isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  // iOS device in a browser (not the native app — Capacitor would have
  // intercepted this before reaching the web stub if the app is installed).
  const isiOS = /iP(ad|hone|od)/.test(ua) && !/CriOS/.test(ua);
  // Desktop Safari — not the app, definitely a browser.
  const isDesktopSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isiOS || isDesktopSafari;
}

export class UnitDownIAPWebStub {
  async getProducts(_options: { productIds: string[] }) {
    console.log("[UnitDownIAP] Web stub: getProducts called — native plugin not available");
    // Return empty — callers check for empty array to detect unavailability.
    return { products: [] };
  }

  async purchaseProduct(_options: { productId: string }): Promise<never> {
    console.log(
      "[UnitDownIAP] Web stub: purchaseProduct called — native plugin not available.",
      "platform:", typeof window !== "undefined" ? (window.Capacitor?.isNativePlatform?.() ? "capacitor-native" : "browser") : "ssr",
    );
    if (_isSafariBrowser()) {
      throw new Error(
        "To subscribe, please open the UnitDown AI app on your iPhone or iPad. " +
        "In-app purchases are not available in Safari.",
      );
    }
    throw new Error("Subscription is temporarily unavailable. Please try again later.");
  }

  async restoreTransactions(): Promise<never> {
    console.log(
      "[UnitDownIAP] Web stub: restoreTransactions called — native plugin not available.",
      "platform:", typeof window !== "undefined" ? (window.Capacitor?.isNativePlatform?.() ? "capacitor-native" : "browser") : "ssr",
    );
    if (_isSafariBrowser()) {
      throw new Error(
        "To restore purchases, please open the UnitDown AI app on your iPhone or iPad.",
      );
    }
    throw new Error("Restore is temporarily unavailable. Please try again later.");
  }

  async finishTransaction(_options: { transactionId: string; productId: string }) {
    return;
  }
}
