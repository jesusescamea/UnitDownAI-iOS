/**
 * iOS Payment Navigation Guard
 *
 * Apple requires that all in-app purchases on iOS go through StoreKit (IAP).
 * This module patches browser navigation APIs at the earliest possible point
 * to ensure no external payment page (Stripe checkout, etc.) can be opened
 * inside an iOS webview — regardless of how the navigation is triggered.
 *
 * Three surfaces are patched:
 *   1. window.open            — most common programmatic opener
 *   2. <a> click events       — anchor tags in rendered HTML
 *   3. location.assign/replace — direct location mutations
 *
 * Call installIOSPaymentGuard() once, BEFORE React renders (in main.tsx).
 * It is safe to call on any platform — it exits immediately when isIOSApp()
 * returns false, so web and Android behaviour is completely unchanged.
 */

import { isIOSApp } from "./platform";

/** Substrings that identify external payment pages that must be blocked. */
const BLOCKED_PATTERNS: readonly string[] = [
  "checkout.stripe.com",
  "buy.stripe.com",
  "billing.stripe.com",
  "pay.stripe.com",
  "stripe.com/pay",
  "stripe.com/b/",
  "js.stripe.com",
];

function isBlockedUrl(url: string): boolean {
  if (!url) return false;
  try {
    const resolved = new URL(url, window.location.href);
    const href = resolved.href;
    return BLOCKED_PATTERNS.some((p) => href.includes(p));
  } catch {
    // If URL parsing fails, fall back to a simple substring search.
    return BLOCKED_PATTERNS.some((p) => url.includes(p));
  }
}

let _installed = false;

export function installIOSPaymentGuard(): void {
  if (!isIOSApp()) return; // no-op on web and Android
  if (_installed) return;  // idempotent
  _installed = true;

  // ── 1. window.open ────────────────────────────────────────────────────────
  const _origOpen = window.open.bind(window);
  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string,
  ): WindowProxy | null {
    const href = url ? String(url) : "";
    if (isBlockedUrl(href)) {
      console.warn("[iOS Guard] Blocked window.open to payment URL:", href);
      return null;
    }
    return _origOpen(
      url as Parameters<typeof window.open>[0],
      target,
      features,
    );
  };

  // ── 2. Anchor clicks (capture phase — fires before React handlers) ────────
  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      const el = e.target as Element | null;
      const anchor = el?.closest("a") as HTMLAnchorElement | null;
      if (anchor?.href && isBlockedUrl(anchor.href)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        console.warn(
          "[iOS Guard] Blocked anchor navigation to payment URL:",
          anchor.href,
        );
      }
    },
    true,
  );

  // ── 3. location.assign / location.replace ─────────────────────────────────
  try {
    const origAssign = location.assign.bind(location);
    const origReplace = location.replace.bind(location);

    Object.defineProperty(location, "assign", {
      configurable: true,
      writable: true,
      value(url: string) {
        if (isBlockedUrl(url)) {
          console.warn("[iOS Guard] Blocked location.assign to payment URL:", url);
          return;
        }
        origAssign(url);
      },
    });

    Object.defineProperty(location, "replace", {
      configurable: true,
      writable: true,
      value(url: string) {
        if (isBlockedUrl(url)) {
          console.warn("[iOS Guard] Blocked location.replace to payment URL:", url);
          return;
        }
        origReplace(url);
      },
    });
  } catch {
    // location is not always patchable in every webview sandbox — silent
    // failure is acceptable; the window.open and click interceptors still work.
  }
}
