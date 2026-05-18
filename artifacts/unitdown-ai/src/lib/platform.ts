/**
 * Platform detection utilities.
 * Detects whether the app is running inside a Capacitor native wrapper
 * (iOS or Android) vs. a standard web browser.
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform(): boolean;
      getPlatform(): string;
    };
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
  return getPlatform() === "web";
}

/**
 * On iOS (App Store builds) we must NEVER show Stripe or any external
 * payment UI. Apple requires all in-app purchases to go through StoreKit.
 */
export function shouldUseAppleIAP(): boolean {
  return isIOS();
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
