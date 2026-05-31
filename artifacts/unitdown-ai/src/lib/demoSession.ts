// ─── APPLE REVIEW — Local demo session ────────────────────────────────────────
// This module implements a pure client-side demo/review bypass for the Apple
// App Store review account (unitdownsupport@gmail.com).
//
// Why sessionStorage (not localStorage):
//   • Cleared automatically when the browser/WebView tab closes, so the demo
//     flag never leaks into a real user session on a shared device.
//   • Works in iOS WKWebView (Capacitor) — no special bridge needed.
//
// Security: no tokens, no credentials, no server calls. The bypass is purely
// cosmetic on the client. The backend still enforces rate limits for the
// anonymous session (4 free diagnoses is enough for Apple Review).
//
// Usage (in login.tsx):
//   activateDemoSession("unitdownsupport@gmail.com");
//   navigate("/");
//
// Usage (in gate checks):
//   if (isDemoSessionActive()) { /* grant Pro */ }
// ─────────────────────────────────────────────────────────────────────────────

// APPLE REVIEW BYPASS — must stay in sync with demoAccess.ts
export const DEMO_SESSION_EMAILS = [
  "unitdownsupport@gmail.com",
  "review@unitdown.org",
];

const SESSION_KEY = "_udai_demo_reviewer";

/**
 * Activates a local demo session for the given email.
 * Only accepted if the email is on the reviewer allowlist.
 * Idempotent — safe to call multiple times.
 */
export function activateDemoSession(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!DEMO_SESSION_EMAILS.includes(normalized)) return false;
  try {
    sessionStorage.setItem(SESSION_KEY, normalized);
  } catch {
    // sessionStorage unavailable (private-mode restriction in some browsers)
    // Fall back to a module-level in-memory flag
    _memFlag = normalized;
  }
  return true;
}

/** Returns true when a demo reviewer session is currently active. */
export function isDemoSessionActive(): boolean {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v !== null && DEMO_SESSION_EMAILS.includes(v);
  } catch {
    return _memFlag !== null;
  }
}

/** Returns the demo email, or null if no session is active. */
export function getDemoSessionEmail(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return _memFlag;
  }
}

/** Clears the demo session (called on explicit sign-out). */
export function clearDemoSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
  _memFlag = null;
}

// In-memory fallback for environments where sessionStorage is blocked.
let _memFlag: string | null = null;
