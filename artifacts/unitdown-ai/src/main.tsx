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
// the redirect against its own registered home URL (shared-gateway.replit.com).
const origin = window.location.origin;

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY}
    proxyUrl={proxyUrl}
    signInFallbackRedirectUrl={origin}
    signUpFallbackRedirectUrl={origin}
    signInUrl="/login"
    signUpUrl="/signup"
  >
    <App />
  </ClerkProvider>
);
