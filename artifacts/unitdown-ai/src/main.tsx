import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
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

// REQUIRED — resolves the publishable key from window.location.hostname so the
// same build can serve multiple Clerk custom domains. Falls back to the env var
// when the hostname doesn't map to a registered Clerk domain.
// Do not inline the env var or replace publishableKeyFromHost with anything else.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// REQUIRED — empty in dev (Clerk hits dev FAPI directly), auto-set in prod.
// Do NOT gate on import.meta.env.PROD / NODE_ENV — the empty dev value is
// intentional, and any branching breaks the prod proxy.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

// The canonical production web origin. Used for post-auth redirects when
// running inside the Capacitor native shell.
//
// App Store Connect Bundle ID: co.median.ios.abmwydj
// This matches capacitor.config.ts appId and PRODUCT_BUNDLE_IDENTIFIER in
// App.xcodeproj/project.pbxproj (both Debug and Release configurations).
// Info.plist inherits via $(PRODUCT_BUNDLE_IDENTIFIER) — no separate edit needed.
const PRODUCTION_ORIGIN = "https://unitdown.org";

// Resolve the effective origin for post-auth redirect URLs:
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

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <ThemeProvider>
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
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
      // ── Post sign-out: return to effective origin ────────────────────────────
      afterSignOutUrl={effectiveOrigin}
    >
      <App />
    </ClerkProvider>
    </ThemeProvider>
  </RootErrorBoundary>
);
