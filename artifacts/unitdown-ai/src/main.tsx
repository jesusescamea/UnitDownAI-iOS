import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { installIOSPaymentGuard } from "./lib/iosPaymentGuard";

// Install the iOS payment guard BEFORE React renders so that no Stripe or
// external billing URL can slip through — regardless of how navigation is
// triggered (window.open, <a> clicks, location.assign, etc.).
// This is a no-op on web and Android; only activates when isIOSApp() is true.
installIOSPaymentGuard();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// In production, route all Clerk Frontend API calls through the server-side
// proxy at /api/__clerk so auth works on custom domains (unitdown.org,
// *.replit.app) without requiring DNS CNAME configuration.
// In development, leave proxyUrl undefined — the Clerk SDK calls its API
// directly, which is fine for dev-key / localhost flows.
const proxyUrl = import.meta.env.PROD
  ? `${window.location.origin}/api/__clerk`
  : undefined;

// Always redirect back to the exact origin the user logged in from.
// Using an explicit absolute URL (not "/") prevents Clerk from resolving
// the redirect against its own registered home URL (shared-gateway.replit.com)
// or the stale unit-down-ai-new.replit.app URL in Clerk's instance config.
//
// IMPORTANT: Clerk's production instance display_config contains stale URLs
// (accounts.unitdown.org, unit-down-ai-new.replit.app) left over from an
// earlier custom-domain configuration attempt. These ClerkProvider props
// override every one of those at the SDK level so the app never navigates
// to a non-existent domain.
const origin = window.location.origin;

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY}
    proxyUrl={proxyUrl}
    // ── Sign-in / sign-up paths live inside the app, never on accounts.unitdown.org ──
    signInUrl="/login"
    signUpUrl="/signup"
    // ── Post-auth redirects: always return to this origin ────────────────────
    signInFallbackRedirectUrl={origin}
    signUpFallbackRedirectUrl={origin}
    afterSignInUrl={origin}
    afterSignUpUrl={origin}
    // ── Post sign-out: return to this origin, not accounts.unitdown.org ──────
    afterSignOutUrl={origin}
  >
    <App />
  </ClerkProvider>
);
