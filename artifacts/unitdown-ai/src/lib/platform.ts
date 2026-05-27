/**
 * Platform detection utilities.
 * Detects whether the app is running inside a Capacitor native wrapper
 * (iOS or Android), a Median/GoNative webview, or a standard web browser.
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform(): boolean;
      getPlatform(): string;
    };
    /** Injected by Median (formerly GoNative) webview wrappers. */
    median?: unknown;
    /** Legacy GoNative object — older Median SDK versions. */
    gonative?: unknown;
  }
}

export function isNative(): boolean {
  return !!(window.Capacitor?.isNativePlatform?.());
}

export function getPlatform(): "ios" | "android" | "web" {
  if (!isNative()) return "web";
  const p = window.Capacitor?.getPlatform?.() ?? "web";
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return "web";
}

export function isIOS(): boolean {
  return getPlatform() === "ios";
}

export function isAndroid(): boolean {
  return getPlatform() === "android";
}

export function isWeb(): boolean {
  return !isNative() && !isMedian();
}

/**
 * Returns true when running inside a Median (formerly GoNative) webview.
 *
 * Median does NOT inject window.Capacitor, so isIOS() / isNative() return
 * false even on a real iPhone. Median instead injects window.median and
 * sets a recognisable user-agent string — we detect both.
 */
export function isMedian(): boolean {
  if (typeof window === "undefined") return false;
  if (window.median !== undefined) return true;
  if (window.gonative !== undefined) return true;
  const ua = typeof navigator !== "undefined" ? (navigator.userAgent ?? "") : "";
  return ua.includes("Median") || ua.includes("GoNative");
}

/**
 * Returns true when the app is running inside Capacitor on iOS OR inside a
 * Median/GoNative webview wrapper. Use this to gate any behaviour that must
 * differ between the iOS App Store build and the standard web experience.
 *
 * Both environments must never show Stripe or any external payment UI —
 * Apple requires all in-app purchases to go through StoreKit.
 */
export function isIOSApp(): boolean {
  return isIOS() || isMedian();
}

/**
 * On iOS (Capacitor builds AND Median webviews) we must NEVER show Stripe or
 * any external payment UI. Apple requires all in-app purchases to go through
 * StoreKit (IAP). Returns false on web and Android.
 */
export function shouldUseAppleIAP(): boolean {
  return isIOS() || isMedian();
}

/**
 * Apple guideline 4.8: Sign in with Apple must be offered as an equivalent
 * option wherever any third-party social login (e.g. Google) is present.
 * We show it on all platforms so it is always visible to App Store reviewers
 * and to web users who prefer Apple authentication.
 */
export function shouldShowAppleSignIn(): boolean {
  return true;
}
