import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { installIOSPaymentGuard } from "./lib/iosPaymentGuard";
import { isNative } from "./lib/platform";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { initTheme } from "./lib/theme";
import { ThemeProvider } from "./context/ThemeContext";

// Restore saved dark/light preference before React renders so there is no
// flash of the wrong theme on first paint.
initTheme();

// Install the iOS payment guard BEFORE React renders so that no Stripe or
// external billing URL can slip through — regardless of how navigation is
// triggered (window.open, <a> clicks, location.assign, etc.).
// This is a no-op on web and Android; only activates when isIOSApp() is true.
installIOSPaymentGuard();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// Clerk key type guard.
//
// pk_test_* keys are "dev instance" keys. They use a cookie-based "dev browser"
// session-sync flow (a redirect to clerk.shared.lcl.dev that sets a
// __clerk_db_jwt cookie). That flow is blocked in two situations:
//
//   1. Cross-origin iframes (Replit preview pane, any embedded context) because
//      modern browsers reject SameSite=None cookies from cross-origin frames.
//
//   2. Through the /api/__clerk proxy — the proxy intercepts the dev_browser
//      handshake and returns a 400, permanently preventing isLoaded from
//      becoming true.
//
// SOLUTION: Always use pk_live_* in VITE_CLERK_PUBLISHABLE_KEY.
// Development/testing on localhost still works fine with live keys.
const isLiveKey = PUBLISHABLE_KEY.startsWith("pk_live_");

if (!isLiveKey && import.meta.env.PROD) {
  // Deployed to production with a test key — this will cause a proxy 400 and
  // a permanent Clerk init failure. Log a loud warning.
  console.error(
    "[UnitDown] VITE_CLERK_PUBLISHABLE_KEY is a pk_test_ key. " +
    "Production deployments must use a pk_live_ key or Clerk will fail to initialize."
  );
}

// The canonical production web origin.  Used as the Clerk proxy base and for
// post-auth redirects when we are running inside the Capacitor native shell.
//
// App Store Connect Bundle ID: co.median.ios.abmwydj
// This matches capacitor.config.ts appId and PRODUCT_BUNDLE_IDENTIFIER in
// App.xcodeproj/project.pbxproj (both Debug and Release configurations).
// Info.plist inherits via $(PRODUCT_BUNDLE_IDENTIFIER) — no separate edit needed.
const PRODUCTION_ORIGIN = "https://unitdown.org";

// Resolve the effective origin for all Clerk URLs:
//
//   • Capacitor iOS native  → window.location.origin == "https://localhost"
//                             (Capacitor's local WKWebView bridge). That URL
//                             has no /api/__clerk proxy and is not registered in
//                             Clerk's allowed-redirect list.  Always use the
//                             real production domain instead.
//
//   • Web production        → use window.location.origin as-is
//                             (unitdown.org, *.replit.app, etc.)
//
//   • Web development       → use window.location.origin as-is
//                             (localhost:XXXX)
const effectiveOrigin = isNative() ? PRODUCTION_ORIGIN : window.location.origin;

// Route all Clerk Frontend API calls through the server-side proxy at
// /api/__clerk so auth works on custom domains without DNS CNAME setup.
//
// The proxy is used with ALL live keys in ALL environments:
//   • pk_test_ + proxy → Clerk's dev_browser endpoint returns 400 through the
//     proxy (the proxy forwards a different Host header), permanently blocking init.
//   • pk_test_ without proxy → dev browser cookie is blocked in cross-origin
//     iframes (Replit preview), but at least localhost dev works.
//   • pk_live_ + proxy → correct path everywhere — also fixes script loading:
//     when proxyUrl is set, Clerk loads clerk.browser.js from the proxy host
//     (/api/__clerk/npm/...) instead of the FAPI domain (clerk.unitdown.org),
//     which may not be reachable in some environments (e.g. Replit preview).
//   • pk_live_ without proxy → direct FAPI load; fails if clerk.unitdown.org
//     is unreachable (no DNS CNAME configured).
const proxyUrl = isLiveKey ? `${effectiveOrigin}/api/__clerk` : undefined;

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <ThemeProvider>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      proxyUrl={proxyUrl}
      // ── Sign-in / sign-up paths live inside the app ──────────────────────────
      signInUrl="/login"
      signUpUrl="/signup"
      // ── Post-auth redirects: always return to the effective origin ───────────
      // In native Capacitor this is the production domain; on web it is the
      // current window origin.  Using an explicit absolute URL prevents Clerk
      // from resolving the redirect against its own registered home URL
      // (shared-gateway.replit.com) or any stale URL in Clerk's instance config.
      signInFallbackRedirectUrl={effectiveOrigin}
      signUpFallbackRedirectUrl={effectiveOrigin}
      afterSignInUrl={effectiveOrigin}
      afterSignUpUrl={effectiveOrigin}
      // ── Post sign-out: return to effective origin ────────────────────────────
      afterSignOutUrl={effectiveOrigin}
    >
      <App />
    </ClerkProvider>
    </ThemeProvider>
  </RootErrorBoundary>
);
