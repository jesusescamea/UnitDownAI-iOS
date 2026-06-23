import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { installIOSPaymentGuard } from "./lib/iosPaymentGuard";
import { isNative } from "./lib/platform";
import { RootErrorBoundary } from "./components/RootErrorBoundary";

// Install the iOS payment guard BEFORE React renders so that no Stripe or
// external billing URL can slip through — regardless of how navigation is
// triggered (window.open, <a> clicks, location.assign, etc.).
// This is a no-op on web and Android; only activates when isIOSApp() is true.
installIOSPaymentGuard();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
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
// Skip the proxy in local web development (PROD=false AND not native).
const proxyUrl =
  isNative() || import.meta.env.PROD
    ? `${effectiveOrigin}/api/__clerk`
    : undefined;

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
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
  </RootErrorBoundary>
);
