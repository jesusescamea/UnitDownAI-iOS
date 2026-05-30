// ─── APPLE REVIEW — Demo-account sign-in token ───────────────────────────────
// Creates a short-lived Clerk sign-in token for the designated Apple Review
// demo account (unitdownsupport@gmail.com) so reviewers can log in without
// any OTP, email code, magic-link, 2FA, or access-code step.
//
// Flow (fully automatic — no manual Clerk dashboard access required):
//  1. Validate the email is on the demo allowlist (case-insensitive).
//  2. Look up the Clerk user by email via the Backend API.
//  3. If not found, auto-create the user (idempotent — safe to repeat).
//  4. Create a short-lived Clerk sign-in token for that user.
//  5. Return the token — frontend signs in instantly via strategy:"ticket".
//
// Security notes:
//  • Only allowlisted demo emails are accepted; all others get 403.
//  • Only CLERK_SECRET_KEY is required — already set by Replit auth setup.
//  • Tokens expire in 5 minutes and are single-use.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";

const demoRouter: IRouter = Router();

// APPLE REVIEW DEMO ACCOUNT — case-insensitive allowlist.
// Must stay in sync with src/lib/demoAccess.ts in the frontend.
const DEMO_EMAILS = new Set([
  "unitdownsupport@gmail.com",
  "review@unitdown.org",
]);

function isDemoEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  return DEMO_EMAILS.has(email.trim().toLowerCase());
}

type ClerkUser = { id: string };

/** Look up a Clerk user by exact email address. Returns null if not found. */
async function findClerkUserByEmail(
  email: string,
  secret: string
): Promise<ClerkUser | null> {
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${secret}` } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Clerk user lookup failed (${res.status}): ${body}`);
  }
  const users = (await res.json()) as ClerkUser[];
  return Array.isArray(users) && users.length > 0 && users[0]?.id ? users[0] : null;
}

/**
 * Auto-create a Clerk user for the demo email.
 * Uses skip_password_checks so no password is required.
 * Idempotent: if the account already exists this will error, which the caller handles.
 */
async function createClerkUser(email: string, secret: string): Promise<ClerkUser> {
  const res = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      skip_password_checks: true,
      skip_password_requirement: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Clerk user creation failed (${res.status}): ${body}`);
  }
  return (await res.json()) as ClerkUser;
}

/** Create a Clerk sign-in token for the given user ID. */
async function createSignInToken(userId: string, secret: string): Promise<string> {
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      expires_in_seconds: 300, // 5-minute window — plenty for a reviewer
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Clerk sign-in token creation failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("Clerk response missing token field");
  return data.token;
}

/**
 * POST /api/auth/demo-token
 *
 * Body:    { email: string }
 * Returns: { token: string }  — Clerk sign-in token, use with strategy:"ticket"
 *
 * APPLE REVIEW BYPASS — do not change without updating login.tsx accordingly.
 */
demoRouter.post("/auth/demo-token", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: unknown };

  // Reject anything that isn't a demo account email
  if (!isDemoEmail(email)) {
    res.status(403).json({ error: "Not a demo account." });
    return;
  }

  const clerkSecret = process.env["CLERK_SECRET_KEY"];
  if (!clerkSecret) {
    logger.warn("Demo sign-in requested but CLERK_SECRET_KEY is not set");
    res.status(503).json({ error: "Auth provider is not configured." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Step 1 — Find or auto-create the Clerk user
  let user = await findClerkUserByEmail(normalizedEmail, clerkSecret);

  if (!user) {
    // Account doesn't exist yet — create it automatically (idempotent)
    logger.info({ email: normalizedEmail }, "Demo account not found in Clerk — auto-creating");
    try {
      user = await createClerkUser(normalizedEmail, clerkSecret);
      logger.info({ userId: user.id }, "Demo Clerk account created");
    } catch (err) {
      // Creation may fail if the account was created concurrently or via OAuth.
      // Try one more lookup before giving up.
      user = await findClerkUserByEmail(normalizedEmail, clerkSecret);
      if (!user) {
        logger.error({ err }, "Demo account creation failed and user still not found");
        res.status(502).json({ error: "Could not provision demo account." });
        return;
      }
    }
  }

  // Step 2 — Create a single-use Clerk sign-in token
  const token = await createSignInToken(user.id, clerkSecret);

  // Return only the token — never log it
  res.json({ token });
});

export default demoRouter;
