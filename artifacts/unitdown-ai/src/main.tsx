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

// On Capacitor iOS, window.location.hostname is "localhost" (the WKWebView
// bridge origin). Passing "localhost" to publishableKeyFromHost causes Clerk
// to construct clerk.localhost as the FAPI domain, which is unreachable inside
// the native app. Skip the hostname-based derivation entirely for native builds
// and use the publishable key directly — its payload already encodes the correct
// FAPI domain (clerk.unitdown.org).
//
// On web, keep the publishableKeyFromHost call so that the same bundle can serve
// multiple Clerk custom domains (e.g. unitdown.org → clerk.unitdown.org).
const clerkPubKey = isNative()
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    );

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// Proxy URL: only applicable on web. The /api/__clerk reverse proxy is served
// by the Express API server, which is not reachable from the Capacitor iOS
// WKWebView (window.location is https://localhost in the simulator/device shell).
// On native, Clerk must call the Clerk FAPI directly — set proxyUrl to undefined
// so Clerk does not attempt to route through a proxy that does not exist.
const clerkProxyUrl = isNative() ? undefined : import.meta.env.VITE_CLERK_PROXY_URL;

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
