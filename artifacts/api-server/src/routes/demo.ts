// ─── APPLE REVIEW — Demo-account sign-in token ───────────────────────────────
// This route creates a short-lived Clerk sign-in token for the designated
// Apple Review demo account (unitdownsupport@gmail.com) so reviewers can log
// in without any OTP, email code, magic-link, or 2FA step.
//
// Security notes:
//  • Only the exact demo email is accepted — all other inputs are rejected.
//  • Requires DEMO_ACCOUNT_CLERK_USER_ID (Clerk user_xxx ID for the demo
//    account) to be set; returns 503 if missing.
//  • Tokens expire in 5 minutes (Clerk default) and are single-use.
//  • Remove or gate this route if the app no longer needs review bypass.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";

const demoRouter: IRouter = Router();

// APPLE REVIEW DEMO ACCOUNT — case-insensitive email allowlist.
// These must match the emails in the frontend src/lib/demoAccess.ts.
const DEMO_EMAILS = new Set([
  "unitdownsupport@gmail.com",
  "review@unitdown.org",
]);

function isDemoEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  return DEMO_EMAILS.has(email.trim().toLowerCase());
}

/**
 * POST /api/auth/demo-token
 *
 * Body: { email: string }
 * Returns: { token: string }  — a Clerk sign-in token usable with strategy "ticket"
 *
 * APPLE REVIEW BYPASS — do not change without updating login.tsx accordingly.
 */
demoRouter.post("/auth/demo-token", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: unknown };

  // Reject anything that isn't the demo account email
  if (!isDemoEmail(email)) {
    res.status(403).json({ error: "Not a demo account." });
    return;
  }

  const clerkUserId = process.env["DEMO_ACCOUNT_CLERK_USER_ID"];
  const clerkSecret = process.env["CLERK_SECRET_KEY"];

  if (!clerkUserId || !clerkSecret) {
    logger.warn("Demo sign-in requested but DEMO_ACCOUNT_CLERK_USER_ID or CLERK_SECRET_KEY is not set");
    res.status(503).json({ error: "Demo sign-in is not configured on this server." });
    return;
  }

  // Create a Clerk sign-in token via the Backend API.
  // The token can be used client-side with signIn.create({ strategy: 'ticket', ticket: token })
  // and requires no OTP, email code, or any other verification step.
  const clerkRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: clerkUserId,
      expires_in_seconds: 300, // 5-minute window — enough for the reviewer
    }),
  });

  if (!clerkRes.ok) {
    const body = await clerkRes.text();
    logger.error({ status: clerkRes.status, body }, "Clerk sign-in token creation failed");
    res.status(502).json({ error: "Could not create demo sign-in token." });
    return;
  }

  const data = (await clerkRes.json()) as { token?: string };

  if (!data.token) {
    logger.error({ data }, "Clerk sign-in token response missing token field");
    res.status(502).json({ error: "Invalid response from auth provider." });
    return;
  }

  // Return only the token — never log it
  res.json({ token: data.token });
});

export default demoRouter;
